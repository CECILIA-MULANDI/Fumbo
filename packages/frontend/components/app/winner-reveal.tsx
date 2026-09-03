"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  useDecryptPublicValues,
  useDecryptValues,
  useGrantPermit,
  useHasPermit,
} from "@zama-fhe/react-sdk";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { drawRegistry, fumboPool } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

const CUSDT_DECIMALS = 6;
const STATUS_PENDING = 0;
const SCAN_RECENT = 5;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

type EligibleDraw = { drawId: number; timestamp: number };

export function WinnerReveal() {
  const { address } = useAccount();

  const { data: isDepositor } = useReadContract({
    ...fumboPool,
    functionName: "isDepositor",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: drawCount } = useReadContract({
    ...drawRegistry,
    functionName: "drawCount",
    query: { enabled: !!isDepositor },
  });

  const scanIds = useMemo<number[]>(() => {
    const n = drawCount !== undefined ? Number(drawCount) : 0;
    const ids: number[] = [];
    for (let i = n - 1; i >= Math.max(0, n - SCAN_RECENT); i--) ids.push(i);
    return ids;
  }, [drawCount]);

  const { data: rawDraws } = useReadContracts({
    contracts: scanIds.map((id) => ({
      ...drawRegistry,
      functionName: "draws" as const,
      args: [BigInt(id)] as const,
    })),
    query: { enabled: scanIds.length > 0 },
  });

  const { data: claimedFlags } = useReadContracts({
    contracts: scanIds.map((id) => ({
      ...drawRegistry,
      functionName: "claimed" as const,
      args: [id, address ?? ZERO_ADDRESS] as const,
    })),
    query: { enabled: scanIds.length > 0 && !!address },
  });

  const eligible = pickEligible(scanIds, rawDraws, claimedFlags);

  if (!address || !isDepositor || !eligible) return null;
  return <EligibleCard key={eligible.drawId} drawId={eligible.drawId} timestamp={eligible.timestamp} />;
}

function pickEligible(
  scanIds: readonly number[],
  rawDraws: readonly { result?: unknown }[] | undefined,
  claimedFlags: readonly { result?: unknown }[] | undefined,
): EligibleDraw | null {
  if (!rawDraws || !claimedFlags) return null;
  for (let i = 0; i < scanIds.length; i++) {
    const draw = rawDraws[i]?.result as
      | readonly [bigint, bigint, number, boolean]
      | undefined;
    const claimed = claimedFlags[i]?.result as boolean | undefined;
    if (!draw) continue;
    const status = Number(draw[2]);
    if (status !== STATUS_PENDING) continue;
    if (claimed) continue;
    return { drawId: scanIds[i], timestamp: Number(draw[0]) };
  }
  return null;
}

type CheckState = "idle" | "checking" | "confirming" | "revealed-win" | "revealed-lose" | "dismissed";

function EligibleCard({ drawId, timestamp }: EligibleDraw) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [state, setState] = useState<CheckState>("idle");

  const {
    data: hasPermit,
    isLoading: permitLoading,
    error: permitError,
  } = useHasPermit({ contractAddresses: [drawRegistry.address] });

  const grantPermit = useGrantPermit();

  const {
    data: checkHash,
    writeContractAsync: sendCheck,
    isPending: checkSending,
    error: checkError,
    reset: resetCheck,
  } = useWriteContract();

  const { isLoading: checkConfirming, isSuccess: checkConfirmed } =
    useWaitForTransactionReceipt({
      hash: checkHash,
      query: { enabled: !!checkHash },
    });

  const { data: storedHandle } = useReadContract({
    ...drawRegistry,
    functionName: "revealedIsWinner",
    args: address ? [drawId, address] : undefined,
    query: { enabled: !!address && checkConfirmed },
  });
  const winnerHandle = storedHandle as `0x${string}` | undefined;

  const decryptInputs =
    winnerHandle && checkConfirmed
      ? [{ encryptedValue: winnerHandle, contractAddress: drawRegistry.address }]
      : [];
  const {
    data: decrypted,
    isFetching: decrypting,
    error: rawDecryptError,
  } = useDecryptValues(decryptInputs, {
    enabled: decryptInputs.length > 0 && !!hasPermit,
  });
  const decryptError = checkConfirmed ? rawDecryptError : undefined;

  const isWinner =
    winnerHandle && decrypted && typeof decrypted[winnerHandle] === "boolean"
      ? (decrypted[winnerHandle] as boolean)
      : undefined;

  useEffect(() => {
    if (isWinner === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from async decrypt
    setState(isWinner ? "revealed-win" : "revealed-lose");
  }, [isWinner]);

  useEffect(() => {
    if (!grantPermit.error) return;
    toast.error({
      title: "Authorization failed",
      description: firstMessage(grantPermit.error) ?? undefined,
    });
  }, [grantPermit.error, toast]);

  useEffect(() => {
    if (!checkError) return;
    toast.error({
      title: `Reveal failed for Draw #${drawId}`,
      description: firstMessage(checkError) ?? undefined,
    });
  }, [checkError, toast, drawId]);

  useEffect(() => {
    if (!decryptError) return;
    toast.error({
      title: `Decrypt failed for Draw #${drawId}`,
      description: firstMessage(decryptError) ?? undefined,
    });
  }, [decryptError, toast, drawId]);

  const relative = useRelativeTime(timestamp);

  async function handleCheck() {
    if (!address) return;
    try {
      setState("checking");
      if (!hasPermit) {
        await grantPermit.mutateAsync([drawRegistry.address]);
      }
      await sendCheck({
        ...drawRegistry,
        functionName: "didIWin",
        args: [drawId, address],
      });
      setState("confirming");
    } catch {
      setState("idle");
    }
  }

  function handleClose() {
    setState("dismissed");
    resetCheck();
    queryClient.invalidateQueries();
  }

  const errorMessage = firstMessage(permitError);

  const busy =
    permitLoading ||
    grantPermit.isPending ||
    checkSending ||
    checkConfirming ||
    decrypting ||
    state === "checking" ||
    state === "confirming";

  let label = "Reveal my result";
  if (grantPermit.isPending) label = "Sign to authorize…";
  else if (checkSending) label = "Confirm in wallet…";
  else if (checkConfirming) label = "Checking on chain…";
  else if (decrypting) label = "Decrypting…";

  if (state === "dismissed") return null;

  return (
    <>
      <Card className="[--card-spacing:--spacing(6)] border-accent/50 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-2xl">Draw #{drawId} settled {relative}</CardTitle>
          <p className="text-sm leading-[1.6] text-muted-foreground">
            Only you can find out whether your address was selected. Reveal is a private
            on-chain check followed by a local decrypt.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {state === "revealed-lose" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="flex flex-col gap-1">
                <p className="font-mono text-lg text-foreground">Not this time.</p>
                <p className="text-sm text-muted-foreground">
                  Your deposit stays in the pool. You are automatically entered in the next draw.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setState("dismissed")}
                className="h-10 shrink-0 rounded-md px-4 text-sm font-medium sm:self-center"
              >
                Dismiss
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleCheck}
              disabled={busy}
              className="h-12 rounded-md text-base font-medium"
            >
              {label}
            </Button>
          )}
          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {state === "revealed-win" && (
          <WinReveal drawId={drawId} onClose={handleClose} />
        )}
      </AnimatePresence>
    </>
  );
}

