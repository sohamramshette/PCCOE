import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
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

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="stations" element={<Stations />} />
          <Route path="stations/:stationId" element={<StationDetails />} />
          <Route path="digital-twin" element={<DigitalTwinMap />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="scenarios" element={<Scenarios />} />
          <Route path="model-performance" element={<ModelPerformance />} />
          <Route path="data-methodology" element={<DataMethodology />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
