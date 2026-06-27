import { create } from "zustand";
import type { TransactionStatus } from "@/types";

interface TransactionState {
  transactions: TransactionStatus[];
  addTransaction: (tx: TransactionStatus) => void;
  updateTransaction: (hash: string, updates: Partial<TransactionStatus>) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()((set) => ({
  transactions: [],

  addTransaction: (tx) =>
    set((state) => ({
      transactions: [tx, ...state.transactions].slice(0, 100), // keep last 100
    })),

  updateTransaction: (hash, updates) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.hash === hash ? { ...tx, ...updates } : tx
      ),
    })),

  clearTransactions: () => set({ transactions: [] }),
}));
