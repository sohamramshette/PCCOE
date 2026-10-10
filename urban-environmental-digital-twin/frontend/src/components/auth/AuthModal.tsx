import React, { useState } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { X, ShieldCheck, UserCheck, KeyRound, UserPlus, LogIn, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, quickLogin } = useAuth();
  const [tab, setTab] = useState<'quick' | 'signin' | 'register'>('quick');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('CITIZEN');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        email,
        password,
        full_name: fullName,
        role: regRole,
        organization: organization || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (targetRole: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(targetRole);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(10, 14, 10, 0.82)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={closeAuthModal}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(145deg, rgba(28, 40, 27, 0.95) 0%, rgba(18, 25, 17, 0.98) 100%)',
          border: '1px solid rgba(163, 181, 147, 0.28)',
          borderRadius: '24px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          color: '#eef1e7',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid rgba(163, 181, 147, 0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8fa07e 0%, #44593e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <KeyRound size={17} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                AirLens Access &amp; Roles
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#9eab93' }}>
              Switch between Citizen Portal and Environmental Authority Control Room
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            style={{
              background: 'rgba(163, 181, 147, 0.1)',
              border: '1px solid rgba(163, 181, 147, 0.2)',
              borderRadius: '8px',
              padding: '6px',
              color: '#9eab93',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            padding: '0.75rem 1.75rem',
            gap: '8px',
            background: 'rgba(14, 20, 14, 0.5)',
            borderBottom: '1px solid rgba(163, 181, 147, 0.12)',
          }}
        >
          <button
            onClick={() => setTab('quick')}
            style={{
              padding: '8px',
              borderRadius: '10px',
              border: tab === 'quick' ? '1px solid #8fa07e' : '1px solid transparent',
              background: tab === 'quick' ? 'rgba(143, 160, 126, 0.2)' : 'transparent',
              color: tab === 'quick' ? '#ffffff' : '#9eab93',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} /> Quick Demo
          </button>
          <button
            onClick={() => setTab('signin')}
            style={{
              padding: '8px',
              borderRadius: '10px',
              border: tab === 'signin' ? '1px solid #8fa07e' : '1px solid transparent',
              background: tab === 'signin' ? 'rgba(143, 160, 126, 0.2)' : 'transparent',
              color: tab === 'signin' ? '#ffffff' : '#9eab93',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <LogIn size={14} /> Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            style={{
              padding: '8px',
              borderRadius: '10px',
              border: tab === 'register' ? '1px solid #8fa07e' : '1px solid transparent',
              background: tab === 'register' ? 'rgba(143, 160, 126, 0.2)' : 'transparent',
              color: tab === 'register' ? '#ffffff' : '#9eab93',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <UserPlus size={14} /> Register
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.75rem' }}>
          {error && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                fontSize: '0.82rem',
              }}
            >
              {error}
            </div>
          )}

          {/* TAB 1: QUICK 1-CLICK EVALUATOR ACCESS */}
          {tab === 'quick' && (
            <div>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.86rem', color: '#c9d3bf', lineHeight: 1.5 }}>
                Select a persona to test the platform. Evaluators can switch roles instantly without typing credentials:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Citizen Option */}
                <div
                  onClick={() => handleQuick('CITIZEN')}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(143, 160, 126, 0.35)',
                    background: 'linear-gradient(135deg, rgba(32, 48, 30, 0.8) 0%, rgba(20, 32, 19, 0.9) 100%)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(143, 160, 126, 0.25)',
                        border: '1px solid #8fa07e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a3b593',
                      }}
                    >
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#ffffff' }}>
                        Normal User / Citizen View
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9eab93', marginTop: '2px' }}>
                        Clean neighborhood search, health safety tips &amp; AI voice assistant
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#8fa07e',
                      color: '#131812',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    Select →
                  </span>
                </div>

                {/* Authority Option */}
                <div
                  onClick={() => handleQuick('AUTHORITY')}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(207, 152, 97, 0.35)',
                    background: 'linear-gradient(135deg, rgba(48, 38, 26, 0.8) 0%, rgba(32, 24, 16, 0.9) 100%)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(207, 152, 97, 0.25)',
                        border: '1px solid #cf9861',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f3c491',
                      }}
                    >
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#ffffff' }}>
                        Authority / Environmental Officer
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#d2b48c', marginTop: '2px' }}>
                        Full Digital Twin, IDW spatial map, What-If policy &amp; backtracking
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#cf9861',
                      color: '#131812',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    Select →
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SIGN IN FORM */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9eab93', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. citizen@pune-air.in"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(14, 20, 14, 0.7)',
                    border: '1px solid rgba(163, 181, 147, 0.22)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9eab93', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(14, 20, 14, 0.7)',
                    border: '1px solid rgba(163, 181, 147, 0.22)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #8fa07e 0%, #44593e 100%)',
                  border: '1px solid rgba(163, 181, 147, 0.4)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Authenticating...' : 'Sign In with JWT'}
              </button>
            </form>
          )}

          {/* TAB 3: REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9eab93', marginBottom: '5px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    background: 'rgba(14, 20, 14, 0.7)',
                    border: '1px solid rgba(163, 181, 147, 0.22)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9eab93', marginBottom: '5px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    background: 'rgba(14, 20, 14, 0.7)',
                    border: '1px solid rgba(163, 181, 147, 0.22)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9eab93', marginBottom: '5px' }}>
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    background: 'rgba(14, 20, 14, 0.7)',
                    border: '1px solid rgba(163, 181, 147, 0.22)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9eab93', marginBottom: '5px' }}>
                  Role Designation
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setRegRole('CITIZEN')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: regRole === 'CITIZEN' ? '1.5px solid #8fa07e' : '1px solid rgba(163, 181, 147, 0.2)',
                      background: regRole === 'CITIZEN' ? 'rgba(143, 160, 126, 0.25)' : 'rgba(14, 20, 14, 0.6)',
                      color: regRole === 'CITIZEN' ? '#ffffff' : '#9eab93',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Citizen / Resident
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('AUTHORITY')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: regRole === 'AUTHORITY' ? '1.5px solid #cf9861' : '1px solid rgba(163, 181, 147, 0.2)',
                      background: regRole === 'AUTHORITY' ? 'rgba(207, 152, 97, 0.25)' : 'rgba(14, 20, 14, 0.6)',
                      color: regRole === 'AUTHORITY' ? '#ffffff' : '#9eab93',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Municipal Authority
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9eab93', marginBottom: '5px' }}>
                  Organization / Neighborhood
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Kothrud Residents Society or PCMC Ward 4"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.95rem',
                    background: 'rgba(14, 20, 14, 0.7)',
                    border: '1px solid rgba(163, 181, 147, 0.22)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #8fa07e 0%, #44593e 100%)',
                  border: '1px solid rgba(163, 181, 147, 0.4)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Creating Account...' : 'Register Secure Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
