#!/usr/bin/env bash
# deploy_treasury.sh — Build, optimize, and deploy the Treasury contract to Stellar Testnet.
#
# Prerequisites:
#   - Rust + cargo installed
#   - stellar CLI installed
#   - STELLAR_SECRET_KEY exported in environment
#
# Usage:
#   export STELLAR_SECRET_KEY=SXXXXX...
#   bash scripts/deploy_treasury.sh [--network testnet]
#
# After deployment, run deploy_contract.sh with --treasury <TREASURY_ID>

set -euo pipefail

NETWORK="${NETWORK:-testnet}"
RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
CONTRACT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../contract" && pwd)"
WASM_PATH="${CONTRACT_DIR}/target/wasm32-unknown-unknown/release/treasury.wasm"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network) NETWORK="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Treasury Contract Deployment"
echo " Network : ${NETWORK}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "▶ Step 1: Building WASM..."
(cd "${CONTRACT_DIR}" && cargo build --target wasm32-unknown-unknown --release -p treasury)
echo "  ✓ Built: ${WASM_PATH}"

echo ""
echo "▶ Step 2: Optimizing..."
if command -v stellar &>/dev/null; then
  stellar contract optimize --wasm "${WASM_PATH}"
  OPTIMIZED="${WASM_PATH%.wasm}.optimized.wasm"
  DEPLOY_WASM="${OPTIMIZED:-${WASM_PATH}}"
else
  DEPLOY_WASM="${WASM_PATH}"
fi

echo ""
echo "▶ Step 3: Deploying..."
if [[ -z "${STELLAR_SECRET_KEY:-}" ]]; then
  echo "  ERROR: STELLAR_SECRET_KEY is not set."; exit 1
fi

TREASURY_ID=$(stellar contract deploy \
  --wasm "${DEPLOY_WASM}" \
  --source "${STELLAR_SECRET_KEY}" \
  --network "${NETWORK}" \
  --rpc-url "${RPC_URL}" \
  --network-passphrase "${NETWORK_PASSPHRASE}" \
  2>&1 | grep -oE 'C[A-Z0-9]{55}' | head -1)

echo "  ✓ Treasury deployed: ${TREASURY_ID}"

echo ""
echo "▶ Step 4: Initializing treasury..."
ADMIN_ADDRESS=$(stellar keys show "${STELLAR_SECRET_KEY}" --network "${NETWORK}" 2>/dev/null || echo "")
if [[ -n "${ADMIN_ADDRESS}" ]]; then
  stellar contract invoke \
    --id "${TREASURY_ID}" \
    --source "${STELLAR_SECRET_KEY}" \
    --network "${NETWORK}" \
    --rpc-url "${RPC_URL}" \
    --network-passphrase "${NETWORK_PASSPHRASE}" \
    -- init --admin "${ADMIN_ADDRESS}" || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ Treasury Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Treasury ID : ${TREASURY_ID}"
echo " Next step   : bash scripts/deploy_contract.sh --treasury ${TREASURY_ID}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
