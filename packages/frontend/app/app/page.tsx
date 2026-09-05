import { AppNav } from "@/components/app/app-nav";
import { BalanceCard } from "@/components/app/balance-card";
import { ConnectGate } from "@/components/app/connect-gate";
import { DepositCard } from "@/components/app/deposit-card";
import { DrawsCard } from "@/components/app/draws-card";
import { GettingStartedCard } from "@/components/app/getting-started-card";
import { WalletBalanceCard } from "@/components/app/wallet-balance-card";
import { WinnerReveal } from "@/components/app/winner-reveal";
import { WithdrawCard } from "@/components/app/withdraw-card";

export default function AppPage() {
  return (
    <>
      <AppNav />
      <ConnectGate>
        <main className="px-6 py-12 md:px-12 md:py-16 lg:px-20 xl:px-32 2xl:px-40">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-10">
            <header>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
                Your pool.
              </h1>
            </header>

            <GettingStartedCard />

            <WinnerReveal />

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
