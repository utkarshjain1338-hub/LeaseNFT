# Demo Script — 2-Minute Walkthrough

This script guides a live 2-minute demo of LeaseNFT covering all Orange Belt features.

---

## 0:00 — Introduction (10s)

> "LeaseNFT is a permissionless NFT leasing platform built on Stellar Soroban. Two smart contracts — LeaseNFT and Treasury — communicate via cross-contract invocation. Let me show you how it works."

**Show**: Landing page at `http://localhost:3000`

---

## 0:10 — Wallet Connection (15s)

> "First, connect a Stellar wallet. LeaseNFT supports Freighter, Albedo, LOBSTR, and others via Stellar Wallets Kit."

**Do**:
1. Click "Connect Wallet"
2. Select Freighter (or any wallet)
3. Approve connection in the wallet popup

**Show**: Wallet address in navbar, network badge = "testnet"

---

## 0:25 — Treasury Architecture (20s)

> "Before listing, let me explain the inter-contract communication. When a lease is created, LeaseNFT automatically calls Treasury.deposit_fee() on-chain — a cross-contract invocation built with Soroban's contractclient macro."

**Show**: `docs/architecture.md` diagram (or draw on screen)

```
LeaseNFT.lease_nft() → Treasury.deposit_fee() → balance++
```

---

## 0:45 — List NFT (25s)

> "Let's list an NFT for lease."

**Do**:
1. Navigate to App → List NFT form
2. Fill: Token ID = `DEMO_NFT_001`
3. Fill: Token Address = `CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`
4. Fill: Daily Rate = `100` (stroops)
5. Fill: Max Duration = `30` (days)
6. Click "List NFT"
7. Approve in wallet

**Show**: Toast "NFT listed!", transaction hash, "View on Explorer" link

---

## 1:10 — Lease NFT (20s)

> "The listing now appears in the grid. Let's lease it."

**Do**:
1. In the listings grid, find the new listing (Listing #N)
2. Enter duration: `7` days
3. Click "Lease"
4. Approve in wallet

**Show**: 
- Toast "NFT leased!"
- Listing badge changes from "Available" → "Leased"
- Treasury cross-contract call fired on-chain

---

## 1:30 — Activity Feed (15s)

> "The Activity Feed streams contract events in real-time via incremental polling with cursor tracking — no manual refresh needed."

**Show**:
1. Navigate to Dashboard
2. Point to Activity Feed showing "Lease NFT" event
3. Show TX status: pending → success → explorer link

---

## 1:45 — Explorer + CI/CD (15s)

> "Every transaction is on-chain and verifiable. The project also has a full CI/CD pipeline."

**Show**:
1. Click "View on Explorer" — shows Stellar Expert
2. Show `.github/workflows/ci.yml` — contract tests, lint, build

---

## 2:00 — End

> "LeaseNFT: two Soroban contracts, 36 passing tests, Playwright e2e, GitHub Actions CI/CD, service-layer architecture, and event streaming. All deployed on Stellar Testnet."

---

## Key Points to Emphasize

| Feature | Evidence |
|---------|----------|
| Inter-contract communication | `lib.rs` → TreasuryClient cross-contract call |
| 90%+ test coverage | `cargo test` → 24 + 12 = 36 passing |
| CI/CD pipeline | `.github/workflows/` |
| Service layer | `src/services/` |
| Typed error handling | `src/lib/errors.ts` |
| Zod env validation | `src/lib/env.ts` |
| Event streaming with cursor | `src/services/eventService.ts` |
| Playwright e2e | `tests/e2e/*.spec.ts` |
| Deployment automation | `scripts/deploy_contract.sh` |
