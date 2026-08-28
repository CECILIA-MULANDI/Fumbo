<p align="center">
  <img src="./docs/logo.svg" alt="Fumbo" width="72" />
</p>

<h1 align="center">Fumbo</h1>

<p align="center">Confidential no-loss prize savings on Sepolia.</p>

<p align="center">
  <a href="https://fumbo-nu.vercel.app/">Live app</a>
  ·
  <a href="https://github.com/CECILIA-MULANDI/Fumbo">Repo</a>
  <!-- before submission, add: · <a href="VIDEO_URL">Video</a> · <a href="X_THREAD_URL">Thread</a> -->
</p>

## What is Fumbo

A no-loss prize savings pool. Depositors put cUSDT in, keep their principal (withdraw any time), and the pool's yield funds a prize that goes to one weighted-random depositor every 15 minutes. It's the PoolTogether pattern, rebuilt on Zama's FHEVM so individual deposit sizes, per-depositor odds, and the winner's identity all stay encrypted end-to-end. Only the winner learns they won.

## Try it

1. Open the [live app](https://fumbo-nu.vercel.app/) on Sepolia.
2. Click "Get 1,000 test cUSDT" to faucet the mock token.
3. Deposit, then "Reveal" your balance (one EIP-712 permit signature).
4. When the countdown hits zero, "Trigger draw", then "Claim" if you won.
5. "Withdraw" any amount back at any time. Principal is always available; no loss.

## Contracts

Under [packages/contracts/contracts/](packages/contracts/contracts/):

- [`MockConfidentialUSDT.sol`](packages/contracts/contracts/mocks/MockConfidentialUSDT.sol). ERC-7984 test token, 6 decimals. Open `mint(address, uint64)` is the faucet.
- [`FumboPool.sol`](packages/contracts/contracts/FumboPool.sol). Encrypted per-user balances and total. `deposit` and `withdraw` take `externalEuint64 + proof`. Withdraw clamps to balance via `FHE.min`, so principal is never at risk.
- [`PrizePot.sol`](packages/contracts/contracts/PrizePot.sol). Encrypted reserve, pot, total yield. `accrue` moves reserve to pot, `snapshot` drains pot per draw, `rollover` puts unclaimed prizes back.
- [`DrawRegistry.sol`](packages/contracts/contracts/DrawRegistry.sol). Runs the draw, gates the claim window.

## Frontend

`packages/frontend`. Next.js 15 + Wagmi + [`@zama-fhe/react-sdk`](https://www.npmjs.com/package/@zama-fhe/react-sdk) v3.

- Encryption and decryption go through the Zama relayer via SDK hooks: `useEncrypt`, `useDecryptValues`, `useDecryptPublicValues`, `useGrantPermit`, `useHasPermit`, `useConfidentialBalance`.
- ERC-7984 uses `setOperator` instead of ERC-20 `approve`. First deposit triggers a one-click 30-day operator grant via `useConfidentialSetOperator`; subsequent deposits within the window skip it.
- Error surfaces: wrong network prompts a Sepolia switch, insufficient cUSDT disables the deposit button with an inline red message, missing operator triggers the "Approve pool" step automatically, failed transactions render an error banner (first message extracted via [`lib/errors.ts`](packages/frontend/lib/errors.ts)). The deposit is followed by a "Deposited ✓" success banner.
- Single-token by design (cUSDT only). No token picker means no unsupported-token error path.

## Draw mechanic

Permissionless. [`DrawRegistry.triggerDraw()`](packages/contracts/contracts/DrawRegistry.sol#L83):

```
encYield = encTotalDeposits * aprBps * elapsed / (BPS * SECONDS_PER_YEAR)
prizePot.accrue(encYield)                      // reserve -> pot
encPrize = prizePot.snapshot()                 // drains pot
FHE.makePubliclyDecryptable(encPrize)          // pot size is public; winner is not

r = FHE.xor(FHE.randEuint64(poolCapPow2),
            block.prevrandao & (poolCapPow2 - 1))

for i in depositors:
    cumsum += encBalance[i]
    winnerIdx = FHE.select(FHE.lt(r, cumsum) && !foundYet, i+1, winnerIdx)
    foundYet |= FHE.lt(r, cumsum)
```

Winner index and prize sit encrypted per draw. `didIWin(drawId, addr)` grants ACL of an `ebool` to the caller, who decrypts locally. `claim` calls `PrizePot.release`, which gates the payout with `FHE.select(isWinner, encPrize, 0)`. Non-winners silently receive zero.

If no depositor covers `r` (pool underfull), the sweep finishes with no winner. The prize sits until `CLAIM_TIMEOUT_SECS = 86400`, then anyone calls `expireDraw` and `rollover` returns the prize to `_encPot` for the next draw.

## What's encrypted

`euint64` unless noted. Never leaves ciphertext except via user EIP-712 decrypt.

- Per-user balances and total deposits (`FumboPool`)
- Reserve, pot, total yield accrued (`PrizePot`)
- Per-draw prize amount (`euint64`, made publicly decryptable so pot size is visible; winner is not)
- Per-draw winner index (`euint32`, ACL restricted)
- Winner identity (only the winner's `didIWin` returns true after they decrypt)

## What leaks

1. Admin's one-time reserve funding amount, broadcast in plaintext at deploy ([`fundReserve.ts`](packages/contracts/scripts/fundReserve.ts)).
2. Protocol parameters: `APR_BPS=500`, `DRAW_INTERVAL_SECS=900`, `CLAIM_TIMEOUT_SECS=86400`, `POOL_CAP_POW2=2^40`, `MAX_DEPOSITORS=100`.
3. Per-draw prize amount is public.
4. Tx metadata (`msg.sender`, `block.timestamp`) for deposit / withdraw / trigger / claim. Amounts stay hidden.
5. The `depositors[]` array is plaintext so the sweep can iterate. Being a depositor is public; deposit size is not.
6. If total deposits exceed `POOL_CAP_POW2` (~1.1M cUSDT at 2^40), the RNG range no longer covers the full cumulative sum and selection biases against latecomers. Not enforced on chain because comparing to encrypted `_encTotalDeposits` would require decryption. Sized well above demo scale; a production deploy would size it to a realistic pool ceiling.

## Yield source

**Mocked.** Admin funds `PrizePot` reserve with plaintext cUSDT (one-time, at deploy). Each draw, `triggerDraw` computes yield as a constant APR against total deposits over elapsed time and moves it from reserve to pot. `PrizePot.accrue` clamps to reserve via `FHE.min`, so the protocol cannot overpay.

**Real swap.** Replace `_encReserve` with a wrapped position in an ERC-4626 vault or lending market. Replace `accrue(euint64)` with `accrueFromVault()` that reads the vault's current asset value, computes the delta since last snapshot, and moves it (trivially encrypted) into `_encPot`. `FumboPool` and `DrawRegistry` are unchanged.

## Deploy

Contracts (`packages/contracts`):

```
cp .env.example .env    # MNEMONIC, INFURA_API_KEY
NODE_OPTIONS='--dns-result-order=ipv4first --network-family-autoselection-attempt-timeout=5000' \
  npx hardhat deploy --network sepolia
NODE_OPTIONS='--dns-result-order=ipv4first --network-family-autoselection-attempt-timeout=5000' \
  AMOUNT_CUSDT=5000 npx hardhat run scripts/fundReserve.ts --network sepolia
```

Frontend (`packages/frontend`):

```
cp .env.example .env.local    # NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
pnpm install
pnpm sync-contracts
pnpm dev
```

Vercel: root directory `packages/frontend`, framework preset Next.js.

## Sepolia addresses

| Contract | Address |
| --- | --- |
| MockConfidentialUSDT | `0x3298c2f69958170343641304aAe2Da4aa259F1cA` |
| PrizePot | `0x9448a49CC066A8A5C50dfE5582F8C31f64cA5A74` |
| FumboPool | `0x6ab465A82dD13badF2C06385AAc8cEbf419a0EFa` |
| DrawRegistry | `0x06491d751879757AA2b28dC633FD057A1798EdcF` |

Also written to [`addresses/sepolia.json`](packages/contracts/addresses/sepolia.json) on every deploy.

## Tests

```
cd packages/contracts && npx hardhat test
```

## License

MIT.
