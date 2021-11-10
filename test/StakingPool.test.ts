import { expect, use } from "chai";
import {
  deployContract,
  loadFixture,
  MockProvider,
  solidity,
} from "ethereum-waffle";
import StakePoolContract from "../artifacts/contracts/StakingPool.sol/StakingPool.json";
import { StakingPool } from "../src/types";
import { Wallet, utils, BigNumber } from "ethers";

use(solidity);

describe("Staking Pool", function () {
  const oneEWT = utils.parseUnits("1", "ether");

  const hardCap = oneEWT.mul(5000000);
  const contributionLimit = oneEWT.mul(50000);

  const rewards = oneEWT.mul(11);

  const ratio = 0.0000225;
  const ratioInt = utils.parseUnits(ratio.toString(), 18); // ratio as 18 digit number

  const timeTravel = async (provider: MockProvider, seconds: number) => {
    await provider.send("evm_increaseTime", [seconds]);
    await provider.send("evm_mine", []);
  };

  async function fixture(
    hardCap: BigNumber,
    start: number,
    [owner, patron1, patron2]: Wallet[],
    provider: MockProvider
  ) {
    const duration = 3600 * 24 * 30;
    const end = start + duration;

    const stakingPool = (await deployContract(
      owner,
      StakePoolContract,
      [owner.address, start, end, ratioInt, hardCap, contributionLimit],
      { value: rewards }
    )) as StakingPool;

    // travel to staking event start
    await timeTravel(provider, 10);

    return {
      stakingPool,
      patron1,
      patron2,
      asPatron1: stakingPool.connect(patron1),
      asPatron2: stakingPool.connect(patron2),
      provider,
      duration,
    };
  }

  async function defaultFixture(wallets: Wallet[], provider: MockProvider) {
    const { timestamp } = await provider.getBlock("latest");
    const start = timestamp + 10;

    return fixture(hardCap, start, wallets, provider);
  }

  describe("Staking", async () => {
    it(`can stake funds`, async function () {
      const { stakingPool, patron1, asPatron1, provider } = await loadFixture(
        defaultFixture
      );

      const tx = await asPatron1.stake({
        value: oneEWT,
      });

      const receipt = await tx.wait();

      const { timestamp } = await provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(stakingPool, "StakeAdded")
        .withArgs(patron1.address, oneEWT, timestamp);

      const [stake, compounded] = await asPatron1.total();

      expect(stake).to.be.equal(compounded);
      expect(stake).to.be.equal(oneEWT);
    });

    it(`can stake funds multiple times`, async function () {
      const { asPatron1 } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await asPatron1.stake({
        value: oneEWT,
      });

      const [stake, compounded] = await asPatron1.total();

      expect(stake).to.be.equal(compounded);
      expect(stake).to.be.equal(oneEWT.mul(2));
    });

    it("should increase the balance of the staking pool", async function () {
      const { stakingPool, asPatron1 } = await loadFixture(defaultFixture);

      await expect(
        await asPatron1.stake({
          value: oneEWT,
        })
      ).to.changeEtherBalance(stakingPool, oneEWT);
    });

    it("should revert when staking pool reached the hard cap", async function () {
      const hardCap = utils.parseUnits("2", "ether");
      const { asPatron1, asPatron2 } = await loadFixture(
        async (wallets: Wallet[], provider: MockProvider) => {
          const { timestamp } = await provider.getBlock("latest");
          const start = timestamp + 10;
          return fixture(hardCap, start, wallets, provider);
        }
      );

      await asPatron1.stake({
        value: oneEWT.mul(2),
      });

      await expect(
        asPatron2.stake({
          value: oneEWT,
        })
      ).to.be.revertedWith("Staking pool is full");
    });

    it(`should revert when stake is greater than contribution limit`, async function () {
      const { asPatron1 } = await loadFixture(defaultFixture);

      const patronStake = utils.parseUnits("50001", "ether");

      await expect(
        asPatron1.stake({
          value: patronStake,
        })
      ).to.be.revertedWith("Stake greater than contribution limit");
    });

    it("should revert when staking pool has not yet started", async function () {
      const { asPatron1 } = await loadFixture(
        async (wallets: Wallet[], provider: MockProvider) => {
          const { timestamp } = await provider.getBlock("latest");
          const start = timestamp + 100; //future
          return fixture(hardCap, start, wallets, provider);
        }
      );

      await expect(
        asPatron1.stake({
          value: oneEWT,
        })
      ).to.be.revertedWith("Staking pool not yet started");
    });

    it("should revert when staking pool already expired", async function () {
      const { asPatron1, duration, provider } = await loadFixture(
        defaultFixture
      );

      await timeTravel(provider, duration + 1);

      await expect(
        asPatron1.stake({
          value: oneEWT,
        })
      ).to.be.revertedWith("Staking pool already expired");
    });

    it("should not compound stake after reaching expiry date", async function () {
      const { asPatron1, duration, provider } = await loadFixture(
        defaultFixture
      );

      await asPatron1.stake({
        value: oneEWT,
      });

      await timeTravel(provider, duration + 1);

      const [stake, compounded] = await asPatron1.total();

      expect(compounded.gt(stake)).to.be.true;

      await timeTravel(provider, duration + 1);

      const [stakeAfterExpiry, compoundedAfterExpiry] = await asPatron1.total();

      expect(stakeAfterExpiry).to.be.equal(stake);
      expect(compoundedAfterExpiry).to.be.equal(compounded);
    });
  });

  describe("Unstaking", async () => {
    it(`can unstake funds`, async function () {
      const { patron1, asPatron1 } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await expect(await asPatron1.unstakeAll()).to.changeEtherBalance(
        patron1,
        oneEWT
      );

      const [stake, compounded] = await asPatron1.total();

      expect(stake).to.be.equal(BigNumber.from(0));
      expect(compounded).to.be.equal(BigNumber.from(0));
    });

    it("should decrease the balance of the staking pool", async function () {
      const { stakingPool, asPatron1 } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await expect(await asPatron1.unstakeAll()).to.changeEtherBalance(
        stakingPool,
        oneEWT.mul(-1)
      );
    });

    it("should revert when no funds staked before", async function () {
      const { asPatron1, asPatron2 } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await expect(asPatron2.unstakeAll()).to.be.revertedWith(
        "No stake available"
      );
    });
  });

  it(`maximum compound precision error should not result in error greater than 1 cent`, async function () {
    const { stakingPool, duration } = await loadFixture(defaultFixture);

    const oneCent = utils.parseUnits("0.001", "ether");

    const patronStake = 50000;
    const patronStakeWei = utils.parseUnits(patronStake.toString(), "ether");

    const periods = duration / 3600;

    const compounded = await stakingPool.compound(
      patronStakeWei,
      ratioInt,
      periods
    );

    const expectedCompounded = patronStake * Math.pow(1 + ratio, periods);
    const expected = utils.parseUnits(expectedCompounded.toString(), 18);
    const diff = compounded.sub(expected).abs().toNumber();

    expect(diff).to.be.lessThanOrEqual(oneCent.toNumber());
  });
});
