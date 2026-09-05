"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useDecryptValues, useEncrypt, useHasPermit } from "@zama-fhe/react-sdk";
import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { fumboPool } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

const CUSDT_DECIMALS = 6;

export function WithdrawCard() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [amount, setAmount] = useState("");

  const parsed = Number(amount);
  const invalid = amount !== "" && (!Number.isFinite(parsed) || parsed <= 0);

  const { data: isDepositor } = useReadContract({
    ...fumboPool,
    functionName: "isDepositor",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: balanceHandle } = useReadContract({
    ...fumboPool,
    functionName: "encBalanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!isDepositor },
  });

  const { data: hasPoolPermit } = useHasPermit({
    contractAddresses: [fumboPool.address],
  });

  const balanceDecryptInputs = balanceHandle && hasPoolPermit
    ? [{ encryptedValue: balanceHandle, contractAddress: fumboPool.address }]
    : [];
  const { data: balanceDecrypted } = useDecryptValues(balanceDecryptInputs, {
    enabled: balanceDecryptInputs.length > 0,
  });
  const poolBalance =
    balanceHandle && balanceDecrypted && typeof balanceDecrypted[balanceHandle] === "bigint"
      ? (balanceDecrypted[balanceHandle] as bigint)
      : undefined;

  const encrypt = useEncrypt();

  const {
    data: withdrawHash,
    writeContractAsync,
    isPending: withdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWriteContract();
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } =
    useWaitForTransactionReceipt({
      hash: withdrawHash,
      query: { enabled: !!withdrawHash },
    });

  let amountRaw: bigint | undefined;
  if (amount !== "" && !invalid) {
    try {
      amountRaw = parseUnits(amount, CUSDT_DECIMALS);
    } catch {
      amountRaw = undefined;
    }
  }

  useEffect(() => {
    if (!withdrawSuccess) return;
    toast.success({
      title: "Withdrawal confirmed",
      description: "Amount transferred is the minimum of what you asked for and your actual balance. Reveal your balances above to see the new numbers.",
    });
    queryClient.invalidateQueries();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot on tx confirm
    setAmount("");
    resetWithdraw();
  }, [withdrawSuccess, queryClient, resetWithdraw, toast]);

  useEffect(() => {
    if (!encrypt.error) return;
    toast.error({
      title: "Encryption failed",
      description: firstMessage(encrypt.error) ?? undefined,
    });
  }, [encrypt.error, toast]);

  useEffect(() => {
    if (!withdrawError) return;
    toast.error({
      title: "Withdrawal failed",
      description: firstMessage(withdrawError) ?? undefined,
    });
  }, [withdrawError, toast]);

  async function handleWithdraw() {
    if (!address || amountRaw === undefined) return;
    const encrypted = await encrypt.mutateAsync({
      values: [{ type: "euint64", value: amountRaw }],
      contractAddress: fumboPool.address,
      userAddress: address,
    });
    await writeContractAsync({
      ...fumboPool,
      functionName: "withdraw",
      args: [encrypted.encryptedValues[0], encrypted.inputProof],
    });
  }

  const busy = encrypt.isPending || withdrawPending || withdrawConfirming;
  const notDepositor = isDepositor === false;
  const insufficientPool =
    poolBalance !== undefined && amountRaw !== undefined && amountRaw > poolBalance;
  const withdrawDisabled =
    amount === "" || invalid || busy || notDepositor || insufficientPool;

  let primaryLabel: string;
  if (encrypt.isPending) {
    primaryLabel = "Encrypting amount…";
  } else if (withdrawPending) {
    primaryLabel = "Confirm in wallet…";
  } else if (withdrawConfirming) {
    primaryLabel = "Withdrawing…";
  } else if (withdrawSuccess) {
    primaryLabel = "Withdrawn ✓";
  } else if (parsed > 0) {
    primaryLabel = `Withdraw up to ${parsed} cUSDT`;
  } else {
    primaryLabel = "Withdraw cUSDT";
  }

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="text-2xl">Take your principal back</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="withdraw-amount" className="sr-only">
            Amount
          </Label>
          <div className="relative">
            <Input
              id="withdraw-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy || notDepositor}
              aria-invalid={invalid || undefined}
              className="h-14 rounded-lg pr-20 font-mono text-2xl tabular-nums"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm font-medium tracking-wider text-muted-foreground">
              cUSDT
            </span>
          </div>
          {invalid && (
            <p className="text-sm leading-snug text-destructive">Enter a positive amount.</p>
          )}
          {notDepositor && (
            <p className="text-sm leading-snug text-muted-foreground">
              Nothing to withdraw yet. Deposit first.
            </p>
          )}
          {!invalid && !notDepositor && insufficientPool && poolBalance !== undefined && (
            <p className="text-sm leading-snug text-destructive">
              More than your pool balance. You have {formatUnits(poolBalance, CUSDT_DECIMALS)}{" "}
              cUSDT deposited.
            </p>
          )}
          {!invalid && !notDepositor && !insufficientPool && poolBalance === undefined && (
            <p className="text-xs leading-[1.55] text-muted-foreground">
              Reveal your Encrypted principal above for instant validation. Without it, the
              contract still clamps any request to your balance via
              <span className="font-mono"> FHE.min</span>, so you can never overdraw.
            </p>
          )}
        </div>

        <Button
          onClick={handleWithdraw}
          disabled={withdrawDisabled}
          className="h-12 rounded-md text-base font-medium"
        >
          {primaryLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
