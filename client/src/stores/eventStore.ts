import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContractEvent } from "@/types";

interface EventState {
  events: ContractEvent[];
  addEvent: (event: ContractEvent) => void;
  setEvents: (events: ContractEvent[]) => void;
  clearEvents: () => void;
}

export const useEventStore = create<EventState>()(
  persist(
    (set) => ({
      events: [],

      addEvent: (event) =>
        set((state) => {
          // Deduplicate by ID — never add the same event twice
          if (state.events.some((e) => e.id === event.id)) return state;
          return {
            events: [event, ...state.events].slice(0, 200),
          };
        }),

      setEvents: (events) => set({ events }),

      clearEvents: () => set({ events: [] }),
    }),
    {
      name: "leasenft-events",
      partialize: (state) => ({ events: state.events }),
    }
  )
);
