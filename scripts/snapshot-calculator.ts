import { config } from "dotenv";
import { ethers } from "hardhat";
import { writeFileSync } from "node:fs";
import { Log, JsonRpcProvider } from "@ethersproject/providers";
import { Contract, Wallet, providers, utils } from "ethers";
import { Snapshot } from "./types/snapshot.types";
import { EW_CHAIN_ID, formatDID, _rpcReadContractSlot, getSlotNumber } from "./utils/snapshot.utils";

config();
let stakingContract: Contract;
let failingCalculations: string[] = [];

const STAKES_STORAGE_SLOT = getSlotNumber("StakingPoolPatronKYC", "stakes"); //slot num 12
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeEmoji = require("node-emoji");
const wallet = new Wallet("9d69bf3c7bda0fc771a59818e5a7f894f3b4fbd3114891db3d4de7f46aa71ca8");

const parseEvents = async (stakeLogs: Log[], blockNumber: number) => {
  const stakers: string[] = [];
  await Promise.all(
    stakeLogs.map(async (currentLog) => {
      if (currentLog.blockNumber <= blockNumber) {
        //Removing the padding zeros
        const currentAddress = utils.hexStripZeros(currentLog.topics[1]);
        if (!stakers.includes(currentAddress)) {
          stakers.push(currentAddress);
        }
      }
    }),
  );
  return stakers;
};

const getStakers = async (
  blockNumber: number,
  minStakedAmount: number,
  stakingPoolAddress: string,
  provider: JsonRpcProvider,
) => {
  stakingContract = (await ethers.getContractFactory("StakingPoolPatronKYC", wallet.connect(provider))).attach(
    stakingPoolAddress,
  );
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
  _stakers: string[],
  chainID: number,
  rpcProvider: providers.JsonRpcProvider,
  blockNumber: number,
  minBalance: number,
  _stakingAddress?: string,
) => {
  const _stakingContract = _stakingAddress ? _stakingAddress : process.env.STAKINGPOOL;
  const snapshots: Snapshot[] = [];

  await Promise.all(
    _stakers.map(async (currentAddress) => {
      let stakingAmount = null;
      try {
        do {
          stakingAmount = await _rpcReadContractSlot(
            STAKES_STORAGE_SLOT,
            currentAddress,
            rpcProvider,
            blockNumber,
            _stakingContract,
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
                stakingPoolAddress: _stakingContract as string,
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

export const takeSnapShot = async (
  _contractAddress: string,
  chainID: number,
  blockNumber: number,
  minimumBalance: number,
  provider: providers.JsonRpcProvider,
) => {
  const stakersList = await getStakers(blockNumber, minimumBalance, _contractAddress, provider);
  let snapshotContent = await calculateSnapshot(
    stakersList,
    chainID,
    provider,
    blockNumber,
    minimumBalance,
    _contractAddress,
  );
  //We keep calculating all previously failing snapshots
  while (failingCalculations.length != 0) {
    console.log("Error size :: ", failingCalculations.length);
    const failingSnapshot = await calculateSnapshot(
      failingCalculations,
      EW_CHAIN_ID,
      provider,
      blockNumber,
      minimumBalance,
      _contractAddress,
    );
    snapshotContent = snapshotContent.concat(failingSnapshot);
  }

  const finalSnapshot = [...new Set(snapshotContent)];

  const snapshot = {
    credentialNamespace: "snapshot1.roles.consortiapool.apps.energyweb.iam.ewc",
    credentials: finalSnapshot,
  };
  if (finalSnapshot.length !== 0) {
    const fileName = `stakingSnapshot_${new Date().toJSON()}.json`;
    writeFileSync(`snapshots/${fileName}`, JSON.stringify(snapshot, null, " "));
    return fileName;
  }
  return null;
};
