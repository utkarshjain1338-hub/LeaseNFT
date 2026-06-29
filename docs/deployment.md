# Deployment Guide

LeaseNFT uses shell scripts + the [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli) for deployment.

## Prerequisites

| Tool | Install |
|------|---------|
| Rust + cargo | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| wasm32 target | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | `cargo install --locked stellar-cli` |
| Secret key | Generate from [Stellar Laboratory](https://laboratory.stellar.org/) |

---

## Step 1: Fund your account (Testnet)

```bash
stellar keys generate --global my-key --network testnet
stellar keys fund my-key --network testnet
```

Or export your existing key:
```bash
export STELLAR_SECRET_KEY=SXXXXXXXXXXXXXXXXXX
```

---

## Step 2: Deploy Treasury Contract (Optional)

The Treasury contract receives fees from LeaseNFT via cross-contract invocation.

```bash
bash scripts/deploy_treasury.sh --network testnet
# Outputs: Treasury ID: CXXX...
```

---

## Step 3: Deploy LeaseNFT Contract

```bash
# Without treasury:
bash scripts/deploy_contract.sh --network testnet

# With treasury (enables inter-contract fee forwarding):
bash scripts/deploy_contract.sh --network testnet --treasury CXXX_TREASURY_ID
```

The script:
1. Builds the WASM binary
2. Optimizes it with `stellar contract optimize`
3. Deploys to testnet
4. Calls `init()` to initialize the counter
5. Updates `client/.env` automatically

---

## Step 4: Start the Frontend

```bash
cd client
bun install
bun run dev
```

Open http://localhost:3000 and connect your Stellar wallet.

---

## Manual Deployment (without scripts)

```bash
# 1. Build WASM
cd contract
cargo build --target wasm32-unknown-unknown --release -p lease_nft

# 2. Optimize
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/lease_nft.wasm

# 3. Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lease_nft.optimized.wasm \
  --source $STELLAR_SECRET_KEY \
  --network testnet

# 4. Initialize (replace CONTRACT_ID)
stellar contract invoke \
  --id CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --network testnet \
  -- init --treasury null
```

---

## Environment Variables

Copy `client/.env.example` to `client/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet`, `mainnet`, or `futurenet` |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Soroban RPC endpoint URL |
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed LeaseNFT contract address (starts with C) |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID (optional) |

---

## Mainnet Deployment

For mainnet, change `--network testnet` to `--network mainnet` in the scripts.
Update `NEXT_PUBLIC_STELLAR_NETWORK=mainnet` in `client/.env`.

> ⚠️ **Warning**: Mainnet transactions are irreversible and involve real XLM.
> Test thoroughly on testnet first.
