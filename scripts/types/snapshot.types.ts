export type Snapshot = {
  did: string;
  issuerFields: [
    {
      chainId: number;
      stakeAmount: number;
      stakingDate?: number;
      snapshotBlock: number;
      minimumBalance: number;
      transactionHash?: string;
      stakingPoolAddress: string;
    },
  ];
};

export type StakingLog = {
  address: string;
  blockNumber: number;
  transactionHash: string;
};
