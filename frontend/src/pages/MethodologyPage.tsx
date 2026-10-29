import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Database, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../api/endpoints';
import { ChartCard } from '../components/common/ChartCard';
import { LoadingSkeleton, ErrorBanner } from '../components/common/FeedbackStates';

export const MethodologyPage: React.FC = () => {
  const { data: methodology, isLoading: loadingMeth, error: errMeth } = useQuery({
    queryKey: ['methodology'],
    queryFn: () => api.getMethodology(),
  });

  const { data: dataSources, isLoading: loadingSources } = useQuery({
    queryKey: ['data-sources'],
    queryFn: () => api.getDataSources(),
  });

  if (loadingMeth || loadingSources) {
    return <LoadingSkeleton rows={8} />;
  }

  if (errMeth) {
    return <ErrorBanner message={(errMeth as Error).message} />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── SECTION 1: OVERVIEW & EVALUATION WINDOW ───────────────────── */}
      <ChartCard
        title="Evaluation Framework & Scope"
        subtitle="Standardized parameters ensuring complete mathematical reproducibility"
      >
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-navy-900 block mb-1">Evaluation Period</span>
              <span>{methodology?.evaluation_window || '1–31 January 2026 (744 total delivery hours)'}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-navy-900 block mb-1">Time Standard</span>
              <span>Coordinated Universal Time (UTC) applied strictly across all publication and delivery timestamps.</span>
            </div>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
            <span className="font-bold text-navy-900 block mb-1">Interval Alignment Rule</span>
            <p>{methodology?.alignment_rule}</p>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
            <span className="font-bold text-navy-900 block mb-1">Forecast Selection Policy</span>
            <p>{methodology?.forecast_selection_policy}</p>
          </div>
        </div>
      </ChartCard>

      {/* ── SECTION 2: MATHEMATICAL FORMULATIONS ──────────────────────── */}
      <ChartCard
        title="Accuracy Metrics Formulations & Interpretations"
        subtitle="Explicit error definitions and sensitivity characteristics"
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] bg-slate-50">
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Mathematical Formulation</th>
                <th className="py-2.5 px-3">Operational Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {methodology?.metrics?.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-navy-900">{m.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{m.unit}</td>
                  <td className="py-3 px-3 font-mono text-slate-800 bg-slate-50/60">{m.formula}</td>
                  <td className="py-3 px-3 text-slate-600 leading-snug">{m.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ── SECTION 3: DATA SOURCES & PROVENANCE ──────────────────────── */}
      <ChartCard
        title="Dataset Provenance & Field Schemas"
        subtitle="Official Elexon BMRS data feeds evaluated under open transparency rules"
      >
        <div className="space-y-6">
          {dataSources?.sources?.map((s, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-navy-900">{s.dataset_name}</h4>
                  <p className="text-xs text-slate-500">{s.description}</p>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Provider: <span className="font-semibold text-slate-700">{s.provider}</span>
                </div>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase font-semibold">
                    <th className="py-1.5 px-2">Field</th>
                    <th className="py-1.5 px-2">Type</th>
                    <th className="py-1.5 px-2">Unit</th>
                    <th className="py-1.5 px-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {s.fields.map((f, fi) => (
                    <tr key={fi}>
                      <td className="py-1.5 px-2 font-mono font-semibold text-navy-900">{f.field_name}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-500">{f.data_type}</td>
                      <td className="py-1.5 px-2 text-slate-600">{f.unit || '—'}</td>
                      <td className="py-1.5 px-2 text-slate-600">{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <p className="text-[11px] text-slate-500 italic">
            {dataSources?.licence_and_attribution}
          </p>
        </div>
      </ChartCard>

      {/* ── SECTION 4: DELIBERATELY EXCLUDED SCOPE (GOV.UK AUDIT DEFENCE) ─ */}
      <div className="bg-slate-50 border border-slate-300 rounded p-4 space-y-2.5">
        <div className="flex items-center space-x-2 text-slate-900">
          <ShieldAlert className="w-4 h-4 text-slate-700 shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            Evidentiary Boundaries & Explicitly Excluded Claims
          </h4>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          In compliance with enterprise-grade and ministerial analytical standards, this evaluation platform strictly limits
          conclusions to verified physical generation capacities and decision-time data availability:
        </p>
        <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside leading-relaxed">
          {methodology?.deliberately_excluded_scope?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
