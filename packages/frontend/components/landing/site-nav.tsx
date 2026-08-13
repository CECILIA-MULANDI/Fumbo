import Link from "next/link";
import { WalletConnectButton } from "@/components/wallet/connect-button";

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-20 xl:px-32 2xl:px-40">
        <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight text-foreground">
          <VeilMark />
          Fumbo
        </Link>
        <div className="hidden items-center gap-10 md:flex">
          <a href="#how" className="text-base text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#developers" className="text-base text-muted-foreground transition-colors hover:text-foreground">
            Developers
          </a>
          <a href="#faq" className="text-base text-muted-foreground transition-colors hover:text-foreground">
            FAQ
          </a>
        </div>
        <WalletConnectButton className="h-11 rounded-md px-5 text-base font-medium" />
      </div>
    </nav>
  );
}

function VeilMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6 L12 18 M6 12 L18 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}
