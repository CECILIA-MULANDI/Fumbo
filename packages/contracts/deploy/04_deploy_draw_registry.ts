import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const DRAW_INTERVAL_SECS = BigInt(process.env.DRAW_INTERVAL_SECS ?? 900);
const CLAIM_TIMEOUT_SECS = BigInt(process.env.CLAIM_TIMEOUT_SECS ?? 86400);
const APR_BPS = Number(process.env.APR_BPS ?? 500);

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const pool = await get("FumboPool");
  const prizePot = await get("PrizePot");

  const drawRegistry = await deploy("DrawRegistry", {
    from: deployer,
    args: [pool.address, prizePot.address, DRAW_INTERVAL_SECS, CLAIM_TIMEOUT_SECS, APR_BPS],
    log: true,
  });

  console.log(`DrawRegistry: ${drawRegistry.address}`);
};

export default func;
func.id = "deploy_draw_registry";
func.tags = ["DrawRegistry"];
func.dependencies = ["FumboPool"];
