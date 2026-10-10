import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Dashboard } from './pages/Dashboard';
import { Stations } from './pages/Stations';
import { StationDetails } from './pages/StationDetails';
import { Forecast } from './pages/Forecast';
import { Scenarios } from './pages/Scenarios';
import { DigitalTwinMap } from './pages/DigitalTwinMap';
import { ModelPerformance } from './pages/ModelPerformance';
import { DataMethodology } from './pages/DataMethodology';
import { Alerts } from './pages/Alerts';
import { LandingPage } from './pages/LandingPage';
import { Scene } from './Scene';

const Backtracking = lazy(() => import('./pages/Backtracking').then((m) => ({ default: m.Backtracking })));

export { Scene };

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Master AirLens 3D Living World Landing Page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />

        {/* Dedicated Urban Environmental Digital Twin Workspace Pages */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="stations" element={<Stations />} />
          <Route path="stations/:stationId" element={<StationDetails />} />
          <Route path="digital-twin" element={<DigitalTwinMap />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="scenarios" element={<Scenarios />} />
          <Route
            path="backtracking"
            element={
              <Suspense fallback={<LoadingSpinner message="Loading Atmospheric Trajectory Backtracking Engine..." />}>
                <Backtracking />
              </Suspense>
            }
          />
          <Route path="model-performance" element={<ModelPerformance />} />
          <Route path="data-methodology" element={<DataMethodology />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
