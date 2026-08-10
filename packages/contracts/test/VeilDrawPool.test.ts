import { expect } from "chai";
import { ethers, fhevm, network } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";

import type { DrawRegistry, MockConfidentialUSDT, PrizePot, VeilDrawPool } from "../types";

const POOL_CAP: bigint = 2n ** 12n;
const MAX_DEPOSITORS = 20;
const DRAW_INTERVAL: bigint = 60n;
const CLAIM_TIMEOUT: bigint = 3600n;
const APR_BPS = 100;
const YEAR_SECONDS = 365 * 24 * 3600;
const INITIAL_RESERVE: bigint = 10_000n;

describe("VeilDraw end-to-end", () => {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  let token: MockConfidentialUSDT;
  let prizePot: PrizePot;
  let pool: VeilDrawPool;
  let drawRegistry: DrawRegistry;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("MockConfidentialUSDT");
    token = (await TokenFactory.deploy()) as unknown as MockConfidentialUSDT;

    const PrizePotFactory = await ethers.getContractFactory("PrizePot");
    prizePot = (await PrizePotFactory.deploy(await token.getAddress())) as unknown as PrizePot;

    const PoolFactory = await ethers.getContractFactory("VeilDrawPool");
    pool = (await PoolFactory.deploy(
      await token.getAddress(),
      await prizePot.getAddress(),
      POOL_CAP,
      MAX_DEPOSITORS,
    )) as unknown as VeilDrawPool;

    const RegistryFactory = await ethers.getContractFactory("DrawRegistry");
    drawRegistry = (await RegistryFactory.deploy(
      await pool.getAddress(),
      await prizePot.getAddress(),
      DRAW_INTERVAL,
      CLAIM_TIMEOUT,
      APR_BPS,
    )) as unknown as DrawRegistry;

    await pool.connect(deployer).setDrawRegistry(await drawRegistry.getAddress());
    await prizePot.connect(deployer).wire(await pool.getAddress(), await drawRegistry.getAddress());
  });

  it("wires all three contracts correctly", async () => {
    expect(await prizePot.wired()).to.equal(true);
    expect(await pool.wired()).to.equal(true);
    expect(await prizePot.pool()).to.equal(await pool.getAddress());
    expect(await prizePot.drawRegistry()).to.equal(await drawRegistry.getAddress());
    expect(await pool.drawRegistry()).to.equal(await drawRegistry.getAddress());
  });

  it("admin funds the reserve", async () => {
    await token.mint(deployer.address, Number(INITIAL_RESERVE));

    const encInput = await fhevm
      .createEncryptedInput(await token.getAddress(), deployer.address)
      .add64(INITIAL_RESERVE)
      .encrypt();

    await token
      .connect(deployer)
      ["confidentialTransfer(address,bytes32,bytes)"](
        await prizePot.getAddress(),
        encInput.handles[0],
        encInput.inputProof,
      );

    await prizePot.connect(deployer).fundReserve(INITIAL_RESERVE);

    expect(await prizePot.encReserve()).to.not.equal(ethers.ZeroHash);
  });

  it("full happy path: deposit -> draw -> claim -> withdraw", async () => {
    const tokenAddr = await token.getAddress();
    const poolAddr = await pool.getAddress();

    const aliceDeposit = 1000n;
    const bobDeposit = 3096n;

    await token.mint(deployer.address, Number(INITIAL_RESERVE));
    await token.mint(alice.address, Number(aliceDeposit));
    await token.mint(bob.address, Number(bobDeposit));

    const reserveInput = await fhevm
      .createEncryptedInput(tokenAddr, deployer.address)
      .add64(INITIAL_RESERVE)
      .encrypt();
    await token
      .connect(deployer)
      ["confidentialTransfer(address,bytes32,bytes)"](
        await prizePot.getAddress(),
        reserveInput.handles[0],
        reserveInput.inputProof,
      );
    await prizePot.connect(deployer).fundReserve(INITIAL_RESERVE);

    const farFuture = 2n ** 47n - 1n;
    await token.connect(alice).setOperator(poolAddr, farFuture);
    await token.connect(bob).setOperator(poolAddr, farFuture);

    const aliceEnc = await fhevm
      .createEncryptedInput(poolAddr, alice.address)
      .add64(aliceDeposit)
      .encrypt();
    await pool.connect(alice).deposit(aliceEnc.handles[0], aliceEnc.inputProof);

    const bobEnc = await fhevm
      .createEncryptedInput(poolAddr, bob.address)
      .add64(bobDeposit)
      .encrypt();
    await pool.connect(bob).deposit(bobEnc.handles[0], bobEnc.inputProof);

    expect(await pool.depositorCount()).to.equal(2);
    expect(await pool.isDepositor(alice.address)).to.equal(true);
    expect(await pool.isDepositor(bob.address)).to.equal(true);

    const aliceBalHandle = await pool.encBalanceOf(alice.address);
    const aliceBal = await fhevm.userDecryptEuint(FhevmType.euint64, aliceBalHandle, poolAddr, alice);
    expect(aliceBal).to.equal(aliceDeposit);

    await network.provider.send("evm_increaseTime", [YEAR_SECONDS]);
    await network.provider.send("evm_mine");

    await drawRegistry.connect(deployer).triggerDraw();
    expect(await drawRegistry.drawCount()).to.equal(1);

    await pool.connect(alice).claim(0);
    await pool.connect(bob).claim(0);

    const aliceCashHandle = await token.confidentialBalanceOf(alice.address);
    const bobCashHandle = await token.confidentialBalanceOf(bob.address);
    const aliceCash = await fhevm.userDecryptEuint(FhevmType.euint64, aliceCashHandle, tokenAddr, alice);
    const bobCash = await fhevm.userDecryptEuint(FhevmType.euint64, bobCashHandle, tokenAddr, bob);
    const totalCashOut = aliceCash + bobCash;
    expect(totalCashOut).to.be.greaterThan(0n);

    const aliceWithdrawEnc = await fhevm
      .createEncryptedInput(poolAddr, alice.address)
      .add64(aliceDeposit)
      .encrypt();
    await pool.connect(alice).withdraw(aliceWithdrawEnc.handles[0], aliceWithdrawEnc.inputProof);

    const aliceCashAfterHandle = await token.confidentialBalanceOf(alice.address);
    const aliceCashAfter = await fhevm.userDecryptEuint(FhevmType.euint64, aliceCashAfterHandle, tokenAddr, alice);
    expect(aliceCashAfter).to.equal(aliceCash + aliceDeposit);

    const aliceBalAfterHandle = await pool.encBalanceOf(alice.address);
    const aliceBalAfter = await fhevm.userDecryptEuint(FhevmType.euint64, aliceBalAfterHandle, poolAddr, alice);
    expect(aliceBalAfter).to.equal(0n);
  });

  it("triggerDraw reverts NoDepositors when pool is empty", async () => {
    await network.provider.send("evm_increaseTime", [Number(DRAW_INTERVAL) + 1]);
    await network.provider.send("evm_mine");
    await expect(drawRegistry.triggerDraw()).to.be.revertedWithCustomError(drawRegistry, "NoDepositors");
  });

  it("triggerDraw reverts DrawNotReady before drawInterval elapses", async () => {
    const poolAddr = await pool.getAddress();

    await token.mint(alice.address, 4096);
    await token.connect(alice).setOperator(poolAddr, 2n ** 47n - 1n);
    const enc = await fhevm.createEncryptedInput(poolAddr, alice.address).add64(4096n).encrypt();
    await pool.connect(alice).deposit(enc.handles[0], enc.inputProof);

    await expect(drawRegistry.triggerDraw()).to.be.revertedWithCustomError(drawRegistry, "DrawNotReady");
  });

  it("double claim reverts AlreadyClaimed", async () => {
    const tokenAddr = await token.getAddress();
    const poolAddr = await pool.getAddress();

    await token.mint(deployer.address, Number(INITIAL_RESERVE));
    await token.mint(alice.address, 4096);

    const reserveInput = await fhevm
      .createEncryptedInput(tokenAddr, deployer.address)
      .add64(INITIAL_RESERVE)
      .encrypt();
    await token
      .connect(deployer)
      ["confidentialTransfer(address,bytes32,bytes)"](
        await prizePot.getAddress(),
        reserveInput.handles[0],
        reserveInput.inputProof,
      );
    await prizePot.connect(deployer).fundReserve(INITIAL_RESERVE);

    await token.connect(alice).setOperator(poolAddr, 2n ** 47n - 1n);
    const enc = await fhevm.createEncryptedInput(poolAddr, alice.address).add64(4096n).encrypt();
    await pool.connect(alice).deposit(enc.handles[0], enc.inputProof);

    await network.provider.send("evm_increaseTime", [YEAR_SECONDS]);
    await network.provider.send("evm_mine");
    await drawRegistry.triggerDraw();

    await pool.connect(alice).claim(0);
    await expect(pool.connect(alice).claim(0)).to.be.revertedWithCustomError(pool, "AlreadyClaimed");
  });

  it("unclaimed draw expires and rolls over", async () => {
    const tokenAddr = await token.getAddress();
    const poolAddr = await pool.getAddress();

    await token.mint(deployer.address, Number(INITIAL_RESERVE));
    await token.mint(alice.address, 4096);

    const reserveInput = await fhevm
      .createEncryptedInput(tokenAddr, deployer.address)
      .add64(INITIAL_RESERVE)
      .encrypt();
    await token
      .connect(deployer)
      ["confidentialTransfer(address,bytes32,bytes)"](
        await prizePot.getAddress(),
        reserveInput.handles[0],
        reserveInput.inputProof,
      );
    await prizePot.connect(deployer).fundReserve(INITIAL_RESERVE);

    await token.connect(alice).setOperator(poolAddr, 2n ** 47n - 1n);
    const enc = await fhevm.createEncryptedInput(poolAddr, alice.address).add64(4096n).encrypt();
    await pool.connect(alice).deposit(enc.handles[0], enc.inputProof);

    await network.provider.send("evm_increaseTime", [YEAR_SECONDS]);
    await network.provider.send("evm_mine");
    await drawRegistry.triggerDraw();

    await expect(drawRegistry.expireDraw(0)).to.be.revertedWithCustomError(drawRegistry, "DrawNotExpirable");

    await network.provider.send("evm_increaseTime", [Number(CLAIM_TIMEOUT) + 1]);
    await network.provider.send("evm_mine");

    await drawRegistry.expireDraw(0);
    const draw = await drawRegistry.draws(0);
    expect(draw.status).to.equal(1);
    expect(draw.hasAnyClaim).to.equal(false);
  });

  it("wire reverts AlreadyWired on second call", async () => {
    await expect(
      prizePot.connect(deployer).wire(await pool.getAddress(), await drawRegistry.getAddress()),
    ).to.be.revertedWithCustomError(prizePot, "AlreadyWired");
  });

  it("non-deployer cannot fundReserve, wire, or setDrawRegistry", async () => {
    await expect(prizePot.connect(alice).fundReserve(100n)).to.be.revertedWithCustomError(prizePot, "NotDeployer");
    await expect(
      prizePot.connect(alice).wire(await pool.getAddress(), await drawRegistry.getAddress()),
    ).to.be.revertedWithCustomError(prizePot, "NotDeployer");
    await expect(
      pool.connect(alice).setDrawRegistry(await drawRegistry.getAddress()),
    ).to.be.revertedWithCustomError(pool, "NotDeployer");
  });

  it("random address cannot call accrue, release, rollover, snapshot on PrizePot", async () => {
    const dummyHandle = ethers.ZeroHash;
    await expect(prizePot.connect(alice).accrue(dummyHandle)).to.be.revertedWithCustomError(prizePot, "NotAuthorized");
    await expect(prizePot.connect(alice).rollover(dummyHandle)).to.be.revertedWithCustomError(prizePot, "NotAuthorized");
    await expect(prizePot.connect(alice).snapshot()).to.be.revertedWithCustomError(prizePot, "NotAuthorized");
    await expect(
      prizePot.connect(alice).release(alice.address, dummyHandle, dummyHandle),
    ).to.be.revertedWithCustomError(prizePot, "NotAuthorized");
  });

  it("random address cannot call markClaimed on DrawRegistry", async () => {
    await expect(drawRegistry.connect(alice).markClaimed(0, alice.address)).to.be.revertedWithCustomError(
      drawRegistry,
      "NotPool",
    );
  });

  it("non-depositor claim does not revert but credits nothing", async () => {
    const tokenAddr = await token.getAddress();
    const poolAddr = await pool.getAddress();

    await token.mint(deployer.address, Number(INITIAL_RESERVE));
    await token.mint(alice.address, 4096);

    const reserveInput = await fhevm
      .createEncryptedInput(tokenAddr, deployer.address)
      .add64(INITIAL_RESERVE)
      .encrypt();
    await token
      .connect(deployer)
      ["confidentialTransfer(address,bytes32,bytes)"](
        await prizePot.getAddress(),
        reserveInput.handles[0],
        reserveInput.inputProof,
      );
    await prizePot.connect(deployer).fundReserve(INITIAL_RESERVE);

    await token.connect(alice).setOperator(poolAddr, 2n ** 47n - 1n);
    const enc = await fhevm.createEncryptedInput(poolAddr, alice.address).add64(4096n).encrypt();
    await pool.connect(alice).deposit(enc.handles[0], enc.inputProof);

    await network.provider.send("evm_increaseTime", [YEAR_SECONDS]);
    await network.provider.send("evm_mine");
    await drawRegistry.triggerDraw();

    await expect(pool.connect(bob).claim(0)).to.not.be.reverted;

    const bobCashHandle = await token.confidentialBalanceOf(bob.address);
    const bobCash = await fhevm.userDecryptEuint(FhevmType.euint64, bobCashHandle, tokenAddr, bob);
    expect(bobCash).to.equal(0n);
  });
});
