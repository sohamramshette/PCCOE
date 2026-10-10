import os

AUTH_CONTEXT_CODE = '''import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
        const res = await fetch('/api/v1/auth/me', {
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
    const res = await fetch('/api/v1/auth/login', {
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
    const res = await fetch('/api/v1/auth/register', {
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

  const quickLogin = async (targetRole: UserRole): Promise<UserProfile> => {
    const res = await fetch('/api/v1/auth/quick-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: targetRole }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Quick login failed.');
    }
    const data = await res.json();
    setSession(data.access_token, data.user);
    setIsAuthModalOpen(false);
    return data.user;
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
'''

for base_dir in [r"C:\Users\A1\Desktop\Landing_page", r"c:\Users\A1\Desktop\PCCOE-1\urban-environmental-digital-twin\frontend"]:
    context_dir = os.path.join(base_dir, "src", "context")
    os.makedirs(context_dir, exist_ok=True)
    target_path = os.path.join(context_dir, "AuthContext.tsx")
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(AUTH_CONTEXT_CODE)
    print("Created AuthContext.tsx at", target_path)
