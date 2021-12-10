const { ethers } = require("hardhat");

async function main() {
  const contract = await ethers.getContractFactory("StakingPoolNoKYC");

  const stakingPool = contract.attach(process.env.CONTRACT);

  const start = Math.floor(new Date().getTime() / 1000 + 60 * 10);
  const end = start + 2 * 24 * 3600;

  const ratio = ethers.utils.parseUnits("0.000225", 18); //10x the original pool
  const hardCap = ethers.utils.parseUnits("50", "ether");

  console.log(`${ratio} ${hardCap.toString()} ${start} ${end}`);
  console.log(`Start: ${new Date(start * 1000).toLocaleString()} End: ${new Date(end * 1000).toLocaleString()}`);

  const compounded = await stakingPool.compound(ratio, hardCap, start, end);
  const rewards = compounded.sub(hardCap);

  console.log(`Expected rewards to be sent with init ${rewards.toString()} (${ethers.utils.formatEther(rewards)})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
