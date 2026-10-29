import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse p-4">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 bg-slate-100 rounded w-full"></div>
      ))}
    </div>
  );
};

export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
      <div className="flex items-center space-x-2.5">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
