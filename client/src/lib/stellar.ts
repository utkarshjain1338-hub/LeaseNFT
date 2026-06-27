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

// Sign and submit a transaction using the connected wallet
export async function signAndSendTransaction(
  txXdr: string,
  address: string
): Promise<string> {
  ensureKit();
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(txXdr, {
    networkPassphrase: getNetworkPassphrase(),
    address,
  });

  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedTxXdr, getNetworkPassphrase());
  const sendResponse = await server.sendTransaction(tx);

  if (sendResponse.status === "ERROR") {
    throw new Error("Transaction failed");
  }

  return sendResponse.hash;
}

// Wait for transaction to complete
export async function waitForTransaction(
  hash: string,
  maxRetries = 30
): Promise<rpc.Api.GetTransactionResponse> {
  const server = getServer();
  let attempts = 0;
  while (attempts < maxRetries) {
    const result = await server.getTransaction(hash);
    if (result.status !== "NOT_FOUND") {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }
  throw new Error("Transaction timeout");
}

// Build and submit a contract call
export async function callContract(
  method: string,
  args: xdr.ScVal[],
  source: string,
  needsAuth: boolean = true
): Promise<string> {
  const server = getServer();
  const contractId = getContractId();
  const contract = new Contract(contractId);

  // Get source account
  const account = await server.getAccount(source);

  // Build the transaction
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(
      contract.call(
        method,
        ...(needsAuth
          ? [new Address(source).toScVal(), ...args]
          : args)
      )
    )
    .setTimeout(300)
    .build();

  // Simulate
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${JSON.stringify(sim.error)}`);
  }

  const preparedTx = rpc.assembleTransaction(tx, sim).build();
  const txXdr = preparedTx.toXDR();

  return signAndSendTransaction(txXdr, source);
}

// Read-only contract call
export async function readContract(
  method: string,
  args: xdr.ScVal[],
  source?: string
): Promise<unknown> {
  const server = getServer();
  const contractId = getContractId();
  const contract = new Contract(contractId);

  // Build a dummy transaction for simulation
  const dummyKey =
    "GANIETF4PFXNHJZQDALIX2IE3J4CHG2A3MVS5RAM2CZYQJYRHV27JAAAAAAAAAAAAAAAAAJN";
  const account = source
    ? await server.getAccount(source)
    : await server.getAccount(dummyKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${JSON.stringify(sim.error)}`);
  }

  if (!sim.result) {
    throw new Error("No simulation result");
  }

  const results = sim.result.retval
    ? scValToNative(sim.result.retval)
    : undefined;
  return results;
}
