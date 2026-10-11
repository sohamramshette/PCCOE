import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '@designcodeio/threeui/style.css';

import AirLensNav from '../components/AirLensNav';
import HeroSection from '../components/HeroSection';
import BiggerPictureSection from '../components/BiggerPictureSection';
import LiveTwinSection from '../components/LiveTwinSection';
import DataToDecisionsSection from '../components/DataToDecisionsSection';
import TransparencySection from '../components/TransparencySection';
import CtaSection from '../components/CtaSection';
import AirLensFooter from '../components/AirLensFooter';
import StackingSections, { StackSection } from '../components/StackingSections';
import { scrollToCard } from '../utils/scrollHelper';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('is-ready');
    return () => {
      document.body.classList.remove('is-ready');
    };
  }, []);

  useEffect(() => {
    if (location.state && (location.state as any).scrollTo) {
      const targetId = (location.state as any).scrollTo;
      const timer = setTimeout(() => {
        scrollToCard(targetId);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const handleOpenDashboard = () => {
    navigate('/dashboard');
  };

  const handleScrollTo = (id: string) => {
    scrollToCard(id);
  };

  return (
    <div className="airlens-app-root">
      {/* Navigation */}
      <AirLensNav onOpenDashboard={handleOpenDashboard} />

      {/* Stacking Sections - Each page overlays on top of the previous one on scroll */}
      <StackingSections>
        {/* Page 01: Hero Section with 3D Scene */}
        <StackSection className="stack-section-hero" id="hero-section">
          <HeroSection
            onExploreTwin={() => handleScrollTo('live-monitoring-map')}
            onDiscoverApproach={() => handleScrollTo('digital-twin-explorer')}
          />
        </StackSection>

        {/* Page 02: Card 01 - Environmental Intelligence */}
        <StackSection id="environmental-intelligence">
          <BiggerPictureSection />
        </StackSection>

        {/* Page 03: Card 02 - Live Monitoring Map */}
        <StackSection id="live-monitoring-map">
          <LiveTwinSection onExploreTwin={handleOpenDashboard} />
        </StackSection>

        {/* Page 04: Card 03 - Digital Twin Explorer */}
        <StackSection id="digital-twin-explorer">
          <DataToDecisionsSection onOpenDashboard={handleOpenDashboard} />
        </StackSection>

        {/* Page 05: Card 04 - Data Transparency */}
        <StackSection id="data-transparency">
          <TransparencySection onExploreMethodology={() => handleScrollTo('data-transparency')} />
        </StackSection>

        {/* Page 06: Final Call to Action & Footer */}
        <StackSection className="stack-section-final" id="final-section">
          <CtaSection onEnterAirLens={handleOpenDashboard} />
          <AirLensFooter />
        </StackSection>
      </StackingSections>
    </div>
  );
};

export default LandingPage;

