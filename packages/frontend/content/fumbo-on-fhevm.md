# Building Fumbo: A confidential no-loss prize savings on FHEVM

One of the most elegant financial primitives DeFi has borrowed from traditional finance is prize-linked savings. A user deposits principal that stays safe while the pool it sits in yields rewards, and one depositor wins per draw, weighted by how much they saved. The options are either winning a prize or walking away with the whole of your principal. This is a mechanism that PoolTogether has proved to work even at scale. Sounds cool, right?

However, there is a problem! On a transparent chain, everyone can see how much you saved, what your odds are, and who won every draw. This then raises issues like whales getting doxxed, wallets being profiled and small savers that could be part of the prize protocol scared away.

Fumbo (Swahili word for mystery or parable) is my attempt to fix that using Zama's FHEVM. Deposits and balances stay encrypted. Winner selection runs on ciphertext with an FHE-generated random number. The winner is never announced publicly onchain, so only the winner learns they won. Each draw's prize amount stays publicly decryptable so anyone can verify the pot exists, but nothing about individual positions or the winner leaks.

It's live on Sepolia right now.

**Try it:** https://fumbo-nu.vercel.app/

**Source:** https://github.com/CECILIA-MULANDI/Fumbo

## How it works

A user claims some test cUSDT from our in-app faucet and makes a deposit it into the pool, and their principal just sits there safely, we never touched by the prize logic itself. After every 15 minutes any wallet can permissionlessly trigger a draw, and the prize for that draw is whatever yield would have accrued on the pool during that interval. One depositor gets picked, weighted by how much they've deposited, and if they claim within 24 hours the prize is sent to them through a confidential transfer. However, if they don't claim in time, the pot just rolls forward into the next draw and whenever they want their money back, they can withdraw their principal at any point.

That part is standard prize-linked savings! Well, I think what actually matters is that none of the sensitive data leaks. Nobody can see how much you deposited, what your odds of winning are, or whether you won any particular draw.

## What stays encrypted, what leaks

**Encrypted onchain (only the owner can decrypt via EIP-712):**

- Your deposit amount and running pool balance
- Each withdrawal amount
- The winner index for every draw
- Whether you personally won any given draw
- The pool's reserve, pot, and cumulative accrued yield
- Prize routing to non-winners (via `FHE.select` on ciphertext, so their zero payouts look identical to the real one)

**Public by design (readable or KMS-decryptable onchain):**

- The pool's total deposits, KMS-decryptable so the draw contract can bound the RNG to a valid range and anyone can audit pool TVL
- Each draw's prize amount, KMS-decryptable so the pot size is visible before you decide whether to participate
- The set of registered depositor addresses (a boolean membership flag, never the amounts)
- Draw cadence, state, timing, and every contract call

The pool's total and each draw's prize are public because a prize-savings protocol needs a visible pot and provably-fair math for anyone to trust the mechanic. The depositor address list is public because winner selection has to walk over it on ciphertext. But none of that tells you how much any specific person has saved, and the winner itself stays encrypted through the entire flow.

## Three FHE primitives that make the whole protocol work

Most of what makes Fumbo work really comes down to three FHEVM primitives, used at the right moments. If you're building confidential DeFi on FHEVM, I think these are the three patterns worth understanding before you write any other code.

### 1. `FHE.min` for confidential withdrawals

One thing we needed to figure out was how to let users withdraw without leaking their balance in the process. The obvious approach would be to check whether they have enough and revert if they don't, but that revert itself becomes a problem. Even though the requested amount is encrypted, whether a transaction reverts or succeeds is completely public on the chain, so if we reverted on an overdraw, anyone watching would immediately learn that this address had less than the amount they asked for. That is NOT what we want!

This is the pattern that actually works is to clamp on ciphertext instead:

```solidity
euint64 requested = FHE.fromExternal(encAmount, proof);
euint64 amount = FHE.min(requested, encBalanceOf[msg.sender]);
encBalanceOf[msg.sender] = FHE.sub(encBalanceOf[msg.sender], amount);
token.confidentialTransfer(msg.sender, amount);
```

On the Fumbo UI we actually catch this at the frontend as soon as you've decrypted your own balance for yourself. The button just disables, and you get an inline error telling you your real balance so nothing wasteful gets submitted. But the frontend check is only a convenience for you, and it depends on you having decrypted your balance first. The real safety guarantee lives inside the contract. Even if a request for more than you have somehow reaches it, the contract will not revert. It clamps your requested amount down to whatever you actually have in the pool and transfers that instead. Nobody watching the chain can tell whether the amount you asked for was equal to your balance, higher, or lower, because from the outside every withdrawal looks completely identical.

