/**
 * Auth Store
 * Feature: frontend-admin-ui
 * 
 * Manages authentication state including Admin Token storage,
 * login/logout, and authorization header generation.
 */
import { defineStore } from 'pinia';

const TOKEN_KEY = 'admin_token';

interface AuthState {
  token: string | null;
  isInitialized: boolean | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    isInitialized: null,
  }),

  getters: {
    isLoggedIn: (state): boolean => !!state.token,
  },

  actions: {
    /**
     * Initialize store from localStorage
     */
    init() {
      if (import.meta.client) {
        this.token = localStorage.getItem(TOKEN_KEY);
      }
    },

    /**
     * Check initialization status via API
     */
    async checkInitStatus(): Promise<boolean> {
      try {
        const res = await fetch('/v1/init/status');
        const data = await res.json();
        const initialized = data.data?.initialized ?? false;
        this.isInitialized = initialized;
        return initialized;
      } catch {
        this.isInitialized = false;
        return false;
      }
    },

    /**
     * Initialize the application (first-time setup)
     */
    async initialize(): Promise<string> {
      const res = await fetch('/v1/init', { method: 'POST' });
      const data = await res.json();
      
      if (data.code !== 0 || !data.data?.adminToken) {
        throw new Error(data.message || '初始化失败');
      }
      
      return data.data.adminToken;
    },

    /**
     * Validate and login with Admin Token
     */
    async login(token: string): Promise<boolean> {
      try {
        const res = await fetch('/v1/auth/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const data = await res.json();
        
        if (res.ok && data.code === 0) {
          this.token = token;
          if (import.meta.client) {
            localStorage.setItem(TOKEN_KEY, token);
          }
          return true;
        }
        
        return false;
      } catch {
        return false;
      }
    },

    /**
     * Save token directly (after initialization)
     */
    saveToken(token: string) {
      this.token = token;
      if (import.meta.client) {
        localStorage.setItem(TOKEN_KEY, token);
      }
    },

    /**
     * Logout and clear token
     */
    logout() {
      this.token = null;
      if (import.meta.client) {
        localStorage.removeItem(TOKEN_KEY);
      }
    },

    /**
     * Get authorization header for API requests
     */
    getAuthHeader(): Record<string, string> {
      if (this.token) {
        return { 'Authorization': `Bearer ${this.token}` };
      }
      return {};
    },
  },
});
