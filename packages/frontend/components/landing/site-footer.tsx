export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="px-6 py-16 md:px-12 lg:px-20 xl:px-32 2xl:px-40">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
          <div className="col-span-2 md:col-span-1">
            <p className="text-base font-semibold tracking-tight text-foreground">Fumbo</p>
            <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
              Confidential no-loss prize savings on Ethereum, powered by FHEVM.
            </p>
          </div>

          <FooterCol title="Product" links={[
            { label: "Launch app", href: "#" },
            { label: "How it works", href: "#how" },
            { label: "FAQ", href: "#faq" },
          ]} />

          <FooterCol title="About" links={[
            { label: "GitHub", href: "https://github.com/CECILIA-MULANDI/veildraw" },
            { label: "Contact", href: "https://x.com/kashortgirl" },
          ]} />
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 md:flex-row md:items-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Testnet only. Not audited. Not financial advice.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for the Zama Season 4 Bounty Track.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <ul className="mt-4 space-y-3">
        {links.map((l) => {
          const isExternal = l.href.startsWith("http");
          return (
            <li key={l.label}>
              <a
                href={l.href}
                {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                className="text-sm text-foreground transition-colors hover:text-primary"
              >
                {l.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
