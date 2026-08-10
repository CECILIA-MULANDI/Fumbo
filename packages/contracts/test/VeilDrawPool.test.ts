import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import type { DrawRegistry, MockConfidentialUSDT, PrizePot, VeilDrawPool } from "../types";

const POOL_CAP: bigint = 2n ** 12n;
const MAX_DEPOSITORS = 20;
const DRAW_INTERVAL: bigint = 60n;
const CLAIM_TIMEOUT: bigint = 3600n;
const APR_BPS = 100;
const INITIAL_RESERVE: bigint = 10_000n;

describe("VeilDraw end-to-end", () => {
  let deployer: HardhatEthersSigner;

  let token: MockConfidentialUSDT;
  let prizePot: PrizePot;
  let pool: VeilDrawPool;
  let drawRegistry: DrawRegistry;

  beforeEach(async () => {
    [deployer] = await ethers.getSigners();

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
});
