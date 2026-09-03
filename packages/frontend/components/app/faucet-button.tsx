"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cUSDT } from "@/lib/contracts";
import { firstMessage } from "@/lib/errors";

const FAUCET_AMOUNT_RAW = BigInt(1_000_000_000);
const FAUCET_LABEL_AMOUNT = "1,000";

export function FaucetButton() {
  const { address } = useAccount();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  useEffect(() => {
    if (!isSuccess) return;
    toast.success({
      title: `Received ${FAUCET_LABEL_AMOUNT} cUSDT`,
      description: "Test tokens are in your wallet. Deposit any amount to join the pool.",
    });
    queryClient.invalidateQueries();
    const t = setTimeout(() => reset(), 5000);
    return () => clearTimeout(t);
  }, [isSuccess, toast, queryClient, reset]);

  useEffect(() => {
    if (!error) return;
    toast.error({
      title: "Faucet mint failed",
      description: firstMessage(error) ?? undefined,
    });
  }, [error, toast]);

  function handleMint() {
    if (!address) return;
    writeContract({
      ...cUSDT,
      functionName: "mint",
      args: [address, FAUCET_AMOUNT_RAW],
    });
  }

  const busy = isPending || isConfirming;

  return (
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
  );
}
