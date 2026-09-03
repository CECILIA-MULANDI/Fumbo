"use client";

import {
  useDecryptValues,
  useGrantPermit,
  useHasPermit,
} from "@zama-fhe/react-sdk";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { fumboPool } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

const CUSDT_DECIMALS = 6;

export function BalanceCard() {
  const { address } = useAccount();
  const toast = useToast();
  const [revealed, setRevealed] = useState(false);

  const { data: isDepositor, error: isDepositorError } = useReadContract({
    ...fumboPool,
    functionName: "isDepositor",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: handle, error: handleError } = useReadContract({
    ...fumboPool,
    functionName: "encBalanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!isDepositor },
  });

  const {
    data: hasPermit,
    isLoading: permitLoading,
    error: permitError,
  } = useHasPermit({
    contractAddresses: [fumboPool.address],
  });

  const grantPermit = useGrantPermit();

  const decryptInputs =
    revealed && handle
      ? [{ encryptedValue: handle, contractAddress: fumboPool.address }]
      : [];
  const {
    data: decrypted,
    isFetching: decrypting,
    error: decryptError,
  } = useDecryptValues(decryptInputs, {
    enabled: decryptInputs.length > 0 && !!hasPermit,
  });

  const cleartext =
    handle && decrypted && typeof decrypted[handle] === "bigint"
      ? (decrypted[handle] as bigint)
      : undefined;

  async function handleReveal() {
    try {
      if (!hasPermit) {
        await grantPermit.mutateAsync([fumboPool.address]);
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
    if (!decryptError) return;
    toast.error({
      title: "Balance decrypt failed",
      description: firstMessage(decryptError) ?? undefined,
    });
  }, [decryptError, toast]);

  const errorMessage = firstMessage(isDepositorError, handleError, permitError);

  const showCleartext = revealed && cleartext !== undefined;
  const label = permitLoading
    ? "Loading…"
    : grantPermit.isPending
    ? "Authorizing…"
    : decrypting
    ? "Decrypting…"
    : hasPermit
    ? "Reveal"
    : "Reveal (sign once)";

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="text-2xl">Encrypted principal</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {!isDepositor ? (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-3xl text-muted-foreground md:text-4xl">
                No balance yet
              </span>
              <span className="text-sm text-muted-foreground">
                Deposit cUSDT to enter this week&apos;s draw.
              </span>
            </div>
          ) : showCleartext ? (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-4xl tabular-nums text-foreground md:text-5xl">
                {formatUnits(cleartext!, CUSDT_DECIMALS)}
              </span>
              <span className="text-sm text-muted-foreground">cUSDT · principal</span>
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

          {isDepositor && (
            showCleartext ? (
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
                disabled={!handle || permitLoading || grantPermit.isPending || decrypting}
                className="font-mono text-xs uppercase tracking-wider text-accent transition-colors hover:text-accent/80 disabled:opacity-50"
              >
                {label}
              </button>
            )
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
