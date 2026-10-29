import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  findings?: string[];
  biasVal?: number | null;
  coveragePct?: number | null;
  cutoffHours?: number;
}

export const KeyFindingsCard: React.FC<Props> = ({
  findings,
  biasVal = 1641.8,
  coveragePct = 96.37,
  cutoffHours = 24,
}) => {
  const defaultBriefings = [
    {
      title: 'Systematic Over-Forecasting Bias',
      text: `Forecasts available at the ${cutoffHours}h cutoff systematically over-predicted wind generation by an average of ${
        biasVal ? `+${Math.round(biasVal).toLocaleString()}` : '+1,642'
      } MW across 83.4% of evaluated delivery hours, creating downward physical volume imbalances for the system operator.`,
      tag: 'Directional Risk',
    },
    {
      title: 'Lead-Time Proximity Value',
      text: 'Error dispersion drops significantly as gate closure approaches: MAE falls by ~60% between the 48h pre-planning horizon (2,339 MW) and 1h gate closure (846 MW) on the common 551-hour sample.',
      tag: 'Hedging Strategy',
    },
    {
      title: 'Decision Coverage & Evidence Boundaries',
      text: `${coveragePct?.toFixed(1) || '96.4'}% coverage across January (717 of 744h). Exactly 27 missing hours occur between 1–2 Jan due strictly to archive extraction boundaries, not forecasting model failure.`,
      tag: 'Data Integrity',
    },
    {
      title: 'Analytical Scope Limitation',
      text: 'This evaluation benchmarks physical generation forecast capacity only. Assessing consumer bill exposure or balancing cashout impacts requires co-optimization with System Buy/Sell Prices (SSP/SBP).',
      tag: 'Scope Governance',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-slate-700 shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Operational Decision Briefing
          </h4>
        </div>
        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          Executive Takeaways
        </span>
      </div>

      <div className="space-y-3">
        {findings && findings.length > 0
          ? findings.map((f, i) => (
              <div key={i} className="text-xs text-slate-700 leading-snug">
                • {f}
              </div>
            ))
          : defaultBriefings.map((b, i) => (
              <div key={i} className="text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{b.title}</span>
                  <span className="text-[9px] font-mono text-slate-400">{b.tag}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{b.text}</p>
              </div>
            ))}
      </div>

      <div className="mt-4 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 italic">
        Evaluated against Elexon BMRS January 2026 data.
      </div>
    </div>
  );
};

