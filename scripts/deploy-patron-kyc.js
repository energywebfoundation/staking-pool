const prompt = require("prompt-sync")();

const emoji = require("node-emoji");
const { ethers } = require("hardhat");

const displayContractInfos = async (_contractName, _contract) => {
  console.log(`\n[ ${_contractName}'s infos ]`);
  console.log(`\tAddress: ${_contract.address}\n`);
};

const deployContract = async (contractName) => {
  const answer = prompt("Deploy? (Y/n)");

  if (answer === "n") {
    process.exit(0);
  }

  const Contract = await ethers.getContractFactory(contractName);

  // const initiator = "0x7aB78e40666E18fB8bA9998f2A8201257e6890de";
  const VOLTA_CLAIM_MANAGER_ADDRESS = "0x23b026631A6f265d17CFee8aa6ced1B244f3920C";

  const initiator = "0x935b00BdF181C207D954E97Dbb1197E83366fd49"; //Gnosis Multisig Wallet

  try {
    const deployedContract = await Contract.deploy(initiator, VOLTA_CLAIM_MANAGER_ADDRESS);
    displayContractInfos(contractName, deployedContract);
    console.log(`${emoji.emojify(":large_green_circle:")} ${contractName} deployed`);

    return deployedContract;
  } catch (error) {
    console.log(`${emoji.emojify(":red_circle:")} An error occurred during contract deployment ${error}`);
    return undefined;
  }
};

//current staking 2 contract --> 	Address: 0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A
const initializeContract = async (_deployedContract) => {
  const start = 1647630000; //18/03/2022 - 20:00:00
  const end = 1671390000; //18/12/2022 - 20:00:0
  const ratio = ethers.utils.parseUnits("0.00001125", 18);

  const hardCap = ethers.utils.parseUnits("7500000", "ether");
  const contributionLimit = ethers.utils.parseUnits("3000", "ether");

  // const patronRoles = [ethers.utils.namehash("email.roles.verification.apps.energyweb.iam.ewc")]; //on volta
  const patronRoles = [ethers.utils.namehash("email.roles.verification.apps.energyweb.auth.ewc")]; // EWC

  const rewards = (await _deployedContract.compound(ratio, hardCap, start, end)).sub(hardCap);

  console.log(
    `Init params: start=${start} end=${end} ratio=${ratio} hardCap=${hardCap} limit=${contributionLimit} patronRoles=${patronRoles} value=${rewards.toString()} valueEWC=${ethers.utils.formatEther(
      rewards,
    )}`,
  );

  const answer = prompt("Init? (Y/n)");

  if (answer === "n") {
    process.exit(0);
  }

  try {
    const tx = await _deployedContract.init(
      //require owner to be enrolled in claimManager
      start,
      end,
      ratio,

      hardCap,
      contributionLimit,
      patronRoles,
      { value: rewards },
    );

    console.log("Transaction >> ", tx.hash);

    await tx.wait();

    console.log(
      `${emoji.emojify(":large_green_circle:")} Staking Pool ${_deployedContract.address} initialized start: ${new Date(
        start * 1000,
      ).toLocaleString()} end: ${new Date(end * 1000).toLocaleString()} \n`,
    );
  } catch (error) {
    console.log(
      `\n${emoji.emojify(":red_circle:")} An error occurred during contract initialization :\n\t ==> ${error}`,
    );
  }
};

module.exports = {
  deployContract,
  initializeContract: initializeContract,
};

async function main() {
  if (process.env.CONTRACT) {
    const Contract = await ethers.getContractFactory("StakingPoolPatronKYC");
    const stakingPoolContract = Contract.attach(process.env.CONTRACT);

    await initializeContract(stakingPoolContract);
  } else {
    const stakingPoolContract = await deployContract("StakingPoolPatronKYC");

    if (stakingPoolContract) {
      await initializeContract(stakingPoolContract);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
