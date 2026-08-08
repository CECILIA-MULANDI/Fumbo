import dns from "dns";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

// Pin DNS to Cloudflare + prefer IPv4 to work around local resolver flakiness
// that gives Undici (Node's fetch) bad IPs and IPv6 timeouts.
dns.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

const CONTRACT_ADDRESS = "0x8F4397B46B8B9C2F55240F7Ca4bf1843050604E5";
const NUM_NEW_DRAWS = 0;
const BOUND = 1n << 40n;

async function main() {
  await fhevm.initializeCLIApi();

  const [signer] = await ethers.getSigners();
  console.log(`Signer: ${signer.address}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Bound: 2^40 = ${BOUND}`);

  const contract = await ethers.getContractAt("RngGrindTest", CONTRACT_ADDRESS, signer);

  const startIdx = Number(await contract.drawCount());
  console.log(`\nExisting draws: ${startIdx}`);

  console.log(`\nGenerating ${NUM_NEW_DRAWS} new draws...`);
  for (let i = 0; i < NUM_NEW_DRAWS; i++) {
    const tx = await contract.generate();
    const receipt = await tx.wait();
    console.log(`  draw ${startIdx + i}: tx=${tx.hash} block=${receipt!.blockNumber} gas=${receipt!.gasUsed}`);
  }

  const endIdx = Number(await contract.drawCount());
  console.log(`\nDecrypting all draws 0..${endIdx - 1}. This will take a while (relayer round-trip per draw).\n`);

  let anyPredictable = false;
  for (let i = 0; i < endIdx; i++) {
    const encHandle = await contract.getRandom(i);
    const ctx = await contract.getContext(i);

    const plain = await fhevm.userDecryptEuint(FhevmType.euint64, encHandle, CONTRACT_ADDRESS, signer);
    const value = BigInt(plain);

    // Naive "predictions" from public block state at generation time.
    // If the RNG were seeded from any of these, one would match.
    const predictions: Record<string, bigint> = {
      block_number_mod: BigInt(ctx.blockNumber) % BOUND,
      timestamp_mod: BigInt(ctx.blockTimestamp) % BOUND,
      prevrandao_mod: BigInt(ctx.prevrandao) % BOUND,
      prev_blockhash_mod: BigInt(ctx.prevBlockhash) % BOUND,
      keccak_of_all_mod:
        BigInt(
          ethers.keccak256(
            ethers.solidityPacked(
              ["uint64", "uint64", "uint256", "bytes32", "address"],
              [ctx.blockNumber, ctx.blockTimestamp, ctx.prevrandao, ctx.prevBlockhash, ctx.caller],
            ),
          ),
        ) % BOUND,
    };

    console.log(`draw ${i}:`);
    console.log(`  value:      ${value}   (0x${value.toString(16)}, in [0, 2^40) = ${value < BOUND})`);
    console.log(`  block:      ${ctx.blockNumber}`);
    console.log(`  timestamp:  ${ctx.blockTimestamp}`);
    console.log(`  prevrandao: ${ctx.prevrandao}`);
    console.log(`  blockhash:  ${ctx.prevBlockhash}`);

    let matched = false;
    for (const [name, guess] of Object.entries(predictions)) {
      if (value === guess) {
        console.log(`  PREDICTABLE: matches ${name} = ${guess}`);
        matched = true;
        anyPredictable = true;
      }
    }
    if (!matched) console.log(`  unpredictable via any tested public-state function`);
    console.log();
  }

  console.log(
    anyPredictable
      ? "RESULT: at least one draw was predictable. RNG design assumption is broken; redesign needed."
      : "RESULT: no draw matched any public-state prediction. RNG unpredictability holds for this sample.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
