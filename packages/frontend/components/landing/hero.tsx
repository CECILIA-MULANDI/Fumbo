"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/wallet/connect-button";

export function Hero() {
  return (
    <section className="relative">
      <div className="px-6 pt-16 pb-20 md:px-12 md:pt-20 md:pb-24 lg:px-20 xl:px-32 2xl:px-40">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col justify-start gap-6 lg:col-span-5">
            <p className="font-mono text-base font-medium uppercase tracking-[0.18em] text-accent">
              Confidential Prize Savings
            </p>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-6xl xl:text-[68px]">
              A no-loss prize pool where only the winner knows they won.
            </h1>
            <p className="max-w-[52ch] text-lg leading-[1.65] text-muted-foreground md:text-xl">
              Deposit cUSDT, keep your principal. Yield funds a weekly draw. Balances and winners stay encrypted. On Ethereum, via FHEVM.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WalletConnectButton
                className="h-12 rounded-md px-6 text-base font-medium"
                connectedHref="/app"
              />
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href="https://github.com/CECILIA-MULANDI/Fumbo#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                className="h-12 rounded-md px-6 text-base font-medium"
              >
                Read the docs
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-7">
            <BalanceCardPreview />
            <ActivityFeed />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              Illustration. Preview values, not live testnet data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BalanceCardPreview() {
  const reduce = useReducedMotion();

  return (
    <div className="relative w-full">
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Your balance
          </p>
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            encrypted
          </span>
        </div>

        <div className="mt-6 h-20">
          {reduce ? (
            <p className="font-mono text-5xl font-medium tabular-nums tracking-tight text-foreground md:text-6xl">
              847.00
              <span className="ml-3 text-lg text-muted-foreground">cUSDT</span>
            </p>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.p
                className="font-mono text-5xl font-medium tabular-nums tracking-[0.15em] text-foreground md:text-6xl"
                initial={{ letterSpacing: "0.4em", filter: "blur(6px)" }}
                animate={{ letterSpacing: "0em", filter: "blur(0px)" }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              >
                <motion.span
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: 0.9 }}
                  className="absolute"
                  aria-hidden="true"
                >
                  •••• ••••
                </motion.span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 1.0 }}
                >
                  847.00<span className="ml-3 text-lg text-muted-foreground">cUSDT</span>
                </motion.span>
              </motion.p>
            </motion.div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Next draw
            </p>
            <p className="mt-1.5 font-mono text-base tabular-nums text-foreground">3d 14h 22m</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Current prize
            </p>
            <p className="mt-1.5 font-mono text-base tabular-nums text-foreground">84.20 cUSDT</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const activityRows = [
  { kind: "Deposit", time: "2h ago", amount: "•••• cUSDT", party: "from 0x1a…9f2" },
  { kind: "Draw #41 settled", time: "yesterday", amount: "•••• cUSDT", party: "to ••••••" },
  { kind: "Deposit", time: "3d ago", amount: "•••• cUSDT", party: "from 0x7b…c04" },
  { kind: "Draw #40 settled", time: "1w ago", amount: "•••• cUSDT", party: "to ••••••" },
];

function ActivityFeed() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="mb-5 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Pool activity
        </p>
        <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          amounts encrypted
        </span>
      </div>
      <ul className="divide-y divide-border/50">
        {activityRows.map((r) => (
          <li key={`${r.kind}-${r.time}`} className="grid grid-cols-12 items-baseline gap-3 py-3.5 text-sm">
            <div className="col-span-5">
              <p className="text-foreground">{r.kind}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.time}</p>
            </div>
            <div className="col-span-3 font-mono tabular-nums text-foreground">
              {r.amount}
            </div>
            <div className="col-span-4 truncate text-right font-mono text-xs text-muted-foreground">
              {r.party}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
