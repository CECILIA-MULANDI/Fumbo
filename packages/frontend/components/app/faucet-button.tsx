"use client";

import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/button";
import { cUSDT } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

const FAUCET_AMOUNT_RAW = BigInt(1_000_000_000);
const FAUCET_LABEL_AMOUNT = "1,000";

export function FaucetButton() {
  const { address } = useAccount();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  function handleMint() {
    if (!address) return;
    writeContract({
      ...cUSDT,
      functionName: "mint",
      args: [address, FAUCET_AMOUNT_RAW],
    });
  }

  const busy = isPending || isConfirming;
  const errorMessage = firstMessage(error);

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        onClick={handleMint}
        disabled={!address || busy}
        className="h-12 w-full rounded-md text-base font-medium"
      >
        {isPending
          ? "Confirm in wallet…"
          : isConfirming
          ? "Minting…"
          : isSuccess
          ? `Minted ${FAUCET_LABEL_AMOUNT} cUSDT ✓`
          : `Get ${FAUCET_LABEL_AMOUNT} test cUSDT`}
      </Button>
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
