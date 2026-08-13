const items = [
  {
    q: "Is my principal at risk?",
    a: "No. Deposits stay in the pool and only the accrued yield is used as the prize. Withdraw your full deposit at any time — there are no lockups.",
  },
  {
    q: "How is the winner chosen without revealing who deposited?",
    a: "The contract runs a weighted random selection directly over encrypted balances. The winner index is derived on ciphertext and the corresponding address is granted an encrypted claim.",
  },
  {
    q: "What token does the pool accept?",
    a: "Confidential USDT (cUSDT), a Zama-native ERC-7984 confidential token. Support for additional yield-bearing confidential tokens is planned for V2.",
  },
  {
    q: "Can the pool operator see my balance?",
    a: "No. The operator address holds no decryption key for user balances. FHEVM's access control enforces per-address decrypt permissions at the runtime level, not through convention.",
  },
  {
    q: "What happens if the winner never claims?",
    a: "After a fixed claim window, the prize rolls over into the next draw's reserve. No principal is affected.",
  },
  {
    q: "Where does the yield come from?",
    a: "On testnet, the prize reserve is seeded by the deployer and accrues at a fixed simulated APR against the pool's encrypted total. The contract interface is yield-source agnostic — the mainnet path plugs the same accrual into a lending market like Aave.",
  },
];

export function Faq() {
  return (
    <section id="faq">
      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-20 xl:px-32 2xl:px-40">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <p className="font-mono text-base font-medium uppercase tracking-[0.18em] text-accent">
              Questions
            </p>
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              Anything else worth asking.
            </h2>
            <p className="max-w-[46ch] text-lg leading-[1.65] text-muted-foreground">
              The mechanics people ask about most. If yours isn't here, open an issue on GitHub.
            </p>
          </div>

          <div className="divide-y divide-border lg:col-span-7">
            {items.map((item) => (
              <details key={item.q} className="group py-5 first:pt-0">
                <summary className="flex cursor-pointer items-center justify-between gap-6 text-lg font-medium text-foreground marker:hidden">
                  {item.q}
                  <span className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5">
                      <path d="M6 1 L6 11 M1 6 L11 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 max-w-[62ch] text-base leading-[1.7] text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
