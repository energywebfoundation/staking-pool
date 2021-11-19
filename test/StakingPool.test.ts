import { expect, use } from "chai";
import { deployContract, loadFixture, MockProvider, solidity } from "ethereum-waffle";
import StakePoolContract from "../artifacts/contracts/StakingPool.sol/StakingPool.json";
import { StakingPool } from "../ethers";
import { Wallet, utils, BigNumber } from "ethers";

use(solidity);

describe("Staking Pool", function () {
  const oneEWT = utils.parseUnits("1", "ether");

  const hardCap = oneEWT.mul(5000000);
  const contributionLimit = oneEWT.mul(50000);

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
    provider: MockProvider,
    initializePool = true,
  ) {
    const duration = 3600 * 24 * 30;
    const end = start + duration;

    const stakingPool = (await deployContract(owner, StakePoolContract)) as StakingPool;

    if (initializePool) {
      const asOwner = stakingPool.connect(owner);
      const tx = await asOwner.init(
        owner.address, //ToDo adapt with claimManager address
        start,
        end,
        ratioInt,
        hardCap,
        contributionLimit,
        {
          value: oneEWT,
        },
      );
      await expect(tx).to.emit(stakingPool, "StakingPoolInitialized").withArgs(oneEWT);
    }

    // travel to staking event start
    await timeTravel(provider, 10);

    return {
      stakingPool,
      patron1,
      patron2,
      owner,
      asPatron1: stakingPool.connect(patron1),
      asPatron2: stakingPool.connect(patron2),
      asOwner: stakingPool.connect(owner),
      provider,
      duration,
      start,
      end,
      hardCap,
    };
  }

  async function defaultFixture(wallets: Wallet[], provider: MockProvider) {
    const { timestamp } = await provider.getBlock("latest");
    const start = timestamp + 10;

    return fixture(hardCap, start, wallets, provider);
  }

  async function failureInitFixture(wallets: Wallet[], provider: MockProvider) {
    const { timestamp } = await provider.getBlock("latest");
    const start = timestamp + 10;

    return fixture(hardCap, start, wallets, provider, false);
  }

  it("Ownership can't be transferred to current owner", async function () {
    const { owner, asOwner } = await loadFixture(defaultFixture);
    await expect(asOwner.changeOwner(owner.address)).to.be.revertedWith("changeOwner: already owner");
  });

  it("Ownership can't be transferred by non owner", async function () {
    const { asPatron1, patron1 } = await loadFixture(defaultFixture);
    await expect(asPatron1.changeOwner(patron1.address)).to.be.revertedWith("OnlyOwner: Not authorized");
  });

  it("Ownership is correctly transferred", async function () {
    const { patron1, asOwner, stakingPool } = await loadFixture(defaultFixture);

    const tx = await asOwner.changeOwner(patron1.address);

    await expect(tx).to.emit(stakingPool, "OwnershipTransferred");
  });

  describe("Staking", async () => {
    it("should revert if staking pool is not initialized", async function () {
      const { asPatron1 } = await loadFixture(failureInitFixture);

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
      const hardCap = utils.parseUnits("2", "ether");
      const { asPatron1, asPatron2 } = await loadFixture(async (wallets: Wallet[], provider: MockProvider) => {
        const { timestamp } = await provider.getBlock("latest");
        const start = timestamp + 10;
        return fixture(hardCap, start, wallets, provider);
      });

      await asPatron1.stake({
        value: oneEWT.mul(2),
      });

      await expect(
        asPatron2.stake({
          value: oneEWT,
        }),
      ).to.be.revertedWith("Staking pool is full");
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
        return fixture(hardCap, start, wallets, provider);
      });

      await expect(
        asPatron1.stake({
          value: oneEWT,
        }),
      ).to.be.revertedWith("Staking pool not yet started");
    });

    it("should revert when staking pool already expired", async function () {
      const { asPatron1, duration, provider } = await loadFixture(defaultFixture);

      await timeTravel(provider, duration + 1);

      await expect(
        asPatron1.stake({
          value: oneEWT,
        }),
      ).to.be.revertedWith("Staking pool already expired");
    });

    it("should not compound stake after reaching expiry date", async function () {
      const { asPatron1, duration, provider } = await loadFixture(defaultFixture);

      await asPatron1.stake({
        value: oneEWT,
      });

      await timeTravel(provider, duration + 1);

      const [deposit, compounded] = await asPatron1.total();

      expect(compounded.gt(deposit)).to.be.true;

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

      await asPatron1.stake({
        value: initialStake,
      });

      await timeTravel(provider, duration / 2);

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

  it("maximum compound precision error should not result in error greater than 1 cent", async function () {
    const { stakingPool, duration } = await loadFixture(defaultFixture);

    const oneCent = utils.parseUnits("0.001", "ether");

    const patronStake = 50000;
    const patronStakeWei = utils.parseUnits(patronStake.toString(), "ether");

    const periods = duration / 3600;

    const compounded = await stakingPool.compound(patronStakeWei, ratioInt, periods);

    const expectedCompounded = patronStake * Math.pow(1 + ratio, periods);
    const expected = utils.parseUnits(expectedCompounded.toString(), 18);
    const diff = compounded.sub(expected).abs().toNumber();

    expect(diff).to.be.lessThanOrEqual(oneCent.toNumber());
  });
});
