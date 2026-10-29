import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, Menu, Activity } from 'lucide-react';
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

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const location = useLocation();
  const { cutoffHours, setCutoffHours } = useGlobalFilters();

  const currentInfo = routeTitles[location.pathname] || {
    title: 'UK Wind Forecast Evaluation',
    subtitle: 'Elexon BMRS January 2026 Analysis',
  };

  const activeCutoffMeta = cutoffOptions.find((o) => o.value === cutoffHours);

  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-20">
      {/* Top / Left Section: Hamburger Menu + Page Context */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        {/* Hamburger Menu Button (visible on mobile & tablet <1024px) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
          aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isSidebarOpen}
          aria-controls="mobile-navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Mini Logo Icon (visible on mobile only) */}
        <div className="lg:hidden w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shrink-0 sm:hidden">
          <Activity className="w-3.5 h-3.5" />
        </div>

        {/* Title and Context */}
        <div className="min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate">
              {currentInfo.title}
            </h2>
            {cutoffHours === 24 && (
              <span className="text-[9px] sm:text-[10px] font-mono uppercase px-1.5 sm:px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold shrink-0">
                Day-Ahead Focus
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate hidden sm:block max-w-xl">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right / Filter Controls Section */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 self-end md:self-auto w-full md:w-auto justify-end">
        {/* Evaluation Period (collapsed on smallest screens) */}
        <div className="hidden xs:block border border-slate-200 rounded px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-50 text-left">
          <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-500 font-semibold leading-tight">
            Period
          </div>
          <div className="text-[11px] sm:text-xs font-mono font-medium text-slate-800">
            01–31 Jan 2026
          </div>
        </div>

        {/* Forecast Cutoff Selector (Primary Interactive Filter) */}
        <div className="border border-slate-200 rounded px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white text-left relative focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex-1 xs:flex-initial">
          <div className="flex items-center justify-between space-x-2">
            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-500 font-semibold leading-tight">
              Decision Cutoff
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 hidden sm:inline">
              {activeCutoffMeta?.tag}
            </span>
          </div>
          <div className="relative mt-0.5">
            <select
              value={cutoffHours}
              onChange={(e) => setCutoffHours(Number(e.target.value) as CutoffHours)}
              aria-label="Select forecast decision cutoff horizon"
              className="appearance-none w-full bg-transparent pr-6 text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {cutoffOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value}h Cutoff — {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Time Standard Pill */}
        <div className="border border-slate-200 rounded px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-50 text-left shrink-0">
          <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-500 font-semibold leading-tight">
            Zone
          </div>
          <div className="text-[11px] sm:text-xs font-mono font-semibold text-slate-800">
            UTC
          </div>
        </div>
      </div>
    </header>
  );
};
