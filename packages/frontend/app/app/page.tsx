import { AppNav } from "@/components/app/app-nav";
import { BalanceCard } from "@/components/app/balance-card";
import { ConnectGate } from "@/components/app/connect-gate";
import { DepositCard } from "@/components/app/deposit-card";
import { DrawsCard } from "@/components/app/draws-card";
import { WalletBalanceCard } from "@/components/app/wallet-balance-card";
import { WithdrawCard } from "@/components/app/withdraw-card";

export default function AppPage() {
  return (
    <>
      <AppNav />
      <ConnectGate>
        <main className="px-6 py-12 md:px-12 md:py-16 lg:px-20 xl:px-32 2xl:px-40">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-10">
            <header className="flex flex-col gap-2">
              <p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-accent">
                Confidential prize savings
              </p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
                Your pool.
              </h1>
              <p className="max-w-2xl text-base leading-[1.6] text-muted-foreground">
                Deposit cUSDT to enter this week&apos;s draw. Balances and prizes stay encrypted on
                Sepolia. Only you can decrypt yours.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <BalanceCard />
              <WalletBalanceCard />
              <DepositCard />
              <WithdrawCard />
            </div>

            <DrawsCard />
          </div>
        </main>
      </ConnectGate>
    </>
  );
}
