"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  useConfidentialBalance,
  useConfidentialIsOperator,
  useConfidentialSetOperator,
  useEncrypt,
  useHasPermit,
} from "@zama-fhe/react-sdk";
import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { FaucetButton } from "@/components/app/faucet-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cUSDT, fumboPool } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

const CUSDT_DECIMALS = 6;
const OPERATOR_WINDOW_SECONDS = 30 * 24 * 60 * 60;

export function DepositCard() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");

  const parsed = Number(amount);
  const invalid = amount !== "" && (!Number.isFinite(parsed) || parsed <= 0);

  const { data: hasPermit } = useHasPermit({
    contractAddresses: [cUSDT.address],
  });
  const { data: cusdtBalance } = useConfidentialBalance(
    { address: cUSDT.address, account: address },
    { enabled: !!address && !!hasPermit },
  );

  const { data: isOperator, isLoading: operatorLoading } = useConfidentialIsOperator({
    address: cUSDT.address,
    holder: address,
    spender: fumboPool.address,
  });

  const setOperator = useConfidentialSetOperator(cUSDT.address);
  const encrypt = useEncrypt();

  const {
    data: depositHash,
    writeContractAsync,
    isPending: depositPending,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();
  const { isLoading: depositConfirming, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
    query: { enabled: !!depositHash },
  });

  let amountRaw: bigint | undefined;
  if (amount !== "" && !invalid) {
    try {
      amountRaw = parseUnits(amount, CUSDT_DECIMALS);
    } catch {
      amountRaw = undefined;
    }
  }
  const insufficient =
    cusdtBalance !== undefined && amountRaw !== undefined && amountRaw > cusdtBalance;

  useEffect(() => {
    if (!depositSuccess) return;
    queryClient.invalidateQueries();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot on tx confirm
    setAmount("");
    const t = setTimeout(() => resetDeposit(), 5000);
    return () => clearTimeout(t);
  }, [depositSuccess, queryClient, resetDeposit]);

  const operatorSuccess = setOperator.isSuccess;
  const resetOperator = setOperator.reset;
  useEffect(() => {
    if (!operatorSuccess) return;
    const t = setTimeout(() => resetOperator(), 5000);
    return () => clearTimeout(t);
  }, [operatorSuccess, resetOperator]);

  async function handleApprove() {
    if (!address) return;
    await setOperator.mutateAsync({
      operator: fumboPool.address,
      until: Math.floor(Date.now() / 1000) + OPERATOR_WINDOW_SECONDS,
    });
    queryClient.invalidateQueries();
  }

  async function handleDeposit() {
    if (!address || amountRaw === undefined) return;
    const encrypted = await encrypt.mutateAsync({
      values: [{ type: "euint64", value: amountRaw }],
      contractAddress: fumboPool.address,
      userAddress: address,
    });
    await writeContractAsync({
      ...fumboPool,
      functionName: "deposit",
      args: [encrypted.encryptedValues[0], encrypted.inputProof],
    });
  }

  const errorMessage = firstMessage(setOperator.error, encrypt.error, depositError);

  const busy =
    setOperator.isPending ||
    encrypt.isPending ||
    depositPending ||
    depositConfirming ||
    operatorLoading;

  const needsOperator = isOperator === false;
  const depositDisabled = amount === "" || invalid || insufficient || busy;

  let primaryLabel: string;
  if (needsOperator) {
    primaryLabel = setOperator.isPending ? "Confirm in wallet…" : "Approve pool";
  } else if (encrypt.isPending) {
    primaryLabel = "Encrypting amount…";
  } else if (depositPending) {
    primaryLabel = "Confirm in wallet…";
  } else if (depositConfirming) {
    primaryLabel = "Depositing…";
  } else if (depositSuccess) {
    primaryLabel = "Deposited ✓";
  } else {
    primaryLabel = `Deposit ${parsed > 0 ? `${parsed} cUSDT` : "cUSDT"}`;
  }

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="text-2xl">Add to the pool</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="deposit-amount" className="sr-only">
            Amount
          </Label>
          <div className="relative">
            <Input
              id="deposit-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              aria-invalid={invalid || insufficient || undefined}
              className="h-14 rounded-lg pr-20 font-mono text-2xl tabular-nums"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm font-medium uppercase tracking-wider text-muted-foreground">
              cUSDT
            </span>
          </div>
          {invalid && (
            <p className="text-sm leading-snug text-destructive">Enter a positive amount.</p>
          )}
          {!invalid && insufficient && cusdtBalance !== undefined && (
            <p className="text-sm leading-snug text-destructive">
              Not enough cUSDT. You have {formatUnits(cusdtBalance, CUSDT_DECIMALS)}. Use the faucet
              below.
            </p>
          )}
        </div>

        {needsOperator && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
                aria-hidden="true"
              />
              <p className="text-sm leading-[1.6] text-muted-foreground">
                Deposits need the pool authorized as an operator on cUSDT. Approval lasts 30 days,
                so you&apos;ll only see this once a month.
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={needsOperator ? handleApprove : handleDeposit}
          disabled={needsOperator ? busy : depositDisabled}
          className="h-12 rounded-md text-base font-medium"
        >
          {primaryLabel}
        </Button>

        {setOperator.isSuccess && (
          <div
            role="status"
            className="rounded-lg border border-accent/40 bg-accent/10 p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Pool approved</p>
                <p className="text-sm leading-[1.6] text-muted-foreground">
                  You can deposit any amount for the next 30 days without re-approving.
                </p>
              </div>
            </div>
          </div>
        )}

        {depositSuccess && (
          <div
            role="status"
            className="rounded-lg border border-accent/40 bg-accent/10 p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Deposit confirmed</p>
                <p className="text-sm leading-[1.6] text-muted-foreground">
                  Your encrypted principal is updating. Reveal it from the pool balance card
                  above.
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

        <FaucetButton />
      </CardContent>
    </Card>
  );
}
