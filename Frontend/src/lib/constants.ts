// Contract addresses - these would be updated after deployment
export const CONTRACT_ADDRESSES = {
  FACTORY: "0x0000000000000000000000000000000000000000", // To be updated after deployment
  // Individual business contract addresses will be stored in database
} as const

// Reward types mapping to contract enums
export const REWARD_TYPES = {
  NONE: 0,
  WEB2_VOUCHER: 1,
  TOKEN_AIRDROP: 2,
  NFT_REWARD: 3
} as const

// Factory Contract ABI (simplified - would need full ABI after compilation)
export const FACTORY_ABI = [
  {
    "inputs": [
      { "name": "_uuid", "type": "string" },
      { "name": "_name", "type": "string" },
      { "name": "_description", "type": "string" },
      { "name": "_businessENSDomain", "type": "string" }
    ],
    "name": "deployBusinessContract",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "_uuid", "type": "string" }],
    "name": "getBusinessContract",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_uuid", "type": "string" },
      { "name": "_name", "type": "string" },
      { "name": "_description", "type": "string" },
      { "name": "_businessENSDomain", "type": "string" }
    ],
    "name": "BusinessContractDeployed",
    "type": "event"
  }
] as const

// Business Contract ABI (simplified - key functions for bounty management)
export const BUSINESS_CONTRACT_ABI = [
  // Reward Template Management
  {
    "inputs": [
      { "name": "_name", "type": "string" },
      { "name": "_description", "type": "string" },
      { "name": "_rewardType", "type": "uint8" },
      { "name": "_pointsValue", "type": "uint256" },
      { "name": "_voucherMetadata", "type": "string" },
      { "name": "_validityPeriod", "type": "uint256" },
      { "name": "_tokenAddress", "type": "address" },
      { "name": "_tokenAmount", "type": "uint256" },
      { "name": "_nftMetadata", "type": "string" }
    ],
    "name": "addRewardTemplate",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Bounty Management
  {
    "inputs": [
      { "name": "_title", "type": "string" },
      { "name": "_description", "type": "string" },
      { "name": "_rewardTemplateId", "type": "uint256" },
      { "name": "_expiry", "type": "uint256" },
      { "name": "_maxCompletions", "type": "uint256" }
    ],
    "name": "createBounty",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Prize Management
  {
    "inputs": [
      { "name": "_name", "type": "string" },
      { "name": "_description", "type": "string" },
      { "name": "_pointsCost", "type": "uint256" },
      { "name": "_maxClaims", "type": "uint256" },
      { "name": "_metadata", "type": "string" }
    ],
    "name": "createPrize",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // View Functions
  {
    "inputs": [],
    "name": "getActiveBounties",
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveRewards",
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActivePrizes", 
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Events
  {
    "inputs": [
      { "indexed": true, "name": "bountyId", "type": "uint256" },
      { "indexed": false, "name": "title", "type": "string" },
      { "indexed": false, "name": "rewardTemplateId", "type": "uint256" }
    ],
    "name": "BountyCreated",
    "type": "event"
  },
  {
    "inputs": [
      { "indexed": true, "name": "rewardId", "type": "uint256" },
      { "indexed": false, "name": "name", "type": "string" },
      { "indexed": false, "name": "rewardType", "type": "uint8" }
    ],
    "name": "RewardTemplateAdded",
    "type": "event"
  },
  {
    "inputs": [
      { "indexed": true, "name": "prizeId", "type": "uint256" },
      { "indexed": false, "name": "name", "type": "string" },
      { "indexed": false, "name": "pointsCost", "type": "uint256" }
    ],
    "name": "PrizeCreated",
    "type": "event"
  }
] as const

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 11155111, // Sepolia testnet
  rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY", // Update with actual RPC
  blockExplorer: "https://sepolia.etherscan.io"
} as const

// Default values for forms
export const DEFAULT_VALUES = {
  BOUNTY: {
    maxCompletions: 0, // unlimited
    expiry: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
  },
  REWARD: {
    pointsValue: 10,
    validityPeriod: 30 * 24 * 60 * 60, // 30 days
    tokenAmount: 0
  },
  PRIZE: {
    pointsCost: 100,
    maxClaims: 0 // unlimited
  }
} as const

// Validation constants
export const VALIDATION = {
  MIN_POINTS: 1,
  MAX_POINTS: 10000,
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500
} as const