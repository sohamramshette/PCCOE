import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VapiVoiceAssistant } from '../components/voice/VapiVoiceAssistant';
import {
  MapPin,
  Heart,
  Activity,
  Wind,
  Shield,
  Sun,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';

interface StationOption {
  id: number;
  name: string;
  area: string;
  pm25: number;
  aqiCategory: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor';
  color: string;
  advice: string;
}

const NEIGHBORHOODS: StationOption[] = [
  {
    id: 11609,
    name: 'Mhada Colony, Pune - IITM',
    area: 'Viman Nagar / Airport Corridor',
    pm25: 28.3,
    aqiCategory: 'Good',
    color: '#00E400',
    advice: 'Clean, fresh air today. Excellent conditions for outdoor sports, morning walks, and cycling.',
  },
  {
    id: 11613,
    name: 'Revenue Colony-Shivajinagar',
    area: 'Central Pune & University Road',
    pm25: 42.6,
    aqiCategory: 'Satisfactory',
    color: '#92D050',
    advice: 'Air is satisfactory. Safe for all general outdoor routines. Slight haze near traffic junctions in the evening.',
  },
  {
    id: 60658,
    name: 'Hadapsar, Pune - IITM',
    area: 'Magarpatta / Solapur Road',
    pm25: 58.1,
    aqiCategory: 'Satisfactory',
    color: '#92D050',
    advice: 'Acceptable air quality. Safe for normal activities, but sensitive people should avoid rush-hour highway runs.',
  },
  {
    id: 3409331,
    name: 'Bhosari, Pune - IITM',
    area: 'PCMC Industrial Corridor',
    pm25: 76.4,
    aqiCategory: 'Moderate',
    color: '#FFFF00',
    advice: 'Moderate air pollution from local industrial operations and freight traffic. Sensitive individuals should wear masks near arterial roads.',
  },
  {
    id: 3409438,
    name: 'Katraj, Pune - IITM',
    area: 'South Pune / Bio-Reserve',
    pm25: 31.5,
    aqiCategory: 'Satisfactory',
    color: '#92D050',
    advice: 'Very pleasant air near the hills. Great for family outings and evening jogs in parks.',
  },
  {
    id: 3409526,
    name: 'Wakad-Hinjawadi Link',
    area: 'IT Park & Expressway Hub',
    pm25: 48.2,
    aqiCategory: 'Satisfactory',
    color: '#92D050',
    advice: 'Normal air quality during daylight hours. Traffic dust increases around 6:30 PM.',
  },
];

export const CitizenPortal: React.FC = () => {
  const { user, role, openAuthModal } = useAuth();
  const [selectedStation, setSelectedStation] = useState<StationOption>(NEIGHBORHOODS[0]);

  // Hourly simplified trend
  const hourlyForecast = [
    { time: '6:00 AM', status: 'Good', pm25: 24, safe: true },
    { time: '9:00 AM', status: 'Satisfactory', pm25: 38, safe: true },
    { time: '12:00 PM', status: 'Satisfactory', pm25: 32, safe: true },
    { time: '3:00 PM', status: 'Good', pm25: 27, safe: true },
    { time: '6:00 PM', status: 'Moderate', pm25: 55, safe: false },
    { time: '9:00 PM', status: 'Moderate', pm25: 62, safe: false },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Citizen Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(28, 42, 27, 0.88) 0%, rgba(18, 28, 17, 0.94) 100%)',
          border: '1px solid rgba(163, 181, 147, 0.22)',
          borderRadius: '24px',
          padding: '2rem 2.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(143, 160, 126, 0.25)',
                color: '#a3b593',
                border: '1px solid rgba(163, 181, 147, 0.3)',
              }}
            >
              🌿 Citizen Clean Air Portal
            </span>
            <span style={{ fontSize: '11px', color: '#9eab93' }}>Pune &amp; PCMC Metropolitan Area</span>
          </div>
          <h1
            style={{
              fontSize: '2.1rem',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: '#f4f6f0',
              fontFamily: 'var(--font-heading)',
            }}
          >
            How is the air in your neighborhood today?
          </h1>
          <p style={{ margin: 0, fontSize: '0.94rem', color: '#c9d3bf', maxWidth: '680px', lineHeight: 1.5 }}>
            Real-time, zero-jargon air quality insights and practical health recommendations for your family, daily exercise, and commute.
          </p>
        </div>

        {/* Persona Pill & Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={openAuthModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '14px',
              background: 'rgba(163, 181, 147, 0.15)',
              border: '1px solid rgba(163, 181, 147, 0.35)',
              color: '#eef1e7',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Sparkles size={16} color="#8fa07e" />
            <span>Switch Role / Login</span>
          </button>
          {role === 'AUTHORITY' && (
            <Link
              to="/digital-twin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #cf9861 0%, #a46d38 100%)',
                color: '#131812',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Layers size={16} />
              <span>Open Authority Digital Twin →</span>
            </Link>
          )}
        </div>
      </div>

      {/* Embedded Vapi Voice Assistant Widget */}
      <div style={{ marginBottom: '2rem' }}>
        <VapiVoiceAssistant
          stationName={selectedStation.name}
          pm25={selectedStation.pm25}
          aqiCategory={selectedStation.aqiCategory}
        />
      </div>

      {/* Neighborhood Selector Chips */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MapPin size={16} color="#8fa07e" />
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#eef1e7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Choose Your Pune Neighborhood:
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {NEIGHBORHOODS.map((st) => {
            const isSelected = st.id === selectedStation.id;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStation(st)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: isSelected ? '1.5px solid #8fa07e' : '1px solid rgba(163, 181, 147, 0.2)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(38, 56, 35, 0.95) 0%, rgba(24, 38, 23, 0.95) 100%)'
                    : 'rgba(20, 28, 19, 0.65)',
                  color: isSelected ? '#ffffff' : '#c9d3bf',
                  fontSize: '0.86rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 16px rgba(0, 0, 0, 0.3)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: st.color }} />
                <span>{st.area}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Citizen Layout: Primary AQI Card & Activity Safety Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}
      >
        {/* Left: Big AQI Health Card */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#8fa07e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Telemetry Feed
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '4px 0 0', color: '#f4f6f0' }}>
                  {selectedStation.name}
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#9eab93' }}>{selectedStation.area}</span>
              </div>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: `${selectedStation.color}25`,
                  color: '#ffffff',
                  border: `1.5px solid ${selectedStation.color}`,
                }}
              >
                {selectedStation.aqiCategory} Air
              </span>
            </div>

            {/* Big Meter Circle & Number */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '12px',
                marginBottom: '1rem',
                padding: '1.5rem',
                borderRadius: '18px',
                background: 'rgba(14, 20, 14, 0.65)',
                border: '1px solid rgba(163, 181, 147, 0.15)',
              }}
            >
              <span style={{ fontSize: '3.6rem', fontWeight: 800, color: selectedStation.color, lineHeight: 1 }}>
                {selectedStation.pm25.toFixed(1)}
              </span>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#eef1e7' }}>µg/m³ PM2.5</span>
                <div style={{ fontSize: '0.78rem', color: '#9eab93' }}>Fine breathable particles</div>
              </div>
            </div>

            {/* Plain language advice */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                background: 'rgba(143, 160, 126, 0.12)',
                borderLeft: `4px solid ${selectedStation.color}`,
                color: '#eef1e7',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
              }}
            >
              <strong>Resident Guidance:</strong> {selectedStation.advice}
            </div>
          </div>

          <div
            style={{
              paddingTop: '1rem',
              borderTop: '1px solid rgba(163, 181, 147, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              color: '#9eab93',
            }}
          >
            <span>Verified by CPCB / IITM SAFAR Network</span>
            <span style={{ color: '#8fa07e', fontWeight: 600 }}>Updated 5 mins ago</span>
          </div>
        </div>

        {/* Right: "Can I Go Outside?" Activity Safety Matrix */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <Heart size={20} color="#8fa07e" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
              Daily Activity &amp; Health Checklist
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Activity 1 */}
            <div
              style={{
                padding: '1rem 1.15rem',
                borderRadius: '16px',
                background: 'rgba(14, 22, 14, 0.65)',
                border: '1px solid rgba(163, 181, 147, 0.14)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(0, 228, 0, 0.15)',
                  border: '1px solid #00E400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4ade80',
                  flexShrink: 0,
                }}
              >
                <Sun size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f6f0' }}>
                  Morning Jogging &amp; Outdoor Walks
                </div>
                <div style={{ fontSize: '0.78rem', color: '#c9d3bf', marginTop: '2px' }}>
                  Safe &amp; recommended. Air is clearest between 6:00 AM and 9:00 AM in parks.
                </div>
              </div>
            </div>

            {/* Activity 2 */}
            <div
              style={{
                padding: '1rem 1.15rem',
                borderRadius: '16px',
                background: 'rgba(14, 22, 14, 0.65)',
                border: '1px solid rgba(163, 181, 147, 0.14)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(0, 228, 0, 0.15)',
                  border: '1px solid #00E400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4ade80',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f6f0' }}>
                  Children &amp; School Playground
                </div>
                <div style={{ fontSize: '0.78rem', color: '#c9d3bf', marginTop: '2px' }}>
                  Normal outdoor sports and break time playtime safe. No restrictions.
                </div>
              </div>
            </div>

            {/* Activity 3 */}
            <div
              style={{
                padding: '1rem 1.15rem',
                borderRadius: '16px',
                background: 'rgba(14, 22, 14, 0.65)',
                border: '1px solid rgba(163, 181, 147, 0.14)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                  flexShrink: 0,
                }}
              >
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f6f0' }}>
                  Seniors &amp; Asthma Patients
                </div>
                <div style={{ fontSize: '0.78rem', color: '#c9d3bf', marginTop: '2px' }}>
                  Mild caution during evening traffic peak (6 PM - 8 PM). Avoid busy highway junctions.
                </div>
              </div>
            </div>

            {/* Activity 4 */}
            <div
              style={{
                padding: '1rem 1.15rem',
                borderRadius: '16px',
                background: 'rgba(14, 22, 14, 0.65)',
                border: '1px solid rgba(163, 181, 147, 0.14)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid #3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}
              >
                <Wind size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f6f0' }}>
                  Home Ventilation &amp; Windows
                </div>
                <div style={{ fontSize: '0.78rem', color: '#c9d3bf', marginTop: '2px' }}>
                  Keep windows open between 10:00 AM and 4:00 PM to circulate clean daytime air.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified 24-Hour Neighborhood Outlook */}
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
          border: '1px solid rgba(163, 181, 147, 0.22)',
          borderRadius: '24px',
          padding: '2rem',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#8fa07e" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
              Simplified 24-Hour Neighborhood Outlook
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#9eab93' }}>Forecast calibrated by meteorological patterns</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {hourlyForecast.map((h, i) => (
            <div
              key={i}
              style={{
                padding: '1.1rem 0.85rem',
                borderRadius: '16px',
                background: 'rgba(14, 20, 14, 0.65)',
                border: '1px solid rgba(163, 181, 147, 0.14)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#9eab93', fontWeight: 600 }}>{h.time}</div>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  margin: '6px 0',
                  color: h.safe ? '#4ade80' : '#facc15',
                }}
              >
                {h.pm25}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '8px',
                  background: h.safe ? 'rgba(74, 222, 128, 0.15)' : 'rgba(250, 204, 21, 0.15)',
                  color: h.safe ? '#4ade80' : '#facc15',
                  border: `1px solid ${h.safe ? '#4ade80' : '#facc15'}50`,
                }}
              >
                {h.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
