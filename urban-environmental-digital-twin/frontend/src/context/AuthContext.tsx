import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../api/client';

export type UserRole = 'CITIZEN' | 'AUTHORITY';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  organization?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    organization?: string;
  }) => Promise<UserProfile>;
  quickLogin: (role: UserRole) => Promise<UserProfile>;
  enterDemo: (role: UserRole) => UserProfile;
  logout: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'airlens_jwt_token';
const USER_KEY = 'airlens_user_profile';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Validate token on mount
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (res.ok) {
          const profile: UserProfile = await res.json();
          setUser(profile);
          localStorage.setItem(USER_KEY, JSON.stringify(profile));
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.warn('Session verification fallback to cached profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, []);

  const setSession = (accessToken: string, profile: UserProfile) => {
    setToken(accessToken);
    setUser(profile);
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
  };

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed. Please check your credentials.');
    }
    const data = await res.json();
    setSession(data.access_token, data.user);
    setIsAuthModalOpen(false);
    return data.user;
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    organization?: string;
  }): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed.');
    }
    const data = await res.json();
    setSession(data.access_token, data.user);
    setIsAuthModalOpen(false);
    return data.user;
  };

  const enterDemo = (targetRole: UserRole): UserProfile => {
    const demoProfile: UserProfile = {
      id: targetRole === 'CITIZEN' ? 1 : 2,
      email: targetRole === 'CITIZEN' ? 'citizen@pune-air.in' : 'officer@pcmc.gov.in',
      full_name: targetRole === 'CITIZEN' ? 'Rahul Sharma (Citizen)' : 'Dr. Sunita Kulkarni (Env Officer)',
      role: targetRole,
      organization: targetRole === 'CITIZEN' ? 'Pune Resident - Kothrud' : 'PCMC Environmental Protection Cell',
      phone: targetRole === 'CITIZEN' ? '+91 98220 12345' : '+91 94220 54321',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setSession('demo-access-token', demoProfile);
    setIsAuthModalOpen(false);
    return demoProfile;
  };

  const quickLogin = async (targetRole: UserRole): Promise<UserProfile> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/quick-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.access_token, data.user);
        setIsAuthModalOpen(false);
        return data.user;
      }
    } catch (err) {
      console.warn('Backend quick-login unreachable, falling back to local demo session:', err);
    }
    return enterDemo(targetRole);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  // Default to CITIZEN if not logged in
  const role: UserRole = user?.role || 'CITIZEN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        quickLogin,
        enterDemo,
        logout,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        isAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
