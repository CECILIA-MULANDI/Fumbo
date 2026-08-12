import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const POOL_CAP_POW2 = BigInt(process.env.POOL_CAP_POW2 ?? 1n << 30n);
const MAX_DEPOSITORS = Number(process.env.MAX_DEPOSITORS ?? 100);
const DRAW_INTERVAL_SECS = BigInt(process.env.DRAW_INTERVAL_SECS ?? 900);
const CLAIM_TIMEOUT_SECS = BigInt(process.env.CLAIM_TIMEOUT_SECS ?? 3600);
const APR_BPS = Number(process.env.APR_BPS ?? 500);

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  const signer = await hre.ethers.getSigner(deployer);

  const token = await get("MockConfidentialUSDT");

  const prizePot = await deploy("PrizePot", {
    from: deployer,
    args: [token.address],
    log: true,
  });

  const pool = await deploy("FumboPool", {
    from: deployer,
    args: [token.address, prizePot.address, POOL_CAP_POW2, MAX_DEPOSITORS],
    log: true,
  });

  const drawRegistry = await deploy("DrawRegistry", {
    from: deployer,
    args: [pool.address, prizePot.address, DRAW_INTERVAL_SECS, CLAIM_TIMEOUT_SECS, APR_BPS],
    log: true,
  });

  const prizePotContract = await hre.ethers.getContractAt("PrizePot", prizePot.address, signer);
  if (!(await prizePotContract.wired())) {
    const tx = await prizePotContract.wire(pool.address, drawRegistry.address);
    await tx.wait();
    console.log(`PrizePot wired: pool=${pool.address} drawRegistry=${drawRegistry.address}`);
  }

  const poolContract = await hre.ethers.getContractAt("FumboPool", pool.address, signer);
  if (!(await poolContract.wired())) {
    const tx = await poolContract.setDrawRegistry(drawRegistry.address);
    await tx.wait();
    console.log(`Pool wired: drawRegistry=${drawRegistry.address}`);
  }

  console.log(`\nFumbo stack:`);
  console.log(`  cUSDT:        ${token.address}`);
  console.log(`  PrizePot:     ${prizePot.address}`);
  console.log(`  Pool:         ${pool.address}`);
  console.log(`  DrawRegistry: ${drawRegistry.address}`);
  console.log(`  params: cap=2^${POOL_CAP_POW2.toString(2).length - 1} maxDepositors=${MAX_DEPOSITORS} drawInterval=${DRAW_INTERVAL_SECS}s claimTimeout=${CLAIM_TIMEOUT_SECS}s aprBps=${APR_BPS}`);
};

export default func;
func.id = "deploy_fumbo_stack";
func.tags = ["FumboStack", "PrizePot", "FumboPool", "DrawRegistry"];
func.dependencies = ["MockConfidentialUSDT"];
