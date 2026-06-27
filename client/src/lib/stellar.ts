import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import {
  rpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Contract,
  xdr,
  Address,
} from "@stellar/stellar-sdk";
import { getNetworkConfig, getContractId } from "./config";

let initialized = false;

export function ensureKit() {
  if (!initialized) {
    const config = getNetworkConfig();
    const network =
      config.network === "mainnet" ? Networks.PUBLIC :
      config.network === "futurenet" ? Networks.FUTURENET :
      Networks.TESTNET;
    StellarWalletsKit.init({
      network,
      selectedWalletId: undefined,
      modules: defaultModules(),
    });
    initialized = true;
  }
}

export function getNetworkPassphrase(): string {
  const config = getNetworkConfig();
  return config.networkPassphrase;
}

export function getServer() {
  const config = getNetworkConfig();
  return new rpc.Server(config.rpcUrl);
}

// ScVal converters for contract interactions
export function toScValString(v: string) {
  return nativeToScVal(v);
}

export function toScValU64(v: number) {
  return nativeToScVal(v, { type: "u64" });
}

export function toScValI128(v: string | number | bigint) {
  return nativeToScVal(v, { type: "i128" });
}

export function toScValAddress(v: string) {
  return new Address(v).toScVal();
}

/**
 * Decode a Stellar contract error result into a human-readable message.
 * Never exposes raw exception objects to callers.
 */
export function decodeTransactionError(sendResponse: rpc.Api.SendTransactionResponse): string {
  if (sendResponse.errorResult) {
    try {
      const result = sendResponse.errorResult;
      const txResult = result.result();
      const code = txResult.results()?.[0]?.tr()?.invokeHostFunctionResult()?.switch()?.name;
      if (code) return `Transaction failed: ${code}`;
    } catch {
      // Fall through to generic message
    }
  }
  return "Transaction failed on network";
}

/**
 * Extract a human-readable error message from arbitrary objects (especially wallet errors).
 * Prevents converting unknown error structures into "[object Object]".
 */
export function formatWalletError(err: unknown): string {
  if (err === null || err === undefined) return "Unknown error occurred";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const prefix = obj.code !== undefined ? `[Code ${obj.code}] ` : "";
    if (typeof obj.message === "string" && obj.message) return `${prefix}${obj.message}`;
    if (typeof obj.error === "string" && obj.error) return `${prefix}${obj.error}`;
    if (typeof obj.name === "string" && typeof obj.message === "string") return `${obj.name}: ${obj.message}`;
    try {
      const str = JSON.stringify(err);
      if (str !== "{}") return `${prefix}${str}`;
    } catch {
      // ignore
    }
  }
  return "Signing failed due to wallet error";
}

// Sign and submit a transaction using the connected wallet
export async function signAndSendTransaction(
  txXdr: string,
  address: string
): Promise<string> {
  ensureKit();
  const passphrase = getNetworkPassphrase();
  let kitNetworkPassphrase = "";
  try {
    const netObj = await StellarWalletsKit.getNetwork();
    kitNetworkPassphrase = netObj?.networkPassphrase || "";
  } catch {
    // ignore if module not ready
  }

  console.log("[LeaseNFT] Step 2 & 5 — Pre-sign audit:", {
    targetAddress: address,
    networkPassphrase: passphrase,
    kitNetworkPassphrase,
    xdrLength: txXdr.length,
  });

  if (kitNetworkPassphrase && kitNetworkPassphrase !== passphrase) {
    console.warn(`[LeaseNFT] Network mismatch detected! Wallet network (${kitNetworkPassphrase}) != expected network (${passphrase})`);
  }

  let signedTxXdr: string;
  try {
    console.log("[LeaseNFT] Requesting wallet signature via StellarWalletsKit.signTransaction...");
    const result = await StellarWalletsKit.signTransaction(txXdr, {
      networkPassphrase: passphrase,
      address,
    });
    signedTxXdr = result.signedTxXdr;
    console.log("[LeaseNFT] Transaction signed successfully. Signed XDR length:", signedTxXdr.length);
  } catch (err: unknown) {
    console.error("[LeaseNFT] Step 1 & 6 — signTransaction error details (raw object):");
    console.dir(err, { depth: null });

    const msg = formatWalletError(err);
    const lower = msg.toLowerCase();
    if (
      lower.includes("user declined") ||
      lower.includes("user rejected") ||
      lower.includes("cancelled") ||
      lower.includes("rejected") ||
      lower.includes("closed")
    ) {
      throw new Error("Transaction cancelled");
    }
    throw new Error(`Signing failed: ${msg}`);
  }

  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedTxXdr, getNetworkPassphrase());

  let sendResponse: rpc.Api.SendTransactionResponse;
  try {
    sendResponse = await server.sendTransaction(tx);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LeaseNFT] RPC send error:", err);
    throw new Error(`RPC unavailable: ${msg}`);
  }

  if (sendResponse.status === "ERROR") {
    const reason = decodeTransactionError(sendResponse);
    console.error("[LeaseNFT] Transaction error:", sendResponse);
    throw new Error(reason);
  }

  return sendResponse.hash;
}

