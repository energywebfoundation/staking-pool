import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { BigNumber, ethers, utils } from "ethers";
import { VOLTA_CHAIN_ID } from "@energyweb/iam-contracts";
import { StorageLayout } from "../types/snapshot.types";

const contractAddress = "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A";

export const formatAmount = (amountInWei: BigNumber) => {
  return Number(utils.formatEther(amountInWei.toString()));
};

export const formatDID = (address: string, chainID: number) => {
  const network = chainID == EW_CHAIN_ID ? "ewc" : "volta";
  return `did:ethr:${network}:${address}`;
};

export const EW_CHAIN_ID = 246;

export const getRpc = (chainID: number) => {
  switch (chainID) {
    case VOLTA_CHAIN_ID:
      return "https://volta-archive-rpc.energyweb.org";
    case EW_CHAIN_ID:
      return "https://archive-rpc.energyweb.org";
    case 1337:
      return "http://127.0.0.1:8545";
    default:
      throw new Error(`${chainID} is not a valid chain Iditifier`);
  }
};

export const formatHex = (data: string) => {
  if (!utils.isHexString(data)) {
    return utils.hexZeroPad(utils.hexValue(data), 32);
  }
  return utils.hexZeroPad(data, 32);
};

export const getSlotNumber = (contractName: string, variableName: string) => {
  const artifactDebugPath = resolve(
    __dirname,
    "../",
    "../",
    "artifacts",
    "contracts",
    `${contractName}.sol`,
    `${contractName}.dbg.json`,
  );
  const artifactDebug = JSON.parse(
    readFileSync(artifactDebugPath, {
      encoding: "utf8",
    }),
  );

  const buildInfosPath = artifactDebug.buildInfo;
  const buildInfos = JSON.parse(
    readFileSync(resolve(__dirname, "../", "../", "artifacts", "build-info", `${getBuildFileName(buildInfosPath)}`), {
      encoding: "utf8",
    }),
  );
  const contractBuildInfos = buildInfos["output"]["contracts"][`contracts/${contractName}.sol`][contractName];
  const storageInfos = contractBuildInfos["storageLayout"]["storage"];
  const stakeMappingStorage = storageInfos.filter(
    (storageInfo: StorageLayout) => storageInfo["label"] === variableName,
  );

  const slotNumber = Number(stakeMappingStorage[0].slot);

  return slotNumber;
};

const getBuildFileName = (buildPath: string) => {
  return buildPath.substring("../../build-info/".length);
};

export const _rpcReadContractSlot = async (
  slotNumber: number,
  stakerAddress: string,
  provider: ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider,
  blockNumber?: number,
  _contractAddress?: string,
) => {
  const formattedSlot = `${formatHex(stakerAddress)}${formatHex(utils.hexValue(slotNumber)).substring(2)}`;
  try {
    const position = ethers.utils.keccak256(formattedSlot);
    const stakeAmount = await provider.getStorageAt(
      _contractAddress || contractAddress,
      position,
      blockNumber || "latest",
    );
    return formatAmount(BigNumber.from(stakeAmount));
  } catch (err) {
    console.log("An error occurred :: ", err);
    return null;
  }
};
