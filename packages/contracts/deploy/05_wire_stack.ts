import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { get } = hre.deployments;
  const signer = await hre.ethers.getSigner(deployer);

  const token = await get("MockConfidentialUSDT");
  const prizePot = await get("PrizePot");
  const pool = await get("FumboPool");
  const drawRegistry = await get("DrawRegistry");

  const prizePotContract = await hre.ethers.getContractAt("PrizePot", prizePot.address, signer);
  if (!(await prizePotContract.wired())) {
    const tx = await prizePotContract.wire(pool.address, drawRegistry.address);
    await tx.wait();
    console.log(`PrizePot wired`);
  } else {
    console.log(`PrizePot already wired`);
  }

  const poolContract = await hre.ethers.getContractAt("FumboPool", pool.address, signer);
  if (!(await poolContract.wired())) {
    const tx = await poolContract.setDrawRegistry(drawRegistry.address);
    await tx.wait();
    console.log(`FumboPool wired`);
  } else {
    console.log(`FumboPool already wired`);
  }

  const summary = {
    chainId: hre.network.config.chainId,
    network: hre.network.name,
    deployer,
    contracts: {
      MockConfidentialUSDT: token.address,
      PrizePot: prizePot.address,
      FumboPool: pool.address,
      DrawRegistry: drawRegistry.address,
    },
    updatedAt: new Date().toISOString(),
  };

  const outDir = join(hre.config.paths.root, "addresses");
  const outPath = join(outDir, `${hre.network.name}.json`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(summary, null, 2) + "\n");
  console.log(`\nSaved address summary to ${outPath}`);
  console.log(summary.contracts);
};

export default func;
func.id = "wire_fumbo_stack";
func.tags = ["Wire"];
func.dependencies = ["DrawRegistry"];
