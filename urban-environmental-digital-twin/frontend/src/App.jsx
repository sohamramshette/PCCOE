import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { CitizenPortal } from './pages/CitizenPortal';
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
import { PortalSelection } from './pages/PortalSelection';
import { UserDemoLogin } from './pages/UserDemoLogin';
import { AuthorityDemoLogin } from './pages/AuthorityDemoLogin';
import { Scene } from './Scene';

const Backtracking = lazy(() => import('./pages/Backtracking').then((m) => ({ default: m.Backtracking })));

export { Scene };

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Master AirLens 3D Living World Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<Navigate to="/" replace />} />

          {/* Portal Selection & Demo Login Flows */}
          <Route path="/login" element={<PortalSelection />} />
          <Route path="/login/user" element={<UserDemoLogin />} />
          <Route path="/login/authority" element={<AuthorityDemoLogin />} />

          {/* Dedicated Urban Environmental Digital Twin Workspace Pages */}
          <Route element={<Layout />}>
            {/* Clean Citizen Portal */}
            <Route path="citizen" element={<CitizenPortal />} />

            {/* Authority & Engineering Control Room */}
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
    </AuthProvider>
  );
}
