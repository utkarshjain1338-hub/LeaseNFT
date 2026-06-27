export type NetworkType = "testnet" | "mainnet" | "futurenet";

export interface NetworkConfig {
  network: NetworkType;
  networkPassphrase: string;
  rpcUrl: string;
}

// Contract types matching Rust structs
export interface Listing {
  owner: string;
  token_id: string;
  token_address: string;
  daily_rate: string;
  max_duration: number;
  active: boolean;
}

export interface ActiveLease {
  renter: string;
  start_time: number;
  end_time: number;
  total_fee: string;
}

export interface WalletInfo {
  address: string;
  network: NetworkType;
  connected: boolean;
}

export interface TransactionStatus {
  hash: string;
  status: "pending" | "success" | "failed";
  timestamp: number;
  label: string;
}

export interface ContractEvent {
  id: string;
  type: string;
  timestamp: number;
  wallet: string;
  action: string;
  data?: Record<string, unknown>;
}

export interface ContractMethodArg {
  name: string;
  type: "string" | "address" | "i128" | "u64" | "u32" | "bool";
}
