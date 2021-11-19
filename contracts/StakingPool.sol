//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./libs/ABDKMath64x64.sol";

contract StakingPool {
    using ABDKMath64x64 for int128;

    address public owner;
    address public claimManager;
    uint256 public start;
    uint256 public end;
    uint256 public ratio;
    uint256 public hardCap;
    uint256 public contributionLimit;
    uint256 public totalStaked;

    struct Stake {
        uint256 deposit;
        uint256 compounded;
        uint256 time;
    }

    event StakeAdded(address indexed sender, uint256 amount, uint256 time);
    event StakeWithdrawn(address indexed sender, uint256 amount);
    event StakingPoolInitialized(uint256 funded);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    mapping(address => Stake) public stakes;
    modifier onlyOwner() {
        require(msg.sender == owner, "OnlyOwner: Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        //check if appropraite role
        // check if deposit is at least the max rewards
        // require(calculateReward(_end - _start, _hardCap) <= msg.value);
    }

    function init(
        address _claimManager,
        uint256 _start,
        uint256 _end,
        uint256 _ratio,
        uint256 _hardCap,
        uint256 _contributionLimit
    ) external payable onlyOwner {
        require(
            _start >= block.timestamp,
            "Start date should be at least current block timestamp"
        );
        // check if stake pool time is at least 1 day
        require(_end - _start >= 1 days, "Duration should be at least 1 day");
        require(msg.value > 0, "Staking pool should be funded");

        claimManager = _claimManager;
        start = _start;
        end = _end;
        ratio = _ratio;
        hardCap = _hardCap;
        contributionLimit = _contributionLimit;

        emit StakingPoolInitialized(msg.value);
    }

    function changeOwner(address _newOwner) external onlyOwner {
        require(owner != _newOwner, "changeOwner: already owner");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    function stake() public payable {
        // check role with claimManager
        require(start != 0, "Staking Pool not initialized");
        require(block.timestamp >= start, "Staking pool not yet started");
        require(block.timestamp <= end, "Staking pool already expired");

        require(
            stakes[msg.sender].deposit + msg.value <= contributionLimit,
            "Stake greater than contribution limit"
        );

        require(hardCap - totalStaked >= msg.value, "Staking pool is full");

        (, uint256 compounded) = total();

        // track user stake
        stakes[msg.sender].deposit += msg.value;
        // store compounded value
        stakes[msg.sender].compounded = compounded + msg.value;
        // update compunding time
        stakes[msg.sender].time = block.timestamp;

        totalStaked += msg.value;

        emit StakeAdded(msg.sender, msg.value, block.timestamp);
    }

    function unstake(uint256 value) public {
        (uint256 deposit, uint256 compounded) = total();

        require(compounded > 0, "No funds available");

        require(
            compounded >= value,
            "Requested value above the compounded funds"
        );

        uint256 depositComponent = deposit;
        if (value < deposit) {
            depositComponent = value;
        }

        if (value == compounded) {
            delete stakes[msg.sender];
        } else {
            stakes[msg.sender].deposit -= depositComponent;
            stakes[msg.sender].compounded = compounded - value;
            stakes[msg.sender].time = block.timestamp;
        }

        totalStaked -= depositComponent;

        payable(msg.sender).transfer(value);

        emit StakeWithdrawn(msg.sender, value);
    }

    //allow specifing the value
    function unstakeAll() public {
        (, uint256 compounded) = total();

        unstake(compounded);
    }

    function total() public view returns (uint256, uint256) {
        Stake memory senderStake = stakes[msg.sender];

        // checks if there is no stake added
        if (senderStake.time == 0) {
            return (0, 0);
        }

        uint256 compoundEnd = block.timestamp;

        if (block.timestamp > end) {
            compoundEnd = end;
        }

        uint256 period = compoundEnd - senderStake.time;
        uint256 periods = period / 1 hours;

        uint256 compounded = compound(senderStake.compounded, ratio, periods);

        return (senderStake.deposit, compounded);
    }

    function compound(
        uint256 principal,
        uint256 _ratio,
        uint256 n
    ) public pure returns (uint256) {
        return
            ABDKMath64x64.mulu(
                ABDKMath64x64.pow(
                    ABDKMath64x64.add(
                        ABDKMath64x64.fromUInt(1),
                        ABDKMath64x64.divu(_ratio, 10**18)
                    ),
                    n
                ),
                principal
            );
    }
}
