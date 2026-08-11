const steps = [
  {
    title: "Deposit cUSDT",
    body: "Your deposit is transferred as an encrypted amount. The pool never learns your individual balance, only the encrypted total.",
  },
  {
    title: "Yield accrues",
    body: "The pool's total earns lending yield. Interest compounds into an encrypted prize reserve on-chain.",
  },
  {
    title: "One draw per week",
    body: "A verifiable random weight-selects one depositor. The winner index and prize amount are computed on ciphertext.",
  },
  {
    title: "Winner decrypts privately",
    body: "Only the winner's wallet holds the decryption key. Everyone else sees a completed draw with no visible recipient.",
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
              Four steps. Zero disclosed balances.
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
