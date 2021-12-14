//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./StakingPool.sol";

contract StakingPoolPatronKYC is StakingPool {
	modifier onlyOwner() override {
		// restrict to the account that was set as initiator
		require(msg.sender == initiator, "OnlyOwner: Not an owner");
		_;
	}

	constructor(address _initiator, address _claimManager)
		StakingPool(bytes32(0), _claimManager)
	{
		require(_initiator != address(0));

		initiator = _initiator;
	}
}
