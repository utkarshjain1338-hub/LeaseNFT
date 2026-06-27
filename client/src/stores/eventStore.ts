import { create } from "zustand";
import type { ContractEvent } from "@/types";

interface EventState {
  events: ContractEvent[];
  addEvent: (event: ContractEvent) => void;
  setEvents: (events: ContractEvent[]) => void;
  clearEvents: () => void;
}

export const useEventStore = create<EventState>()((set) => ({
  events: [],

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 200), // keep last 200
    })),

  setEvents: (events) => set({ events }),

  clearEvents: () => set({ events: [] }),
}));
