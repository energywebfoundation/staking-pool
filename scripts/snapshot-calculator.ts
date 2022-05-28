import { config } from "dotenv";
import { ethers } from "hardhat";
import { writeFileSync } from "node:fs";
import { Log } from "@ethersproject/providers";
import { Contract, Wallet, providers } from "ethers";
import { Snapshot } from "./types/snapshot.types";
import { getRpc, EW_CHAIN_ID, formatDID, _rpcReadContractSlot } from "./utils/snapshot.utils";

config();
let stakingContract: Contract;
let failingCalculations: string[] = [];

const STAKES_STORAGE_SLOT = 12;
const snapshots: Snapshot[] = [];
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeEmoji = require("node-emoji");
const wallet = new Wallet(`${process.env.PRIV_KEY}`);
const blockNumber = Number(process.env.SNAPSHOT_BLOCKNUMBER);
const minBalance = Number(process.env.SNAPSHOT_MIN_BALANCE) || 10;
const stakingAddress = process.env.STAKINGPOOL || "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A";

const parseEvents = async (stakeLogs: Log[]) => {
  const stakers: string[] = [];
  await Promise.all(
    stakeLogs.map(async (currentLog) => {
      if (currentLog.blockNumber <= blockNumber) {
        //Removing the padding zeros
        const currentAddress = `0x${currentLog.topics[1].substring(26)}`;
        if (!stakers.includes(currentAddress)) {
          stakers.push(currentAddress);
        }
      }
    }),
  );
  return stakers;
};

const getStakers = async (blockNumber: number, minStakedAmount: number, stakingPoolAddress: string, provider: any) => {
  stakingContract = (await ethers.getContractFactory("StakingPool", wallet.connect(provider))).attach(
    stakingPoolAddress,
  );

  const stakingLogs = await provider.getLogs({
    address: stakingPoolAddress,
    topics: ["0x270d6dd254edd1d985c81cf7861b8f28fb06b6d719df04d90464034d43412440"], // Ref of topic corresponding to `StakeAdded` event
    fromBlock: 0,
    toBlock: blockNumber,
  });

  const stakersList = await parseEvents(stakingLogs);

  return stakersList;
};

const calculateSnapshot = async (
  _stakers: string[],
  chainID: number,
  rpcProvider: providers.JsonRpcProvider,
  blockNumber: number,
) => {
  await Promise.all(
    _stakers.map(async (currentAddress) => {
      let stakingAmount = null;
      try {
        do {
          stakingAmount = await _rpcReadContractSlot(STAKES_STORAGE_SLOT, currentAddress, rpcProvider, blockNumber);
          if (stakingAmount === null) {
            nodeEmoji.emojify(":x:", "RPC connection broke ... Recalculate ", currentAddress);
          } else {
            console.log(nodeEmoji.emojify(":white_check_mark:"), currentAddress);
          }
        } while (stakingAmount === null);

        if (stakingAmount >= minBalance) {
          snapshots.push({
            did: formatDID(currentAddress, chainID),
            issuerFields: [
              {
                stakeAmount: Number(stakingAmount),
                minimumBalance: minBalance,
                chainId: chainID,
                stakingPoolAddress: stakingAddress,
              },
            ],
          });
          //We remove this log from failingCalculation array if it is present
          if (failingCalculations.includes(currentAddress)) {
            failingCalculations = failingCalculations.filter((addr) => {
              return addr !== currentAddress;
            });
          }
        }
        return snapshots;
      } catch (error) {
        console.log(`An error occurred during calculation of snapshot ${currentAddress} ... `);
        // We keep track of all transactions which fail
        if (!failingCalculations.includes(currentAddress)) {
          failingCalculations.push(currentAddress);
        }
        console.log("Error log :: ", error);
      }
    }),
  );
  return snapshots;
};

export const takeSnapShot = async (chainID: number, blockNumber: number, minimumBalance: number) => {
  const rpcUrl = getRpc(chainID);
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const stakersList = await getStakers(blockNumber, minimumBalance, stakingAddress, provider);

  let snapshotContent = await calculateSnapshot(stakersList, EW_CHAIN_ID, provider, blockNumber);
  //We keep calculating all previously failing snapshots
  while (failingCalculations.length != 0) {
    console.log("Error size :: ", failingCalculations.length);
    const failingSnapshot = await calculateSnapshot(failingCalculations, EW_CHAIN_ID, provider, blockNumber);
    snapshotContent = snapshotContent.concat(failingSnapshot);
  }

  const snapshot = {
    credentialNamespace: "snapshot1.roles.consortiapool.apps.energyweb.iam.ewc",
    snaphotBlock: blockNumber,
    credentials: [...new Set(snapshotContent)],
  };
  writeFileSync(`snapshots/stakingSnapshot_${new Date().toJSON()}.json`, JSON.stringify(snapshot, null, " "));
};

takeSnapShot(EW_CHAIN_ID, blockNumber, minBalance)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
