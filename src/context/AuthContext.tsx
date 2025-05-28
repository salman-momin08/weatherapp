// src/context/AuthContext.tsx
"use client";

import type { ClientUser } from '@/types/user';
import { createContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: ClientUser | null;
  token: string | null;
  isLoading: boolean;
  login: (emailIn: string, passwordIn: string) => Promise<boolean>;
  signup: (nameIn: string, emailIn: string, passwordIn: string, mobileNumberIn: string) => Promise<boolean>;
  logout: () => void;
  setUserAndToken: (userData: ClientUser | null, tokenData: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true to check localStorage
  const router = useRouter();
  const { toast } = useToast();

  const setUserAndToken = useCallback((userData: ClientUser | null, tokenData: string | null) => {
    setUser(userData);
    setToken(tokenData);
    if (userData && tokenData) {
      localStorage.setItem('weatherAppToken', tokenData);
      localStorage.setItem('weatherAppUser', JSON.stringify(userData));
    } else {
      localStorage.removeItem('weatherAppToken');
      localStorage.removeItem('weatherAppUser');
    }
  }, []);

  useEffect(() => {
    // Check localStorage for token and user on initial load
    try {
      const storedToken = localStorage.getItem('weatherAppToken');
      const storedUser = localStorage.getItem('weatherAppUser');
      if (storedToken && storedUser) {
        // Basic validation: ensure storedUser is valid JSON.
        // For more robust validation, you could verify the token against a '/api/auth/verify' endpoint
        // but for local-only, this might be sufficient if the token isn't expired.
        const parsedUser = JSON.parse(storedUser) as ClientUser;
        if (parsedUser && parsedUser.id && parsedUser.email) {
           setUserAndToken(parsedUser, storedToken);
        } else {
           setUserAndToken(null, null); // Clear if stored user is invalid
        }
      }
    } catch (error) {
      console.error("Error loading auth state from localStorage:", error);
      setUserAndToken(null, null); // Clear if there's an error
    } finally {
      setIsLoading(false);
    }
  }, [setUserAndToken]);

  const login = async (emailIn: string, passwordIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailIn, password: passwordIn }),
      });
      const data = await response.json();
      if (response.ok) {
        setUserAndToken(data.user, data.token);
        toast({ title: 'Login Successful', description: `Welcome back, ${data.user.name}!` });
        router.push('/');
        return true;
      } else {
        toast({ title: 'Login Failed', description: data.error || 'Invalid credentials.', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      toast({ title: 'Login Error', description: 'An unexpected error occurred.', variant: 'destructive' });
      console.error("Login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (nameIn: string, emailIn: string, passwordIn: string, mobileNumberIn: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameIn, email: emailIn, password: passwordIn, mobileNumber: mobileNumberIn }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: 'Signup Successful', description: 'Please log in with your new account.' });
        router.push('/login');
        return true;
      } else {
        const errorMsg = data.details ? Object.values(data.details).flat().join(', ') : data.error;
        toast({ title: 'Signup Failed', description: errorMsg || 'Could not create account.', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      toast({ title: 'Signup Error', description: 'An unexpected error occurred.', variant: 'destructive' });
      console.error("Signup error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUserAndToken(null, null);
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout, setUserAndToken }}>
      {children}
    </AuthContext.Provider>
  );
}
