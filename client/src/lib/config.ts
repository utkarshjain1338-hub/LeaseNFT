import { NetworkConfig } from "@/types";

export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    network: "testnet",
    networkPassphrase: "Test SDF Network ; September 2015",
    rpcUrl: "https://soroban-testnet.stellar.org",
  },
  mainnet: {
    network: "mainnet",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    rpcUrl: "https://soroban-rpc.stellar.org",
  },
  futurenet: {
    network: "futurenet",
    networkPassphrase: "Test SDF Future Network ; October 2022",
    rpcUrl: "https://rpc-futurenet.stellar.org",
  },
};

export function getNetworkConfig(network?: string): NetworkConfig {
  const net = network || process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
  return NETWORKS[net] || NETWORKS.testnet;
}

export function getContractId(): string {
  return (
    process.env.NEXT_PUBLIC_CONTRACT_ID ||
    "CCY5LVFVUQRJFV4WVVP5VO2WQA7NIGUKLQKWMNVOBTRHKN2RE4ZSAAAAAAAA"
  );
}

export function getCurrentNetwork(): string {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
}

export function getExplorerUrl(
  type: "transaction" | "contract" | "account",
  id: string
): string {
  const base =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
      ? "https://stellar.expert/explorer/public"
      : "https://stellar.expert/explorer/testnet";

  switch (type) {
    case "transaction":
      return `${base}/tx/${id}`;
    case "contract":
      return `${base}/contract/${id}`;
    case "account":
      return `${base}/account/${id}`;
    default:
      return base;
  }
}
