import { sepolia } from "wagmi/chains";

import {
  drawRegistryAbi,
  drawRegistryAddress,
  fumboPoolAbi,
  fumboPoolAddress,
  mockConfidentialUSDTAbi,
  mockConfidentialUSDTAddress,
  prizePotAbi,
  prizePotAddress,
} from "./generated";

export const SUPPORTED_CHAIN_ID = sepolia.id;

function addressFor(map: Record<number, `0x${string}`>, name: string): `0x${string}` {
  const addr = map[SUPPORTED_CHAIN_ID];
  if (!addr) {
    throw new Error(
      `Missing ${name} deployment for chain ${SUPPORTED_CHAIN_ID}. Re-run \`pnpm --filter frontend sync-contracts\`.`,
    );
  }
  return addr;
}

export const fumboPool = {
  address: addressFor(fumboPoolAddress, "FumboPool"),
  abi: fumboPoolAbi,
} as const;

export const cUSDT = {
  address: addressFor(mockConfidentialUSDTAddress, "MockConfidentialUSDT"),
  abi: mockConfidentialUSDTAbi,
} as const;

export const drawRegistry = {
  address: addressFor(drawRegistryAddress, "DrawRegistry"),
  abi: drawRegistryAbi,
} as const;

export const prizePot = {
  address: addressFor(prizePotAddress, "PrizePot"),
  abi: prizePotAbi,
} as const;
