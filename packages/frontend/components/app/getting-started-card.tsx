"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fumbo-tour-v2-dismissed";
const POPOVER_WIDTH = 340;
const GAP = 20;

const steps = [
  {
    target: "deposit",
    n: 1,
    title: "Faucet and deposit",
    body: "Click Get 1,000 test cUSDT for free tokens. Then type an amount and click Deposit. First deposit approves the pool for 30 days.",
  },
  {
    target: "balance",
    n: 2,
    title: "Reveal your balance",
    body: "Sign one EIP-712 permit to decrypt. Only your wallet sees the number. On chain, your balance stays encrypted.",
  },
  {
    target: "draws",
    n: 3,
    title: "Trigger a draw",
    body: "When the countdown hits zero, any wallet can call it. Winner is picked over encrypted balances, weighted by deposit size.",
  },
  {
    target: "withdraw",
    n: 4,
    title: "Withdraw any time",
    body: "Type an amount and click Withdraw. FHE.min clamps the request against your encrypted balance on chain. No loss, ever.",
  },
];

type Position = { top: number; left: number };

export function GettingStartedCard() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);

  useEffect(() => {
    setMounted(true);
    setDismissed(
      typeof window !== "undefined" &&
        window.localStorage.getItem(STORAGE_KEY) === "1",
    );
  }, []);

  useEffect(() => {
    if (!mounted || dismissed) return;
    const step = steps[current];

    function fallbackPos() {
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const POPOVER_H_EST = 260;
      setPos({
        top: viewportH - POPOVER_H_EST - 24,
        left: Math.max(16, (viewportW - POPOVER_WIDTH) / 2),
      });
    }

    const el = document.querySelector<HTMLElement>(
      `[data-tour="${step.target}"]`,
    );
    if (!el) {
      fallbackPos();
      return;
    }

    el.style.outline = "2px solid var(--accent)";
    el.style.outlineOffset = "6px";
    el.style.borderRadius = "0.75rem";
    el.style.transition = "outline-color 200ms ease";
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    function computePosition() {
      if (!el) {
        fallbackPos();
        return;
      }
      const rect = el.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const POPOVER_H_EST = 260;

      const spaceRight = viewportW - rect.right - GAP;
      const spaceLeft = rect.left - GAP;

      // Narrow viewport or no side room: dock to bottom center
      if (spaceRight < POPOVER_WIDTH && spaceLeft < POPOVER_WIDTH) {
        fallbackPos();
        return;
      }

      const placeRight = spaceRight >= POPOVER_WIDTH;
      const left = placeRight
        ? rect.right + GAP
        : rect.left - GAP - POPOVER_WIDTH;

      let top = rect.top + rect.height / 2 - POPOVER_H_EST / 2;
      top = Math.max(96, Math.min(top, viewportH - POPOVER_H_EST - 16));

      setPos({ top, left });
    }

    computePosition();
    // Recompute after smooth scroll settles
    const settleTimers = [
      window.setTimeout(computePosition, 150),
      window.setTimeout(computePosition, 500),
    ];
    window.addEventListener("scroll", computePosition, { passive: true });
    window.addEventListener("resize", computePosition);

    return () => {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.transition = "";
      settleTimers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("scroll", computePosition);
      window.removeEventListener("resize", computePosition);
    };
  }, [mounted, dismissed, current]);

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // storage disabled; dismissal is session-only
    }
  }

  if (!mounted || dismissed || !pos) return null;

  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;

  return (
    <div
      className="fixed z-30 flex flex-col gap-4 rounded-xl border border-accent/40 bg-card/95 p-5 shadow-2xl backdrop-blur-md"
      style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          Step {current + 1} of {steps.length}
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-xs text-accent">
            {step.n}
          </span>
          <span className="text-sm font-medium text-foreground">
            {step.title}
          </span>
        </div>
        <p className="text-sm leading-normal text-muted-foreground">
          {step.body}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.target}
              aria-hidden="true"
              className={
                i === current
                  ? "h-1.5 w-5 rounded-full bg-accent transition-all"
                  : "h-1.5 w-1.5 rounded-full bg-border transition-all"
              }
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={isFirst}
            className="h-8 rounded-md border border-border px-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                handleDismiss();
              } else {
                setCurrent((c) => c + 1);
              }
            }}
            className="h-8 rounded-md bg-accent px-3 font-mono text-[11px] uppercase tracking-wider text-accent-foreground transition-opacity hover:opacity-90"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
