# LeaseNFT — NFT Leasing Platform on Stellar Soroban

A permissionless NFT leasing platform built on Stellar Soroban smart contracts. List NFTs for lease, rent them by the day, and track everything on-chain.

## Features

- **📜 Smart Contract**: Custom Soroban contract for listing, leasing, and managing NFT rentals
- **🔗 Multi-Wallet Support**: Connect with Freighter, Albedo, LOBSTR, xBull, Rabet, Hana, WalletConnect
- **📊 Dashboard**: View balances, transaction history, and contract events
- **⚡ Real-Time Updates**: Auto-polling for transaction status and event tracking
- **🔍 Activity Feed**: Real-time feed of contract events and transaction updates
- **🌙 Dark Mode**: Full dark mode support with shadcn/ui
- **📱 Responsive**: Works on desktop and mobile devices

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Stellar Soroban |
| **Smart Contract** | Rust (soroban-sdk v25) |
| **Frontend** | Next.js 16, TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui |
| **Wallet** | StellarWalletsKit, Freighter API |
| **State** | Zustand, TanStack Query |
| **Toasts** | sonner |
| **Icons** | lucide-react |

## Project Structure

```
├── contract/                    # Soroban smart contract
│   ├── Cargo.toml              # Workspace config
│   └── contracts/contract/
│       ├── Cargo.toml          # Contract package
│       └── src/
│           ├── lib.rs          # Contract implementation
│           └── test.rs         # Tests
│
├── client/                      # Next.js frontend
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── page.tsx        # Home page
│   │   │   ├── dashboard/      # Dashboard page
│   │   │   ├── app-page/       # Contract interaction page
│   │   │   └── activity/       # Activity feed pages
│   │   ├── components/         # React components
│   │   │   ├── ui/             # shadcn/ui primitives
│   │   │   ├── Navbar.tsx      # Navigation bar
│   │   │   ├── WalletModal.tsx # Wallet selection modal
│   │   │   ├── Contract.tsx    # Contract interaction UI
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── TransactionFeed.tsx
│   │   ├── hooks/              # React hooks
│   │   │   ├── useWallet.ts    # Wallet management
│   │   │   └── useContract.ts  # Contract interactions
│   │   ├── lib/                # Utilities
│   │   │   ├── stellar.ts      # Stellar SDK helpers
│   │   │   ├── config.ts       # Network config
│   │   │   ├── utils.ts        # General utilities
│   │   │   └── providers.tsx   # Query client provider
│   │   ├── stores/             # Zustand stores
│   │   │   ├── walletStore.ts
│   │   │   ├── transactionStore.ts
│   │   │   └── eventStore.ts
│   │   └── types/              # TypeScript types
│   ├── packages/contract/      # Generated contract bindings
│   ├── scripts/                # Deployment scripts
│   └── .env.example
│
└── README.md
```

## Getting Started

### Prerequisites

- **Rust** 1.84+ (for contract development): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Stellar CLI**: `cargo install stellar-cli --features opt`
- **Bun** (for frontend): `curl -fsSL https://bun.sh/install | bash`
- **Node.js** 18+ (also works with npm/pnpm/yarn)

### Environment Setup

Copy the example env file and fill in the values:

```bash
cd client
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | Network passphrase |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | RPC endpoint |
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed contract address |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | (Optional) WalletConnect project ID |

### Smart Contract Development

```bash
# Navigate to contract directory
cd contract

# Run tests
cargo test

# Build contract
stellar contract build

# Deploy to testnet (replace dev with your account name)
stellar keys generate dev --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/lease_nft.wasm \
  --source-account dev \
  --network testnet
```

### Frontend Development

```bash
# Navigate to client directory
cd client

# Install dependencies
bun install

# Run development server
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

### Generate Contract Bindings

After deploying the contract, generate TypeScript bindings:

```bash
cd client
stellar contract bindings typescript \
  --contract-id <YOUR_CONTRACT_ID> \
  --network testnet \
  --output-dir packages/contract \
  --overwrite

# Link the package
bun add file:./packages/contract
```

### Automated Deployment Script

```bash
cd client
bash scripts/deploy.sh
```

Or using Node.js:

```bash
cd client
node scripts/initialize.js
```

## Smart Contract API

### Functions

| Function | Description | Auth Required |
|---|---|---|
| `init()` | Initialize the contract | No |
| `list_nft(owner, token_id, token_address, daily_rate, max_duration)` | List an NFT for lease | Yes (owner) |
| `lease_nft(renter, listing_id, duration_days)` | Lease a listed NFT | Yes (renter) |
| `end_lease(caller, listing_id)` | End an active lease | Yes (owner or renter) |
| `get_listing(listing_id)` | Get listing details | No |
| `get_lease(listing_id)` | Get active lease details | No |

### Events

The contract emits events on all state-changing operations:

- `ListingCreated` — when an NFT is listed
- `ListingLeased` — when an NFT is leased
- `ListingEnded` — when a lease ends

## Deployment

### Testnet

1. Fund a testnet account: `stellar keys generate dev --network testnet --fund`
2. Build: `stellar contract build`
3. Deploy: `stellar contract deploy --wasm target/wasm32v1-none/release/lease_nft.wasm --source dev --network testnet`
4. Setup frontend: update `.env` with contract ID, generate bindings

### Mainnet

1. Ensure you have a funded mainnet account with XLM
2. Build: `cargo build --target wasm32v1-none --release`
3. Deploy to mainnet:
   ```bash
   stellar contract deploy \
     --wasm target/wasm32v1-none/release/lease_nft.wasm \
     --source <YOUR_ACCOUNT> \
     --network mainnet \
     --rpc-url https://soroban-rpc.stellar.org \
     --network-passphrase "Public Global Stellar Network ; September 2015"
   ```

## Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push the repository to GitHub
2. Import the project in Vercel
3. Set the root directory to `client`
4. Add environment variables from `.env.example`
5. Deploy!

## License

MIT

## Contract Address

```
CONTRACT_ADDRESS_HERE
```

## Transaction Hash

```
TRANSACTION_HASH_HERE
```
