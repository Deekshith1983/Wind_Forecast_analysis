import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LabelList,
} from 'recharts';
import type { CutoffComparisonResponse } from '../../types/api';
import { formatNumber } from '../../lib/formatters';

interface Props {
  comparison: CutoffComparisonResponse | null;
}

type MetricType = 'mae' | 'rmse' | 'bias' | 'coverage';

export const LeadTimeBarChart: React.FC<Props> = ({ comparison }) => {
  const [activeMetric, setActiveMetric] = useState<MetricType>('mae');

  if (!comparison || !comparison.results) {
    return <div className="text-xs text-slate-400 py-10 font-mono text-center">Loading comparison data...</div>;
  }

  const chartData = comparison.results.map((r) => {
    let val: number | null = 0;
    if (activeMetric === 'mae') {
      val = r.common_sample.metrics.mae;
    } else if (activeMetric === 'rmse') {
      val = r.common_sample.metrics.rmse;
    } else if (activeMetric === 'bias') {
      val = r.common_sample.metrics.bias;
    } else if (activeMetric === 'coverage') {
      val = r.full_coverage.coverage_pct;
    }

    return {
      name: `${r.cutoff_hours}h`,
      label: `${r.cutoff_hours}h Cutoff`,
      value: val !== null ? Number(val.toFixed(2)) : 0,
      cutoff: r.cutoff_hours,
      is24h: r.cutoff_hours === 24,
    };
  });

  return (
    <div className="w-full flex flex-col h-full min-w-0">
      {/* Metric Selector Pills & Sample Annotation */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <span className="text-[10px] font-mono text-slate-500">
          {activeMetric === 'coverage'
            ? 'Sample: All 744 January Hours'
            : `Sample: Common ${comparison.common_sample_hours}h (Balanced)`}
        </span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded text-[11px] font-medium text-slate-600">
          {(['mae', 'rmse', 'bias', 'coverage'] as MetricType[]).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className={`px-2 py-0.5 rounded uppercase font-mono ${
                activeMetric === m
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-56 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
              domain={activeMetric === 'coverage' ? [0, 100] : ['auto', 'auto']}
              unit={activeMetric === 'coverage' ? '%' : ''}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-slate-300 rounded shadow-xs p-2 text-xs font-mono">
                    <div className="font-bold text-slate-900">{d.label}</div>
                    <div className="text-slate-700 mt-1">
                      {activeMetric.toUpperCase()}:{' '}
                      <span className="font-bold">
                        {activeMetric === 'coverage'
                          ? `${d.value}%`
                          : `${formatNumber(d.value, 1)} MW`}
                      </span>
                    </div>
                    {d.is24h && (
                      <div className="text-[10px] text-blue-600 font-semibold mt-1">
                        ★ Day-Ahead Benchmark (11:00 D-1)
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: any) =>
                  activeMetric === 'coverage' ? `${v}%` : formatNumber(Number(v), 0)
                }
                style={{ fontSize: '10px', fontWeight: 600, fill: '#0f172a', fontFamily: 'monospace' }}
              />
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.is24h ? '#1e40af' : '#60a5fa'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[10px] text-slate-400 font-mono text-right">
        Dark navy = 24h Day-Ahead Baseline
      </div>
    </div>
  );
};

