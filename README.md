# LeaseNFT — NFT Leasing Platform on Stellar Soroban

A permissionless NFT leasing platform built on Stellar Soroban smart contracts. List NFTs for lease, rent them by the day, and track everything on-chain.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Project Description

LeaseNFT is a full-stack dApp on Stellar Soroban that allows NFT owners to monetize their assets through time-limited leases. Renters can access NFTs for a daily fee without buying ownership. All lease terms, fees, and state transitions are recorded on-chain via a Soroban smart contract.

---

## Features

- **📜 Smart Contract** — Custom Soroban contract for listing, leasing, and managing NFT rentals
- **🔍 Automated Discovery** — Automatically queries and discovers all active/historical listings directly from on-chain state via `get_listing_count()`
- **🔗 Multi-Wallet Support** — Connect with Freighter, Albedo, LOBSTR, xBull, Rabet, Hana, WalletConnect
- **💳 Wallet Persistence** — Reconnects automatically after page refresh
- **📊 Dashboard** — View balances, transaction history, and contract events
- **⚡ Real-Time Updates** — Auto-polling for transaction status and event tracking
- **🔍 Activity Feed** — Live feed of contract events and transaction updates, deduplicated
- **🧾 Transaction History** — Persistent across sessions, with Stellar Explorer links
- **⚠️ Error Handling** — 7+ error types with user-friendly messages, no raw exceptions
- **🌙 Dark Mode** — Full dark mode with shadcn/ui
- **📱 Responsive** — Works on mobile, tablet, and desktop
- **♿ Accessible** — ARIA labels, keyboard navigation, skip-to-content, live regions

---

## Tech Stack

| Layer            | Technology                                |
|------------------|-------------------------------------------|
| **Blockchain**   | Stellar Soroban (Testnet)                 |
| **Smart Contract** | Rust (soroban-sdk v25)                  |
| **Frontend**     | Next.js 16, TypeScript                    |
| **Styling**      | Tailwind CSS v4, shadcn/ui                |
| **Wallet**       | StellarWalletsKit (`@creit.tech`)         |
| **State**        | Zustand (with localStorage persistence)   |
| **Server State** | TanStack Query v5                         |
| **Toasts**       | sonner                                    |
| **Icons**        | lucide-react                              |

---

## Folder Structure

```
LeaseNFT/
├── contract/                        # Soroban smart contract workspace
│   ├── Cargo.toml                   # Workspace config
│   └── contracts/contract/
│       ├── Cargo.toml               # Contract package
│       └── src/
│           ├── lib.rs               # Contract implementation
│           └── test.rs              # 8 unit tests
│
└── client/                          # Next.js 16 frontend
    ├── .env.example                 # Environment variable template
    ├── scripts/
    │   └── deploy.sh                # Automated deployment script
    └── src/
        ├── app/
        │   ├── layout.tsx           # Root layout (SEO, accessibility)
        │   ├── page.tsx             # Home / landing page
        │   ├── dashboard/           # Wallet + stats dashboard
        │   ├── app-page/            # Contract interaction UI
        │   └── activity/            # Activity + transaction feed
        ├── components/
        │   ├── ui/                  # shadcn/ui primitives
        │   ├── Navbar.tsx           # Navigation with wallet controls
        │   ├── WalletModal.tsx      # Multi-wallet selection modal
        │   ├── Contract.tsx         # Smart contract interaction UI
        │   ├── ActivityFeed.tsx     # Real-time event feed
        │   └── TransactionFeed.tsx  # Transaction history
        ├── hooks/
        │   ├── useWallet.ts         # Wallet connect/disconnect/reconnect
        │   └── useContract.ts       # Contract calls + mutation hooks
        ├── lib/
        │   ├── stellar.ts           # Stellar SDK helpers, signing, RPC
        │   ├── config.ts            # Network config, explorer URLs
        │   ├── utils.ts             # Address formatting, error parsing
        │   └── providers.tsx        # QueryClient + Toaster provider
        ├── stores/
        │   ├── walletStore.ts       # Zustand wallet state (persisted)
        │   ├── transactionStore.ts  # Zustand tx history (persisted)
        │   └── eventStore.ts        # Zustand contract events (persisted)
        └── types/
            └── index.ts             # Shared TypeScript interfaces
```

