import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Clock,
  Database,
  FileText,
  Activity,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  {
    name: 'Executive Overview',
    path: '/overview',
    icon: LayoutDashboard,
    badge: 'Day-Ahead',
  },
  {
    name: 'Forecast Performance',
    path: '/forecast-performance',
    icon: TrendingUp,
  },
  {
    name: 'Purchase Lead-time',
    path: '/lead-time-analysis',
    icon: Clock,
  },
  {
    name: 'Data Quality & Coverage',
    path: '/data-quality',
    icon: Database,
  },
  {
    name: 'Methodology & Evidence',
    path: '/methodology',
    icon: FileText,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Persistent on Desktop (lg:), Slide-in Drawer on Mobile & Tablet */}
      <aside
        id="mobile-navigation"
        aria-label="Application Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-100 flex flex-col shrink-0 h-viewport border-r border-slate-800 select-none transform transition-transform duration-200 ease-in-out pt-safe pb-safe pl-safe
          lg:static lg:translate-x-0 lg:w-60 lg:h-full lg:z-auto
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand & Context Header */}
        <div className="p-4 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight text-white tracking-tight">
                UK Wind Forecast
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">Evaluation Engine</p>
            </div>
          </div>

          {/* Close button on Mobile/Tablet */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 -mr-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Context Sub-banner */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
          <span>Delivery Period</span>
          <span className="font-mono font-medium text-slate-200">Jan 2026 (744h)</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto touch-scroll">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 lg:py-2 rounded text-xs transition-colors duration-100 min-h-[44px] lg:min-h-0 ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white focus:bg-slate-800 focus:text-white'
                  }`
                }
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="truncate font-medium">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System Status / Provenance Footer */}
        <div className="p-3.5 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 shrink-0 bg-slate-900/95">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Data Feed</span>
            <span className="font-mono text-[10px] text-slate-200">Elexon BMRS</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Time Standard</span>
            <span className="font-mono text-[10px] text-emerald-400 font-semibold">UTC (Strict)</span>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 leading-tight">
            Benchmark: 24h Cutoff (11:00 D-1 Gate)
          </div>
        </div>
      </aside>
    </>
  );
};
