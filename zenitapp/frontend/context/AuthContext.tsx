import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authService from "@/services/auth";
import { tokenStorage } from "@/services/storage";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await authService.fetchCurrentUser();
      setUser(me);
    } catch {
      await tokenStorage.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authService.login(email, password);
      await refreshUser();
    },
    [refreshUser]
  );

  const signUp = useCallback(
    async (payload: { email: string; password: string; full_name: string; phone?: string }) => {
      await authService.register(payload);
      await authService.login(payload.email, payload.password);
      await refreshUser();
    },
    [refreshUser]
  );

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
