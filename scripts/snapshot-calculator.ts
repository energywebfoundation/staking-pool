import { config } from "dotenv";
import { ethers } from "hardhat";
import { writeFileSync } from "node:fs";
import { Log, JsonRpcProvider } from "@ethersproject/providers";
import { providers, utils } from "ethers";
import { Snapshot } from "./types/snapshot.types";
import {
  EW_CHAIN_ID,
  formatDID,
  rpcReadContractSlot,
  getSlotNumber,
  getRpcUrl,
  isEnvReady,
} from "./utils/snapshot.utils";

config();
const failingCalculations = new Set<string>();

const STAKES_STORAGE_SLOT = getSlotNumber("StakingPoolPatronKYC", "stakes"); //slot num 12
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeEmoji = require("node-emoji");

const parseEvents = async (stakeLogs: Log[], blockNumber: number) => {
  // const stakers: string[] = [];
  const stakers = new Set<string>();
  await Promise.all(
    stakeLogs.map(async (currentLog) => {
      if (currentLog.blockNumber <= blockNumber) {
        //Removing the padding zeros
        const currentAddress = utils.hexStripZeros(currentLog.topics[1]);
        stakers.add(currentAddress);
      }
    }),
  );
  return [...stakers];
};

const getStakers = async (blockNumber: number, stakingPoolAddress: string, provider: JsonRpcProvider) => {
  const stakingLogs = await provider.getLogs({
    address: stakingPoolAddress,
    topics: ["0x270d6dd254edd1d985c81cf7861b8f28fb06b6d719df04d90464034d43412440"], // Ref of topic corresponding to `StakeAdded` event
    fromBlock: 0,
    toBlock: blockNumber,
  });

  const stakersList = await parseEvents(stakingLogs, blockNumber);

  return stakersList;
};

const calculateSnapshot = async (
  stakers: string[],
  chainID: number,
  rpcProvider: providers.JsonRpcProvider,
  blockNumber: number,
  minBalance: number,
  stakingAddress?: string,
) => {
  const stakingContract = stakingAddress ? stakingAddress : process.env.STAKINGPOOL;
  const snapshots: Snapshot[] = [];

  await Promise.all(
    stakers.map(async (currentAddress) => {
      let stakingAmount = null;
      try {
        do {
          stakingAmount = await rpcReadContractSlot(
            STAKES_STORAGE_SLOT,
            currentAddress,
            rpcProvider,
            blockNumber,
            stakingContract,
          );
          if (stakingAmount === null) {
            nodeEmoji.emojify(":x:", "RPC connection broke ... Recalculate ", currentAddress);
          } else {
            console.log(nodeEmoji.emojify(":white_check_mark:"), currentAddress);
          }
        } while (stakingAmount === null);

        if (Number(stakingAmount) >= minBalance) {
          snapshots.push({
            did: formatDID(currentAddress, chainID),
            issuerFields: [
              {
                stakeAmount: Number(stakingAmount),
                minimumBalance: minBalance,
                snapshotBlock: blockNumber,
                chainId: chainID,
                stakingPoolAddress: stakingContract as string,
              },
            ],
          });
          //We remove this log from failingCalculation array if it is present
          if (failingCalculations.has(currentAddress)) {
            failingCalculations.delete(currentAddress);
          }
        }
        return snapshots;
      } catch (error) {
        console.log(`An error occurred during calculation of snapshot ${currentAddress} ... `);
        // We keep track of all snapshot calculations which fail
        failingCalculations.add(currentAddress);
        console.log("Error log :: ", error);
      }
    }),
  );
  return snapshots;
};

export const takeSnapShot = async (
  contractAddress: string,
  chainID: number,
  blockNumber: number,
  minimumBalance: number,
  provider: providers.JsonRpcProvider,
  credentialNamespace: string,
) => {
  const stakersList = await getStakers(blockNumber, contractAddress, provider);
  let snapshotContent = await calculateSnapshot(
    stakersList,
    chainID,
    provider,
    blockNumber,
    minimumBalance,
    contractAddress,
  );
  //We keep calculating all previously failing snapshots
  while (failingCalculations.size != 0) {
    const failingSnapshot = await calculateSnapshot(
      [...failingCalculations],
      EW_CHAIN_ID,
      provider,
      blockNumber,
      minimumBalance,
      contractAddress,
    );
    snapshotContent = snapshotContent.concat(failingSnapshot);
  }

  const finalSnapshot = [...new Set(snapshotContent)];

  const snapshot = {
    credentialNamespace,
    credentials: finalSnapshot,
  };
  if (finalSnapshot.length !== 0) {
    const fileName = `stakingSnapshot_${new Date().toJSON()}.json`;
    writeFileSync(`snapshots/${fileName}`, JSON.stringify(snapshot, null, " "));
    return fileName;
  }
  return null;
};

if (isEnvReady()) {
  const provider = new providers.JsonRpcProvider(getRpcUrl(EW_CHAIN_ID));
  takeSnapShot(
    String(process.env.STAKINGPOOL),
    EW_CHAIN_ID,
    Number(process.env.SNAPSHOT_BLOCKNUMBER),
    Number(process.env.SNAPSHOT_MIN_BALANCE),
    provider,
    String(process.env.CREDENTIAL_NAME_SPACE),
  )
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
