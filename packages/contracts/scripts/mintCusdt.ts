import dns from "dns";
import { ethers } from "hardhat";
import hre from "hardhat";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

const CUSDT_DECIMALS = 6n;
const DEFAULT_AMOUNT_CUSDT = 10_000n;

async function main() {
  const [signer] = await ethers.getSigners();
  const recipient = (process.env.RECIPIENT ?? signer.address) as `0x${string}`;
  const amountCusdt = BigInt(process.env.AMOUNT_CUSDT ?? DEFAULT_AMOUNT_CUSDT);
  const amountRaw = amountCusdt * 10n ** CUSDT_DECIMALS;

  const deployment = await hre.deployments.get("MockConfidentialUSDT");
  const cusdt = await ethers.getContractAt("MockConfidentialUSDT", deployment.address, signer);

  console.log(`Signer:    ${signer.address}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`cUSDT:     ${deployment.address}`);
  console.log(`Minting ${amountCusdt} cUSDT (${amountRaw} raw units)...\n`);

  const tx = await cusdt.mint(recipient, amountRaw);
  console.log(`  tx:    ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`  block: ${receipt!.blockNumber}`);
  console.log(`  gas:   ${receipt!.gasUsed}`);
  console.log(`\nDone. Recipient now holds an additional ${amountCusdt} cUSDT (encrypted).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
