import "@typechain/hardhat";
import dotenv from "dotenv";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
require("solidity-coverage");
import { defaultAccounts } from "@ethereum-waffle/provider";

dotenv.config();

const deployer_privateKey = process.env.DEPLOYER_PRIV_KEY || defaultAccounts[0].secretKey;

// noinspection JSValidateJSDoc
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 20000,
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 5000,
      },
    },
    volta: {
      url: "https://volta-rpc.energyweb.org",
      chainId: 73799,
      accounts: [deployer_privateKey],
    },
  },
  typechain: {
    outDir: "ethers",
    target: "ethers-v5",
  },
};
