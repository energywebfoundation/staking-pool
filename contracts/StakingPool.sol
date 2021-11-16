pragma solidity 0.8.6;

import "./libs/ABDKMath64x64.sol";

contract StakingPool {
    using ABDKMath64x64 for int128;

    address public claimManager;
    uint256 public start;
    uint256 public end;
    uint256 public ratio;
    uint256 public hardCap;
    uint256 public contributionLimit;
    uint256 public totalStaked;

    struct Stake {
        uint256 stake;
        uint256 compounded;
        uint256 time;
    }

    event StakeAdded(address indexed sender, uint256 amount, uint256 time);
    event StakeWithdrawn(address indexed sender, uint256 amount);

    mapping(address => Stake) stakes;

    constructor(
        address _claimManager,
        uint256 _start,
        uint256 _end,
        uint256 _ratio,
        uint256 _hardCap,
        uint256 _contributionLimit
    ) payable {
        // check if stake pool time is at least 1 day
        require(
            _start >= block.timestamp,
            "Start date should be at least current block timestamp"
        );
        require(_end - _start >= 1 days, "Duration should be at least 1 day");
        require(msg.value > 0);

        //check if appropraite role

        claimManager = _claimManager;
        start = _start;
        end = _end;
        ratio = _ratio;
        hardCap = _hardCap;
        contributionLimit = _contributionLimit;

        // check if deposit is at least the max rewards
        // require(calculateReward(_end - _start, _hardCap) <= msg.value);
    }

    function stake() public payable {
        // check role with claimManager
        require(block.timestamp >= start, "Staking pool not yet started");
        require(block.timestamp <= end, "Staking pool already expired");

        require(
            stakes[msg.sender].stake + msg.value <= contributionLimit,
            "Stake greater than contribution limit"
        );

        require(hardCap - totalStaked >= msg.value, "Staking pool is full");

        (, uint256 compounded) = total();

        // track user stake
        stakes[msg.sender].stake += msg.value;
        // store compounded value
        stakes[msg.sender].compounded = compounded + msg.value;
        // update compunding time
        stakes[msg.sender].time = block.timestamp;

        totalStaked += msg.value;

        emit StakeAdded(msg.sender, msg.value, block.timestamp);
    }

    //allow specifing the value
    function unstakeAll() public {
        (, uint256 payout) = total();

        require(payout > 0, "No stake available");

        totalStaked -= stakes[msg.sender].stake;
        delete stakes[msg.sender];

        payable(msg.sender).transfer(payout);

        emit StakeWithdrawn(msg.sender, payout);
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

        return (senderStake.stake, compounded);
    }

    function compound(
        uint256 principal,
        uint256 ratio,
        uint256 n
    ) public pure returns (uint256) {
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
