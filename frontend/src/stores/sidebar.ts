import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type SidebarState = {
  pinned: boolean;
  togglePinned: () => void;
  setPinned: (v: boolean) => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      pinned: false,
      togglePinned: () => set((s) => ({ pinned: !s.pinned })),
      setPinned: (v) => set({ pinned: v }),
    }),
    {
      name: "ft-sidebar",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
