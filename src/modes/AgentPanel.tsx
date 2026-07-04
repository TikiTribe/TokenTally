// Phase 2A Agent input panel (lazy). Framework preset + tool-loop parameters. help-1: tooltips + explainer.
import { useAppStore } from '@/store/useAppStore';
import { NumberField } from '@/ui/NumberField';
import { ModelSelector } from '@/ui/ModelSelector';
import { ModeExplainer } from '@/ui/ModeExplainer';
import { HelpTip } from '@/ui/HelpTip';
import { FIELD_HELP, MODEL_HELP, fieldHelp } from '@/config/helpContent';
import type { PresetName } from '@/workloads'; // type-only: erased; the seeds apply in 2C

const PRESETS: { value: PresetName; label: string }[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'langchain', label: 'LangChain / LangGraph' },
  { value: 'crewai', label: 'CrewAI' },
  { value: 'autogen', label: 'AutoGen' },
  { value: 'llamaindex', label: 'LlamaIndex' },
];

export default function AgentPanel(): JSX.Element {
  const i = useAppStore((s) => s.inputs.agent);
  const patch = useAppStore((s) => s.patchInputs);
  return (
    <div className="card">
      <ModeExplainer mode="agent" />
      <ModelSelector mode="agent" help={MODEL_HELP} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
        <span className="field-label-row">
          <label htmlFor="agent-preset" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Framework preset (tunable seed)</label>
          <HelpTip tipId="agent-preset-tip" label="Framework preset (tunable seed)" content={fieldHelp('agent.preset')} />
        </span>
        <select id="agent-preset" className="input-field" value={i.preset} aria-describedby="agent-preset-tip"
          onChange={(e) => patch('agent', { preset: e.target.value as PresetName })}>
          {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <NumberField label="Tool-schema prefix (tokens)" value={i.toolSchemaTokens} onChange={(v) => patch('agent', { toolSchemaTokens: v })} hint="Stable cached prefix" help={FIELD_HELP['agent.toolSchemaTokens']} />
      <NumberField label="Steps per run" value={i.stepsPerRun} onChange={(v) => patch('agent', { stepsPerRun: v })} help={FIELD_HELP['agent.stepsPerRun']} />
      <NumberField label="Observation growth per step (tokens)" value={i.observationGrowthPerStep} onChange={(v) => patch('agent', { observationGrowthPerStep: v })} hint="Super-linear re-sent context" help={FIELD_HELP['agent.observationGrowthPerStep']} />
      <NumberField label="Action output per step (tokens)" value={i.actionOutputTokens} onChange={(v) => patch('agent', { actionOutputTokens: v })} help={FIELD_HELP['agent.actionOutputTokens']} />
      <NumberField label="Runs per month" value={i.runsPerMonth} onChange={(v) => patch('agent', { runsPerMonth: v })} help={FIELD_HELP['agent.runsPerMonth']} />
    </div>
  );
}
