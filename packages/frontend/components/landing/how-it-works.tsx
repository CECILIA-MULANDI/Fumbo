const steps = [
  {
    title: "Deposit cUSDT",
    body: "Your deposit is transferred as an encrypted amount. Your individual balance stays encrypted per user. Only the aggregate pool total is KMS-decryptable, so draws can be provably fair.",
  },
  {
    title: "Yield accrues",
    body: "The pool's total earns lending yield. Interest compounds into an encrypted prize reserve on-chain.",
  },
  {
    title: "Anyone triggers the draw",
    body: "Every 15 minutes the draw window opens. Any wallet can call triggerDraw and pay the gas. No admin, no keeper, no scheduled job.",
  },
  {
    title: "Weighted selection on ciphertext",
    body: "A verifiable random cursor sweeps the encrypted balances. The winner index and prize amount are computed without ever decrypting a deposit.",
  },
  {
    title: "Winner decrypts privately",
    body: "Only the winner's wallet can decrypt the isWinner flag. Everyone else sees a completed draw with no visible recipient. Claim within 24 hours.",
  },
  {
    title: "Withdraw any time",
    body: "Principal is always withdrawable, encrypted end to end. If your draw goes unclaimed, anyone can roll the prize into the next round.",
  },
];

export function HowItWorks() {
  return (
    <section id="how">
      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-20 xl:px-32 2xl:px-40">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <p className="font-mono text-base font-medium uppercase tracking-[0.18em] text-accent">
              How it works
            </p>
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              Six steps. Zero disclosed balances.
            </h2>
            <p className="max-w-[46ch] text-lg leading-[1.65] text-muted-foreground">
              Every step runs over encrypted state. The pool never learns your balance, and the network never sees who won.
            </p>
          </div>

          <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:col-span-7">
            {steps.map((step) => (
              <li key={step.title} className="flex flex-col gap-3 bg-card p-8">
                <h3 className="text-xl font-medium tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="text-base leading-[1.7] text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
