import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';

const get = () => useAppStore.getState();

describe('useAppStore transitions', () => {
  beforeEach(() => {
    useAppStore.setState({ mode: 'chatbot', theme: 'system', paletteOpen: false });
  });

  it('setMode / setTheme / togglePalette', () => {
    get().setMode('agent');
    expect(get().mode).toBe('agent');
    get().setTheme('dark');
    expect(get().theme).toBe('dark');
    get().togglePalette();
    expect(get().paletteOpen).toBe(true);
    get().togglePalette(false);
    expect(get().paletteOpen).toBe(false);
  });

  it('setSelection updates only the given mode', () => {
    const before = get().selection.prompt;
    get().setSelection('agent', { canonicalId: 'claude-3-5-sonnet', deployment: 'anthropic' });
    expect(get().selection.agent).toEqual({ canonicalId: 'claude-3-5-sonnet', deployment: 'anthropic' });
    expect(get().selection.prompt).toBe(before); // untouched
  });

  it('patchInputs merges into one mode without disturbing others (type-safe per mode)', () => {
    const promptBefore = get().inputs.prompt;
    get().patchInputs('chatbot', { conversationsPerMonth: 55555, contextStrategy: 'full' });
    expect(get().inputs.chatbot.conversationsPerMonth).toBe(55555);
    expect(get().inputs.chatbot.contextStrategy).toBe('full');
    expect(get().inputs.chatbot.avgResponseTokens).toBe(200); // other fields preserved
    expect(get().inputs.prompt).toBe(promptBefore); // other mode untouched
  });

  it('ensureRegistry loads the pinned snapshot and is idempotent', async () => {
    await get().ensureRegistry();
    expect(get().registryStatus).toBe('ready');
    expect(get().snapshotMeta?.snapshotVersion).toBe('8bb4e624126bd02dbc5190cdc40e520ba93502c9');
    expect((get().snapshotMeta?.droppedCount ?? 0)).toBeGreaterThan(0);
    // second call is a no-op (still ready)
    await get().ensureRegistry();
    expect(get().registryStatus).toBe('ready');
  });
});
