# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 16)                     │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Home    │  │ App Page │  │Dashboard │  │  Activity Feed   │ │
│  │ (/)      │  │(/app-page│  │(/dashbd) │  │  (real-time)     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │              │              │                  │          │
│  ┌────▼──────────────▼──────────────▼──────────────────▼────────┐│
│  │                   Hooks Layer                                  ││
│  │   useContract   useWallet   useEventStream                    ││
│  └────┬──────────────────────────────────────────────────────────┘│
│       │                                                           │
│  ┌────▼──────────────────────────────────────────────────────────┐│
│  │                   Services Layer                               ││
│  │   contractService  walletService  eventService  notifySvc     ││
│  └────┬──────────────────────────────────────────────────────────┘│
│       │                                                           │
│  ┌────▼──────────────────────────────────────────────────────────┐│
│  │                   State (Zustand)                              ││
│  │   walletStore    transactionStore    eventStore                ││
│  └────┬──────────────────────────────────────────────────────────┘│
│       │                                                           │
│  ┌────▼──────────────────────────────────────────────────────────┐│
│  │                   lib/stellar.ts                               ││
│  │   callContract  readContract  signAndSend  waitForTx           ││
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS/RPC
          ┌────────────────────▼────────────────────┐
          │           Stellar Soroban RPC            │
          │    https://soroban-testnet.stellar.org   │
          └────────────────────┬────────────────────┘
                               │
          ┌────────────────────▼────────────────────┐
          │           Stellar Testnet Ledger         │
          │                                          │
          │  ┌──────────────────────────────────┐   │
          │  │     LeaseNFT Contract (WASM)      │   │
          │  │  init / list_nft / lease_nft      │   │
          │  │  end_lease / get_listing          │   │
          │  │  get_lease / get_listing_count    │   │
          │  │  get_treasury                     │   │
          │  └──────────────┬───────────────────┘   │
          │                 │ cross-contract call    │
          │  ┌──────────────▼───────────────────┐   │
          │  │     Treasury Contract (WASM)      │   │
          │  │  init / deposit_fee / withdraw    │   │
          │  │  get_balance / get_admin          │   │
          │  └──────────────────────────────────┘   │
          └──────────────────────────────────────────┘
```

## Inter-Contract Communication

When `lease_nft()` is called on the LeaseNFT contract:

```
User Wallet
    │
    │ signs transaction
    ▼
LeaseNFT.lease_nft(renter, listing_id, duration_days)
    │
    ├── validates listing (active, duration ≤ max)
    ├── calculates total_fee = daily_rate × duration_days
    ├── updates listing.active = false
    ├── stores ActiveLease { renter, start_time, end_time, total_fee }
    ├── emits "leased" event
    │
    └── if treasury_address is registered:
            │ cross-contract invocation
            ▼
        Treasury.deposit_fee(
            from_contract = LeaseNFT.address,
            listing_id,
            amount = total_fee
        )
            │
            ├── validates amount > 0
            ├── adds to treasury balance
            └── emits "deposit" event
```

## Data Flow

```
Contract Events → Soroban RPC (getEvents)
                → eventService.fetchIncrementalEvents()
                → useEventStream hook (every 10s)
                → eventStore.addEvent()
                → ActivityFeed component (auto-refresh)
```

## Folder Structure

```
LeaseNFT/
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # Unified pipeline
│   ├── contract.yml            # Rust/Soroban CI
│   └── frontend.yml            # Next.js CI
│
├── contract/                   # Soroban smart contracts
│   └── contracts/
│       ├── contract/           # LeaseNFT main contract
│       │   └── src/
│       │       ├── lib.rs      # Contract logic + inter-contract call
│       │       └── test.rs     # 24 unit tests
│       └── treasury/           # Treasury fee contract
│           └── src/
│               ├── lib.rs      # Treasury logic
│               └── test.rs     # 12 unit tests
│
├── client/                     # Next.js frontend
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # React UI components
│   │   ├── hooks/              # React hooks
│   │   │   ├── useContract.ts  # Contract interaction hooks
│   │   │   ├── useWallet.ts    # Wallet hooks
│   │   │   └── useEventStream.ts # Event streaming hook
│   │   ├── services/           # Business logic (non-React)
│   │   │   ├── contractService.ts
│   │   │   ├── walletService.ts
│   │   │   ├── eventService.ts
│   │   │   └── notificationService.ts
│   │   ├── stores/             # Zustand state
│   │   ├── lib/
│   │   │   ├── stellar.ts      # RPC + signing layer
│   │   │   ├── config.ts       # Network config
│   │   │   ├── errors.ts       # Typed error classes
│   │   │   └── env.ts          # Zod env validation
│   │   └── types/              # TypeScript types
│   │
│   ├── tests/e2e/              # Playwright e2e tests
│   │   ├── home.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── listing-form.spec.ts
│   │   ├── lease-form.spec.ts
│   │   └── activity-feed.spec.ts
│   └── playwright.config.ts
│
├── scripts/                    # Deployment automation
│   ├── deploy_contract.sh
│   └── deploy_treasury.sh
│
└── docs/                       # Documentation
    ├── architecture.md
    ├── deployment.md
    ├── testing.md
    └── demo-script.md
```

## Security Considerations

1. **Auth guards**: Every contract write method calls `caller.require_auth()` — Soroban's built-in authorization.
2. **Cross-contract trust**: The Treasury accepts deposits from any caller. In production, add an allowlist of authorized LeaseNFT contract IDs.
3. **No private key exposure**: The frontend only signs transactions via the wallet extension — private keys never touch the app.
4. **Env validation**: Zod validates all env vars at startup, preventing misconfiguration from reaching production.
5. **Error sanitization**: `parseContractError()` ensures raw exceptions never reach the UI.

## Future Improvements

- [ ] Token contract integration (SAC) for actual XLM/token transfers
- [ ] Treasury admin allowlist for authorized callers
- [ ] On-chain royalty splits between platforms
- [ ] Time-locked leases with automatic expiry
- [ ] Multi-sig admin for treasury withdrawals
- [ ] Rate limiting / deposit caps
