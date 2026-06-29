/**
 * env.ts — Environment variable validation with Zod.
 *
 * Design rationale:
 * - Validates all required env vars at startup (fail-fast principle).
 * - Provides typed access to validated config rather than raw process.env strings.
 * - Meaningful error messages tell developers exactly which vars are missing/invalid.
 *
 * Usage: import { env } from '@/lib/env'
 */

import { z } from "zod";

const envSchema = z.object({
  /** Stellar network to connect to. */
  NEXT_PUBLIC_STELLAR_NETWORK: z
    .enum(["testnet", "mainnet", "futurenet"])
    .default("testnet"),

  /** RPC endpoint URL. Must be a valid https:// URL. */
  NEXT_PUBLIC_STELLAR_RPC_URL: z
    .string()
    .url("NEXT_PUBLIC_STELLAR_RPC_URL must be a valid URL")
    .optional()
    .default("https://soroban-testnet.stellar.org"),

  /** Deployed LeaseNFT contract address (56-char Stellar address starting with C). */
  NEXT_PUBLIC_CONTRACT_ID: z
    .string()
    .min(56, "NEXT_PUBLIC_CONTRACT_ID must be at least 56 characters")
    .regex(/^C/, "NEXT_PUBLIC_CONTRACT_ID must start with 'C' (Soroban contract address)")
    .optional()
    .default("CCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),

  /** WalletConnect Project ID (optional). */
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().optional().default(""),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validates and returns the environment configuration.
 * Call this at app startup — throws with a descriptive message on failure.
 */
export function validateEnv(): Env {
  if (_env) return _env;

  const raw = {
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
    NEXT_PUBLIC_CONTRACT_ID: process.env.NEXT_PUBLIC_CONTRACT_ID,
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `[LeaseNFT] Environment validation failed:\n${issues}\n\n` +
        "Copy client/.env.example to client/.env and fill in the required values."
    );
  }

  _env = result.data;
  return _env;
}

/**
 * Validated environment variables.
 * Lazily validated on first access.
 */
export function env(): Env {
  return validateEnv();
}
