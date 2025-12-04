'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  plan: string;
  subscriptionStatus?: string;
  subscriptionEndsAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount and refresh user data
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      setToken(storedToken);
      // Set initial user from localStorage for immediate UI update
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
      // Fetch fresh user data from API to ensure we have latest subscription status
      api.getCurrentUser()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch((error) => {
          console.error('Error fetching current user:', error);
          // If token is invalid, clear everything
          if (error.statusCode === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    localStorage.setItem('access_token', response.access_token);
    setToken(response.access_token);
    
    // Store initial user data from login response
    if (response.user) {
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    // Fetch fresh user data from API to ensure we have latest subscription status
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error fetching user data after login:', error);
      // If fetch fails, keep the user data from login response
    }
  };

  const register = async (email: string, password: string) => {
    const response = await api.register(email, password);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  // Calculate isPro status
  // Frontend should treat any user with plan === 'PRO' as Pro.
  // The backend still enforces subscription validity via guards,
  // so this keeps UI simple while security stays on the server.
  const isPro = !!user && user.plan === 'PRO';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        refreshUser,
        isLoading,
        isAuthenticated: !!user && !!token,
        isPro,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

