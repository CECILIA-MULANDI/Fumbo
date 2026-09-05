<p align="center">
  <img src="./docs/logo.svg" alt="Fumbo" width="72" />
</p>

<h1 align="center">Fumbo</h1>

<p align="center">Confidential no-loss prize savings on Sepolia.</p>

<p align="center">
  <a href="https://fumbo-nu.vercel.app/">Live app</a>
  ·
  <a href="https://www.loom.com/share/fa8a9a34e3bc4afebcf76912e2c1628c">Demo video</a>
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

Permissionless. [`DrawRegistry.triggerDraw(plaintextTotal, decryptionProof)`](packages/contracts/contracts/DrawRegistry.sol#L86):

```
// caller passes KMS-decrypted totalDeposits + KMS signature proof
FHE.checkSignatures([handle(encTotalDeposits)], plaintextTotal, decryptionProof)

encYield = encTotalDeposits * aprBps * elapsed / (BPS * SECONDS_PER_YEAR)
prizePot.accrue(encYield)                      // reserve -> pot
encPrize = prizePot.snapshot()                 // drains pot
FHE.makePubliclyDecryptable(encPrize)          // pot size is public; winner is not

rMixed = FHE.xor(FHE.randEuint64(poolCapPow2),
                 block.prevrandao & (poolCapPow2 - 1))
r      = FHE.rem(rMixed, plaintextTotal)       // bound to actual deposit range

for i in depositors:
    cumsum += encBalance[i]
    winnerIdx = FHE.select(FHE.lt(r, cumsum) && !foundYet, i+1, winnerIdx)
    foundYet |= FHE.lt(r, cumsum)
```

`FHE.rem` requires a plaintext divisor, so `encTotalDeposits` is marked publicly decryptable and every caller retrieves the KMS-signed plaintext via the relayer before triggering. `FHE.checkSignatures` proves on-chain that `plaintextTotal` is the KMS-network's decryption of the current handle, so no griefer can pass a wrong total to skew selection. Individual balances stay encrypted through this whole flow, only the aggregate is decrypted.

Winner index and prize sit encrypted per draw. `didIWin(drawId, addr)` grants ACL of an `ebool` to the caller and persists the handle in `revealedIsWinner[drawId][user]` so the frontend reads back the exact handle the tx granted ACL for. Handles are then locally decrypted via user permit. `claim` calls `PrizePot.release`, which gates the payout with `FHE.select(isWinner, encPrize, 0)`. Non-winners silently receive zero.

The prize sits until `CLAIM_TIMEOUT_SECS = 86400`, then anyone calls `expireDraw` and `rollover` returns the prize to `_encPot` for the next draw.

## What's encrypted

`euint64` unless noted. Never leaves ciphertext except via user EIP-712 decrypt (individual state) or KMS public decryption (aggregate state, explicitly marked below).

- Per-user balances (`FumboPool`, `euint64`, user-decryptable only)
- Reserve, pot, cumulative yield accrued (`PrizePot`, `euint64`)
- Per-draw winner index (`euint32`, ACL restricted)
- Winner identity (only the winner's `didIWin` returns true after they decrypt)
- Prize routing to non-winners (`FHE.select` on ciphertext, so a non-winner's zero payout is indistinguishable from the real one)

## What's public by design

1. **Pool's total deposits** (`_encTotalDeposits`, KMS-decryptable). Needed so `triggerDraw` can pass a KMS-verified plaintext divisor to `FHE.rem` and bound the RNG to the actual deposit range. Also lets anyone audit pool TVL. Individual balances are never in this decryption path.
2. **Per-draw prize amount** (`_encPrizeAmount[drawId]`, KMS-decryptable). Pot size has to be visible for the mechanic to be trusted.
3. **Depositor address set** (`depositors[]` array, plaintext). Being a depositor is public because the sweep has to walk over it on ciphertext. Deposit size stays encrypted.

## What else leaks

1. Admin's one-time reserve funding amount, broadcast in plaintext at deploy ([`fundReserve.ts`](packages/contracts/scripts/fundReserve.ts)).
2. Protocol parameters: `APR_BPS=500`, `DRAW_INTERVAL_SECS=900`, `CLAIM_TIMEOUT_SECS=86400`, `POOL_CAP_POW2=2^40`, `MAX_DEPOSITORS=100`.
3. Tx metadata (`msg.sender`, `block.timestamp`) for deposit / withdraw / trigger / claim. Amounts stay hidden.
4. Modular bias in RNG. `r = rMixed mod plaintextTotal` where `rMixed` spans `[0, POOL_CAP_POW2)`. Bias is negligible as long as `POOL_CAP_POW2 >> plaintextTotal` (~2^40 vs a demo-scale pool). A production deploy sizes `POOL_CAP_POW2` above the expected pool ceiling to keep bias in the noise.

## Trust model

Who has to be trusted for the guarantees below to hold, and why.

- **Threshold KMS network.** The keys that gate ciphertext decryption are held by a threshold MPC set. A majority collusion would let the operators decrypt any handle without on-chain ACL. This is the Zama network's standing assumption for FHEVM.
- **Ethereum validators, for RNG only.** `FHE.randEuint64` output is XOR'd with `block.prevrandao` from the trigger block. A validator that controls proposal for the trigger block can influence half the entropy, but only if they also compromise the KMS majority can they bias the winner selection. Neither on its own is enough.
- **Deployer.** Immutable role after wiring. `PrizePot.wire` and `FumboPool.setDrawRegistry` are one-shot (`if (wired) revert AlreadyWired`); deployer cannot swap in a malicious `DrawRegistry` or drain the reserve. Only privileged post-wire action is `fundReserve`, which adds funds and broadcasts the amount in plaintext.
- **Anyone.** No privileged caller for `triggerDraw`, `expireDraw`, or the token faucet. The draw loop keeps running even if the deployer disappears.

## Security invariants

Enforced in the contracts, exercised by [`FumboPool.test.ts`](packages/contracts/test/FumboPool.test.ts).

1. **No loss.** `FumboPool.withdraw` clamps the requested amount against the encrypted balance with `FHE.min`, so principal is always at most fully returned, never overdrawn.
2. **No overpay from the reserve.** `PrizePot.accrue` clamps the moved amount against `_encReserve` with `FHE.min` before moving reserve into pot. The protocol cannot promise more prize than it holds.
3. **No double claim per draw.** `FumboPool.claim` reverts with `AlreadyClaimed` if `drawRegistry.claimed(drawId, msg.sender)` is already `true`.
4. **No rollover of a claimed draw.** `DrawRegistry.expireDraw` only calls `prizePot.rollover` when `!hasAnyClaim`. A draw that produced a legitimate claim never has its prize double-issued.
5. **ACL-restricted reveal.** `didIWin` grants ACL of the `isWinner` ebool only to `msg.sender`. No other party can decrypt whether a given address won a given draw.
6. **Winner selection is verifiable.** Anyone can re-simulate `triggerDraw` from the on-chain state. The RNG contribution from Zama's KMS is a public output; `block.prevrandao` is a public value; the encrypted balance sweep is deterministic on the stored ciphertexts.

## Not production yet

Explicit list of things that need to change before mainnet, so this repo doesn't pretend otherwise.

1. **Yield is mocked.** The prize source is an admin-funded reserve accruing at a constant plaintext APR. Real deployment replaces `_encReserve` with an ERC-4626 vault position (Aave, Morpho, sDAI) and swaps `accrue(euint64)` for an `accrueFromVault()` that reads `aToken.balanceOf(prizePot)` delta since the last snapshot. `FumboPool` and `DrawRegistry` are unchanged.
2. **No formal audit.** Contracts follow well-worn FHEVM patterns and have full happy-path plus edge-case tests, but no professional auditor has reviewed them. Mainnet deploy requires an audit.
3. **Fixed depositor cap.** `MAX_DEPOSITORS = 100` is the single-tx sweep ceiling under Sepolia's 30M gas limit. Production either pages the sweep (`triggerDrawChunk(k)` pattern, cursor persisted across chunks) or moves to Merkle-based sampling for larger pools. Not urgent for a small-community deployment.
4. **Deployer's initial funding amount is public.** `fundReserve` broadcasts the reserve amount once at deploy. All subsequent movement is encrypted, but the launch amount is a leak by design (the deployer chose to publicize it).
5. **RPC and relayer trust.** The frontend pins `ethereum-sepolia-rpc.publicnode.com` for reads and writes, and reaches Zama's relayer at `relayer.testnet.zama.org`. A production frontend either lets users bring their own RPC or runs its own indexer.

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

All four contracts are source-verified on Sepolia Etherscan. Click any address to read the source and confirm the deployed bytecode matches this repo.

| Contract | Address |
| --- | --- |
| MockConfidentialUSDT | [`0x3298c2f69958170343641304aAe2Da4aa259F1cA`](https://sepolia.etherscan.io/address/0x3298c2f69958170343641304aAe2Da4aa259F1cA#code) |
| PrizePot | [`0x3fa5BacD200C4CF5A59Afb76EC2Be86BC6a81b8D`](https://sepolia.etherscan.io/address/0x3fa5BacD200C4CF5A59Afb76EC2Be86BC6a81b8D#code) |
| FumboPool | [`0xF3c5699e449086CaaC4A3751dE9fAc4839ee540b`](https://sepolia.etherscan.io/address/0xF3c5699e449086CaaC4A3751dE9fAc4839ee540b#code) |
| DrawRegistry | [`0x04E1a7A571239492493817F7d995920c6a3f62Fe`](https://sepolia.etherscan.io/address/0x04E1a7A571239492493817F7d995920c6a3f62Fe#code) |

Also written to [`addresses/sepolia.json`](packages/contracts/addresses/sepolia.json) on every deploy.

## Tests

```
cd packages/contracts && npx hardhat test
```

## License

MIT.
