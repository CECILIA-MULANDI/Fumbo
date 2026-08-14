"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WalletConnectButton({
  className,
  connectLabel = "Launch app",
  connectedHref,
  connectedHrefLabel = "Open app",
}: {
  className?: string;
  connectLabel?: string;
  /** If set, when the wallet is connected on the right network the button becomes a link to this URL instead of opening the account modal. */
  connectedHref?: string;
  connectedHrefLabel?: string;
}) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            className={cn(!ready && "pointer-events-none opacity-0")}
            aria-hidden={!ready}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal} className={className}>
                    {connectLabel}
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    variant="outline"
                    className={cn(
                      className,
                      "gap-2 border-accent/50 text-accent hover:border-accent hover:bg-accent/10 hover:text-accent",
                    )}
                  >
                    <span
                      className="h-2 w-2 animate-pulse rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    Wrong network
                  </Button>
                );
              }

              if (connectedHref) {
                return (
                  <Button
                    render={<Link href={connectedHref} />}
                    nativeButton={false}
                    className={cn(className, "gap-2")}
                  >
                    <span
                      className="h-2 w-2 rounded-full bg-accent-foreground/80"
                      aria-hidden="true"
                    />
                    {connectedHrefLabel}
                  </Button>
                );
              }

              return (
                <Button
                  onClick={openAccountModal}
                  variant="secondary"
                  className={cn(
                    className,
                    "gap-2 font-mono text-sm tabular-nums hover:bg-[color-mix(in_oklch,var(--secondary),var(--accent)_14%)]",
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
                    aria-hidden="true"
                  />
                  {account.displayName}
                </Button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
