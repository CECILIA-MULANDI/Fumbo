"use client";

import { useConfidentialBalance, useHasPermit } from "@zama-fhe/react-sdk";
import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";

import { FaucetButton } from "@/components/app/faucet-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cUSDT } from "@/lib/contracts";

const CUSDT_DECIMALS = 6;

export function DepositCard() {
  const { address } = useAccount();
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

  const disabled = amount === "" || invalid || insufficient;

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Deposit
        </p>
        <CardTitle className="mt-1 text-2xl">Add to the pool</CardTitle>
        <CardDescription>
          Deposit cUSDT. Your amount is encrypted before it hits the chain. Nobody, not even the pool
          contract, sees the number in the clear.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="deposit-amount" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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

        <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
              aria-hidden="true"
            />
            <p className="text-sm leading-[1.6] text-muted-foreground">
              Deposits require a one-time operator approval so the pool can pull encrypted tokens on
              your behalf. You&apos;ll be prompted the first time.
            </p>
          </div>
        </div>

        <Button
          disabled={disabled}
          className="h-12 rounded-md text-base font-medium"
        >
          Deposit {parsed > 0 ? `${parsed} cUSDT` : "cUSDT"}
        </Button>

        <FaucetButton />
      </CardContent>
    </Card>
  );
}
