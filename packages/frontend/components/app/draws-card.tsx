"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { drawRegistry, fumboPool } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Ready";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function DrawsCard() {
  const queryClient = useQueryClient();

  const { data: drawCount } = useReadContract({
    ...drawRegistry,
    functionName: "drawCount",
  });
  const { data: lastDrawTime } = useReadContract({
    ...drawRegistry,
    functionName: "lastDrawTime",
  });
  const { data: drawInterval } = useReadContract({
    ...drawRegistry,
    functionName: "drawInterval",
  });
  const { data: depositorCount } = useReadContract({
    ...fumboPool,
    functionName: "depositorCount",
  });

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const nextDrawAt =
    lastDrawTime !== undefined && drawInterval !== undefined
      ? Number(lastDrawTime) + Number(drawInterval)
      : undefined;
  const secondsUntilNext = nextDrawAt !== undefined ? nextDrawAt - now : undefined;
  const ready = secondsUntilNext !== undefined && secondsUntilNext <= 0;
  const noDepositors = depositorCount !== undefined && Number(depositorCount) === 0;

  const {
    data: triggerHash,
    writeContractAsync,
    isPending: triggerPending,
    error: triggerError,
    reset: resetTrigger,
  } = useWriteContract();
  const { isLoading: triggerConfirming, isSuccess: triggerSuccess } = useWaitForTransactionReceipt({
    hash: triggerHash,
    query: { enabled: !!triggerHash },
  });

  useEffect(() => {
    if (!triggerSuccess) return;
    queryClient.invalidateQueries();
    const t = setTimeout(() => resetTrigger(), 5000);
    return () => clearTimeout(t);
  }, [triggerSuccess, queryClient, resetTrigger]);

  async function handleTrigger() {
    await writeContractAsync({
      ...drawRegistry,
      functionName: "triggerDraw",
    });
  }

  const busy = triggerPending || triggerConfirming;
  const triggerDisabled = !ready || noDepositors || busy;

  let triggerLabel: string;
  if (triggerPending) {
    triggerLabel = "Confirm in wallet…";
  } else if (triggerConfirming) {
    triggerLabel = "Running draw…";
  } else if (triggerSuccess) {
    triggerLabel = "Draw complete ✓";
  } else if (!ready) {
    triggerLabel = "Not yet";
  } else if (noDepositors) {
    triggerLabel = "No depositors";
  } else {
    triggerLabel = "Trigger draw";
  }

  const errorMessage = firstMessage(triggerError);

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Draws
        </p>
        <CardTitle className="mt-1 text-2xl">Recent draws & prizes</CardTitle>
        <CardDescription>
          The pool runs a draw on a fixed cadence. Anyone can trigger the next one once the window
          opens. Only you learn if you won.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Next draw
            </span>
            <span className="font-mono text-2xl tabular-nums text-foreground">
              {secondsUntilNext === undefined
                ? "Loading…"
                : formatCountdown(secondsUntilNext)}
            </span>
          </div>
          <Button
            variant={ready && !noDepositors ? "default" : "outline"}
            className="h-10 rounded-md px-4"
            onClick={handleTrigger}
            disabled={triggerDisabled}
          >
            {triggerLabel}
          </Button>
        </div>

        {drawCount !== undefined && Number(drawCount) === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              No draws yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Once the first draw runs, prizes and your eligibility appear here.
            </p>
          </div>
        )}

        {triggerSuccess && (
          <div role="status" className="rounded-lg border border-accent/40 bg-accent/10 p-4">
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Draw triggered</p>
                <p className="text-sm leading-[1.6] text-muted-foreground">
                  A winner has been selected on encrypted balances. Check below to see if you won.
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
