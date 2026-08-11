import { Button } from "@/components/ui/button";

const code = `// Every balance is an encrypted euint64 handle.
mapping(address => euint64) private _encBalance;

function deposit(externalEuint64 encAmount, bytes calldata proof) external {
    euint64 amount = FHE.fromExternal(encAmount, proof);
    _encBalance[msg.sender] = FHE.add(_encBalance[msg.sender], amount);
    FHE.allow(_encBalance[msg.sender], msg.sender);
}`;

export function DevSection() {
  return (
    <section id="developers" className="bg-muted/30">
      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-20 xl:px-32 2xl:px-40">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <p className="font-mono text-base font-medium uppercase tracking-[0.18em] text-accent">
              For developers
            </p>
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              Real FHE on Solidity.
            </h2>
            <p className="max-w-[48ch] text-lg leading-[1.65] text-muted-foreground">
              Balances are stored as encrypted <code className="font-mono text-base text-foreground">euint64</code> handles. Arithmetic runs on ciphertext through FHEVM. Only address-scoped ACL grants let a wallet decrypt.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-5">
              <Button variant="outline" className="h-11 rounded-md px-5 text-base font-medium">View contracts on GitHub</Button>
              <a href="#" className="text-base font-medium text-primary hover:underline">
                FHEVM docs
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-7">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-mono text-[11px] tracking-widest text-muted-foreground">
                FumboPool.sol
              </span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                Solidity 0.8.27
              </span>
            </div>
            <pre className="overflow-x-auto px-6 py-6 font-mono text-[13px] leading-[1.7] text-foreground">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
