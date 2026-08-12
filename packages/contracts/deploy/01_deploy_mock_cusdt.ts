import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, save } = hre.deployments;

  const override = process.env.CUSDT_ADDRESS;
  if (override) {
    const artifact = await hre.deployments.getExtendedArtifact("MockConfidentialUSDT");
    await save("MockConfidentialUSDT", { address: override, abi: artifact.abi });
    console.log(`MockConfidentialUSDT: using existing token at ${override}`);
    return;
  }

  const deployed = await deploy("MockConfidentialUSDT", {
    from: deployer,
    log: true,
  });

  console.log(`MockConfidentialUSDT: ${deployed.address}`);
};

export default func;
func.id = "deploy_mock_cusdt";
func.tags = ["MockConfidentialUSDT"];
