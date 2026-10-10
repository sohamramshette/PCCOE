import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { CitizenPortal } from './pages/CitizenPortal';
import { ExploreAirQuality } from './pages/ExploreAirQuality';
import { CleanerRoutes } from './pages/CleanerRoutes';
import { ForecastGuidance } from './pages/ForecastGuidance';
import { PollutionSources } from './pages/PollutionSources';
import { MyAlerts } from './pages/MyAlerts';
import { ReportPollution } from './pages/ReportPollution';
import { MyPlaces } from './pages/MyPlaces';
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

const Backtracking = lazy(() => import('./pages/Backtracking').then((m) => ({ default: m.Backtracking })));

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<PortalSelection />} />
          <Route path="/login/user" element={<UserDemoLogin />} />
          <Route path="/login/authority" element={<AuthorityDemoLogin />} />
          <Route element={<Layout />}>
            <Route path="citizen" element={<CitizenPortal />} />
            <Route path="explore" element={<ExploreAirQuality />} />
            <Route path="cleaner-routes" element={<CleanerRoutes />} />
            <Route path="forecast-guidance" element={<ForecastGuidance />} />
            <Route path="pollution-sources" element={<PollutionSources />} />
            <Route path="my-alerts" element={<MyAlerts />} />
            <Route path="report-pollution" element={<ReportPollution />} />
            <Route path="my-places" element={<MyPlaces />} />
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
              <Suspense fallback={<LoadingSpinner message="Loading Atmospheric Backtracking Engine..." />}>
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
};

export default App;
