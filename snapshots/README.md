## Snapshot Calculator

The `snapshot-calculator.ts` script inside the `scripts` folder generates a JSON file providing a `snapshot` (i.e a list of DIDs with a given staking amount on a precise block number).

To run the script, you can either:
- import `takeSnapshot` function and call it with the required parameters;
- provide the required `snapshot parameters` inside the `.env` file :

- `PRIV_KEY`: The private key of the wallet from which to query the `staking contract`.

- `SNAPSHOT_MIN_BALANCE`: The minimal amount that one must have staked be taken included in the current snapshot.
- `STAKINGPOOL`: The address of the `staking contract`.
- `SNAPSHOT_BLOCKNUMBER`: The height of the block on which you want to get the snapshot.

#### Content of the .env file
```
PRIV_KEY = <Wallet_private_key>
SNAPSHOT_START_BLOCK = 17810000
SNAPSHOT_END_BLOCK = 17816744
SNAPSHOT_MIN_BALANCE = 1500
SNAPSHOT_BLOCKNUMBER = 16934055
STAKINGPOOL = "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A"
```

To run the `snapshot-calculator` script from your terminal, type the following command :

```javascript
npm run snapshots:calculate
```
> Note that this script can take some time to query and filter all the transactions according to the `snapshot parameters`

The created JSON file will be named `stakingSnapshot_<UTC_DATE_TIME>.json` and will have the following structure :

```json
{
 "credentialNamespace": "snapshot1.roles.consortiapool.apps.energyweb.iam.ewc",
 "credentials": [
  {
   "did": "did:ethr:ewc:0x...90a307eedd4d3dd887873d20d265...",
   "issuerFields": [
    {
     "stakeAmount": 2006.09,
     "minimumBalance": 1500,
     "snapshotBlock": 17813339,
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
     "snapshotBlock": 17813339,
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
     "snapshotBlock": 17813339,
     "chainId": 246,
     "stakingPoolAddress": "0x181A8b2a5AEb25941F6A79b4aE43dBb1968c417A",
    }
   ]
  }
 ]
}
```