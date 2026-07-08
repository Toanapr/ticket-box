import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ScannerAssignment,
  ScannerConnectionConfig,
  ScannerManifest,
  ScannerQueueItem,
  ScannerResultRecord,
} from './types';

export interface ScannerState {
  connectionConfig: ScannerConnectionConfig | null;
  assignment: ScannerAssignment | null;
  manifest: ScannerManifest | null;
  queue: ScannerQueueItem[];
  results: ScannerResultRecord[];
  checkedInTicketRefs: string[];
  lastSuccessfulSyncAt: string | null;

  setConnectionConfig: (config: ScannerConnectionConfig) => void;
  setAssignment: (assignment: ScannerAssignment | null) => void;
  setManifest: (manifest: ScannerManifest | null) => void;
  
  addQueueItem: (item: ScannerQueueItem) => void;
  replaceQueue: (queue: ScannerQueueItem[]) => void;
  
  addResult: (result: ScannerResultRecord) => void;
  replaceResults: (results: ScannerResultRecord[]) => void;
  
  addCheckedInTicketRef: (ref: string) => void;
  setLastSuccessfulSyncAt: (timestamp: string) => void;
  
  clearAll: () => void;
}

export const useScannerStore = create<ScannerState>()(
  persist(
    (set, get) => ({
      connectionConfig: null,
      assignment: null,
      manifest: null,
      queue: [],
      results: [],
      checkedInTicketRefs: [],
      lastSuccessfulSyncAt: null,

      setConnectionConfig: (config) => set({ connectionConfig: config }),
      setAssignment: (assignment) => set({ assignment }),
      setManifest: (manifest) => set({ manifest }),
      
      addQueueItem: (item) => {
        const currentQueue = get().queue;
        const filtered = currentQueue.filter(q => q.clientEventId !== item.clientEventId);
        set({ queue: [...filtered, item] });
      },
      
      replaceQueue: (queue) => set({ queue }),
      
      addResult: (result) => {
        const currentResults = get().results;
        const filtered = currentResults.filter(r => r.clientEventId !== result.clientEventId);
        set({ results: [...filtered, result] });
      },
      
      replaceResults: (results) => set({ results }),
      
      addCheckedInTicketRef: (ref) => {
        const currentRefs = get().checkedInTicketRefs;
        if (!currentRefs.includes(ref)) {
          set({ checkedInTicketRefs: [...currentRefs, ref] });
        }
      },
      
      setLastSuccessfulSyncAt: (timestamp) => set({ lastSuccessfulSyncAt: timestamp }),
      
      clearAll: () => set({
        connectionConfig: null,
        assignment: null,
        manifest: null,
        queue: [],
        results: [],
        checkedInTicketRefs: [],
        lastSuccessfulSyncAt: null,
      }),
    }),
    {
      name: 'scanner-offline-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
