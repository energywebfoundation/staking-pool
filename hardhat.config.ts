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
  defaultNetwork: "hardhat",
  solidity: {
    version: "0.8.6",
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "evm.methodIdentifiers", "metadata", "storageLayout"],
        },
      },
    },
  },
  networks: {
    volta: {
      url: "https://volta-rpc.energyweb.org",
      chainId: 73799,
      accounts: [deployer_privateKey],
    },
    ewc: {
      url: "https://rpc.energyweb.org",
      chainId: 246,
      accounts: [deployer_privateKey],
      gasPrice: 1000000000,
    },
    hardhat: {
      mining: {
        auto: false,
        interval: [1000, 2000],
      },
      gasPrice: 1000000000,
    },
  },
  typechain: {
    outDir: "ethers",
    target: "ethers-v5",
  },
};
