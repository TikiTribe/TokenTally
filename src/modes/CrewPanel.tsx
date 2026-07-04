// Phase 2A Multi-agent (crew) input panel (lazy).
import { useAppStore } from '@/store/useAppStore';
import { NumberField } from '@/ui/NumberField';
import { ModelSelector } from '@/ui/ModelSelector';
import { ResultsPending } from '@/ui/ResultsPending';

export default function CrewPanel(): JSX.Element {
  const i = useAppStore((s) => s.inputs.crew);
  const patch = useAppStore((s) => s.patchInputs);
  return (
    <div className="card">
      <ModelSelector mode="crew" />
      <NumberField label="Number of agents" value={i.memberCount} min={1} onChange={(v) => patch('crew', { memberCount: v })} />
      <NumberField label="Steps per member" value={i.stepsPerMember} onChange={(v) => patch('crew', { stepsPerMember: v })} />
      <NumberField label="Shared transcript growth per step (tokens)" value={i.sharedTranscriptGrowthPerStep} onChange={(v) => patch('crew', { sharedTranscriptGrowthPerStep: v })} hint="Each member re-reads the growing transcript" />
      <NumberField label="Crew runs per month" value={i.runsPerMonth} onChange={(v) => patch('crew', { runsPerMonth: v })} />
      <ResultsPending />
    </div>
  );
}
