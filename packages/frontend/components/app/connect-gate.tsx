"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { sepolia } from "wagmi/chains";

import { Button } from "@/components/ui/button";

export function ConnectGate({ children }: { children: React.ReactNode }) {
  const { isConnected, chain } = useAccount();
  const wrongNetwork = isConnected && chain?.id !== sepolia.id;

  if (!isConnected) {
    return (
      <GatePanel
        eyebrow="Wallet required"
        title="Connect your wallet to continue."
        description="Fumbo runs on Sepolia. Connect a wallet that holds cUSDT to deposit into the pool."
      >
        <ConnectButton.Custom>
          {({ openConnectModal, mounted }) => (
            <Button
              onClick={openConnectModal}
              disabled={!mounted}
              className="h-12 rounded-md px-6 text-base font-medium"
            >
              Connect wallet
            </Button>
          )}
        </ConnectButton.Custom>
      </GatePanel>
    );
  }

  if (wrongNetwork) {
    return (
      <GatePanel
        eyebrow="Wrong network"
        title="Switch to Sepolia."
        description="This app is only deployed on Sepolia testnet. Switch networks to continue."
      >
        <ConnectButton.Custom>
          {({ openChainModal, mounted }) => (
            <Button
              onClick={openChainModal}
              disabled={!mounted}
              variant="outline"
              className="h-12 gap-2 rounded-md border-accent/50 px-6 text-base font-medium text-accent hover:border-accent hover:bg-accent/10 hover:text-accent"
            >
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-accent"
                aria-hidden="true"
              />
              Switch to Sepolia
            </Button>
          )}
        </ConnectButton.Custom>
      </GatePanel>
    );
  }

  return <>{children}</>;
}

function GatePanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center ring-1 ring-foreground/5">
        <p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-base leading-[1.6] text-muted-foreground">
          {description}
        </p>
        <div className="mt-8 flex justify-center">{children}</div>
      </div>
    </div>
  );
}
