import Link from "next/link";
import { VeilMark } from "@/components/brand/veil-mark";
import { WalletConnectButton } from "@/components/wallet/connect-button";

export function AppNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-20">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-semibold tracking-tight text-foreground"
        >
          <VeilMark />
          Fumbo
        </Link>
        <WalletConnectButton
          className="h-11 rounded-md px-5 text-base font-medium"
          connectLabel="Connect wallet"
        />
      </div>
    </nav>
  );
}
