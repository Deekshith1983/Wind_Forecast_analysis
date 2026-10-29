import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  badge?: string;
  variant?: 'default' | 'bias' | 'accent' | 'warning' | 'neutral';
  tooltipText?: string;
  icon?: LucideIcon; // Retained for backwards compatibility if needed
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  badge,
  variant = 'default',
  tooltipText,
  onClick,
}) => {
  // Border accent to encode analytical meaning
  const borderAccent =
    variant === 'bias'
      ? 'border-l-4 border-l-amber-500'
      : variant === 'accent'
      ? 'border-l-4 border-l-blue-600'
      : variant === 'warning'
      ? 'border-l-4 border-l-rose-500'
      : 'border-l-4 border-l-slate-300';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded border border-slate-200 p-3.5 flex flex-col justify-between transition-colors ${borderAccent} ${
        onClick ? 'cursor-pointer hover:bg-slate-50/80' : ''
      }`}
    >
      {/* Top Header: Title & Context Badge */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase truncate">
          {title}
        </span>
        {badge && (
          <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            {badge}
          </span>
        )}
      </div>

      {/* Main Metric Value: Tabular Monospace */}
      <div className="my-1.5 flex items-baseline space-x-1.5">
        <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono font-semibold text-slate-500 uppercase">
            {unit}
          </span>
        )}
      </div>

      {/* Subtitle / Analytical Context */}
      {subtitle && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100/80">
          <span className="truncate">{subtitle}</span>
          {tooltipText && (
            <span
              title={tooltipText}
              className="cursor-help inline-flex text-slate-400 hover:text-slate-600 ml-1 shrink-0"
            >
              <Info className="w-3 h-3" />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

