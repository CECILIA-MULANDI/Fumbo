"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEncrypt } from "@zama-fhe/react-sdk";
import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fumboPool } from "@/lib/contracts";

const CUSDT_DECIMALS = 6;

export function WithdrawCard() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");

  const parsed = Number(amount);
  const invalid = amount !== "" && (!Number.isFinite(parsed) || parsed <= 0);

  const encrypt = useEncrypt();

  const {
    data: withdrawHash,
    writeContractAsync,
    isPending: withdrawPending,
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
    queryClient.invalidateQueries();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot on tx confirm
    setAmount("");
    const t = setTimeout(() => resetWithdraw(), 5000);
    return () => clearTimeout(t);
  }, [withdrawSuccess, queryClient, resetWithdraw]);

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
  const withdrawDisabled = amount === "" || invalid || busy;

  let primaryLabel: string;
  if (encrypt.isPending) {
    primaryLabel = "Encrypting amount…";
  } else if (withdrawPending) {
    primaryLabel = "Confirm in wallet…";
  } else if (withdrawConfirming) {
    primaryLabel = "Withdrawing…";
  } else if (withdrawSuccess) {
    primaryLabel = "Withdrawn ✓";
  } else {
    primaryLabel = `Withdraw ${parsed > 0 ? `${parsed} cUSDT` : "cUSDT"}`;
  }

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Withdraw
        </p>
        <CardTitle className="mt-1 text-2xl">Take your principal back</CardTitle>
        <CardDescription>
          Your deposit is never at risk. Withdraw any amount up to your pool balance. The amount
          stays encrypted end-to-end.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="withdraw-amount"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
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
              disabled={busy}
              aria-invalid={invalid || undefined}
              className="h-14 rounded-lg pr-20 font-mono text-2xl tabular-nums"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm font-medium uppercase tracking-wider text-muted-foreground">
              cUSDT
            </span>
          </div>
          {invalid && (
            <p className="text-sm leading-snug text-destructive">Enter a positive amount.</p>
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
