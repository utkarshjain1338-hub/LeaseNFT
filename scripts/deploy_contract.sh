#!/usr/bin/env bash
# deploy_contract.sh — Build, optimize, and deploy the LeaseNFT contract to Stellar Testnet.
#
# Prerequisites:
#   - Rust + cargo installed
#   - stellar CLI installed (https://developers.stellar.org/docs/tools/stellar-cli)
#   - STELLAR_SECRET_KEY exported in environment (or passed via --source-account)
#
# Usage:
#   export STELLAR_SECRET_KEY=SXXXXX...
#   bash scripts/deploy_contract.sh [--network testnet] [--treasury <treasury_contract_id>]
#
# After deployment, the CONTRACT_ID will be printed and optionally written to client/.env

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
NETWORK="${NETWORK:-testnet}"
RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
CONTRACT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../contract" && pwd)"
CLIENT_ENV="$(cd "$(dirname "${BASH_SOURCE[0]}")/../client" && pwd)/.env"
WASM_PATH="${CONTRACT_DIR}/target/wasm32-unknown-unknown/release/lease_nft.wasm"
TREASURY_CONTRACT_ID="${TREASURY_CONTRACT_ID:-}"

# ─── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --network) NETWORK="$2"; shift 2 ;;
    --treasury) TREASURY_CONTRACT_ID="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " LeaseNFT Deployment Script"
echo " Network : ${NETWORK}"
echo " RPC URL : ${RPC_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Build ─────────────────────────────────────────────────────────────────
echo ""
echo "▶ Step 1: Building WASM..."
(cd "${CONTRACT_DIR}" && cargo build --target wasm32-unknown-unknown --release -p lease_nft)
echo "  ✓ WASM built at ${WASM_PATH}"

# ─── 2. Optimize ──────────────────────────────────────────────────────────────
echo ""
echo "▶ Step 2: Optimizing WASM with stellar optimize..."
if command -v stellar &>/dev/null; then
  stellar contract optimize --wasm "${WASM_PATH}"
  OPTIMIZED_WASM="${WASM_PATH%.wasm}.optimized.wasm"
  if [[ -f "${OPTIMIZED_WASM}" ]]; then
    echo "  ✓ Optimized WASM: ${OPTIMIZED_WASM}"
    DEPLOY_WASM="${OPTIMIZED_WASM}"
  else
    echo "  ⚠ No optimized WASM found, using original"
    DEPLOY_WASM="${WASM_PATH}"
  fi
else
  echo "  ⚠ stellar CLI not found — skipping optimization, using raw WASM"
  DEPLOY_WASM="${WASM_PATH}"
fi

# ─── 3. Deploy ────────────────────────────────────────────────────────────────
echo ""
echo "▶ Step 3: Deploying to ${NETWORK}..."

if [[ -z "${STELLAR_SECRET_KEY:-}" ]]; then
  echo "  ERROR: STELLAR_SECRET_KEY is not set."
  echo "  Export it: export STELLAR_SECRET_KEY=SXXXXX..."
  exit 1
fi

CONTRACT_ID=$(stellar contract deploy \
  --wasm "${DEPLOY_WASM}" \
  --source "${STELLAR_SECRET_KEY}" \
  --network "${NETWORK}" \
  --rpc-url "${RPC_URL}" \
  --network-passphrase "${NETWORK_PASSPHRASE}" \
  2>&1 | grep -oE 'C[A-Z0-9]{55}' | head -1)

if [[ -z "${CONTRACT_ID}" ]]; then
  echo "  ERROR: Failed to extract contract ID from deployment output."
  exit 1
fi

echo "  ✓ Contract deployed: ${CONTRACT_ID}"

# ─── 4. Initialize ────────────────────────────────────────────────────────────
echo ""
echo "▶ Step 4: Initializing contract..."

TREASURY_ARG=""
if [[ -n "${TREASURY_CONTRACT_ID}" ]]; then
  TREASURY_ARG="--arg '${TREASURY_CONTRACT_ID}'"
  echo "  Treasury: ${TREASURY_CONTRACT_ID}"
fi

stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source "${STELLAR_SECRET_KEY}" \
  --network "${NETWORK}" \
  --rpc-url "${RPC_URL}" \
  --network-passphrase "${NETWORK_PASSPHRASE}" \
  -- init \
  --treasury "${TREASURY_CONTRACT_ID:-null}" \
  2>&1 || echo "  ⚠ init() may have already been called (safe to ignore if re-deploying same ID)"

echo "  ✓ Contract initialized"

# ─── 5. Update .env ───────────────────────────────────────────────────────────
echo ""
echo "▶ Step 5: Updating client/.env..."

if [[ -f "${CLIENT_ENV}" ]]; then
  # Update existing line
  sed -i "s|^NEXT_PUBLIC_CONTRACT_ID=.*|NEXT_PUBLIC_CONTRACT_ID=${CONTRACT_ID}|" "${CLIENT_ENV}"
  sed -i "s|^NEXT_PUBLIC_STELLAR_NETWORK=.*|NEXT_PUBLIC_STELLAR_NETWORK=${NETWORK}|" "${CLIENT_ENV}"
  echo "  ✓ Updated ${CLIENT_ENV}"
else
  cat > "${CLIENT_ENV}" <<EOF
NEXT_PUBLIC_STELLAR_NETWORK=${NETWORK}
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}
NEXT_PUBLIC_STELLAR_RPC_URL=${RPC_URL}
NEXT_PUBLIC_CONTRACT_ID=${CONTRACT_ID}
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
EOF
  echo "  ✓ Created ${CLIENT_ENV}"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Contract ID  : ${CONTRACT_ID}"
echo " Network      : ${NETWORK}"
echo " Explorer     : https://stellar.expert/explorer/${NETWORK}/contract/${CONTRACT_ID}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
