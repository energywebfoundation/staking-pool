//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./StakingPool.sol";

contract StakingPoolNoKYC is StakingPool {
	modifier onlyOwner() override {
		// restrict to the account that was set as initiator
		require(msg.sender == initiator, "OnlyOwner: Not an owner");
		_;
	}

	modifier onlyPatrons(address _agent) override {
		// no role check, just pass
		_;
	}

	constructor(address _initiator) StakingPool(bytes32(0), address(0)) {
		require(_initiator != address(0));

		initiator = _initiator;
	}
}
