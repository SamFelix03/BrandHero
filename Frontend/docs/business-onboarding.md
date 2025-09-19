Perfect — here's a full **database + smart contract design plan** for the business side, as per your onboarding flow, smart contract logic, and reward system.

---

# 📚 PART 1: Database Schema (Off-chain for Platform UI)

This is used for:

* Business registration
* AI interaction logs
* Metadata before contract deployment
* Linking smart contract addresses
* UI rendering

---

### 🧾 Table: `Businesses`

| Field                    | Type      | Description               |
| ------------------------ | --------- | ------------------------- |
| `id`                     | UUID      | Internal ID               |
| `wallet_address`         | Address   | Connected wallet          |
| `ens_domain`             | String    | e.g. `bask.eth`           |
| `profile_picture_url`    | String    | CDN/IPFS URL              |
| `business_name`          | String    | e.g., “Bask Café”         |
| `description`            | Text      | Short bio                 |
| `location`               | String    | City/area info            |
| `website`                | String    | Website URL               |
| `social_links`           | JSON      | Instagram, Zomato, etc.   |
| `is_token_issuer`        | Boolean   | Enables Web3 rewards      |
| `token_contract_address` | Address   | Optional, if token issuer |
| `smart_contract_address` | Address   | After AI agent deployment |
| `created_at`             | Timestamp | Onboarding timestamp      |

---

### 🧾 Table: `Bounties_Draft` *(before contract deployment)*

| Field            | Type                 | Description                            |
| ---------------- | -------------------- | -------------------------------------- |
| `id`             | UUID                 | Draft ID                               |
| `business_id`    | FK → Businesses      | Owner                                  |
| `title`          | String               | Bounty title                           |
| `description`    | Text                 | Full task                              |
| `location`       | String               | Optional filter                        |
| `action_type`    | Enum                 | `review`, `social_post`, `flyer`, etc. |
| `proof_type`     | Enum                 | `video`, `image`, `receipt`, etc.      |
| `goal`           | String               | e.g., “Post story + tag us”            |
| `reward_type_id` | FK → RewardTemplates | Chosen reward                          |
| `max_claims`     | Integer              | Optional                               |
| `auto_verify`    | Boolean              | OCR/AI verification                    |
| `expiry_date`    | Timestamp            | Optional                               |
| `tags`           | JSON\[]              | e.g., \["ugc", "offline"]              |

---

### 🧾 Table: `RewardTemplates`

| Field               | Type    | Description                                                               |
| ------------------- | ------- | ------------------------------------------------------------------------- |
| `id`                | UUID    | Internal ID                                                               |
| `name`              | String  | e.g., "10% Discount Coupon"                                               |
| `reward_type`       | Enum    | `web2`, `web3`, `points`                                                  |
| `reward_logic_slug` | String  | e.g., `discount_coupon`, `airdrop_token`, `mint_nft`, `receipt_to_reward` |
| `description`       | Text    | Short summary                                                             |
| `requires_token?`   | Boolean | Only shown to token issuers                                               |
| `parameters`        | JSON    | Configurable inputs (e.g., % discount, token amount)                      |

---

### 🧾 Table: `Business_AI_Log`

| Field               | Type            | Description          |
| ------------------- | --------------- | -------------------- |
| `id`                | UUID            | Internal ID          |
| `business_id`       | FK → Businesses | Owner                |
| `request_payload`   | JSON            | Sent to AI           |
| `response_bounties` | JSON            | Returned bounty list |
| `agent_version`     | String          | For audit            |
| `created_at`        | Timestamp       | Interaction time     |

---

---

# ⚙️ PART 2: Smart Contract Architecture (On-chain, per Business)

Each business gets a **dedicated contract** after onboarding. This contract becomes the **single source of truth**.

---

## 🧱 Contract: `BusinessBountyManager`

### 🔐 Ownership

* Contract is owned by platform or business wallet (configurable)
* Only platform/AI can mutate bounty data

---

## 🔧 Key Mappings (Storage)

