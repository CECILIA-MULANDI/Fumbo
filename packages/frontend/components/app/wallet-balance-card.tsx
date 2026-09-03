"use client";

import {
  useConfidentialBalance,
  useGrantPermit,
  useHasPermit,
} from "@zama-fhe/react-sdk";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cUSDT } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

const CUSDT_DECIMALS = 6;

export function WalletBalanceCard() {
  const { address } = useAccount();
  const toast = useToast();
  const [revealed, setRevealed] = useState(false);

  const {
    data: hasPermit,
    isLoading: permitLoading,
    error: permitError,
  } = useHasPermit({
    contractAddresses: [cUSDT.address],
  });

  const grantPermit = useGrantPermit();

  const {
    data: cusdtBalance,
    isFetching,
    error: balanceError,
  } = useConfidentialBalance(
    { address: cUSDT.address, account: address },
    { enabled: !!address && !!hasPermit },
  );

  async function handleReveal() {
    try {
      if (!hasPermit) {
        await grantPermit.mutateAsync([cUSDT.address]);
      }
      setRevealed(true);
    } catch {
      // grantPermit.error is set by the mutation; surfaced by the error toast
    }
  }

  useEffect(() => {
    if (!grantPermit.error) return;
    toast.error({
      title: "Authorization failed",
      description: firstMessage(grantPermit.error) ?? undefined,
    });
  }, [grantPermit.error, toast]);

  useEffect(() => {
    if (!balanceError) return;
    toast.error({
      title: "Wallet balance decrypt failed",
      description: firstMessage(balanceError) ?? undefined,
    });
  }, [balanceError, toast]);

  const errorMessage = firstMessage(permitError);

  const showCleartext = revealed && cusdtBalance !== undefined;
  const label = permitLoading
    ? "Loading…"
    : grantPermit.isPending
    ? "Authorizing…"
    : isFetching
    ? "Decrypting…"
    : hasPermit
    ? "Reveal"
    : "Reveal (sign once)";

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="text-2xl">cUSDT available</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {showCleartext ? (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-4xl tabular-nums text-foreground md:text-5xl">
                {formatUnits(cusdtBalance!, CUSDT_DECIMALS)}
              </span>
              <span className="text-sm text-muted-foreground">cUSDT · in wallet</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span
                className="font-mono text-4xl tracking-[0.4em] text-muted-foreground md:text-5xl"
                aria-label="Balance hidden"
              >
                •••• ••••
              </span>
              <span className="text-sm text-muted-foreground">cUSDT · click to reveal</span>
            </div>
          )}

          {showCleartext ? (
            <button
              type="button"
              onClick={() => setRevealed(false)}
              className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              Hide
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReveal}
              disabled={!address || permitLoading || grantPermit.isPending || isFetching}
              className="font-mono text-xs uppercase tracking-wider text-accent transition-colors hover:text-accent/80 disabled:opacity-50"
            >
              {label}
            </button>
          )}
        </div>
        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
