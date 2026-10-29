import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterProvider } from './context/FilterContext';
import { Layout } from './components/layout/Layout';
import { ExecutiveOverviewPage } from './pages/ExecutiveOverviewPage';
import { ForecastPerformancePage } from './pages/ForecastPerformancePage';
import { LeadTimeAnalysisPage } from './pages/LeadTimeAnalysisPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { MethodologyPage } from './pages/MethodologyPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <FilterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<ExecutiveOverviewPage />} />
              <Route path="forecast-performance" element={<ForecastPerformancePage />} />
              <Route path="lead-time-analysis" element={<LeadTimeAnalysisPage />} />
              <Route path="data-quality" element={<DataQualityPage />} />
              <Route path="methodology" element={<MethodologyPage />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FilterProvider>
    </QueryClientProvider>
  );
};

export default App;