### 2. Weighted selection on ciphertext with `FHE.randEuint64`

This is where I think the whole protocol pivots. `FHE.randEuint64` gives us an encrypted uniform random value drawn onchain, we XOR it with `block.prevrandao` (so a single malicious actor with control of either the KMS network or the block proposer isn't enough), and then take that modulo `totalDeposits` to get an encrypted offset into the pool. From there we walk the depositor list on ciphertext, accumulating each depositor's encrypted balance as we go, and whoever's cumulative range happens to contain that offset ends up being the winner.

There's a subtle constraint hiding in that description that took me a while to work through. `FHE.rem` on FHEVM needs a plaintext divisor, but `totalDeposits` is stored encrypted. If we skipped the mod and let the RNG range span the full pool cap instead, we'd have a nasty statistical bug where the RNG almost never lands inside the actual cumulative range (the cap is sized for the theoretical maximum pool, and any real pool is a small fraction of that), so most draws would produce no winner at all.

The fix is to make `totalDeposits` publicly decryptable, hand the ciphertext to the KMS network to decrypt off-chain, and have `triggerDraw` accept the plaintext plus the KMS signatures as arguments. `FHE.checkSignatures` verifies the plaintext really came from the KMS decryption of the on-chain handle, and then `FHE.rem(rMixed, plaintextTotal)` is safe. This costs one KMS round trip per draw, but keeps the fairness guarantee end to end. Individual balances never enter the KMS decryption path.

The rest of the computation stays in ciphertext from start to finish, and the resulting winner index is stored as an encrypted `euint32` that nothing outside the contract can decrypt directly. What individual depositors get is a handle they can query through `didIWin` to learn whether they specifically won, without any information leaking about who else did or didn't win.

There are two tradeoffs I think are worth me mentioning:

- The algorithm is O(n) in depositors per draw. For thousands of participants you'd want a segment-tree structure that batches range checks. For a pool with tens of depositors, O(n) is fine.
- The random value is uniform, but selection is weighted by deposit balance, so bigger depositors win proportionally more often. That matches PoolTogether's mechanic exactly, translated to encrypted state.

### 3. `FHE.select` for confidential prize routing

Now when it's time to actually pay out the prize, we run into a subtle problem. The prize amount for each draw is already public, you can see it right on the draws card in the UI. What has to stay hidden is who actually receives it. If we just called `transfer` on the winner's address directly, that single transaction would immediately expose the winner at the network layer, because anyone watching the chain would see one specific address suddenly receiving funds from the pool.

The trick is to run a transfer transaction for every single depositor, not just the winner. For each depositor, the amount transferred is either the real prize (if they won) or zero, wrapped in `FHE.select` so the decision itself stays encrypted:

```solidity
ebool isWinner = FHE.eq(encWinnerIndex, FHE.asEuint32(i));
euint64 payout = FHE.select(isWinner, prize, FHE.asEuint64(0));
token.confidentialTransfer(depositor, payout);
```

From the outside, every depositor receives an identical-looking confidential transfer. The amounts are encrypted, so nobody watching can tell which transfer actually moved value and which was a hidden zero. Only one of them did, and that's the winner. Everyone else "received" an encrypted zero, which is a real transaction but changes nothing about their balance.

## The winner-only reveal

The other design decision I want to walk through is how a user actually finds out they won. There is no public `WinnerAnnounced` event that an indexer could scrape to dox recent winners, and no admin sitting somewhere pushing a notification. Instead, each depositor has to call `didIWin(drawId)` for themselves, and the contract returns an `ebool` that only that specific caller can decrypt via EIP-712.

```solidity
function didIWin(uint32 drawId, address user) external returns (ebool) {
    uint32 idx = pool.indexOf(user);
    ebool result = FHE.eq(_encWinnerIndex[drawId], FHE.asEuint32(idx));
    FHE.allow(result, msg.sender);
    revealedIsWinner[drawId][user] = result;
    emit WinnerRevealed(drawId, user, result);
    return result;
}
```

There are two subtleties buried in that code that took me a while to get right. First, the ACL is granted specifically to `msg.sender`, so only the caller can hand the returned handle to the relayer and decrypt it. Second, we also store that same handle in a `revealedIsWinner` mapping, which looks redundant at first because the function already returns the handle. Here's why we still need it.

The frontend has to pass the handle to the relayer for EIP-712 decryption, which means we need a stable way to read that handle back after the tx confirms. If we tried to grab it from an `eth_call` simulation of the function, we'd hit a subtle bug I only found the hard way. FHEVM handles produced during simulation can differ from the handles the actual transaction produces, so the handle the frontend thinks it should use ends up being one the tx never granted ACL for. The relayer then rejects it with a "not entitled to decrypt" error, and the user just sees a broken reveal.

Storing the handle in the mapping is our way around that. The frontend reads it back through a plain view function on `revealedIsWinner`, and it's guaranteed to be the exact same handle the tx wrote and granted ACL for. That one cost me a full afternoon to figure out, lol!

## Permissionless draws with rollover

Draws happen on a fixed cadence, but nobody in particular has special access to trigger them. There's no admin key involved, and there's no keeper we quietly rely on either. Any wallet at all can call `triggerDraw` once the cadence interval has elapsed, and if the winner doesn't claim within their 24-hour claim window, any wallet can also call `expireDraw`, which rolls that unclaimed prize forward into the next draw's pot as a side effect. Nothing gets lost in the process, and nobody sits in the middle deciding who wins or when.

This might look like a small design decision, but the consequences show up quickly once you think about failure modes. A prize-savings protocol whose draws depend on a single keeper is one keeper failure away from silently pausing prizes for everyone at once. Making the trigger permissionless means that any participant, or even a small bot running in the background, can keep the mechanic ticking regardless of what any single actor decides to do.

## What's live on Sepolia

- Three verified contracts on Etherscan: a cUSDT test token (ERC-7984), FumboPool, and DrawRegistry
- An in-app faucet that mints 1,000 test cUSDT per click
- The full loop end to end: connect your wallet, make a deposit, decrypt your pool balance via EIP-712 permit, trigger a draw, reveal whether you won, claim, and withdraw
- Global toast feedback for every transaction, with specific messages for approval, permit, insufficient balance, and network mismatch cases
- A landing page that explains the mechanic before you connect a wallet, and an app screen that assumes you're ready to use it

On the frontend, the Zama SDK integration uses the v3 React hooks (`useEncrypt`, `useDecryptValues`, `useGrantPermit`, `useHasPermit`, `useConfidentialSetOperator`) alongside wagmi v2 and rainbowkit. One thing I ended up pinning was the Sepolia RPC transport, because I ran into a subtle bug earlier on: if your dApp writes a transaction and then immediately reads state, and those reads happen to land on a different node that hasn't propagated the write yet, users see stale data and assume the whole thing failed. Pinning to a single node turned out to be the easiest fix.

---

## What's not production yet

The bounty asks whether a real user could trust Fumbo with real money today, and honestly there are a few gaps that would need closing first.

- **APR is mocked.** The prize reserve on Sepolia is admin-funded, whereas a real deployment would plug into a lending market or a staked-ETH derivative and let real yield accrue on the pooled deposits. The README documents where that integration would slot in.
- **No formal audit.** The contracts have a test suite covering the core invariants like no-loss on withdraw, only-depositors-can-win, over-withdraw clamping, and rollover math, but that is not the same thing as a proper audit by a third party.
- **O(n) winner selection.** The current loop is fine at Sepolia scale, but with thousands of depositors it becomes prohibitive, and a segment-tree balance accumulator would need to replace it.
- **No rate limiting on the faucet.** Anyone can mint test cUSDT freely right now, which is fine because it's test tokens, but a production deployment would need proper access control there.
- **Sepolia only.** FHEVM mainnet is coming, and Fumbo will move when it does.

I don't think any of these are dealbreakers though, and each one has a documented path forward in the README.

---

## Try it

**Try it:** https://fumbo-nu.vercel.app/

**Source:** https://github.com/CECILIA-MULANDI/Fumbo

Claim some test cUSDT from the in-app faucet, deposit any amount you want, and watch the draw counter tick down. You can trigger a draw yourself when the time comes, check whether you won, and pull your principal out whenever you feel like it. All of that runs on Sepolia, with every private piece of state encrypted onchain.

Fumbo was built for the Zama Developer Program Season 4 Bounty. If you try it and something feels off, or you find something surprising or broken, please open an issue on the repo.