// Wait for transaction to complete, with RPC retry on network errors
export async function waitForTransaction(
  hash: string,
  maxRetries = 30
): Promise<rpc.Api.GetTransactionResponse> {
  const server = getServer();
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const result = await server.getTransaction(hash);
      if (result.status !== "NOT_FOUND") {
        return result;
      }
    } catch (err: unknown) {
      // RPC network error — log and retry
      console.warn(`[LeaseNFT] RPC error polling tx ${hash}, attempt ${attempts + 1}:`, err);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }
  throw new Error("Transaction confirmation timeout — check the explorer for status");
}

/**
 * Build and submit a contract call.
 *
 * IMPORTANT: The `args` array must NOT include the invoker address for
 * auth-required methods. This function prepends the invoker address
 * automatically when `needsAuth` is true.
 */
export async function callContract(
  method: string,
  args: xdr.ScVal[],
  source: string,
  needsAuth: boolean = true
): Promise<string> {
  const server = getServer();
  const contractId = getContractId();
  const contract = new Contract(contractId);

  // Get source account — retry once on RPC failure
  let account: Awaited<ReturnType<typeof server.getAccount>>;
  try {
    account = await server.getAccount(source);
  } catch (err: unknown) {
    console.warn("[LeaseNFT] getAccount failed, retrying:", err);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      account = await server.getAccount(source);
    } catch {
      throw new Error("RPC unavailable — please try again in a moment");
    }
  }

  // Build the operation args. Auth-required methods receive the invoker address
  // as the first argument per the contract interface.
  const opArgs = needsAuth
    ? [new Address(source).toScVal(), ...args]
    : args;

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...opArgs))
    .setTimeout(300)
    .build();

  // Simulate
  console.log(`[LeaseNFT] Step 4 — Simulating contract call: ${method} for account ${source}`);
  let sim: Awaited<ReturnType<typeof server.simulateTransaction>>;
  try {
    sim = await server.simulateTransaction(tx);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LeaseNFT] Simulation RPC error:", err);
    throw new Error(`RPC unavailable — simulation failed: ${msg}`);
  }

  if (rpc.Api.isSimulationError(sim)) {
    const errStr = typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error);
    console.error("[LeaseNFT] Simulation error full response:", sim);

    // Map known contract error codes to user-friendly messages
    const codeMatch = errStr.match(/Error\(Contract, #(\d+)\)/);
    if (codeMatch) {
      const code = parseInt(codeMatch[1]);
      const errorMap: Record<number, string> = {
        1: "Contract already initialized",
        2: "Listing not found",
        3: "Unauthorized — you are not the owner or renter",
        4: "Listing already exists",
        5: "Listing is not active (already leased)",
        6: "Duration exceeds the maximum allowed",
      };
      throw new Error(errorMap[code] ?? `Contract error #${code}`);
    }
    throw new Error(`Contract call failed: ${errStr}`);
  }

  console.log("[LeaseNFT] Simulation succeeded:", {
    minResourceFee: sim.minResourceFee,
    eventsCount: sim.events?.length ?? 0,
  });

  const preparedTx = rpc.assembleTransaction(tx, sim).build();
  const txXdr = preparedTx.toXDR();

  console.log("[LeaseNFT] Step 3 — Assembled transaction audit:", {
    sequence: preparedTx.sequence,
    fee: preparedTx.fee,
    source: preparedTx.source,
    operationsCount: preparedTx.operations.length,
    xdrLength: txXdr.length,
  });

  return signAndSendTransaction(txXdr, source);
}

// Read-only contract call (simulation only, no signing)
export async function readContract(
  method: string,
  args: xdr.ScVal[],
  source?: string
): Promise<unknown> {
  const server = getServer();
  const contractId = getContractId();
  const contract = new Contract(contractId);

  const dummyKey =
    "GANIETF4PFXNHJZQDALIX2IE3J4CHG2A3MVS5RAM2CZYQJYRHV27JAAAAAAAAAAAAAAAAAJN";
  let account: Awaited<ReturnType<typeof server.getAccount>>;
  try {
    account = source
      ? await server.getAccount(source)
      : await server.getAccount(dummyKey);
  } catch (err: unknown) {
    console.warn("[LeaseNFT] readContract getAccount failed, retrying:", err);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    account = source
      ? await server.getAccount(source)
      : await server.getAccount(dummyKey);
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    const errStr = typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error);
    throw new Error(`Contract read failed: ${errStr}`);
  }

  if (!sim.result) {
    throw new Error("No simulation result returned");
  }

  return sim.result.retval ? scValToNative(sim.result.retval) : undefined;
}
