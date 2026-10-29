import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { ErrorDistributionResponse } from '../../types/api';
import { formatNumber } from '../../lib/formatters';

interface Props {
  distribution: ErrorDistributionResponse | null;
}

export const ErrorDistributionChart: React.FC<Props> = ({ distribution }) => {
  if (!distribution || !distribution.bins || distribution.bins.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center py-10 font-mono">
        Distribution calculating...
      </div>
    );
  }

  const chartData = distribution.bins.map((b) => ({
    range: `${b.bin_start >= 0 ? '+' : ''}${Math.round(b.bin_start / 1000)}k`,
    bin_start: b.bin_start,
    bin_end: b.bin_end,
    count: b.count,
    isOver: b.bin_start >= 0,
  }));

  const medianErr = distribution.summary.median;
  const p90 = distribution.summary.percentile_90_abs;
  const p95 = distribution.summary.percentile_95_abs;

  return (
    <div className="w-full flex flex-col h-full justify-between min-w-0">
      {/* Histogram */}
      <div className="w-full h-48 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }}
              interval={1}
            />
            <YAxis tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-slate-300 rounded shadow-xs p-2 text-xs font-mono">
                    <div className="font-bold text-slate-800">
                      Range: {formatNumber(d.bin_start, 0)} to {formatNumber(d.bin_end, 0)} MW
                    </div>
                    <div className="text-slate-600 mt-1">
                      Count: <span className="font-bold text-slate-900">{d.count} hours</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {d.bin_start >= 0 ? 'Over-forecast (Actual fell short)' : 'Under-forecast (Actual exceeded)'}
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine x="+0k" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" />
            <Bar dataKey="count" radius={[1, 1, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOver ? '#d97706' : '#2563eb'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend indicator */}
      <div className="flex items-center justify-center space-x-3 sm:space-x-4 text-[10px] text-slate-500 py-1">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs inline-block" />
          <span className="truncate">Under (&lt;0 MW)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 bg-amber-600 rounded-xs inline-block" />
          <span className="truncate">Over (&gt;0 MW)</span>
        </div>
      </div>

      {/* Percentiles Summary Row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 text-center">
        <div className="bg-slate-50 p-1.5 sm:p-2 rounded border border-slate-100">
          <div className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">Median</div>
          <div className="text-[11px] sm:text-xs font-bold font-mono text-amber-700 mt-0.5">
            {medianErr !== null && medianErr !== undefined
              ? `${medianErr > 0 ? '+' : ''}${formatNumber(medianErr, 0)} MW`
              : '—'}
          </div>
        </div>
        <div className="bg-slate-50 p-1.5 sm:p-2 rounded border border-slate-100">
          <div className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">P90 |Err|</div>
          <div className="text-[11px] sm:text-xs font-bold font-mono text-slate-900 mt-0.5">
            {p90 ? `${formatNumber(p90, 0)} MW` : '—'}
          </div>
        </div>
        <div className="bg-slate-50 p-1.5 sm:p-2 rounded border border-slate-100">
          <div className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">P95 |Err|</div>
          <div className="text-[11px] sm:text-xs font-bold font-mono text-rose-700 mt-0.5">
            {p95 ? `${formatNumber(p95, 0)} MW` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
};

