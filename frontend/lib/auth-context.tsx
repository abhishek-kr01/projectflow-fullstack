"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, clearProjectCache } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { fullName?: string; username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const refreshUser = useCallback(async () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("projectflow_access_token") : null;
    if (!token) {
      if (typeof window !== "undefined") window.localStorage.removeItem("projectflow_refresh_token");
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const nextUser = await api.auth.currentUser();
      setUser(nextUser);
      setStatus("authenticated");
    } catch {
      window.localStorage.removeItem("projectflow_access_token");
      window.localStorage.removeItem("projectflow_refresh_token");
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => { void refreshUser(); }, [refreshUser]);

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setStatus("unauthenticated");
    };
    window.addEventListener("projectflow:session-expired", onSessionExpired);
    return () => window.removeEventListener("projectflow:session-expired", onSessionExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login({ email, password });
    if (!result?.accessToken || !result?.user) throw new Error("The API did not return an access token. Check the backend login response.");
    clearProjectCache();
    window.localStorage.setItem("projectflow_access_token", result.accessToken);
    if (result.refreshToken) window.localStorage.setItem("projectflow_refresh_token", result.refreshToken);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (payload: { fullName?: string; username: string; email: string; password: string }) => {
    await api.auth.register(payload);
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* Clear the local session even if the API is unavailable. */ }
    window.localStorage.removeItem("projectflow_access_token");
    window.localStorage.removeItem("projectflow_refresh_token");
    clearProjectCache();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(() => ({ user, status, login, register, logout, refreshUser }), [user, status, login, register, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
