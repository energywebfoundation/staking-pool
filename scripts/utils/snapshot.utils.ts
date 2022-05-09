import { BigNumber, utils } from "ethers";
import { VOLTA_CHAIN_ID } from "@energyweb/iam-contracts";

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
      break;
    case EW_CHAIN_ID:
      return "https://rpc-i7tg65ri67rf.energyweb.org";
      break;
    default:
      throw new Error(`${chainID} is not a Chain Iditifier`);
  }
};
