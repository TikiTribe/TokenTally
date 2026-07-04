// Phase 2 app store. FIRST-PAINT CONTRACT (P2-A7): the only runtime import here is `zustand`; everything
// else is `import type`. The engine/registry are reached exclusively through dynamic import() inside
// actions (ensureRegistry here; engineClient in 2C), so this module carries ZERO engine/registry runtime
// symbols and the first-paint-lean gate stays green. Owner: TokenTally UI. Version: Phase 2A.
import { create } from 'zustand';
import { getStoredTheme } from '@/shell/ThemeController'; // tiny DOM util, no engine deps (first-paint safe)
import type {
  Mode, ThemeMode, RegistryStatus, ModelSelection, SnapshotMeta, ModeInputs, FieldTokenCount,
} from '@/store/types';
import type { EngineResult } from '@/store/engineClient'; // type-only: erased, no engine edge in first-paint

const DEFAULT_INPUTS: ModeInputs = {
  chatbot: {
    systemPromptText: '', avgUserMessageTokens: 50, avgResponseTokens: 200,
    turnsPerConversation: 5, contextStrategy: 'moderate', conversationsPerMonth: 10000, ttl: 'min5',
  },
  prompt: { promptText: '', responseTokens: 300, callsPerMonth: 100000, turnsPerCall: 1, sharedSystemPromptTokens: 0 },
  agent: {
    preset: 'custom', runsPerMonth: 1000, stepsPerRun: 6, toolSchemaTokens: 1500,
    observationGrowthPerStep: 350, actionOutputTokens: 150,
  },
  crew: { memberCount: 3, runsPerMonth: 500, stepsPerMember: 5, sharedTranscriptGrowthPerStep: 200 },
  denial_of_wallet: {
    enabled: false, acknowledgedAuthorizedUse: false, attackerRequestsPerMonth: 1_000_000,
    retryCeiling: 1, fallbackInputTokens: 8000, fallbackOutputTokens: 4000,
  },
};

// A safe, present, cacheable per_token default; a wrong key degrades to "select a model" (never $0), so an
// imprecise default is harmless — the ModelSelector populates real options once the registry is ready.
const DEFAULT_SELECTION_KEY: ModelSelection = { canonicalId: 'gpt-4o', deployment: 'openai' };
const DEFAULT_SELECTION: Record<Mode, ModelSelection> = {
  chatbot: { ...DEFAULT_SELECTION_KEY }, prompt: { ...DEFAULT_SELECTION_KEY }, agent: { ...DEFAULT_SELECTION_KEY },
  crew: { ...DEFAULT_SELECTION_KEY }, denial_of_wallet: { ...DEFAULT_SELECTION_KEY },
};

export interface AppState {
  mode: Mode;
  theme: ThemeMode;
  paletteOpen: boolean;
  registryStatus: RegistryStatus;
  snapshotMeta: SnapshotMeta | null;
  selection: Record<Mode, ModelSelection>;
  inputs: ModeInputs;
  tokenCounts: Record<string, FieldTokenCount>; // keyed by fieldId (e.g. 'chatbot.systemPrompt')
  result: EngineResult | null; // forecast for the active mode; null until first recompute
  status: 'idle' | 'computing' | 'ready' | 'error';
  error: string | null;

  setMode(m: Mode): void;
  setTheme(t: ThemeMode): void;
  togglePalette(open?: boolean): void;
  setSelection(m: Mode, s: ModelSelection): void;
  patchInputs<M extends Mode>(m: M, patch: Partial<ModeInputs[M]>): void;
  reportTokenCount(fieldId: string, tc: FieldTokenCount): void;
  // §5.8: apply a validated config bundle (from an example or a decoded permalink) atomically.
  applyConfig(mode: Mode, selection: ModelSelection, inputs: Record<string, unknown>): void;
  ensureRegistry(): Promise<void>;
  recompute(): Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'chatbot',
  theme: getStoredTheme(), // hydrate from localStorage so a reload keeps the user's choice (matches initTheme)
  paletteOpen: false,
  registryStatus: 'idle',
  snapshotMeta: null,
  selection: DEFAULT_SELECTION,
  inputs: DEFAULT_INPUTS,
  tokenCounts: {},
  result: null,
  status: 'idle',
  error: null,

  setMode: (m) => set({ mode: m }),
  setTheme: (t) => set({ theme: t }),
  togglePalette: (open) => set((s) => ({ paletteOpen: open ?? !s.paletteOpen })),
  setSelection: (m, s) => set((state) => ({ selection: { ...state.selection, [m]: s } })),
  patchInputs: (m, patch) =>
    set((state) => ({ inputs: { ...state.inputs, [m]: { ...state.inputs[m], ...patch } } })),
  reportTokenCount: (fieldId, tc) =>
    set((state) => ({ tokenCounts: { ...state.tokenCounts, [fieldId]: tc } })),
  applyConfig: (mode, selection, inputs) =>
    set((state) => ({
      mode,
      selection: { ...state.selection, [mode]: selection },
      // merge only into the target mode; the untrusted `inputs` was already validated by the caller.
      inputs: { ...state.inputs, [mode]: { ...(state.inputs[mode] as unknown as Record<string, unknown>), ...inputs } } as ModeInputs,
    })),

  ensureRegistry: async () => {
    const st = get().registryStatus;
    if (st === 'ready' || st === 'loading') return; // idempotent
    set({ registryStatus: 'loading' });
    try {
      // Dynamic import keeps the registry catalog + loadRegistry runtime OUT of first-paint (P2-A7).
      const { bootstrapRegistry } = await import('@/registry/bootstrapRegistry');
      set({ registryStatus: 'ready', snapshotMeta: bootstrapRegistry() });
    } catch (e) {
      set({ registryStatus: 'error', error: e instanceof Error ? e.message : 'registry load failed' });
    }
  },

  recompute: async () => {
    const s = get();
    if (s.registryStatus !== 'ready' || !s.snapshotMeta) return; // guard: no forecast before the catalog loads
    set({ status: 'computing' });
    try {
      // Dynamic import keeps the engine graph OUT of first-paint (P2-A7).
      const { runForecast } = await import('@/store/engineClient');
      const cur = get(); // re-read: inputs may have changed while the engine chunk loaded
      const result = runForecast(cur.mode, cur.inputs, cur.selection[cur.mode], cur.tokenCounts, cur.snapshotMeta!.snapshotVersion);
      set({ result, status: 'ready', error: null });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'forecast failed' });
    }
  },
}));
