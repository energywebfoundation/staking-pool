//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./libs/Roles.sol";
import "./libs/ABDKMath64x64.sol";
import "@energyweb/iam-contracts/dist/contracts/roles/ClaimManager.sol";

contract StakingPool {
	using ABDKMath64x64 for int128;
	using RolesLibrary for address;

	address public owner;
	address public claimManager;

	uint256 public start;
	uint256 public end;

	uint256 public hourlyRatio;
	uint256 public hardCap;
	uint256 public contributionLimit;

	uint256 public totalStaked;
	bytes32[] private patronRoles;
	bytes32 private ownerRole;

	uint256 private remainingRewards;
	uint256 private futureRewards;

	bool public sweeped;

	struct Stake {
		uint256 deposit;
		uint256 compounded;
		uint256 time;
		uint256 futureReward;
	}

	event StakeAdded(address indexed sender, uint256 amount, uint256 time);
	event StakeWithdrawn(address indexed sender, uint256 amount);
	event StakingPoolInitialized(uint256 funded, uint256 timestamp);
	event OwnershipTransferred(
		address indexed previousOwner,
		address indexed newOwner
	);

	mapping(address => Stake) public stakes;

	modifier onlyOwner() {
		// restrict to accounts enrolled as owner at energyweb
		require(
			msg.sender.isOwner(claimManager, ownerRole),
			"OnlyOwner: Not an owner"
		);
		_;
	}

	modifier onlyPatrons(address _agent) {
		// checking patron role with claimManager
		require(
			_agent.hasRole(claimManager, patronRoles),
			"StakingPool: Not a patron"
		);
		_;
	}

	modifier belowContributionLimit() {
		require(
			stakes[msg.sender].deposit + msg.value <= contributionLimit,
			"Stake greater than contribution limit"
		);
		_;
	}

	modifier initialized() {
		require(start != 0, "Staking Pool not initialized");
		_;
	}

	constructor(bytes32 _ownerRole, address _claimManager) {
		owner = msg.sender;
		ownerRole = _ownerRole;
		claimManager = _claimManager;
	}

	function init(
		uint256 _start,
		uint256 _end,
		uint256 _hourlyRatio,
		uint256 _hardCap,
		uint256 _contributionLimit,
		bytes32[] memory _patronRoles
	) external payable onlyOwner {
		require(
			_start >= block.timestamp,
			"Start date should be at least current block timestamp"
		);
		// check if stake pool time is at least 1 day
		require(_end - _start >= 1 days, "Duration should be at least 1 day");

		uint256 maxFutureRewards = compound(
			_hourlyRatio,
			_hardCap,
			_start,
			_end
		) - _hardCap;

		require(msg.value >= maxFutureRewards, "Rewards lower than expected");

		start = _start;
		end = _end;
		hourlyRatio = _hourlyRatio;
		hardCap = _hardCap;
		contributionLimit = _contributionLimit;
		patronRoles = _patronRoles;

		remainingRewards = msg.value;

		emit StakingPoolInitialized(msg.value, block.timestamp);
	}

	function changeOwner(address _newOwner) external onlyOwner {
		require(owner != _newOwner, "changeOwner: already owner");
		address oldOwner = owner;
		owner = _newOwner;
		emit OwnershipTransferred(oldOwner, _newOwner);
	}

	function stake()
		public
		payable
		onlyPatrons(msg.sender)
		initialized
		belowContributionLimit
	{
		// check role with claimManager
		require(block.timestamp >= start, "Staking pool not yet started");
		require(block.timestamp <= end, "Staking pool already expired");

		require(hardCap - totalStaked >= msg.value, "Staking pool is full");

		(, uint256 compounded) = total();

		updateStake(
			stakes[msg.sender].deposit + msg.value,
			compounded + msg.value
		);
		accountFutureReward();

		totalStaked += msg.value;

		emit StakeAdded(msg.sender, msg.value, block.timestamp);
	}

	function unstake(uint256 value) public initialized {
		(uint256 deposit, uint256 compounded) = total();

		require(compounded > 0, "No funds available");

		require(
			compounded >= value,
			"Requested value above the compounded funds"
		);

		uint256 depositComponent = value <= deposit ? value : deposit;
		uint256 rewardComponent = value > deposit ? value - deposit : 0;

		if (value == compounded) {
			delete stakes[msg.sender];
		} else {
			updateStake(
				stakes[msg.sender].deposit - depositComponent,
				compounded - value
			);
			accountFutureReward();
		}

		futureRewards -= rewardComponent;
		remainingRewards -= rewardComponent;
		totalStaked -= depositComponent;

		payable(msg.sender).transfer(value);

		emit StakeWithdrawn(msg.sender, value);
	}

	//allow specifing the value
	function unstakeAll() public initialized {
		(, uint256 compounded) = total();

		unstake(compounded);
	}

	function sweep() public initialized onlyOwner {
		require(!sweeped, "Already sweeped");
		require(block.timestamp >= end, "Cannot sweep before expiry");

		uint256 payout = remainingRewards - futureRewards;

		sweeped = true;

		payable(msg.sender).transfer(payout);
	}

	function calculateFutureReward() private view returns (uint256) {
		return
			compound(
				hourlyRatio,
				stakes[msg.sender].compounded,
				block.timestamp,
				end
			) - stakes[msg.sender].deposit;
	}

	function accountFutureReward() private {
		uint256 futureReward = calculateFutureReward();

		futureRewards -= stakes[msg.sender].futureReward;
		futureRewards += futureReward;

		stakes[msg.sender].futureReward = futureReward;
	}

	function updateStake(uint256 deposit, uint256 compounded) private {
		stakes[msg.sender].deposit = deposit;
		stakes[msg.sender].compounded = compounded;
		stakes[msg.sender].time = block.timestamp;
	}

	function total() public view returns (uint256, uint256) {
		Stake memory senderStake = stakes[msg.sender];

		// checks if there is no stake added
		if (senderStake.time == 0) {
			return (0, 0);
		}

		uint256 compoundEnd = block.timestamp > end ? end : block.timestamp;

		uint256 compounded = compound(
			hourlyRatio,
			senderStake.compounded,
			senderStake.time,
			compoundEnd
		);

		return (senderStake.deposit, compounded);
	}

	function compound(
		uint256 ratio,
		uint256 principal,
		uint256 compoundStart,
		uint256 compoundEnd
	) public view returns (uint256) {
		uint256 n = (compoundEnd - compoundStart) / 1 hours;

		return
			ABDKMath64x64.mulu(
				ABDKMath64x64.pow(
					ABDKMath64x64.add(
						ABDKMath64x64.fromUInt(1),
						ABDKMath64x64.divu(ratio, 10**18)
					),
					n
				),
				principal
			);
	}
}
