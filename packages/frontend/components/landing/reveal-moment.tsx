"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

export function RevealMoment() {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

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

          <motion.div
            className="relative flex cursor-pointer select-none items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 md:py-20 lg:col-span-7"
            onHoverStart={() => setRevealed(true)}
            onHoverEnd={() => setRevealed(false)}
            onTap={() => setRevealed((r) => !r)}
          >
            <span className="absolute right-5 top-5 rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Illustration
            </span>

            {!reduce && (
              <motion.div
                className="pointer-events-none absolute left-[26%] top-[38%] flex flex-col items-start gap-2"
                animate={{
                  opacity: revealed ? 0 : 1,
                  x: revealed ? -12 : [0, 10, 0],
                  y: revealed ? -12 : [0, 6, 0],
                }}
                transition={{
                  opacity: { duration: 0.25 },
                  x: revealed
                    ? { duration: 0.3 }
                    : { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                  y: revealed
                    ? { duration: 0.3 }
                    : { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 },
                }}
                aria-hidden="true"
              >
                <div className="relative">
                  <motion.span
                    className="absolute -inset-2 rounded-full bg-accent/25"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.55, 0, 0.55] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.span
                    className="absolute -inset-2 rounded-full bg-accent/20"
                    animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    <CursorIcon />
                  </motion.div>
                </div>
                <span className="ml-7 rounded-md bg-accent px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-accent-foreground shadow-lg">
                  Hover
                </span>
              </motion.div>
            )}

            <div className="relative flex h-32 w-full items-center justify-center">
              {reduce ? (
                <p className="font-mono text-5xl font-medium tabular-nums tracking-tight text-foreground md:text-7xl">
                  847.00 <span className="text-2xl text-muted-foreground md:text-3xl">cUSDT</span>
                </p>
              ) : (
                <div className="relative">
                  <motion.span
                    className="absolute inset-0 flex items-center justify-center font-mono text-5xl tracking-[0.4em] text-muted-foreground md:text-7xl"
                    animate={{ opacity: revealed ? 0 : 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    aria-hidden="true"
                  >
                    •••• ••••
                  </motion.span>
                  <motion.p
                    className="font-mono text-5xl font-medium tabular-nums text-foreground md:text-7xl"
                    initial={{ opacity: 0, filter: "blur(8px)", letterSpacing: "0.3em" }}
                    animate={{
                      opacity: revealed ? 1 : 0,
                      filter: revealed ? "blur(0px)" : "blur(8px)",
                      letterSpacing: revealed ? "0em" : "0.3em",
                    }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    847.00 <span className="text-2xl text-muted-foreground md:text-3xl">cUSDT</span>
                  </motion.p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function CursorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-9 w-9 text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
      fill="currentColor"
      stroke="var(--accent)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M4.5 2.5 L4.5 19 L9 14.5 L11.5 20.5 L14 19.5 L11.5 13.5 L18 13 Z" />
    </svg>
  );
}
