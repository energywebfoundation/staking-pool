// Scenario: Generate list of DIDs which can get snapshot
// Given a blocknumber representing a specific blocknumber
// And a minimum required staked amount
// And a staking pool contract address
// And a chain identifier
// When admin triggers the script with these parameters
// Then a JSON file is output with:
//   1. The parameters of the script (e.g. minimum balance, snapshot time)
//   2. The list of DIDs and their stake amount

import { config } from "dotenv";
import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { Contract, Wallet } from "ethers";
import { Log } from "@ethersproject/providers";
import { Snapshot, StakingLog } from "./types/snapshot.types";
import { formatAmount, getRpc, EW_CHAIN_ID, formatDID } from "./utils/snapshot.utils";

config();
let stakingContract: Contract;

const minBalance = Number(process.env.SNAPSHOT_MIN_BALANCE) || 700;
const wallet = new Wallet(`${process.env.PRIV_KEY}`);
const stakingAddress = "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A";

const stakers: Snapshot[] = [];
let failingCalculations: StakingLog[] = [];

const parseEvents = async (logs: Log[]) => {
  const stakingLogs: StakingLog[] = [];
  await Promise.all(
    logs.map(async (log) => {
      //Removing the padding zeros
      const currentAddress = `0x${log.topics[1].substring(26)}`;
      const currentLog = {
        address: currentAddress,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };

      //Rretrieving addresses and avoiding dupplication
      if (!stakingLogs.includes(currentLog)) {
        stakingLogs.push(currentLog);
      }
    }),
  );
  return stakingLogs;
};

const getStakers = async (
  fromBlockNumber: number,
  toBlockNumber: number,
  minStakedAmount: number,
  stakingPoolAddress: string,
  provider: any,
) => {
  stakingContract = (await ethers.getContractFactory("StakingPool", wallet.connect(provider))).attach(
    stakingPoolAddress,
  );

  console.log(`
    fromBlockNumber :: ${fromBlockNumber}
    toBlockNumber :: ${toBlockNumber}
    Minimal Staked Amount :: ${minStakedAmount}
    StakingPool Address :: ${stakingPoolAddress}
  `);

  const logs = await provider.getLogs({
    address: stakingPoolAddress,
    topics: ["0x270d6dd254edd1d985c81cf7861b8f28fb06b6d719df04d90464034d43412440"], // Ref of topic corresponding to `StakeAdded` event
    fromBlock: fromBlockNumber,
    toBlock: toBlockNumber,
  });

  const allStakers = await parseEvents(logs);

  return allStakers;
};

const calculateSnapshot = async (_stakers: StakingLog[], chainID: number) => {
  await Promise.all(
    _stakers.map(async (currentLog) => {
      const currentAddress = currentLog.address;
      const currentBlock = currentLog.blockNumber;
      try {
        const currentStake = await stakingContract.stakes(currentAddress);
        const stakingAmount = formatAmount(currentStake.deposit);

        if (stakingAmount >= minBalance) {
          stakers.push({
            did: formatDID(currentAddress, chainID),
            issuerFields: [
              {
                stakeAmount: stakingAmount,
                minimumBalance: minBalance,
                snapshotBlock: currentBlock,
                chainId: chainID,
                stakingPoolAddress: stakingAddress,
                stakingDate: Number(currentStake.time.toString()),
                transactionHash: currentLog.transactionHash,
              },
            ],
          });
        }
        //We remove this log from failingCalculation array if it is present
        if (failingCalculations.includes(currentLog)) {
          failingCalculations = failingCalculations.filter((log) => {
            return log.address !== currentLog.address;
          });
        }
        return stakers;
      } catch (error) {
        console.log(`An error occurred during calculation of snapshot ${currentAddress} ...`);
        //We keep track of all transactions which fail
        if (!failingCalculations.includes(currentLog)) {
          failingCalculations.push(currentLog);
        }
        console.log("Error log :: ", error);
      }
    }),
  );
  return stakers;
};

const initSnapshot = async (rpcUrl: string) => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const fromBlock = Number(process.env.SNAPSHOT_START_BLOCK) || 0;
  const minimumBalance = Number(process.env.SNAPSHOT_MIN_BALANCE) || minBalance;
  const stakingPoolAddress = process.env.STAKINGPOOL || stakingAddress;
  const toBlock = Number(process.env.SNAPSHOT_END_BLOCK) || (await provider.getBlockNumber());

  return {
    toBlock,
    provider,
    fromBlock,
    minimumBalance,
    stakingPoolAddress,
  };
};

const takeSnapShot = async (chainID: number) => {
  const rpcUrl = getRpc(chainID);
  const { toBlock, fromBlock, provider, minimumBalance } = await initSnapshot(rpcUrl);

  const stakerList = await getStakers(fromBlock, toBlock, minimumBalance, stakingAddress, provider);

  let snapshotContent = await calculateSnapshot(stakerList, EW_CHAIN_ID);
  //We keep calculating all previously failing snapshots
  while (failingCalculations.length != 0) {
    const failingSnapshot = await calculateSnapshot(failingCalculations, EW_CHAIN_ID);
    snapshotContent = snapshotContent.concat(failingSnapshot);
  }

  const snapshot = {
    credentialNamespace: "snapshot1.roles.consortiapool.apps.energyweb.iam.ewc",
    credentials: [...new Set(snapshotContent)],
  };
  writeFileSync(`stakingSnapshot_${new Date().toJSON()}.json`, JSON.stringify(snapshot, null, " "));
};

takeSnapShot(EW_CHAIN_ID)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
