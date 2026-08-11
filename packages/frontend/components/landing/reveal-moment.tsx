"use client";

import { motion, useReducedMotion } from "motion/react";

export function RevealMoment() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-muted/20">
      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-20 xl:px-32 2xl:px-40">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <p className="font-mono text-base font-medium uppercase tracking-[0.18em] text-accent">
              The reveal
            </p>
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              Only you learn you won.
            </h2>
            <p className="max-w-[48ch] text-lg leading-[1.7] text-muted-foreground">
              The pool contract selects a winner over encrypted balances. Nothing on-chain reveals your address as the recipient. The prize is transferred as an encrypted amount your wallet can decrypt.
            </p>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 md:py-20 lg:col-span-7">
            <div className="relative flex h-32 w-full items-center justify-center">
              {reduce ? (
                <p className="font-mono text-5xl font-medium tabular-nums tracking-tight text-foreground md:text-7xl">
                  847.00 <span className="text-2xl text-muted-foreground md:text-3xl">cUSDT</span>
                </p>
              ) : (
                <motion.div
                  className="relative"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.6 }}
                  variants={{ hidden: {}, visible: {} }}
                >
                  <motion.span
                    className="absolute inset-0 flex items-center justify-center font-mono text-5xl tracking-[0.4em] text-muted-foreground md:text-7xl"
                    variants={{
                      hidden: { opacity: 1 },
                      visible: { opacity: 0 },
                    }}
                    transition={{ duration: 0.5, delay: 1.4 }}
                    aria-hidden="true"
                  >
                    •••• ••••
                  </motion.span>
                  <motion.p
                    className="font-mono text-5xl font-medium tabular-nums text-foreground md:text-7xl"
                    variants={{
                      hidden: { opacity: 0, filter: "blur(8px)", letterSpacing: "0.3em" },
                      visible: { opacity: 1, filter: "blur(0px)", letterSpacing: "0em" },
                    }}
                    transition={{ duration: 1.2, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    847.00 <span className="text-2xl text-muted-foreground md:text-3xl">cUSDT</span>
                  </motion.p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
