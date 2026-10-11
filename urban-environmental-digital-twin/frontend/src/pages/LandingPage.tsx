import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../shaders/threeui.css';

import AirLensNav from '../components/AirLensNav';
import HeroSection from '../components/HeroSection';
import BiggerPictureSection from '../components/BiggerPictureSection';
import LiveTwinSection from '../components/LiveTwinSection';
import DataToDecisionsSection from '../components/DataToDecisionsSection';
import TransparencySection from '../components/TransparencySection';
import CtaSection from '../components/CtaSection';
import AirLensFooter from '../components/AirLensFooter';
import StackingSections, { StackSection } from '../components/StackingSections';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('is-ready');
    return () => {
      document.body.classList.remove('is-ready');
    };
  }, []);

  const handleOpenDashboard = () => {
    navigate('/dashboard');
  };

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      if ((window as any).__lenis) {
        (window as any).__lenis.scrollTo(el, { duration: 1.2, offset: 0 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="airlens-app-root">
      {/* Navigation */}
      <AirLensNav />

      {/* Stacking Sections - Each page overlays on top of the previous one on scroll */}
      <StackingSections>
        {/* Page 01: Hero Section with 3D Scene */}
        <StackSection className="stack-section-hero">
          <HeroSection
            onExploreTwin={() => handleScrollTo('live-twin')}
            onDiscoverApproach={() => handleScrollTo('how-it-works')}
          />
        </StackSection>

        {/* Page 02: The Bigger Picture */}
        <StackSection>
          <BiggerPictureSection />
        </StackSection>

        {/* Page 03: The Live Twin */}
        <StackSection>
          <LiveTwinSection onExploreTwin={handleOpenDashboard} />
        </StackSection>

        {/* Page 04: From Data to Decisions */}
        <StackSection>
          <DataToDecisionsSection onOpenDashboard={handleOpenDashboard} />
        </StackSection>

        {/* Page 05: Built for Transparency */}
        <StackSection>
          <TransparencySection onExploreMethodology={() => handleScrollTo('methodology')} />
        </StackSection>

        {/* Page 06: Final Call to Action & Footer */}
        <StackSection className="stack-section-final">
          <CtaSection onEnterAirLens={handleOpenDashboard} />
          <AirLensFooter />
        </StackSection>
      </StackingSections>
    </div>
  );
};

export default LandingPage;
