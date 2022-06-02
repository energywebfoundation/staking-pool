# Staking Pool v1

This repository contains the implementation of the staking pool with hourly compounding, hardcap, contribution limits and expiry date.

## Implementation details

## Lifecycle

Staking pool can be in one of these states during it's lifetime :
```
Deployed --> Initialized --> Open --> Expired --> Swept
``` 

Transitions
```
Deployed - smart contract deployed to the network or terminate() called when in Initialized state

Initialized - init() function executed

Open - block.timestamp >= start

Expired - block.timestamp >= end

Swept - sweep() function executed
```

State vs staking pool operations

|             | Rewards locked | Staking | Unstaking | Compounding |
|-------------|----------------|---------|-----------|-------------|
| Deployed    | No             | No      | No        | No          |
| Initialized | Yes            | No      | No        | No          |
| Open        | Yes            | Yes     | Yes       | Yes         |
| Expired     | Yes            | No      | Yes       | No          |
| Swept       | No             | No      | Yes       | No          |


### Compounding
Our implementation is using linear compounding function 

```
compounded = compounded * (1+ratio)**n

compounded: deposit+compounded rewards
ratio:      hourly compounding ratio
n:          amount of hourly intervals
```
Power function used in the compounding equation comes from [ABDKMath64x64](https://github.com/energywebfoundation/staking-pool/blob/eeefbaf4063f3b0868c4ad0d45933e6cb36315c5/contracts/libs/ABDKMath64x64.sol#L16)solidity math library. 

To keep the smart contract state minimal, `Stake` struct in the `stakes` mapping keeps compounded value that is being updated on every additional stake and unstake function calls, in other words in any function that changes the `stake.deposit`.
 > `mapping(address => Stake) public stakes;`

### Funding
Our staking pool requires the owner to provide the funds to cover all potential rewards given `hardCap`, `ratio` and staking pool time dimension.

The equation for total future rewards is:

```
maxFutureRewards = hardCap - hardCap * compound(1+ratio)**((end-start)/1 hour)
```

### Sweeping after expiry

Since the funding requires maximum amount of rewards to be provided the sweeping functionality is required for staking pool owner to reclaim unnecessary funds. 

`Sweep` can only be called by `owner` after reaching staking pool expiry, where compounding has stopped and thus total amount of rewards is fixed.

We define unnecessary funds as the difference between `maxFutureRewards` and rewards at the staking pool expiry.

> 
> remainingRewards = maxFutureRewards - sum(withdrawnRewards)
> 
> sweepAmount(t == end) = remainingRewards - sum(stakedRewards)
> 
> sweepAmount(t) = maxFutureRewards - sum(withdrawnRewards(t)) - sum(stakedRewards(t))
> 



## Building

In order to build after a successful `clone`:

* npm install
* npm run compile

## Testing

* npm run test

## Local deployment

* npm run deploy:dev

## Volta deployment steps

* Create a `.env` file and set the variable
>DEPLOYER_PRIV_KEY = <private_key>
* Make sure the corresponding address has enough funds on `Volta` testnet. If needed, get some `Volta tokens (VT) ` on [Volta faucet](https://voltafaucet.energyweb.org/).

* run following command
> `npm deploy:volta`

## Snapshot Calculator

The `snapshot-calculator.ts` script inside the `scripts` folder generates a JSON file providing a `snapshot` (i.e a list of DIDs with a given staking on a certain day).

Before running the script, make sure to provide the following `snapshot parameters` inside the `.env` file :

- `PRIV_KEY`: The private key of the wallet from which to query the `staking contract`.
- `SNAPSHOT_START_BLOCK`: the blocknumber representing a the beginning of the scope of the current snapshot
- `SNAPSHOT_END_BLOCK`: the blocknumber representing a the end of the scope of the current snapshot
- `SNAPSHOT_MIN_BALANCE`: The minimal amount that should be taken in account for the current snapshot
- `STAKINGPOOL`: The address of the `staking contract`.

If those values are not set in the `.env`, default values will be given to those variable inside the script in the `initSnapshot` function.

#### Content of the .env file
```
PRIV_KEY = <Wallet_private_key>
SNAPSHOT_START_BLOCK = 17810000
SNAPSHOT_END_BLOCK = 17816744
SNAPSHOT_MIN_BALANCE = 1500
STAKINGPOOL = "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A"
```

To run the `snapshot-calculator` script, enter the following command in your terminal :

```javascript
npm run snapshots:calculate
```
> Note that this script can take some time to query and filter all the transactions according to the `snapshot parameters`

The created JSON file will be named `stakingSnapshot_<UTC_DATE_TIME>.json` and will have the following structure :

```json
{
 "credentialNamespace": "snapshot1.roles.consortiapool.apps.energyweb.iam.ewc",
 "snapshotBlock": 17813339,
 "credentials": [
  {
   "did": "did:ethr:ewc:0x...90a307eedd4d3dd887873d20d265...",
   "issuerFields": [
    {
     "stakeAmount": 2006.09,
     "minimumBalance": 1500,
     "chainId": 246,
     "stakingPoolAddress": "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A",
    }
   ]
  },
  {
   "did": "did:ethr:ewc:0x....ac1604452b7e9683ad82474b746a0cfe....",
   "issuerFields": [
    {
     "stakeAmount": 3000,
     "minimumBalance": 1500,
     "chainId": 246,
     "stakingPoolAddress": "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A",
    }
   ]
  },
  {
   "did": "did:ethr:ewc:0x....6ccf13df603a210a413bc2d0910c4317....",
   "issuerFields": [
    {
     "stakeAmount": 3000,
     "minimumBalance": 1500,
     "chainId": 246,
     "stakingPoolAddress": "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A",
    }
   ]
  }
 ]
}
```