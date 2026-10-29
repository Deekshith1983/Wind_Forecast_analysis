import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useGlobalFilters } from '../../context/FilterContext';
import type { CutoffHours } from '../../types/api';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/overview': {
    title: 'Executive Overview',
    subtitle: 'Day-Ahead purchasing decision evaluation and headline forecast accuracy for January 2026',
  },
  '/forecast-performance': {
    title: 'Forecast Performance & Audit Ledger',
    subtitle: 'Hourly actual generation vs forecasts published before cutoff, signed errors, and empirical distributions',
  },
  '/lead-time-analysis': {
    title: 'Purchase Lead-Time Analysis',
    subtitle: 'Accuracy decay and coverage across decision horizons (48h, 24h Day-Ahead, 12h, 6h, 1h)',
  },
  '/data-quality': {
    title: 'Data Quality & Coverage Audit',
    subtitle: 'Dataset completeness, half-hour to hourly interval alignment, and archive boundary documentation',
  },
  '/methodology': {
    title: 'Methodology & Evidence',
    subtitle: 'Mathematical formulas, Elexon BMRS dataset provenance, and evaluation assumptions',
  },
};

const cutoffOptions: { value: CutoffHours; label: string; tag: string }[] = [
  { value: 24, label: '24h Cutoff', tag: 'Day-Ahead Market Benchmark (D-1 11:00)' },
  { value: 48, label: '48h Cutoff', tag: 'Two-Day Ahead Planning' },
  { value: 12, label: '12h Cutoff', tag: 'Intraday Morning Position' },
  { value: 6, label: '6h Cutoff', tag: 'Balance-of-Day Adjustment' },
  { value: 1, label: '1h Cutoff', tag: 'Gate Closure (Balancing Mechanism)' },
];

export const Header: React.FC = () => {
  const location = useLocation();
  const { cutoffHours, setCutoffHours } = useGlobalFilters();

  const currentInfo = routeTitles[location.pathname] || {
    title: 'UK Wind Forecast Evaluation',
    subtitle: 'Elexon BMRS January 2026 Analysis',
  };

  const activeCutoffMeta = cutoffOptions.find((o) => o.value === cutoffHours);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
      {/* Title & Context */}
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {currentInfo.title}
          </h2>
          {cutoffHours === 24 && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              Day-Ahead Focus
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Global Filter Controls */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Evaluation Period */}
        <div className="border border-slate-200 rounded px-3 py-1.5 bg-slate-50 text-left">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
            Evaluation Period
          </div>
          <div className="text-xs font-mono font-medium text-slate-800">
            01–31 Jan 2026 (744h)
          </div>
        </div>

        {/* Forecast Cutoff Selector */}
        <div className="border border-slate-200 rounded px-3 py-1.5 bg-white text-left relative focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <div className="flex items-center justify-between space-x-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
              Decision Cutoff
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {activeCutoffMeta?.tag}
            </span>
          </div>
          <div className="relative mt-0.5">
            <select
              value={cutoffHours}
              onChange={(e) => setCutoffHours(Number(e.target.value) as CutoffHours)}
              className="appearance-none w-full bg-transparent pr-6 text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {cutoffOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value}h Cutoff — {opt.tag}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Time Standard */}
        <div className="border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-left">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
            Timezone
          </div>
          <div className="text-xs font-mono font-semibold text-slate-800">
            UTC
          </div>
        </div>
      </div>
    </header>
  );
};

