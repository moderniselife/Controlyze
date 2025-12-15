import { create } from "zustand";
import type { ContainerInfo, StackInfo, ContainerStats } from "@/types";

interface ContainersState {
  containers: ContainerInfo[];
  stacks: StackInfo[];
  standalone: ContainerInfo[];
  selectedContainer: ContainerInfo | null;
  selectedStack: StackInfo | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  setContainers: (containers: ContainerInfo[]) => void;
  setStacks: (stacks: StackInfo[], standalone: ContainerInfo[]) => void;
  setSelectedContainer: (container: ContainerInfo | null) => void;
  setSelectedStack: (stack: StackInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  fetchContainers: () => Promise<void>;
  fetchStacks: () => Promise<void>;
}

export const useContainersStore = create<ContainersState>((set) => ({
  containers: [],
  stacks: [],
  standalone: [],
  selectedContainer: null,
  selectedStack: null,
  isLoading: false,
  error: null,
  lastUpdated: null,

  setContainers: (containers) =>
    set({ containers, lastUpdated: new Date() }),

  setStacks: (stacks, standalone) =>
    set({ stacks, standalone, lastUpdated: new Date() }),

  setSelectedContainer: (container) => set({ selectedContainer: container }),

  setSelectedStack: (stack) => set({ selectedStack: stack }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  fetchContainers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/docker/containers");
      const data = await response.json();

      if (data.success) {
        set({ containers: data.data, lastUpdated: new Date() });
      } else {
        set({ error: data.error || "Failed to fetch containers" });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStacks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/docker/stacks");
      const data = await response.json();

      if (data.success) {
        set({
          stacks: data.data.stacks,
          standalone: data.data.standalone,
          lastUpdated: new Date(),
        });
      } else {
        set({ error: data.error || "Failed to fetch stacks" });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      set({ isLoading: false });
    }
  },
}));

interface ContainerStatsState {
  stats: Record<string, ContainerStats>;
  setStats: (containerId: string, stats: ContainerStats) => void;
  fetchStats: (containerId: string) => Promise<void>;
}

export const useContainerStatsStore = create<ContainerStatsState>((set, get) => ({
  stats: {},

  setStats: (containerId, stats) =>
    set((state) => ({
      stats: { ...state.stats, [containerId]: stats },
    })),

  fetchStats: async (containerId) => {
    try {
      const response = await fetch(`/api/docker/containers/${containerId}/stats`);
      const data = await response.json();

      if (data.success) {
        set((state) => ({
          stats: { ...state.stats, [containerId]: data.data },
        }));
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  },
}));
