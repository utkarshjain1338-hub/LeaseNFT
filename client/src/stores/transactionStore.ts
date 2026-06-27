import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TransactionStatus } from "@/types";

interface TransactionState {
  transactions: TransactionStatus[];
  addTransaction: (tx: TransactionStatus) => void;
  updateTransaction: (hash: string, updates: Partial<TransactionStatus>) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: [],

      addTransaction: (tx) =>
        set((state) => ({
          // Deduplicate by hash — never add the same transaction twice
          transactions: state.transactions.some((t) => t.hash === tx.hash)
            ? state.transactions
            : [tx, ...state.transactions].slice(0, 100),
        })),

      updateTransaction: (hash, updates) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.hash === hash ? { ...tx, ...updates } : tx
          ),
        })),

      clearTransactions: () => set({ transactions: [] }),
    }),
    {
      name: "leasenft-transactions",
      partialize: (state) => ({ transactions: state.transactions }),
    }
  )
);
