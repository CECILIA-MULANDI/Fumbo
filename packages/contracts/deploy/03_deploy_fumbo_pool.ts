import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const POOL_CAP_POW2 = BigInt(process.env.POOL_CAP_POW2 ?? 1n << 30n);
const MAX_DEPOSITORS = Number(process.env.MAX_DEPOSITORS ?? 100);

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const token = await get("MockConfidentialUSDT");
  const prizePot = await get("PrizePot");

  const pool = await deploy("FumboPool", {
    from: deployer,
    args: [token.address, prizePot.address, POOL_CAP_POW2, MAX_DEPOSITORS],
    log: true,
  });

  console.log(`FumboPool: ${pool.address}`);
};

export default func;
func.id = "deploy_fumbo_pool";
func.tags = ["FumboPool"];
func.dependencies = ["PrizePot"];
