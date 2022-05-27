import { BigNumber, ethers, utils } from "ethers";
import { VOLTA_CHAIN_ID } from "@energyweb/iam-contracts";

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
      return "https://volta-rpc.energyweb.org";
    case EW_CHAIN_ID:
      return "https://archive-rpc.energyweb.org";
    default:
      throw new Error(`${chainID} is not a Chain Iditifier`);
  }
};

export const formatHex = (data: string) => {
  if (!utils.isHexString(data)) {
    return utils.hexZeroPad(utils.hexValue(data), 32);
  }
  return utils.hexZeroPad(data, 32);
};

export const _rpcReadContractSlot = async (
  slotNumber: number,
  stakerAddress: string,
  provider: ethers.providers.JsonRpcProvider,
  blockNumber?: number,
) => {
  const formattedSlot = `${formatHex(stakerAddress)}${formatHex(utils.hexValue(slotNumber)).substring(2)}`;
  try {
    const position = ethers.utils.keccak256(formattedSlot);
    const stakeAmount = await provider.getStorageAt(contractAddress, position, blockNumber || "latest");
    return formatAmount(BigNumber.from(stakeAmount));
  } catch (err) {
    return null;
  }
};
