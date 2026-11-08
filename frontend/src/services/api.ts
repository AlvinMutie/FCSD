import { User, UserSettings, DashboardOverview } from '../types';

const BASE_URL = '/api';

export const api = {
  // Auth
  async login(email: string, password: string):Promise<{ user: User; settings: UserSettings }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async register(email: string, password: string, display_name: string): Promise<{ user: User; settings: UserSettings }> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, display_name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async logout(): Promise<void> {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async getCurrentUser(): Promise<{ authenticated: boolean; user?: User; settings?: UserSettings }> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) return { authenticated: false };
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{ user: User; settings: UserSettings }> {
    const res = await fetch(`${BASE_URL}/settings`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch settings');
    return data;
  },

  async updateSettings(payload: Partial<UserSettings> & { display_name?: string; timezone?: string }): Promise<{ user: User; settings: UserSettings }> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data;
  },

  // Dashboard
  async getDashboardOverview(): Promise<DashboardOverview> {
    const res = await fetch(`${BASE_URL}/dashboard/overview`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard overview');
    return data;
  },
};