| Mapping             | Type                                           | Purpose                         |
| ------------------- | ---------------------------------------------- | ------------------------------- |
| `bounties`          | `mapping(uint256 => Bounty)`                   | All bounty definitions          |
| `userSubdomains`    | `mapping(bytes32 => address)`                  | `ensHash → walletAddress`       |
| `pointsLedger`      | `mapping(bytes32 => uint256)`                  | `ensHash → points`              |
| `bountyCompletions` | `mapping(bytes32 => uint256[])`                | `ensHash → bountyIDs[]`         |
| `rewardClaims`      | `mapping(bytes32 => mapping(uint256 => bool))` | `ensHash → bountyID → claimed?` |

---

### 🧾 Struct: `Bounty`

```solidity
struct Bounty {
  uint256 id;
  string title;
  string description;
  uint256 maxClaims;
  bool active;
  uint256 expiry; // Unix timestamp
  string actionType;
  string proofType;
  string rewardType; // "web2", "web3", "points"
  bytes rewardParams; // ABI-encoded reward logic params
}
```

---

### 🛠️ Functions

#### 🏗 Bounty Setup (one-time)

```solidity
function addBounty(Bounty calldata bounty) external onlyOwner;
function setBountyActive(uint256 bountyId, bool isActive) external onlyOwner;
```

#### 👥 User Management

```solidity
function setENSMapping(bytes32 ensHash, address user) external onlyOwner;
function updatePoints(bytes32 ensHash, uint256 newPoints) external onlyOwner;
```

#### ✅ Completion Tracking

```solidity
function recordBountyCompletion(bytes32 ensHash, uint256 bountyId) external onlyOwner;
function setRewardClaimed(bytes32 ensHash, uint256 bountyId) external onlyOwner;
function hasClaimed(bytes32 ensHash, uint256 bountyId) external view returns (bool);
function getUserCompletions(bytes32 ensHash) external view returns (uint256[] memory);
```

#### 🔍 View Helpers

```solidity
function getBounty(uint256 bountyId) external view returns (Bounty memory);
function getPoints(bytes32 ensHash) external view returns (uint256);
function getENSOwner(bytes32 ensHash) external view returns (address);
function isBountyActive(uint256 bountyId) external view returns (bool);
```

---

## 🛡 Gas Optimization & Indexing Tips

* Use `bytes32` ENS name hashes for fast lookup (`keccak256("sam.bask.eth")`)
* Keep bounties in fixed-length array for easy pagination
* Emit logs for:

  * `BountyCompleted`
  * `RewardClaimed`
  * `PointsUpdated`

---

# 🎁 Initial Reward Templates (MVP)

### 🟦 Web3 Rewards (for token issuers only)

| Name           | Slug            | Params                          |
| -------------- | --------------- | ------------------------------- |
| Token Airdrop  | `airdrop_token` | `amount`, `token_address`       |
| NFT Badge      | `mint_nft`      | `metadata_uri`                  |
| Swap Bonus     | `swap_bonus`    | `token_address`, `bonus_amount` |
| LP Yield Boost | `lp_boost`      | `token_address`, `tier`         |

---

### 🟨 Web2 Rewards (available to all)

| Name              | Slug                | Params                             |
| ----------------- | ------------------- | ---------------------------------- |
| 10% Discount      | `discount_coupon`   | `code`, `expiry`                   |
| Free Product      | `free_item`         | `item_name`, `location`            |
| Event Access      | `event_ticket`      | `event_id`, `access_type`          |
| Cashback Voucher  | `cashback_code`     | `amount`, `redeem_by`              |
| Receipt-to-Reward | `receipt_to_reward` | `min_amount`, `keywords`, `points` |

---

## ✅ ENS Integration

* Onboarding agent also mints:

  * `bask.eth` or `bask.platform.eth`
* Each user is issued `user.bask.eth`
* Subdomain stored in contract as:

  * `bytes32 ensHash → wallet address`
* Used for all on-chain indexing

---

## 🧠 Next Steps

Let me know if you'd like:

* A complete **Solidity draft** of `BusinessBountyManager`
* **API endpoints** for syncing frontend/backend with the contract
* Or the **user-side flow and contract reading functions**

This structure gives you full modularity, on-chain tracking, and prepares you for reward templates, claim automation, and future expansions.
