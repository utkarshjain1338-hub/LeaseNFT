#!/usr/bin/env bash
set -euo pipefail

# LeaseNFT Deployment Script
# This script handles building, deploying, and generating bindings for the LeaseNFT contract.
#
# Prerequisites:
#   1. Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
#   2. Install Stellar CLI: cargo install stellar-cli --features opt
#   3. Ensure you have a funded testnet account
#
# Usage:
#   export STELLAR_ACCOUNT=<your-account-name>
#   bash scripts/deploy.sh

echo "=== LeaseNFT Deployment Script ==="

# Check prerequisites
command -v stellar >/dev/null 2>&1 || { echo "Error: stellar CLI not found. Run: cargo install stellar-cli --features opt"; exit 1; }

# Set defaults
STELLAR_ACCOUNT="${STELLAR_ACCOUNT:-dev}"
STELLAR_NETWORK="${STELLAR_NETWORK:-testnet}"
STELLAR_RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
STELLAR_NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
CONTRACT_PATH="${CONTRACT_PATH:-../contract}"

echo ""
echo "Network:      ${STELLAR_NETWORK}"
echo "RPC URL:      ${STELLAR_RPC_URL}"
echo "Account:      ${STELLAR_ACCOUNT}"
echo "Contract:     ${CONTRACT_PATH}"
echo ""

# Step 1: Create and fund account if it doesn't exist
echo ">>> Step 1: Ensuring account exists..."
stellar keys generate "${STELLAR_ACCOUNT}" --network "${STELLAR_NETWORK}" --fund 2>/dev/null || true
ACCOUNT_ADDRESS=$(stellar keys public-key "${STELLAR_ACCOUNT}")
echo "Account address: ${ACCOUNT_ADDRESS}"

# Step 2: Build the contract
echo ""
echo ">>> Step 2: Building contract..."
stellar contract build --no-check \
  --manifest-path "${CONTRACT_PATH}/contracts/contract/Cargo.toml" \
  || stellar contract build \
  --manifest-path "${CONTRACT_PATH}/contracts/contract/Cargo.toml"

# Step 3: Deploy the contract
echo ""
echo ">>> Step 3: Deploying contract..."
DEPLOY_OUTPUT=$(stellar contract deploy \
  --wasm "${CONTRACT_PATH}/target/wasm32v1-none/release/lease_nft.wasm" \
  --source "${STELLAR_ACCOUNT}" \
  --network "${STELLAR_NETWORK}" \
  --rpc-url "${STELLAR_RPC_URL}" \
  --network-passphrase "${STELLAR_NETWORK_PASSPHRASE}" 2>&1)

CONTRACT_ID="${DEPLOY_OUTPUT}"
echo "Contract ID: ${CONTRACT_ID}"

# Step 4: Generate TypeScript bindings
echo ""
echo ">>> Step 4: Generating TypeScript bindings..."
stellar contract bindings typescript \
  --contract-id "${CONTRACT_ID}" \
  --network "${STELLAR_NETWORK}" \
  --output-dir packages/contract \
  --overwrite 2>/dev/null || {
  echo "Warning: Bindings generation failed. You can run it manually:"
  echo "  stellar contract bindings typescript --contract-id ${CONTRACT_ID} --network ${STELLAR_NETWORK} --output-dir packages/contract --overwrite"
  
  # Create placeholder binding
  mkdir -p packages/contract/src
  cat > packages/contract/src/index.ts << EOF
// LeaseNFT Contract Bindings (placeholder)
// Replace with generated bindings after deployment:
//   stellar contract bindings typescript --contract-id ${CONTRACT_ID} --network ${STELLAR_NETWORK} --output-dir packages/contract --overwrite

import { Contract, rpc, xdr } from '@stellar/stellar-sdk';
import { scValToNative, nativeToScVal } from '@stellar/stellar-sdk';

export const networkPassphrase = '${STELLAR_NETWORK_PASSPHRASE}';
export const contractId = '${CONTRACT_ID}';
export const rpcUrl = '${STELLAR_RPC_URL}';

export class Client {
  contractId: string;
  networkPassphrase: string;
  rpcUrl: string;

  constructor(opts: { contractId: string; networkPassphrase: string; rpcUrl: string }) {
    this.contractId = opts.contractId;
    this.networkPassphrase = opts.networkPassphrase;
    this.rpcUrl = opts.rpcUrl;
  }

  private server() {
    return new rpc.Server(this.rpcUrl);
  }

  private contract() {
    return new Contract(this.contractId);
  }

  async init(): Promise<string> {
    throw new Error('Use the generated bindings by running stellar contract bindings typescript');
  }

  async list_nft(params: { owner: string; token_id: string; token_address: string; daily_rate: string; max_duration: number }): Promise<string> {
    throw new Error('Use the generated bindings by running stellar contract bindings typescript');
  }

  async lease_nft(params: { renter: string; listing_id: number; duration_days: number }): Promise<string> {
    throw new Error('Use the generated bindings by running stellar contract bindings typescript');
  }

  async end_lease(params: { caller: string; listing_id: number }): Promise<string> {
    throw new Error('Use the generated bindings by running stellar contract bindings typescript');
  }

  async get_listing(params: { listing_id: number }): Promise<any> {
    throw new Error('Use the generated bindings by running stellar contract bindings typescript');
  }

  async get_lease(params: { listing_id: number }): Promise<any> {
    throw new Error('Use the generated bindings by running stellar contract bindings typescript');
  }
}
EOF

  cat > packages/contract/package.json << EOF
{
  "name": "contract",
  "version": "0.1.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@stellar/stellar-sdk": "^12.0.0"
  }
}
EOF
}

# Step 5: Create .env file with contract ID
echo ""
echo ">>> Step 5: Creating .env file..."
cat > .env << EOF
NEXT_PUBLIC_STELLAR_NETWORK=${STELLAR_NETWORK}
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=${STELLAR_NETWORK_PASSPHRASE}
NEXT_PUBLIC_STELLAR_RPC_URL=${STELLAR_RPC_URL}
NEXT_PUBLIC_CONTRACT_ID=${CONTRACT_ID}
EOF

echo ""
echo "=== Deployment Complete ==="
echo "Contract ID: ${CONTRACT_ID}"
echo ""
echo "Next steps:"
echo "  1. If bindings were generated, link the package:"
echo "     cd client && bun add file:./packages/contract"
echo "  2. Start the development server:"
echo "     cd client && bun run dev"
echo "  3. To initialize the contract, visit the App page and click 'Initialize Contract'"
echo ""
echo "Contract explorer: https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}"
