import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { sepolia } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Add it to .env.local. Get one at https://cloud.reown.com",
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Fumbo",
  projectId,
  chains: [sepolia],
  wallets: [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet, injectedWallet],
    },
  ],
  ssr: true,
});
