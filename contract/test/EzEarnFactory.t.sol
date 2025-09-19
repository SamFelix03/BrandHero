// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/EzEarnFactory.sol";
import "../src/BusinessContract.sol";

contract EzEarnFactoryTest is Test {
    EzEarnFactory public factory;
    address public owner1;
    address public owner2;
    address public user1;
    address public user2;

    function setUp() public {
        factory = new EzEarnFactory();
        owner1 = makeAddr("owner1");
        owner2 = makeAddr("owner2");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
    }

    function testDeployBusinessContract() public {
        vm.prank(owner1);
        address businessAddr = factory.deployBusinessContract(
            "business-uuid-1",
            "Test Business",
            "A test business",
            "testbusiness.eth"
        );

        // Verify business was deployed
        assertTrue(businessAddr != address(0));
        assertEq(factory.getBusinessContract("business-uuid-1"), businessAddr);
        
        // Check business details
        BusinessContract business = BusinessContract(businessAddr);
        assertEq(business.businessUuid(), "business-uuid-1");
        assertEq(business.businessName(), "Test Business");
        assertEq(business.businessDescription(), "A test business");
        assertEq(business.owner(), owner1);
    }

    function testCannotDeployDuplicateUUID() public {
        vm.prank(owner1);
        factory.deployBusinessContract(
            "duplicate-uuid",
            "First Business",
            "First description",
            "firstbusiness.eth"
        );

        vm.prank(owner2);
        vm.expectRevert("Business with this UUID already exists");
        factory.deployBusinessContract(
            "duplicate-uuid",
            "Second Business",
            "Second description",
            "secondbusiness.eth"
        );
    }

    function testAddLoyaltyMember() public {
        vm.prank(owner1);
        address businessAddr = factory.deployBusinessContract(
            "test-business",
            "Test Business",
            "A test business",
            "testbusiness.eth"
        );

        // Add loyalty member directly to business contract
        BusinessContract business = BusinessContract(businessAddr);
        vm.prank(owner1);
        business.addLoyaltyMember(user1, "user1.testbusiness.eth");

        // Verify member was added
        assertTrue(business.loyaltyMembers(user1));
    }

    function testOnlyOwnerCanAddMembers() public {
        vm.prank(owner1);
        address businessAddr = factory.deployBusinessContract(
            "test-business",
            "Test Business",
            "A test business",
            "testbusiness.eth"
        );

        // Non-owner tries to add member
        BusinessContract business = BusinessContract(businessAddr);
        vm.prank(owner2);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", owner2));
        business.addLoyaltyMember(user1, "user1.testbusiness.eth");
    }

    function testCreateRewardAndBounty() public {
        vm.prank(owner1);
        address businessAddr = factory.deployBusinessContract(
            "reward-test",
            "Reward Business",
            "Testing rewards",
            "rewardbusiness.eth"
        );

        BusinessContract business = BusinessContract(businessAddr);

        // Add a reward template (points + voucher)
        vm.prank(owner1);
        uint256 rewardId = business.addRewardTemplate(
            "10% Discount",
            "Get 10% off your next purchase",
            BusinessContract.RewardType.WEB2_VOUCHER,
            100, // points
            '{"discount": 10}',
            30 days,
            address(0),
            0,
            ""
        );

        // Create bounty with the reward
        vm.prank(owner1);
        uint256 bountyId = business.createBounty(
            "Follow on Twitter",
            "Follow our Twitter account",
            rewardId,
            block.timestamp + 30 days,
            0 // unlimited
        );

        // Verify bounty was created
        BusinessContract.Bounty memory bounty = business.getBounty(bountyId);
        assertEq(bounty.title, "Follow on Twitter");
        assertEq(bounty.rewardTemplateId, rewardId);
        assertTrue(bounty.active);
    }

    function testCompleteBounty() public {
        vm.prank(owner1);
        address businessAddr = factory.deployBusinessContract(
            "completion-test",
            "Completion Business",
            "Testing completions",
            "completionbusiness.eth"
        );

        BusinessContract business = BusinessContract(businessAddr);

        // Add loyalty member first
        vm.prank(owner1);
        business.addLoyaltyMember(user1, "user1.completionbusiness.eth");

        // Add reward template (points only)
        vm.prank(owner1);
        uint256 rewardId = business.addRewardTemplate(
            "Points Only Reward",
            "Get points only",
            BusinessContract.RewardType.NONE,  // Points only, no direct reward
            50,
            "",
            30 days,
            address(0),
            0,
            ""
        );

        // Create bounty
        vm.prank(owner1);
        uint256 bountyId = business.createBounty(
            "Test Task",
            "Complete this test task",
            rewardId,
            block.timestamp + 30 days,
            0
        );

        // Complete bounty directly on business contract
        vm.prank(owner1);
        business.completeBounty(user1, bountyId);

        // Check user data
        (uint256 points, uint256[] memory completed, uint256[] memory vouchers, uint256[] memory prizes, string memory ensName, uint256 joinedAt) = business.getUserData(user1);
        assertEq(points, 50);
        assertEq(completed.length, 1);
        assertEq(completed[0], bountyId);
        assertEq(vouchers.length, 0); // No voucher for NONE reward type
        assertEq(prizes.length, 0);   // No prizes claimed yet
        assertEq(ensName, "user1.completionbusiness.eth");
        assertTrue(joinedAt > 0);
    }

    function testGetBusinessInfo() public {
        vm.prank(owner1);
        factory.deployBusinessContract(
            "info-test",
            "Info Business",
            "Business for info testing",
            "infobusiness.eth"
        );

        EzEarnFactory.BusinessInfo memory info = factory.getBusinessInfo("info-test");
        assertEq(info.uuid, "info-test");
        assertEq(info.name, "Info Business");
        assertEq(info.description, "Business for info testing");
        assertEq(info.owner, owner1);
        assertTrue(info.contractAddress != address(0));
    }

    function testGetOwnerBusinesses() public {
        vm.startPrank(owner1);
        factory.deployBusinessContract("biz1", "Business 1", "First business", "business1.eth");
        factory.deployBusinessContract("biz2", "Business 2", "Second business", "business2.eth");
        vm.stopPrank();

        string[] memory businesses = factory.getOwnerBusinesses(owner1);
        assertEq(businesses.length, 2);
        assertEq(businesses[0], "biz1");
        assertEq(businesses[1], "biz2");
    }

    function testGetTotalBusinesses() public {
        assertEq(factory.getTotalBusinesses(), 0);

        vm.prank(owner1);
        factory.deployBusinessContract("biz1", "Business 1", "First", "business1.eth");

        assertEq(factory.getTotalBusinesses(), 1);

        vm.prank(owner2);
        factory.deployBusinessContract("biz2", "Business 2", "Second", "business2.eth");

        assertEq(factory.getTotalBusinesses(), 2);
    }

    function testHybridRewardSystem() public {
        vm.prank(owner1);
        address businessAddr = factory.deployBusinessContract(
            "hybrid-test",
            "Hybrid Business", 
            "Testing hybrid rewards",
            "hybridbusiness.eth"
        );

        BusinessContract business = BusinessContract(businessAddr);

        // Add loyalty member
        vm.prank(owner1);
        business.addLoyaltyMember(user1, "user1.hybridbusiness.eth");

        // Create points-only reward template
        vm.prank(owner1);
        uint256 pointsRewardId = business.addRewardTemplate(
            "Points Only",
            "Just points",
            BusinessContract.RewardType.NONE,
            100,
            "",
            30 days,
            address(0),
            0,
            ""
        );

        // Create points + voucher reward template  
        vm.prank(owner1);
        uint256 voucherRewardId = business.addRewardTemplate(
            "Points + Voucher",
            "Points and voucher",
            BusinessContract.RewardType.WEB2_VOUCHER,
            75,
            '{"discount": 15}',
            30 days,
            address(0),
            0,
            ""
        );

        // Create bounties
        vm.prank(owner1);
        uint256 pointsBountyId = business.createBounty(
            "Points Task",
            "Get points only",
            pointsRewardId,
            block.timestamp + 30 days,
            0
        );

        vm.prank(owner1);
        uint256 voucherBountyId = business.createBounty(
            "Voucher Task", 
            "Get points + voucher",
            voucherRewardId,
            block.timestamp + 30 days,
            0
        );

        // Complete points-only bounty
        vm.prank(owner1);
        business.completeBounty(user1, pointsBountyId);

        // Complete points + voucher bounty
        vm.prank(owner1);
        business.completeBounty(user1, voucherBountyId);

        // Check user data
        (uint256 points, uint256[] memory completed, uint256[] memory vouchers, uint256[] memory prizes, string memory ensName, uint256 joinedAt) = business.getUserData(user1);
        assertEq(points, 175); // 100 + 75 points
        assertEq(completed.length, 2);
        assertEq(vouchers.length, 1); // One voucher from second bounty
        assertEq(prizes.length, 0);
        assertEq(ensName, "user1.hybridbusiness.eth");
    }

    function testPrizeSystem() public {
        vm.prank(owner1);
        address businessAddr = factory.deployBusinessContract(
            "prize-test",
            "Prize Business",
            "Testing prizes",
            "prizebusiness.eth"
        );

        BusinessContract business = BusinessContract(businessAddr);

        // Add loyalty member
        vm.prank(owner1);
        business.addLoyaltyMember(user1, "user1.prizebusiness.eth");

        // Create a prize
        vm.prank(owner1);
        uint256 prizeId = business.createPrize(
            "Free Coffee",
            "Get a free coffee",
            100, // costs 100 points
            5,   // max 5 claims
            '{"type": "coffee", "size": "medium"}'
        );

        // Give user points (complete a bounty)
        vm.prank(owner1);
        uint256 rewardId = business.addRewardTemplate(
            "Points Reward",
            "Get points",
            BusinessContract.RewardType.NONE,
            150, // More than enough for prize
            "",
            30 days,
            address(0),
            0,
            ""
        );

        vm.prank(owner1);
        uint256 bountyId = business.createBounty(
            "Get Points",
            "Complete to get points",
            rewardId,
            block.timestamp + 30 days,
            0
        );

        vm.prank(owner1);
        business.completeBounty(user1, bountyId);

        // Check user can afford prize
        (uint256[] memory prizeIds, string[] memory names, uint256[] memory costs, bool[] memory canAfford) = business.getAvailablePrizes(user1);
        assertEq(prizeIds.length, 1);
        assertEq(prizeIds[0], prizeId);
        assertTrue(canAfford[0]);

        // Claim prize
        vm.prank(user1);
        business.claimPrize(prizeId);

        // Check user data after claiming
        (uint256 points, , , uint256[] memory claimedPrizes, string memory ensName, ) = business.getUserData(user1);
        assertEq(points, 50); // 150 - 100 spent on prize
        assertEq(claimedPrizes.length, 1);
        assertEq(claimedPrizes[0], prizeId);
        assertEq(ensName, "user1.prizebusiness.eth");
    }

    function testENSNameValidation() public {
        vm.prank(owner1);
        address businessAddr = factory.deployBusinessContract(
            "ens-test",
            "ENS Business",
            "Testing ENS validation",
            "ensbusiness.eth"
        );

        BusinessContract business = BusinessContract(businessAddr);

        // Test valid ENS name
        assertTrue(business.isENSNameAvailable("user1.ensbusiness.eth"));
        
        // Test invalid ENS names
        assertFalse(business.isENSNameAvailable("user1.wrongdomain.eth"));
        assertFalse(business.isENSNameAvailable("user1"));
        assertFalse(business.isENSNameAvailable(""));

        // Add member and test uniqueness
        vm.prank(owner1);
        business.addLoyaltyMember(user1, "user1.ensbusiness.eth");
        
        assertFalse(business.isENSNameAvailable("user1.ensbusiness.eth"));
        
        // Test ENS helper functions
        assertEq(business.userToENSName(user1), "user1.ensbusiness.eth");
        assertEq(business.ensNameToUser("user1.ensbusiness.eth"), user1);
        
        (address userAddr, uint256 points, string memory ensName, uint256 joinedAt) = business.getUserByENSName("user1.ensbusiness.eth");
        assertEq(userAddr, user1);
        assertEq(points, 0);
        assertEq(ensName, "user1.ensbusiness.eth");
        assertTrue(joinedAt > 0);
    }
}