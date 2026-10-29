import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatPercent } from '../../lib/formatters';

interface Props {
  matchedHours: number;
  unmatchedHours: number;
  totalHours: number;
  coveragePct: number;
}

export const CoverageDonutChart: React.FC<Props> = ({
  matchedHours,
  unmatchedHours,
  totalHours,
  coveragePct,
}) => {
  const data = [
    { name: 'Eligible Matched', value: matchedHours, color: '#059669' },
    { name: 'Unmatched', value: unmatchedHours, color: '#E2E8F0' },
  ];

  return (
    <div className="w-full flex items-center justify-between gap-4">
      {/* Donut Chart with Centered Text */}
      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={46}
              outerRadius={62}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-extrabold text-navy-900 leading-tight">
            {formatPercent(coveragePct)}
          </span>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-tight">
            Coverage
          </span>
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="flex-1 space-y-1.5 text-xs">
        <div className="flex justify-between items-center text-slate-600">
          <span className="text-[11px]">Expected delivery hours (Jan 2026)</span>
          <span className="font-bold text-navy-900">{totalHours}</span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span className="text-[11px]">Hours with eligible forecasts</span>
          <span className="font-bold text-emerald-700">{matchedHours}</span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span className="text-[11px]">Unmatched hours</span>
          <span className="font-bold text-amber-600">{unmatchedHours}</span>
        </div>
        <div className="pl-2 pt-1 border-t border-slate-100 space-y-1 text-[10px] text-slate-500">
          <div className="flex justify-between">
            <span>• Missing forecast publications:</span>
            <span className="font-semibold">{unmatchedHours}</span>
          </div>
          <div className="flex justify-between">
            <span>• Missing actual records:</span>
            <span className="font-semibold">0</span>
          </div>
          <div className="flex justify-between">
            <span>• Forecasts published too late:</span>
            <span className="font-semibold">0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
