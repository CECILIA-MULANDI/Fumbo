import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const token = await get("MockConfidentialUSDT");

  const prizePot = await deploy("PrizePot", {
    from: deployer,
    args: [token.address],
    log: true,
  });

  console.log(`PrizePot: ${prizePot.address}`);
};

export default func;
func.id = "deploy_prize_pot";
func.tags = ["PrizePot"];
func.dependencies = ["MockConfidentialUSDT"];