function WinReveal({ drawId, onClose }: { drawId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const reduce = useReducedMotion();

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

  const prize =
    prizeHandle && decrypt.data?.clearValues
      ? (decrypt.data.clearValues[prizeHandle] as bigint | undefined)
      : undefined;

  const {
    data: claimHash,
    writeContractAsync: sendClaim,
    isPending: claimSending,
    error: claimError,
    reset: resetClaim,
  } = useWriteContract();

  const { isLoading: claimConfirming, isSuccess: claimConfirmed } =
    useWaitForTransactionReceipt({
      hash: claimHash,
      query: { enabled: !!claimHash },
    });

  useEffect(() => {
    if (!claimConfirmed) return;
    toast.success({
      title: `Prize claimed for Draw #${drawId}`,
      description: "It landed in your encrypted pool balance. Reveal your balance to see it.",
    });
    queryClient.invalidateQueries();
  }, [claimConfirmed, queryClient, toast, drawId]);

  useEffect(() => {
    if (!claimError) return;
    toast.error({
      title: `Claim failed for Draw #${drawId}`,
      description: firstMessage(claimError) ?? undefined,
    });
  }, [claimError, toast, drawId]);

  async function handleClaim() {
    await sendClaim({
      ...fumboPool,
      functionName: "claim",
      args: [drawId],
    });
  }

  function handleDone() {
    resetClaim();
    onClose();
  }

  const prizeText = prize !== undefined ? formatUnits(prize, CUSDT_DECIMALS) : "•••• ••••";

  let claimLabel = "Claim prize";
  if (claimSending) claimLabel = "Confirm in wallet…";
  else if (claimConfirming) claimLabel = "Claiming…";
  else if (claimConfirmed) claimLabel = "Claimed";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`You won draw ${drawId}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="relative w-full max-w-2xl rounded-3xl border border-accent/30 bg-card p-10 md:p-16"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="font-mono text-base font-medium uppercase tracking-[0.22em] text-accent">
          You won
        </p>
        <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-foreground md:text-4xl">
          Only your wallet can see this.
        </h2>
        <p className="mt-3 max-w-[42ch] text-base leading-[1.65] text-muted-foreground md:text-lg">
          Draw #{drawId} selected you over encrypted balances. Nothing on chain reveals your
          address as the recipient.
        </p>

        <div className="mt-10 flex flex-col items-start gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Prize
          </span>
          <div className="relative">
            {reduce || prize === undefined ? (
              <p className="font-mono text-5xl font-medium tabular-nums tracking-tight text-foreground md:text-7xl">
                {prizeText}
                {prize !== undefined && (
                  <span className="ml-3 text-2xl text-muted-foreground md:text-3xl">
                    cUSDT
                  </span>
                )}
              </p>
            ) : (
              <motion.p
                className="font-mono text-5xl font-medium tabular-nums text-foreground md:text-7xl"
                initial={{ opacity: 0, filter: "blur(10px)", letterSpacing: "0.35em" }}
                animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0em" }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                {prizeText}
                <span className="ml-3 text-2xl text-muted-foreground md:text-3xl">cUSDT</span>
              </motion.p>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
          {claimConfirmed ? (
            <>
              <div className="flex-1 rounded-lg border border-accent/40 bg-accent/10 p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-[1.6] text-foreground">
                    Prize added to your encrypted pool balance. Reveal your balance to see it.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDone}
                className="h-12 rounded-md px-6 text-base font-medium"
              >
                Done
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleClaim}
                disabled={claimSending || claimConfirming}
                className="h-12 rounded-md px-6 text-base font-medium"
              >
                {claimLabel}
              </Button>
              <Button
                onClick={handleDone}
                disabled={claimSending || claimConfirming}
                variant="ghost"
                className="h-12 rounded-md px-6 text-base font-medium"
              >
                Later
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function useRelativeTime(timestamp: number): string {
  const [label, setLabel] = useState(() => formatRelative(timestamp));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatRelative(timestamp)), 30_000);
    return () => clearInterval(id);
  }, [timestamp]);
  return label;
}

function formatRelative(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
