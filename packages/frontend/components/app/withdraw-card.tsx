"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WithdrawCard() {
  const [amount, setAmount] = useState("");

  const parsed = Number(amount);
  const invalid = amount !== "" && (!Number.isFinite(parsed) || parsed <= 0);

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
          disabled={amount === "" || invalid}
          className="h-12 rounded-md text-base font-medium"
        >
          Withdraw {parsed > 0 ? `${parsed} cUSDT` : "cUSDT"}
        </Button>
      </CardContent>
    </Card>
  );
}
