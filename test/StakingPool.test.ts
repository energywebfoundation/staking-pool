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
  const hardCap = utils.parseUnits("5000000", "ether");
  const contributionLimit = utils.parseUnits("50000", "ether");

  const rewards = utils.parseUnits("11", "ether");

  const ratio = 0.0000225;
  // ratio as 18 digit number
  const ratioInt = utils.parseUnits(ratio.toString(), 18);

  const timeTravel = async (provider: MockProvider, seconds: number) => {
    await provider.send("evm_increaseTime", [seconds]);
    await provider.send("evm_mine", []);
  };

  async function fixture(
    [owner, patron1, patron2]: Wallet[],
    provider: MockProvider
  ) {
    const { timestamp } = await provider.getBlock("latest");
    const start = timestamp + 10;
    const end = start + 3600 * 24 * 7;

    const stakingPool = (await deployContract(
      owner,
      StakePoolContract,
      [owner.address, start, end, ratioInt, hardCap, contributionLimit],
      { value: rewards }
    )) as StakingPool;

    // travel to staking event start
    await timeTravel(provider, 10);

    return { stakingPool, owner, patron1, patron2, provider };
  }

  it(`can stake funds`, async function () {
    const { stakingPool, patron1, provider } = await loadFixture(fixture);

    const asPatron = stakingPool.connect(patron1);
    const patronStake = utils.parseUnits("1", "ether");

    expect(
      await asPatron.stake({
        value: patronStake,
      })
    )
      .to.emit(stakingPool, "StakeAdded")
      .withArgs(
        patron1.address,
        patronStake,
        (await provider.getBlock("latest")).timestamp
      );

    const [stake, compounded] = await asPatron.total();

    expect(stake).to.be.equal(compounded);
    expect(stake).to.be.equal(patronStake);
  });

  it("stake should increase the amount of funds on the staking contract", async function () {
    const { stakingPool, patron1 } = await loadFixture(fixture);

    const asPatron = stakingPool.connect(patron1);
    const patronStake = utils.parseUnits("1", "ether");

    await expect(
      await asPatron.stake({
        value: patronStake,
      })
    ).to.changeEtherBalance(stakingPool, patronStake);
  });

  it(`can stake funds multiple times`, async function () {
    const { stakingPool, patron1 } = await loadFixture(fixture);

    const asPatron = stakingPool.connect(patron1);
    const patronStake = utils.parseUnits("1", "ether");

    await asPatron.stake({
      value: patronStake,
    });

    await asPatron.stake({
      value: patronStake,
    });

    const [stake, compounded] = await asPatron.total();

    expect(stake).to.be.equal(compounded);
    expect(stake).to.be.equal(patronStake.mul(2));
  });

  it(`maximum compound precision error should not result in error greater than 1 cent`, async function () {
    const { stakingPool, patron1, provider } = await loadFixture(fixture);

    const oneCent = utils.parseUnits("0.001", "ether");
    const asPatron = stakingPool.connect(patron1);

    const patronStake = 50000;
    const patronStakeWei = utils.parseUnits(patronStake.toString(), "ether");

    await asPatron.stake({
      value: patronStakeWei,
    });

    const periods = 24 * 90;
    const hour = 3600;

    const expectedCompounded = patronStake * Math.pow(1 + ratio, periods);

    await timeTravel(provider, hour * periods);

    const [, compounded] = await asPatron.total();

    const expected = utils.parseUnits(expectedCompounded.toString(), 18);
    const diff = compounded.sub(expected).abs().toNumber();

    expect(diff).to.be.lessThanOrEqual(oneCent.toNumber());
  });

  it(`cannot allow to stake more than contribution limit`, async function () {
    const { stakingPool, patron1 } = await loadFixture(fixture);

    const asPatron = stakingPool.connect(patron1);
    const patronStake = utils.parseUnits("50001", "ether");

    expect(
      asPatron.stake({
        value: patronStake,
      })
    ).to.be.revertedWith("Stake above contribution limit");
  });

  it(`can unstake funds`, async function () {
    const { stakingPool, patron1 } = await loadFixture(fixture);

    const asPatron = stakingPool.connect(patron1);
    const patronStake = utils.parseUnits("1", "ether");

    await asPatron.stake({
      value: patronStake,
    });

    await expect(await asPatron.unstakeAll()).to.changeEtherBalance(
      patron1,
      patronStake
    );

    const [stake, compounded] = await asPatron.total();

    expect(stake).to.be.equal(BigNumber.from(0));
    expect(compounded).to.be.equal(BigNumber.from(0));
  });
});
