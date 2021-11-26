const { deployContract, initializeContract } = require("./utils/deployUtils");

async function main() {
  const stakingPoolContract = await deployContract("StakingPool");
  if (stakingPoolContract) {
    await initializeContract(stakingPoolContract);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
