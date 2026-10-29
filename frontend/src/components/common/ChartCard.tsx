import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded border border-slate-200 p-4 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      {/* Content */}
      <div className="flex-1 w-full min-h-[200px] flex flex-col justify-center">
        {children}
      </div>
    </div>
  );
};

