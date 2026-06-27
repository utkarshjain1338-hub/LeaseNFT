import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
  address: string;
  network: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  setAddress: (address: string) => void;
  setNetwork: (network: string) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: "",
      network: "testnet",
      isConnected: false,
      isConnecting: false,
      error: null,

      setAddress: (address) => set({ address }),
      setNetwork: (network) => set({ network }),
      setConnected: (connected) => set({ isConnected: connected }),
      setConnecting: (connecting) => set({ isConnecting: connecting }),
      setError: (error) => set({ error }),

      disconnect: () =>
        set({
          address: "",
          isConnected: false,
          error: null,
        }),
    }),
    {
      name: "wallet-storage",
      partialize: (state) => ({
        address: state.address,
        network: state.network,
        isConnected: state.isConnected,
      }),
    }
  )
);
