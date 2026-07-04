// Phase 2A Multi-agent (crew) input panel (lazy). help-1: tooltips + explainer.
import { useAppStore } from '@/store/useAppStore';
import { NumberField } from '@/ui/NumberField';
import { ModelSelector } from '@/ui/ModelSelector';
import { ModeExplainer } from '@/ui/ModeExplainer';
import { FIELD_HELP, MODEL_HELP } from '@/config/helpContent';

export default function CrewPanel(): JSX.Element {
  const i = useAppStore((s) => s.inputs.crew);
  const patch = useAppStore((s) => s.patchInputs);
  return (
    <div className="card">
      <ModeExplainer mode="crew" />
      <ModelSelector mode="crew" help={MODEL_HELP} />
      <NumberField label="Number of agents" value={i.memberCount} min={1} onChange={(v) => patch('crew', { memberCount: v })} help={FIELD_HELP['crew.memberCount']} />
      <NumberField label="Steps per member" value={i.stepsPerMember} onChange={(v) => patch('crew', { stepsPerMember: v })} help={FIELD_HELP['crew.stepsPerMember']} />
      <NumberField label="Shared transcript growth per step (tokens)" value={i.sharedTranscriptGrowthPerStep} onChange={(v) => patch('crew', { sharedTranscriptGrowthPerStep: v })} hint="Each member re-reads the growing transcript" help={FIELD_HELP['crew.sharedTranscriptGrowthPerStep']} />
      <NumberField label="Crew runs per month" value={i.runsPerMonth} onChange={(v) => patch('crew', { runsPerMonth: v })} help={FIELD_HELP['crew.runsPerMonth']} />
    </div>
  );
}
