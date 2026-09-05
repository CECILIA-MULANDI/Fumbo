"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useDecryptPublicValues } from "@zama-fhe/react-sdk";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { drawRegistry, fumboPool } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

const CUSDT_DECIMALS = 6;
const RECENT_DRAWS = 5;
const STATUS_PENDING = 0;
const EXPIRE_UI_GRACE_SECS = 300;

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

function formatRelative(timestamp: number, now: number): string {
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function DrawRow({
  drawId,
  now,
  claimTimeout,
}: {
  drawId: number;
  now: number;
  claimTimeout: number | undefined;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: raw } = useReadContract({
    ...drawRegistry,
    functionName: "draws",
    args: [BigInt(drawId)],
  });
  const { data: prizeHandle } = useReadContract({
    ...drawRegistry,
    functionName: "encPrizeAmount",
    args: [drawId],
  });

  const decrypt = useDecryptPublicValues();
  const decryptMutate = decrypt.mutate;
  useEffect(() => {
    if (!prizeHandle) return;
    decryptMutate([prizeHandle]);
  }, [prizeHandle, decryptMutate]);

  const cleartext =
    prizeHandle && decrypt.data?.clearValues
      ? (decrypt.data.clearValues[prizeHandle] as bigint | undefined)
      : undefined;

  const timestamp = raw ? Number(raw[0]) : undefined;
  const status = raw ? Number(raw[2]) : undefined;
  const hasAnyClaim = raw ? Boolean(raw[3]) : false;

  const expirableAt =
    timestamp !== undefined && claimTimeout !== undefined ? timestamp + claimTimeout : undefined;
  const uiExpirableAt = expirableAt !== undefined ? expirableAt + EXPIRE_UI_GRACE_SECS : undefined;
  const isPending = status === STATUS_PENDING;
  const canExpire = isPending && uiExpirableAt !== undefined && now > uiExpirableAt;
  const windowClosesIn =
    isPending && expirableAt !== undefined && now <= expirableAt ? expirableAt - now : undefined;
  const [confirmingExpire, setConfirmingExpire] = useState(false);
  const showingConfirm = canExpire && confirmingExpire;

  const {
    data: expireHash,
    writeContractAsync: expireAsync,
    isPending: expirePending,
    error: expireError,
    reset: resetExpire,
  } = useWriteContract();
  const { isLoading: expireConfirming, isSuccess: expireSuccess } = useWaitForTransactionReceipt({
    hash: expireHash,
    query: { enabled: !!expireHash },
  });

  useEffect(() => {
    if (!expireSuccess) return;
    toast.success({
      title: `Draw #${drawId} rolled over`,
      description: "The unclaimed prize was returned to the next draw's reserve.",
    });
    queryClient.invalidateQueries();
    const t = setTimeout(() => resetExpire(), 5000);
    return () => clearTimeout(t);
  }, [expireSuccess, queryClient, resetExpire, toast, drawId]);

  useEffect(() => {
    if (!expireError) return;
    toast.error({
      title: `Rollover failed for Draw #${drawId}`,
      description: firstMessage(expireError) ?? undefined,
    });
  }, [expireError, toast, drawId]);

  async function handleExpire() {
    await expireAsync({
      ...drawRegistry,
      functionName: "expireDraw",
      args: [drawId],
    });
  }

  const expireBusy = expirePending || expireConfirming;
  let expireLabel = "Roll over";
  if (expirePending) expireLabel = "Confirm…";
  else if (expireConfirming) expireLabel = "Rolling over…";

  let statusLabel: string;
  let statusClass: string;
  if (status === undefined) {
    statusLabel = "…";
    statusClass = "text-muted-foreground";
  } else if (status !== STATUS_PENDING) {
    statusLabel = hasAnyClaim ? "Claimed" : "Expired";
    statusClass = "text-muted-foreground";
  } else if (hasAnyClaim) {
    statusLabel = "Claimed";
    statusClass = "text-accent";
  } else {
    statusLabel = "Pending";
    statusClass = "text-foreground";
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-base font-medium text-foreground">Draw #{drawId}</span>
          <span className="text-xs text-muted-foreground">
            {timestamp !== undefined ? formatRelative(timestamp, now) : "loading…"}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-lg tabular-nums text-foreground">
              {cleartext !== undefined
                ? `${formatUnits(cleartext, CUSDT_DECIMALS)} cUSDT`
                : decrypt.isPending
                ? "decrypting…"
                : "..."}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">prize</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`font-mono text-xs uppercase tracking-wider ${statusClass}`}>
              {statusLabel}
            </span>
            {canExpire && !showingConfirm && (
              <Button
                variant="outline"
                className="h-7 rounded-md px-2 text-xs"
                onClick={() => setConfirmingExpire(true)}
                disabled={expireBusy}
              >
                {expireLabel}
              </Button>
            )}
            {showingConfirm && (
              <div className="flex flex-col items-end gap-1">
                <span className="max-w-64 text-right text-sm text-muted-foreground">
                  Rolls prize into next draw. Winner loses eligibility.
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    className="h-7 rounded-md px-2 text-xs"
                    onClick={() => setConfirmingExpire(false)}
                    disabled={expireBusy}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-7 rounded-md px-2 text-xs"
                    onClick={handleExpire}
                    disabled={expireBusy}
                  >
                    {expirePending || expireConfirming ? expireLabel : "Confirm expire"}
                  </Button>
                </div>
              </div>
            )}
            {windowClosesIn !== undefined && (
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Closes in {formatCountdown(windowClosesIn)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DrawsCard() {
  const queryClient = useQueryClient();
  const toast = useToast();

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
  const { data: claimTimeout } = useReadContract({
    ...drawRegistry,
    functionName: "claimTimeout",
  });
  const { data: depositorCount } = useReadContract({
    ...fumboPool,
    functionName: "depositorCount",
  });
  const { refetch: refetchEncTotal } = useReadContract({
    ...fumboPool,
    functionName: "encTotalDeposits",
    query: { enabled: false },
  });
  const decryptTotal = useDecryptPublicValues();

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

  const count = drawCount !== undefined ? Number(drawCount) : 0;
  const recentIds: number[] = [];
  for (let i = count - 1; i >= Math.max(0, count - RECENT_DRAWS); i--) {
    recentIds.push(i);
  }

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
    toast.success({
      title: "Draw complete",
      description: "A winner was selected over encrypted balances. Only they will learn they won.",
    });
    queryClient.invalidateQueries();
    resetTrigger();
  }, [triggerSuccess, queryClient, resetTrigger, toast]);

  useEffect(() => {
    if (!triggerError) return;
    toast.error({
      title: "Draw trigger failed",
      description: firstMessage(triggerError) ?? undefined,
    });
  }, [triggerError, toast]);

  async function handleTrigger() {
    const totalRead = await refetchEncTotal();
    const totalHandle = totalRead.data as `0x${string}` | undefined;
    if (!totalHandle) {
      toast.error({ title: "Draw trigger failed", description: "Pool total handle unavailable." });
      return;
    }
    const publicDecrypted = await decryptTotal.mutateAsync([totalHandle]);
    const plaintextTotal = publicDecrypted.clearValues[totalHandle] as bigint | undefined;
    if (plaintextTotal === undefined) {
      toast.error({ title: "Draw trigger failed", description: "Could not decrypt pool total." });
      return;
    }
    await writeContractAsync({
      ...drawRegistry,
      functionName: "triggerDraw",
      args: [plaintextTotal, publicDecrypted.decryptionProof],
    });
  }

  const busy = triggerPending || triggerConfirming || decryptTotal.isPending;
  const triggerDisabled = !ready || noDepositors || busy;

  let triggerLabel: string;
  if (decryptTotal.isPending) {
    triggerLabel = "Preparing draw…";
  } else if (triggerPending) {
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

  return (
    <Card data-tour="draws" className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="text-2xl">Recent draws & prizes</CardTitle>
        <CardDescription>
          Fixed cadence. Anyone can trigger a draw or roll over an unclaimed one. Only you learn if
          you won.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Next draw
              </span>
              <span className="rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                Permissionless
              </span>
              {depositorCount !== undefined && (
                <span
                  title="Addresses in the pool. Individual balances stay encrypted."
                  className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {Number(depositorCount) === 1
                    ? "1 depositor"
                    : `${Number(depositorCount)} depositors`}
                </span>
              )}
            </div>
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

        {count === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              No draws yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Once the first draw runs, prizes and your eligibility appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentIds.map((id) => (
              <DrawRow
                key={id}
                drawId={id}
                now={now}
                claimTimeout={claimTimeout !== undefined ? Number(claimTimeout) : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
