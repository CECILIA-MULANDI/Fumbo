const privateItems = [
  "Your deposit amount",
  "Your running balance",
  "Your withdrawal history",
  "The winner's address, each draw",
  "The prize amount you receive",
];

const publicItems = [
  "The pool contract code",
  "Draw schedule and cadence",
  "Total prize accrued each draw",
  "Contract calls and gas usage",
  "The set of registered depositors",
];

export function PrivacyColumns() {
  return (
    <section>
      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-20 xl:px-32 2xl:px-40">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <p className="font-mono text-base font-medium uppercase tracking-[0.18em] text-accent">
              Transparency
            </p>
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              What stays private, what stays visible.
            </h2>
            <p className="max-w-[48ch] text-lg leading-[1.65] text-muted-foreground">
              FHEVM's access control separates what the network can read from what only your wallet can decrypt. This is the split, per user, per draw.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:col-span-7">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-medium tracking-tight text-foreground">Private</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  encrypted on-chain
                </span>
              </div>
              <ul className="space-y-4">
                {privateItems.map((item) => (
                  <li key={item} className="flex items-baseline gap-3 text-base text-foreground">
                    <span aria-hidden="true" className="font-mono text-xs tracking-wider text-primary">••••</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-medium tracking-tight text-foreground">Public</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  readable on-chain
                </span>
              </div>
              <ul className="space-y-4">
                {publicItems.map((item) => (
                  <li key={item} className="flex items-baseline gap-3 text-base text-foreground">
                    <span aria-hidden="true" className="font-mono text-xs tracking-wider text-muted-foreground">0x</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
