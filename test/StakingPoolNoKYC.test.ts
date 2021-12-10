import { expect, use } from "chai";
import { StakingPool } from "../ethers";
import { Wallet, utils, BigNumber } from "ethers";
import { deployContract, loadFixture, MockProvider, solidity } from "ethereum-waffle";
import StakingPoolContract from "../artifacts/contracts/StakingPoolNoKYC.sol/StakingPoolNoKYC.json";

use(solidity);

describe("Staking Pool No KYC", function () {
  const oneEWT = utils.parseUnits("1", "ether");

  const hardCap = oneEWT.mul(5000000);
  const contributionLimit = oneEWT.mul(50000);

  const ratio = 0.0000225;
  const ratioInt = utils.parseUnits(ratio.toString(), 18); // ratio as 18 digit number

  const timeTravel = async (provider: MockProvider, seconds: number) => {
    await provider.send("evm_increaseTime", [seconds]);
    await provider.send("evm_mine", []);
  };

  async function stakeAndTravel(stakingPool: StakingPool, value: BigNumber, seconds: number, provider: any) {
    await stakingPool.stake({ value });
    await timeTravel(provider, seconds);
  }

  async function fixture(
    hardCap: BigNumber,
    start: number,
    [owner, owner2, patron1, patron2]: Wallet[],
    provider: MockProvider,
    initializePool = true,
    travel = true,
  ) {
    const duration = 3600 * 24 * 30;
    const end = start + duration;

    const stakingPool = (await deployContract(owner, StakingPoolContract, [owner.address])) as StakingPool;

    const rewards = (await stakingPool.compound(ratioInt, hardCap, start, end)).sub(hardCap);

    if (initializePool) {
      const asOwner = stakingPool.connect(owner);
      try {
        const tx = await asOwner.init(start, end, ratioInt, hardCap, contributionLimit, [], {
          value: rewards,
        });
        const { blockNumber } = await tx.wait();
        const { timestamp } = await provider.getBlock(blockNumber);
        await expect(tx).to.emit(stakingPool, "StakingPoolInitialized").withArgs(rewards, timestamp);

        // travel to staking event start
        if (travel) {
          const travelTo = start - timestamp;
          await timeTravel(provider, travelTo);
        }
      } catch (error) {
        console.log("Initialization Error: ");
        console.log(error);
      }
    }

    return {
      stakingPool,
      patron1,
      patron2,
      owner,
      asPatron1: stakingPool.connect(patron1),
      asPatron2: stakingPool.connect(patron2),
      asOwner: stakingPool.connect(owner),
      asOwner2: stakingPool.connect(owner2),
      provider,
      duration,
      start,
      end,
      hardCap,
      rewards,
    };
  }

  async function defaultFixture(wallets: Wallet[], provider: MockProvider) {
    const { timestamp } = await provider.getBlock("latest");
    const start = timestamp + 10;

    return fixture(hardCap, start, wallets, provider);
  }

  async function initNoTravelFixture(wallets: Wallet[], provider: MockProvider) {
    const { timestamp } = await provider.getBlock("latest");
    const start = timestamp + 10;

    return fixture(hardCap, start, wallets, provider, true, false);
  }

  async function uninitializedFixture(wallets: Wallet[], provider: MockProvider) {
    const { timestamp } = await provider.getBlock("latest");
    const start = timestamp + 10;

    return fixture(hardCap, start, wallets, provider, false);
  }

  async function initialStakeAndTravelToExpiryFixture(wallets: Wallet[], provider: MockProvider) {
    const { timestamp } = await provider.getBlock("latest");
    const start = timestamp + 10;

    const setup = await fixture(hardCap, start, wallets, provider);
    const { asPatron1, duration } = setup;

    await stakeAndTravel(asPatron1, oneEWT, duration, setup.provider);

    return setup;
  }

  it("should revert when contribution limit is higher than hardCap", async function () {
    const { asOwner, end, rewards, start } = await loadFixture(uninitializedFixture);
    const wrongContributionLimit = hardCap.add(1);

    await expect(
      asOwner.init(start, end, ratioInt, hardCap, wrongContributionLimit, [], {
        value: rewards,
      }),
    ).to.be.revertedWith("hardCap exceeded");
  });

  it("should revert when init rewards are lower than max future rewards", async function () {
    const { asOwner, start, end, hardCap, rewards } = await loadFixture(uninitializedFixture);

    const smallerRewards = rewards.sub(1);

    await expect(
      asOwner.init(start, end, ratioInt, hardCap, contributionLimit, [], { value: smallerRewards }),
    ).to.be.revertedWith("Rewards lower than expected");
  });

  it("should allow to terminate staking pool before it reaches the start", async function () {
    const { owner, asOwner, rewards } = await loadFixture(initNoTravelFixture);

    await expect(await asOwner.terminate()).to.changeEtherBalance(owner, rewards);
  });

  it("should not allow to terminate staking pool after it reaches the start", async function () {
    const { asOwner, provider } = await loadFixture(defaultFixture);

    await timeTravel(provider, 10);

    await expect(asOwner.terminate()).to.be.revertedWith("Cannot terminate after start");
  });

  it("should send back the funds to original initiator", async function () {
    const { owner, asOwner, rewards } = await loadFixture(initNoTravelFixture);

    await expect(await asOwner.terminate()).to.changeEtherBalance(owner, rewards);
  });

  describe("Staking", async () => {
    it("should revert if staking pool is not initialized", async function () {
      const { asPatron1 } = await loadFixture(uninitializedFixture);

      await expect(
        asPatron1.stake({
          value: oneEWT,
        }),
      ).to.be.revertedWith("Staking Pool not initialized");
    });

    it("can stake funds", async function () {
      const { stakingPool, patron1, asPatron1, provider } = await loadFixture(defaultFixture);

      const tx = await asPatron1.stake({
        value: oneEWT,
      });

      const { blockNumber } = await tx.wait();
      const { timestamp } = await provider.getBlock(blockNumber);

      await expect(tx).to.emit(stakingPool, "StakeAdded").withArgs(patron1.address, oneEWT, timestamp);

      const [deposit, compounded] = await asPatron1.total();

      expect(deposit).to.be.equal(compounded);
      expect(deposit).to.be.equal(oneEWT);
    });

    it("can stake funds multiple times", async function () {
      const { asPatron1 } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await asPatron1.stake({
        value: oneEWT,
      });

      const [deposit, compounded] = await asPatron1.total();

      expect(deposit).to.be.equal(compounded);
      expect(deposit).to.be.equal(oneEWT.mul(2));
    });

    it("should increase the balance of the staking pool", async function () {
      const { stakingPool, asPatron1 } = await loadFixture(defaultFixture);

      await expect(
        await asPatron1.stake({
          value: oneEWT,
        }),
      ).to.changeEtherBalance(stakingPool, oneEWT);
    });

    it("should revert when staking pool reached the hard cap", async function () {
      const hardCap = contributionLimit;
      const { asPatron1, asPatron2 } = await loadFixture(async (wallets: Wallet[], provider: MockProvider) => {
        const { timestamp } = await provider.getBlock("latest");
        const start = timestamp + 10;

        return fixture(hardCap, start, wallets, provider);
      });

      await asPatron1.stake({
        value: contributionLimit,
      });

      await expect(
        asPatron2.stake({
          value: oneEWT,
        }),
      ).to.be.revertedWith("Staking pool is full");
    });

    it("Should revert if Owner tries to reinitialize already launched Staking Pool", async function () {
      const { asOwner, start, end, rewards } = await loadFixture(defaultFixture);
      await expect(
        asOwner.init(start, end, ratioInt, hardCap, contributionLimit, [], {
          value: rewards,
        }),
      ).to.be.revertedWith("Staking Pool already initialized");
    });

    it("should revert when stake is greater than contribution limit", async function () {
      const { asPatron1 } = await loadFixture(defaultFixture);

      const patronStake = utils.parseUnits("50001", "ether");

      await expect(
        asPatron1.stake({
          value: patronStake,
        }),
      ).to.be.revertedWith("Stake greater than contribution limit");
    });

    it("should revert when staking pool has not yet started", async function () {
      const { asPatron1 } = await loadFixture(async (wallets: Wallet[], provider: MockProvider) => {
        const { timestamp } = await provider.getBlock("latest");
        const start = timestamp + 100; //future
        return fixture(hardCap, start, wallets, provider, true, false);
      });

      await expect(
        asPatron1.stake({
          value: oneEWT,
        }),
      ).to.be.revertedWith("Staking pool not yet started");
    });

    it("should revert when staking pool already expired", async function () {
      const { duration, provider, asPatron1 } = await loadFixture(defaultFixture);

      await timeTravel(provider, duration + 1);

      await expect(
        asPatron1.stake({
          value: oneEWT,
        }),
      ).to.be.revertedWith("Staking pool already expired");
    });

    it("should not compound stake after reaching expiry date", async function () {
      const { asPatron1, duration, provider } = await loadFixture(defaultFixture);

      await stakeAndTravel(asPatron1, oneEWT, duration + 1, provider);

      const [deposit, compounded] = await asPatron1.total();

      await timeTravel(provider, duration + 1);

      const [stakeAfterExpiry, compoundedAfterExpiry] = await asPatron1.total();

      expect(stakeAfterExpiry).to.be.equal(deposit);
      expect(compoundedAfterExpiry).to.be.equal(compounded);
    });
  });

  describe("Unstaking", async () => {
    it("can unstake funds", async function () {
      const { patron1, asPatron1 } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await expect(await asPatron1.unstakeAll()).to.changeEtherBalance(patron1, oneEWT);

      const [deposit, compounded] = await asPatron1.total();

      expect(deposit).to.be.equal(BigNumber.from(0));
      expect(compounded).to.be.equal(BigNumber.from(0));
    });

    it("should decrease the balance of the staking pool", async function () {
      const { stakingPool, asPatron1 } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await expect(await asPatron1.unstakeAll()).to.changeEtherBalance(stakingPool, oneEWT.mul(-1));
    });

    it("should revert when no funds staked before", async function () {
      const { asPatron1, asPatron2 } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await expect(asPatron2.unstakeAll()).to.be.revertedWith("No funds available");
    });

    it("should allow partial withdrawal up to compounded value", async function () {
      const { asPatron1, provider, duration } = await loadFixture(defaultFixture);

      const initialStake = oneEWT;

      await stakeAndTravel(asPatron1, initialStake, duration / 2, provider);

      let [deposit, compounded] = await asPatron1.total();

      const initialCompounded = compounded;

      expect(compounded.gt(deposit)).to.be.true;

      const withdrawalValue = initialStake.div(2);

      await asPatron1.unstake(withdrawalValue);

      [deposit, compounded] = await asPatron1.total();

      expect(deposit).to.be.equal(initialStake.sub(withdrawalValue));
      expect(compounded).to.be.equal(initialCompounded.sub(withdrawalValue));

      await asPatron1.unstake(withdrawalValue);

      [deposit, compounded] = await asPatron1.total();

      expect(deposit).to.be.equal(BigNumber.from(0));
      expect(compounded.gt(0)).to.be.true;

      await asPatron1.unstake(compounded);

      [deposit, compounded] = await asPatron1.total();

      expect(deposit).to.be.equal(BigNumber.from(0));
      expect(compounded).to.be.equal(BigNumber.from(0));
    });
  });

  describe("Sweeping", async () => {
    async function quote(stakingPools: StakingPool[]) {
      let deposits = BigNumber.from(0);
      let rewards = BigNumber.from(0);

      for (const stakingPool of stakingPools) {
        const [deposit, compounded] = await stakingPool.total();
        const reward = compounded.sub(deposit);

        deposits = deposits.add(deposit);
        rewards = rewards.add(reward);
      }

      return { deposits, rewards };
    }

    async function calculateExpectedSweep(stakingPools: StakingPool[], initialRewards: BigNumber) {
      const { rewards } = await quote(stakingPools);

      return initialRewards.sub(rewards);
    }

    async function assertTransferAndBalance(
      initialRewards: BigNumber,
      patrons: StakingPool[],
      asOwner: StakingPool,
      owner: Wallet,
      provider: MockProvider,
      expectedSweep?: BigNumber,
      expectedBalance?: BigNumber,
    ) {
      const { deposits, rewards } = await quote(patrons);

      const toSweep = expectedSweep ?? (await calculateExpectedSweep(patrons, initialRewards));

      await expect(await asOwner.sweep()).to.changeEtherBalance(owner, toSweep);

      expect(await provider.getBalance(asOwner.address)).to.be.equal(expectedBalance ?? deposits.add(rewards));
    }

    it("should not allow to sweep before expiry", async function () {
      const { asOwner } = await loadFixture(defaultFixture);

      await expect(asOwner.sweep()).to.be.revertedWith("Cannot sweep before expiry");
    });

    it("should allow to sweep only once", async function () {
      const { asOwner } = await loadFixture(initialStakeAndTravelToExpiryFixture);

      await asOwner.sweep();

      await expect(asOwner.sweep()).to.be.revertedWith("Already sweeped");
    });

    it("should sweep remaining rewards when patron staked", async function () {
      const { owner, asPatron1, asOwner, provider, rewards } = await loadFixture(initialStakeAndTravelToExpiryFixture);

      await assertTransferAndBalance(rewards, [asPatron1], asOwner, owner, provider);
    });

    it("should sweep remaining rewards when patron staked multiple times", async function () {
      const { owner, asPatron1, asOwner, duration, provider, rewards } = await loadFixture(defaultFixture);

      await stakeAndTravel(asPatron1, oneEWT, duration / 2, provider);
      await stakeAndTravel(asPatron1, oneEWT, duration, provider);

      await assertTransferAndBalance(rewards, [asPatron1], asOwner, owner, provider);
    });

    it("should sweep remaining rewards when patron staked multiple times from multiple patrons", async function () {
      const { owner, asPatron1, asPatron2, asOwner, duration, provider, rewards } = await loadFixture(defaultFixture);

      await stakeAndTravel(asPatron1, oneEWT, duration / 2, provider);
      await stakeAndTravel(asPatron2, oneEWT, 0, provider);

      await stakeAndTravel(asPatron1, oneEWT, duration, provider);

      const expectedSweep = await calculateExpectedSweep([asPatron1, asPatron2], rewards);
      await assertTransferAndBalance(rewards, [asPatron1, asPatron2], asOwner, owner, provider, expectedSweep);
    });

    it("should sweep remaining rewards when patron staked and withdrawn after expiry", async function () {
      const { owner, asPatron1, asOwner, provider, rewards } = await loadFixture(initialStakeAndTravelToExpiryFixture);

      const expectedSweep = await calculateExpectedSweep([asPatron1], rewards);

      await asPatron1.unstakeAll();

      await assertTransferAndBalance(rewards, [asPatron1], asOwner, owner, provider, expectedSweep, BigNumber.from(0));
    });

    it("should sweep remaining rewards when patron staked and withdrawn before expiry", async function () {
      const { owner, asPatron1, asOwner, duration, provider, rewards } = await loadFixture(defaultFixture);

      await stakeAndTravel(asPatron1, oneEWT, duration / 2, provider);

      await asPatron1.unstake(oneEWT);

      await timeTravel(provider, duration);

      await assertTransferAndBalance(rewards, [asPatron1], asOwner, owner, provider);
    });
  });

  it("maximum compound precision error should not result in error greater than 1 cent", async function () {
    const { stakingPool, start, end, duration } = await loadFixture(defaultFixture);

    const oneCent = utils.parseUnits("0.001", "ether");

    const patronStake = 50000;
    const patronStakeWei = utils.parseUnits(patronStake.toString(), "ether");

    const periods = duration / 3600;

    const compounded = await stakingPool.compound(ratioInt, patronStakeWei, start, end);

    const expectedCompounded = patronStake * Math.pow(1 + ratio, periods);
    const expected = utils.parseUnits(expectedCompounded.toString(), 18);
    const diff = compounded.sub(expected).abs().toNumber();

    expect(diff).to.be.lessThanOrEqual(oneCent.toNumber());
  });
});
