#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, "..");
const deploymentsRoot = resolve(frontendRoot, "../contracts/deployments");
const outFile = resolve(frontendRoot, "lib/contracts/generated.ts");

const CONTRACTS = [
  "FumboPool",
  "MockConfidentialUSDT",
  "DrawRegistry",
  "PrizePot",
];
const NETWORKS = [{ name: "sepolia", chainId: 11155111 }];

function readDeployment(network, name) {
  const path = join(deploymentsRoot, network, `${name}.json`);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return { address: raw.address, abi: raw.abi };
}

function toCamel(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

const header = `// AUTO-GENERATED. Do not edit by hand.\n\n`;

const chunks = [header];

for (const contract of CONTRACTS) {
  let abi = null;
  const addresses = {};

  for (const net of NETWORKS) {
    const d = readDeployment(net.name, contract);
    if (!d) continue;
    abi ??= d.abi;
    addresses[net.chainId] = d.address;
  }

  if (!abi) {
    console.warn(
      `[warn] no deployment found for ${contract} on any network. Skipping.`
    );
    continue;
  }

  const abiConst = `${toCamel(contract)}Abi`;
  const addrConst = `${toCamel(contract)}Address`;

  chunks.push(
    `export const ${abiConst} = ${JSON.stringify(abi, null, 2)} as const;\n\n`
  );
  chunks.push(
    `export const ${addrConst}: Record<number, \`0x\${string}\`> = ${JSON.stringify(
      addresses,
      null,
      2
    )} as const;\n\n`
  );
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, chunks.join(""));
console.log(`✓ wrote ${outFile}`);
console.log(`  contracts: ${CONTRACTS.join(", ")}`);
console.log(
  `  networks:  ${NETWORKS.map((n) => `${n.name}(${n.chainId})`).join(", ")}`
);
