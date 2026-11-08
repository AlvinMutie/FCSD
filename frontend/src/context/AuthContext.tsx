import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserSettings } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (payload: Partial<UserSettings> & { display_name?: string; timezone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getCurrentUser()
      .then((res) => {
        if (res.authenticated && res.user && res.settings) {
          setUser(res.user);
          setSettings(res.settings);
        }
      })
      .catch((err) => console.error('Error verifying auth:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setSettings(data.settings);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const data = await api.register(email, password, displayName);
    setUser(data.user);
    setSettings(data.settings);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setSettings(null);
  };

  const updateSettings = async (payload: Partial<UserSettings> & { display_name?: string; timezone?: string }) => {
    const res = await api.updateSettings(payload);
    setUser(res.user);
    setSettings(res.settings);
  };

  return (
    <AuthContext.Provider value={{ user, settings, isLoading, login, register, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
