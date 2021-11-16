import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

// noinspection JSValidateJSDoc
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.6",
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 5000,
      },
    },
  },
  typechain: {
    outDir: "ethers",
    target: "ethers-v5",
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: [
      "artifacts/contracts/kyc-token.sol/KycToken.json",
      "artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json",
      "artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json",
      "artifacts/@openzeppelin/contracts/access/Ownable.sol/Ownable.json",
      "artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json",
      "artifacts/@openzeppelin/contracts/utils/Context.sol/Context.json",
    ], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  },
};
