import dns from "dns";
import { ethers } from "hardhat";
import hre from "hardhat";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

const CUSDT_DECIMALS = 6n;
const DEFAULT_AMOUNT_CUSDT = 5_000n;

async function main() {
  const [signer] = await ethers.getSigners();
  const amountCusdt = BigInt(process.env.AMOUNT_CUSDT ?? DEFAULT_AMOUNT_CUSDT);
  const amountRaw = amountCusdt * 10n ** CUSDT_DECIMALS;

  const cusdtDeployment = await hre.deployments.get("MockConfidentialUSDT");
  const prizePotDeployment = await hre.deployments.get("PrizePot");

  const cusdt = await ethers.getContractAt("MockConfidentialUSDT", cusdtDeployment.address, signer);
  const prizePot = await ethers.getContractAt("PrizePot", prizePotDeployment.address, signer);

  console.log(`Signer:   ${signer.address}`);
  console.log(`cUSDT:    ${cusdtDeployment.address}`);
  console.log(`PrizePot: ${prizePotDeployment.address}`);
  console.log(`Amount:   ${amountCusdt} cUSDT (${amountRaw} raw units)\n`);

  console.log("Step 1: minting cUSDT to PrizePot...");
  const mintTx = await cusdt.mint(prizePotDeployment.address, amountRaw);
  console.log(`  tx:    ${mintTx.hash}`);
  const mintReceipt = await mintTx.wait();
  console.log(`  block: ${mintReceipt!.blockNumber}`);
  console.log(`  gas:   ${mintReceipt!.gasUsed}\n`);

  console.log("Step 2: registering reserve on PrizePot...");
  const fundTx = await prizePot.fundReserve(amountRaw);
  console.log(`  tx:    ${fundTx.hash}`);
  const fundReceipt = await fundTx.wait();
  console.log(`  block: ${fundReceipt!.blockNumber}`);
  console.log(`  gas:   ${fundReceipt!.gasUsed}\n`);

  console.log(`Done. Reserve grew by ${amountCusdt} cUSDT.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
