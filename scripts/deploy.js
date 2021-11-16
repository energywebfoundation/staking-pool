const { ethers } = require("hardhat");

async function main() {
  const { timestamp } = await ethers.provider.getBlock();

  const start = timestamp + 5;
  const end = start + 24 * 3600;

  const ratio = ethers.utils.parseUnits("0.0000225", 18);
  const hardCap = ethers.utils.parseUnits("50000", "ether");
  const contributionLimit = ethers.utils.parseUnits("5000", "ether");

  const StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(
    ethers.constants.AddressZero,
    start,
    end,
    ratio,
    hardCap,
    contributionLimit,
    { value: contributionLimit }
  );

  console.log("StakingPool deployed to:", stakingPool.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
