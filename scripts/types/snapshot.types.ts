export type Snapshot = {
  did: string;
  issuerFields: [
    {
      chainId: number;
      stakeAmount: number;
      stakingDate?: number;
      snapshotBlock?: number;
      minimumBalance: number;
      transactionHash?: string;
      stakingPoolAddress: string;
    },
  ];
};

export type StorageLayout = {
  astId: number;
  contract: string;
  label: string;
  offset: number;
  slot: string;
  type: string;
};