---

## Setup

### Prerequisites

| Tool         | Version | Install |
|--------------|---------|---------|
| Rust         | 1.84+   | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Stellar CLI  | latest  | `cargo install stellar-cli --features opt` |
| Bun          | 1.0+    | `curl -fsSL https://bun.sh/install \| bash` |
| Node.js      | 18+     | [nodejs.org](https://nodejs.org) |

---

## Environment Variables

Copy `.env.example` to `.env` inside the `client/` directory:

```bash
cd client
cp .env.example .env
```

| Variable                              | Required | Description                                     |
|---------------------------------------|----------|-------------------------------------------------|
| `NEXT_PUBLIC_STELLAR_NETWORK`         | ✅        | `testnet` or `mainnet`                          |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | ✅    | Network passphrase string                        |
| `NEXT_PUBLIC_STELLAR_RPC_URL`         | ✅        | Soroban RPC endpoint URL                        |
| `NEXT_PUBLIC_CONTRACT_ID`             | ✅        | Deployed contract address (56-char `C…`)        |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | ⬜      | WalletConnect Cloud project ID (optional)       |

**Testnet values:**
```
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

---

## Contract Deployment

### 1. Fund a testnet account

```bash
stellar keys generate dev --network testnet --fund
```

### 2. Build the contract

```bash
cd contract
stellar contract build
```

### 3. Deploy to Testnet

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/lease_nft.wasm \
  --source-account dev \
  --network testnet
```

Copy the output contract address and set it as `NEXT_PUBLIC_CONTRACT_ID` in `client/.env`.

### 4. Initialize the contract (one-time)

Call `init()` from the frontend App page, or via CLI:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source dev \
  --network testnet \
  -- init
```

### 5. Generate TypeScript bindings (optional)

```bash
cd client
stellar contract bindings typescript \
  --contract-id <CONTRACT_ID> \
  --network testnet \
  --output-dir packages/contract \
  --overwrite
bun add file:./packages/contract
```

---

## Running Locally

```bash
# Install dependencies
cd client
bun install

# Start development server
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Wallet Support

LeaseNFT uses [`@creit.tech/stellar-wallets-kit`](https://github.com/Creit-Tech/Stellar-Wallets-Kit) to support all major Stellar wallets through a unified modal:

| Wallet          | Type                    | Notes                         |
|-----------------|-------------------------|-------------------------------|
| **Freighter**   | Browser extension       | Recommended; built by SDF     |
| **Albedo**      | Web signing service     | No extension needed           |
| **LOBSTR**      | Mobile + web            | Popular Stellar wallet        |
| **xBull**       | Browser extension       | Feature-rich                  |
| **Rabet**       | Browser extension       | Lightweight                   |
| **Hana**        | Mobile                  | Stellar-focused               |
| **WalletConnect** | QR / deep link        | Requires project ID in `.env` |

The wallet modal opens the kit's built-in auth flow, which auto-detects installed wallets. The selected wallet session is persisted in `localStorage` and automatically reconnected on page refresh.

---

## Smart Contract API

### Contract Address

```
CA3Z2A63KCHNDB37NDWEBJ6ACFXKIOGT3FVRD7FFX36MD2UYINAN5F6X
```

> **Note:** If this address is no longer active, redeploy using the steps above and replace this value in `client/.env` and this README.

### Functions

| Function | Parameters | Auth Required | Returns |
|---|---|---|---|
| `init()` | — | No | — |
| `list_nft(owner, token_id, token_address, daily_rate, max_duration)` | Address, String, Address, i128, u64 | Yes (owner) | `u64` listing ID |
| `lease_nft(renter, listing_id, duration_days)` | Address, u64, u64 | Yes (renter) | — |
| `end_lease(caller, listing_id)` | Address, u64 | Yes (owner or renter) | — |
| `get_listing(listing_id)` | u64 | No | `Listing` struct |
| `get_lease(listing_id)` | u64 | No | `ActiveLease` struct |
| `get_listing_count()` | — | No | `u64` total count of listings |

### Structs

```rust
pub struct Listing {
    pub owner: Address,
    pub token_id: String,
    pub token_address: Address,
    pub daily_rate: i128,    // in stroops
    pub max_duration: u64,   // in days
    pub active: bool,
}

pub struct ActiveLease {
    pub renter: Address,
    pub start_time: u64,     // Unix timestamp (ledger)
    pub end_time: u64,       // start_time + duration_days * 86400
    pub total_fee: i128,     // daily_rate * duration_days
}
```

### Events

The contract emits Soroban diagnostic events on every state change:

- `ListingCreated` — new NFT listed for lease
- `ListingLeased` — NFT leased by a renter
- `ListingEnded` — active lease ended

---

## Error Handling

Every error is caught, classified, and shown as a user-friendly message. Raw exceptions are never shown in the UI — technical details are logged only to the browser console.

| # | Error | User Message |
|---|-------|--------------|
| 1 | Wallet not connected | "Please connect a wallet before continuing." |
| 2 | User rejected transaction | "Transaction cancelled" |
| 3 | Transaction failed on-chain | Decoded reason if available, otherwise "Transaction failed on network" |
| 4 | RPC unavailable | "RPC unavailable — please try again in a moment" (auto-retried once) |
| 5 | Contract call failure | Decoded contract error code (e.g., "Listing is not active") |
| 6 | Invalid input (forms) | Field-specific validation message before any transaction |
| 7 | Network mismatch | "Network mismatch — please switch your wallet to Stellar Testnet." |

Contract error codes mapped:

| Code | Message |
|------|---------|
| 1 | Contract already initialized |
| 2 | Listing not found |
| 3 | Unauthorized — you are not the owner or renter |
| 4 | Listing already exists |
| 5 | Listing is not active (already leased) |
| 6 | Duration exceeds the maximum allowed |

---

## Transaction Status

Every transaction progresses through a visible pipeline:

```
Pending → Submitting → Confirmed → Explorer Link
                    ↘ Failed
```

- Hash displayed (shortened) immediately after submission
- Inline Stellar Explorer link on every transaction card
- Transactions persisted in `localStorage` across page refreshes
- Activity feed updates automatically with status changes

---

## Screenshots

> Replace these placeholders with actual screenshots before submission.

| Screenshot | Description |
|---|---|
| `screenshots/wallet-selection.png` | Wallet selection modal with 7 wallet options |
| `screenshots/wallet-connected.png` | Navbar showing address, XLM balance, network badge |
| `screenshots/dashboard.png` | Dashboard with wallet info, tx history, events |
| `screenshots/contract-app.png` | Contract interaction page (List, Lease, End, Query) |
| `screenshots/activity-feed.png` | Activity feed with real-time events and tx status |
| `screenshots/transaction-success.png` | Successful transaction with explorer link |

---

## Transaction Hash

```
<!-- Replace with an actual transaction hash after your first successful contract interaction -->
TRANSACTION_HASH_PLACEHOLDER
```

**Explorer URL format:**
```
https://stellar.expert/explorer/testnet/tx/<TRANSACTION_HASH>
```

Example: [https://stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)

---

## Live Demo

> Deploy to Vercel for a live demo URL.

1. Push the repository to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Set **Root Directory** to `client`
4. Add all environment variables from `client/.env.example`
5. Deploy — Vercel auto-detects Next.js

```
https://<your-project>.vercel.app
```

---

## Folder Structure (contract)

```
contract/
├── Cargo.toml               # Workspace
├── Cargo.lock
└── contracts/contract/
    ├── Cargo.toml           # Contract crate
    ├── Makefile
    └── src/
        ├── lib.rs           # LeaseNFT contract
        └── test.rs          # 8 unit tests (all passing)
```

## Running Contract Tests

```bash
cd contract
cargo test
```

All 8 tests pass:
- `test_full_lease_lifecycle`
- `test_renter_can_end_lease`
- `test_get_nonexistent_listing` (panic expected)
- `test_lease_inactive_listing` (panic expected)
- `test_multiple_listings`
- `test_end_lease_without_active_lease` (panic expected)
- `test_double_init` (panic expected)
- `test_lease_exceeds_max_duration` (panic expected)

---

## License

MIT — see [LICENSE](LICENSE) for details.
