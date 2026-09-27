import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, Database, MapPin, Wind } from 'lucide-react';
import { getStations } from '../api/stations';
import { PuneTwinMap } from '../components/map/PuneTwinMap';
import { Station } from '../types/station';

const leafParticles = Array.from({ length: 16 }, (_, index) => ({
  id: index,
  left: `${Math.random() * 100}%`,
  delay: `${-(Math.random() * 20)}s`,
  duration: `${13 + Math.random() * 10}s`,
  width: `${8 + Math.random() * 7}px`,
  height: `${5 + Math.random() * 5}px`,
  opacity: 0.25 + Math.random() * 0.3,
  rotation: `${Math.round(Math.random() * 360)}deg`,
}));

export const LandingPage: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationStatus, setStationStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    let isCurrent = true;

    getStations(true)
      .then((stationList) => {
        if (!isCurrent) return;
        setStations(stationList);
        setStationStatus('ready');
      })
      .catch(() => {
        if (isCurrent) setStationStatus('unavailable');
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <div className="landing-page">
      <div className="leaf-container" aria-hidden="true">
        {leafParticles.map((leaf) => (
          <span
            key={leaf.id}
            className={`leaf leaf--${leaf.id % 4}`}
            style={{
              left: leaf.left,
              animationDelay: leaf.delay,
              animationDuration: leaf.duration,
              width: leaf.width,
              height: leaf.height,
              opacity: leaf.opacity,
              '--leaf-rotation': leaf.rotation,
            } as React.CSSProperties & { '--leaf-rotation': string }}
          />
        ))}
      </div>

      <header className="landing-nav">
        <Link to="/welcome" className="landing-brand" aria-label="Pune Urban Twin home">
          <span className="landing-brand-mark"><Activity size={19} /></span>
          <span>Urban Twin <span className="landing-brand-city">PUNE</span></span>
        </Link>

        <nav className="landing-nav-links" aria-label="Main navigation">
          <a href="#capabilities">Capabilities</a>
          <a href="#method">Method</a>
          <a href="#live-twin">Live Twin</a>
        </nav>

        <Link to="/" className="btn btn-primary landing-nav-action">
          Open dashboard <ArrowUpRight size={16} />
        </Link>
      </header>

      <main className="landing-content">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow"><span className="landing-eyebrow-dot" /> PUNE · URBAN ENVIRONMENTAL DIGITAL TWIN</span>
            <h1 id="landing-title">Pune’s air,<br />seen as a <span className="gradient-text">living system.</span></h1>
            <p>
              Explore ground observations, atmospheric reanalysis, next-hour forecasts, and policy scenarios in one connected view of the city.
            </p>
            <div className="landing-actions">
              <Link to="/" className="btn btn-primary">
                Explore the dashboard <ArrowRight size={16} />
              </Link>
              <a href="#live-twin" className="btn btn-secondary">
                View the live twin <ArrowDown size={16} />
              </a>
            </div>
            <div className="landing-proofline">
              <span><MapPin size={15} /> Pune &amp; PCMC</span>
              <span><Database size={15} /> Observed + reanalysis data</span>
            </div>
          </div>
          <div className="landing-hero-aside" aria-label="Platform summary">
            <div className="landing-aside-topline">
              <span className="landing-aside-icon"><Wind size={18} /></span>
              <span>Air quality intelligence</span>
            </div>
            <div className="landing-aside-rule" />
            <p>One city. Multiple evidence streams. Clear provenance at every step.</p>
            <Link to="/data-methodology" className="landing-text-link">Explore the data approach <ArrowRight size={15} /></Link>
          </div>
        </section>

        <section id="live-twin" className="landing-map-section" aria-labelledby="live-twin-title">
          <div className="landing-section-heading">
            <div>
              <span className="landing-kicker">THE CITY, IN CONTEXT</span>
              <h2 id="live-twin-title">A living map of Pune’s monitoring network</h2>
            </div>
            <div className={`landing-live-status landing-live-status--${stationStatus}`}>
              <span />
              {stationStatus === 'loading' ? 'Connecting to station network' : stationStatus === 'ready' ? `${stations.length} active stations` : 'Station network unavailable'}
            </div>
          </div>
          <div className="landing-map-frame">
            <PuneTwinMap
              stations={stations}
              selectedStationId={null}
              onSelectStation={(stationId) => navigate(`/stations/${stationId}`)}
              latestObservations={{}}
              showTrafficBuffer={false}
              showActivityBuffer={false}
            />
            <div className="landing-map-caption">
              <span><MapPin size={14} /> Pune &amp; Pimpri-Chinchwad</span>
              <Link to="/digital-twin">Open full digital twin <ArrowUpRight size={14} /></Link>
            </div>
          </div>
          {stationStatus === 'unavailable' && (
            <p className="landing-map-note">The basemap is available, but live station markers need the API connection.</p>
          )}
        </section>

        <section id="capabilities" className="landing-capabilities" aria-labelledby="capabilities-title">
          <div className="landing-section-heading landing-capabilities-heading">
            <div>
              <span className="landing-kicker">FROM MEASUREMENT TO DECISION</span>
              <h2 id="capabilities-title">Follow the evidence, all the way through.</h2>
            </div>
            <Link to="/" className="landing-text-link">Visit the dashboard <ArrowRight size={15} /></Link>
          </div>
          <div className="landing-capability-grid">
            <Link to="/stations" className="landing-capability">
              <span className="landing-capability-icon landing-capability-icon--blue"><Activity size={18} /></span>
              <span className="landing-capability-title">Ground observations</span>
              <span className="landing-capability-copy">Inspect station readings and completeness without filling missing measurements.</span>
              <ArrowUpRight className="landing-capability-arrow" size={16} />
            </Link>
            <Link to="/forecast" className="landing-capability">
              <span className="landing-capability-icon landing-capability-icon--orange"><Wind size={18} /></span>
              <span className="landing-capability-title">Next-hour forecast</span>
              <span className="landing-capability-copy">Compare model estimates with observed air quality and atmospheric context.</span>
              <ArrowUpRight className="landing-capability-arrow" size={16} />
            </Link>
            <Link to="/scenarios" className="landing-capability">
              <span className="landing-capability-icon landing-capability-icon--green"><Database size={18} /></span>
              <span className="landing-capability-title">Policy scenarios</span>
              <span className="landing-capability-copy">Explore counterfactual interventions while keeping modeled results distinct from measurements.</span>
              <ArrowUpRight className="landing-capability-arrow" size={16} />
            </Link>
          </div>
        </section>

        <section id="method" className="landing-method-band">
          <div>
            <span className="landing-kicker">BUILT FOR TRACEABILITY</span>
            <h2>Every number keeps its source.</h2>
          </div>
          <p>Observed sensor data, ERA5-Land reanalysis, and model outputs are labeled separately so evidence stays easy to interpret.</p>
          <Link to="/data-methodology" className="btn btn-secondary">Read the methodology <ArrowRight size={16} /></Link>
        </section>

        <footer className="landing-footer">
          <span>Urban Environmental Digital Twin · Pune &amp; PCMC</span>
          <Link to="/">Enter the monitoring workspace <ArrowUpRight size={14} /></Link>
        </footer>
      </main>
    </div>
  );
};