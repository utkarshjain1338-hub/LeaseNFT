# Testing Guide

## Smart Contract Tests

Run all Soroban contract tests:

```bash
cd contract
cargo test --all
```

Run with verbose output:
```bash
cargo test --all -- --nocapture
```

Run tests for a specific contract:
```bash
cargo test -p lease_nft
cargo test -p treasury
```

### Current Coverage

**LeaseNFT contract** — 24 tests:
- Full lifecycle (list → lease → end)
- Renter can end lease
- Unauthorized end lease
- Invalid listing IDs
- Double initialization
- Duration limit enforcement
- Multiple concurrent listings
- Fee calculation accuracy
- Re-lease after end
- Listing count accuracy
- Treasury registration
- Edge cases (min/max fees, overflow, timestamps)

**Treasury contract** — 12 tests:
- Init and balance
- Double init prevention
- Fee accumulation
- Zero/negative fee rejection
- Admin withdrawal
- Insufficient balance
- Non-admin withdrawal rejection
- Uninitialized state
- Multiple deposits from different listings

### Running with Clippy

```bash
cd contract
cargo clippy --all-targets --all-features -- -D warnings
```

### Format Check

```bash
cd contract
cargo fmt --all -- --check
```

---

## Frontend Tests (Playwright)

### Prerequisites

Install browsers (first time only):
```bash
cd client
bunx playwright install chromium
```

### Run All Tests

```bash
cd client
bun run test:e2e
```

### Run with UI (interactive)

```bash
bun run test:e2e:ui
```

### Run Headed (visible browser)

```bash
bun run test:e2e:headed
```

### Run Specific Test File

```bash
bunx playwright test tests/e2e/home.spec.ts
```

### View Test Report

```bash
bunx playwright show-report
```

### Test Coverage

| Test File | Scenarios |
|-----------|-----------|
| `home.spec.ts` | Hero, CTA buttons, feature cards, navigation |
| `dashboard.spec.ts` | Activity feed, transaction history, empty states |
| `listing-form.spec.ts` | Form visibility, field presence, validation |
| `lease-form.spec.ts` | Connected/disconnected states, wallet display |
| `activity-feed.spec.ts` | Empty state, mock transaction display |

### Wallet Mocking

Tests mock wallet state via `localStorage` injection (no real wallet extension needed):

```typescript
import { mockWalletConnected } from "./wallet-mock";
await mockWalletConnected(page);
```

This injects a fake Zustand persist state into localStorage before page load.

---

## CI/CD

Tests run automatically in GitHub Actions on every push/PR:

- **Contract CI**: `.github/workflows/contract.yml`
- **Frontend CI**: `.github/workflows/frontend.yml`
- **Unified**: `.github/workflows/ci.yml`

All pipelines must pass before merging to `main`.
