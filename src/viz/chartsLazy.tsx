// The ONLY module that imports the recharts chart components. Everything downstream imports these React.lazy
// wrappers, so recharts stays in its own async `charts` chunk and never enters the first-paint entry (P1-A25).
// Owner: TokenTally UI.
import { lazy } from 'react';

export const CacheWarmthCurveLazy = lazy(() =>
  import('@/viz/CacheWarmthCurve').then((m) => ({ default: m.CacheWarmthCurve })),
);

export const StepAccumulationChartLazy = lazy(() =>
  import('@/viz/StepAccumulationChart').then((m) => ({ default: m.StepAccumulationChart })),
);

export const BlastRadiusRadialLazy = lazy(() =>
  import('@/viz/BlastRadiusRadial').then((m) => ({ default: m.BlastRadiusRadial })),
);

export const CostVsContextChartLazy = lazy(() =>
  import('@/viz/CostVsContextChart').then((m) => ({ default: m.CostVsContextChart })),
);
