const emoji = require("node-emoji");
const { ethers } = require("hardhat");
const { DateHandler } = require("./dateUtils");

const displayContractInfos = async (_contractName, _contract) => {
  console.log(`\n[ ${_contractName}'s infos ]`);
  console.log(`\tAddress: ${_contract.address}\n`);
};

const parseRole = (roleName) => ethers.utils.namehash(roleName);

const deployContract = async (contractName) => {
  const Contract = await ethers.getContractFactory(contractName);
  try {
    const ownerRole = parseRole("owner.roles.stakingpool.apps.energyweb.iam.ewc");
    const _ownerRole = parseRole("email.roles.verification.apps.energyweb.iam.ewc");
    //const VOLTA_CLAIM_MANAGER_ADDRESS = "0xC3dD7ED75779b33F5Cfb709E0aB02b71fbFA3210"; //dev
    const VOLTA_CLAIM_MANAGER_ADDRESS = "0x561785174DF7f564f2591bA52B253c0F663427aB"; //staging

    const deployedContract = await Contract.deploy(ownerRole, VOLTA_CLAIM_MANAGER_ADDRESS);
    displayContractInfos(contractName, deployedContract);
    console.log(`${emoji.emojify(":large_green_circle:")} ${contractName} deployed`);

    return deployedContract;
  } catch (error) {
    console.log(`${emoji.emojify(":red_circle:")} An error occurred during contract deployment ${error}`);
    return undefined;
  }
};

const initializeContract = async (_deployedContract) => {
  const dateHandler = new DateHandler();

  const start = (await dateHandler.now()) + 42;
  const end = dateHandler.add(1, "months");
  const ratio = ethers.utils.parseUnits("0.0000225", 18);
  const hardCap = ethers.utils.parseUnits("500", "ether");
  const contributionLimit = ethers.utils.parseUnits("5", "ether");
  const patronRoles = [parseRole("email.roles.verification.apps.energyweb.iam.ewc")];
  const rewards = (await _deployedContract.compound(ratio, hardCap, start, end)).sub(hardCap);

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
    console.log(`${emoji.emojify(":large_green_circle:")} Staking Pool initialized \n`);
    console.log("TRansaction >> ", tx);
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
