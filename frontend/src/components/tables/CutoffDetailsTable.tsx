import React from 'react';
import type { CutoffComparisonResponse } from '../../types/api';
import { formatNumber, formatPercent } from '../../lib/formatters';

interface Props {
  comparison: CutoffComparisonResponse | null;
}

const horizonDescriptions: Record<number, string> = {
  48: 'Two-Day Ahead Planning (D-2)',
  24: 'Day-Ahead Gate Closure (11:00 D-1)',
  12: 'Intraday Morning Position Fix',
  6: 'Balance-of-Day Dispatch Window',
  1: 'Balancing Mechanism Gate Closure',
};

export const CutoffDetailsTable: React.FC<Props> = ({ comparison }) => {
  if (!comparison || !comparison.results) {
    return <div className="text-xs text-slate-400 py-10 font-mono text-center">Loading comparison table...</div>;
  }

  return (
    <div className="w-full overflow-x-auto touch-scroll">
      <table className="w-full text-left text-xs min-w-[500px]">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider bg-slate-50">
            <th className="py-2.5 px-3">Horizon / Cutoff</th>
            <th className="py-2.5 px-3">Operational Decision Context</th>
            <th className="py-2.5 px-3 text-right">Coverage</th>
            <th className="py-2.5 px-3 text-right">MAE (551h)</th>
            <th className="py-2.5 px-3 text-right">RMSE (551h)</th>
            <th className="py-2.5 px-3 text-right">Bias (551h)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {comparison.results.map((r) => {
            const is24h = r.cutoff_hours === 24;
            const commonMae = r.common_sample.metrics.mae;
            const commonRmse = r.common_sample.metrics.rmse;
            const commonBias = r.common_sample.metrics.bias;
            const contextText = horizonDescriptions[r.cutoff_hours] || '';

            return (
              <tr
                key={r.cutoff_hours}
                className={`hover:bg-slate-50 transition-colors ${
                  is24h ? 'bg-blue-50/60 font-medium' : ''
                }`}
              >
                <td className="py-2.5 px-3 text-slate-900 font-mono flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="font-bold">{r.cutoff_hours}h</span>
                  {is24h && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-blue-600 text-white rounded font-mono font-semibold">
                      Primary
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-600 text-[11px] min-w-[140px]">
                  {contextText}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono whitespace-nowrap">
                  {formatPercent(r.full_coverage.coverage_pct)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-900 font-mono font-bold whitespace-nowrap">
                  {formatNumber(commonMae, 1)} MW
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700 font-mono whitespace-nowrap">
                  {formatNumber(commonRmse, 1)} MW
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                    commonBias && commonBias > 0 ? 'text-amber-700' : 'text-blue-700'
                  }`}
                >
                  {commonBias !== null && commonBias !== undefined
                    ? `${commonBias > 0 ? '+' : ''}${formatNumber(commonBias, 1)} MW`
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="pt-2 px-3 text-[10px] text-slate-400 font-mono flex flex-col sm:flex-row sm:justify-between gap-1">
        <span>* MAE, RMSE, and Bias calculated on balanced 551-hour common intersection</span>
        <span>Coverage = Full 744h January sample</span>
      </div>
    </div>
  );
};

