import Link from "next/link";
import { VeilMark } from "@/components/brand/veil-mark";
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
          <Link href="/blog" className="text-base text-muted-foreground transition-colors hover:text-foreground">
            Blog
          </Link>
        </div>
        <WalletConnectButton className="h-11 rounded-md px-5 text-base font-medium" />
      </div>
    </nav>
  );
}
