import { useState, useEffect, useCallback, createContext, useContext, createElement, type ReactNode } from "react";
import * as api from "../lib/api";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
  authProvider: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, rememberMe?: boolean) => Promise<{ isNewUser: boolean | undefined; verificationSent: boolean }>;
  loginWithGoogle: (idToken: string, rememberMe?: boolean) => Promise<void>;
  loginWithMicrosoft: (accessToken: string, rememberMe?: boolean) => Promise<void>;
  loginWithApple: (identityToken: string, fullName?: { givenName?: string; familyName?: string }, email?: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  syncSettings: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.authApi.me();
      if (data && data.user) {
        setUser(data.user as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    setError(null);
    try {
      const response = await api.authApi.login(email, password, rememberMe);
      setUser(response.user as AuthUser);
    } catch (err) {
      const msg = err instanceof api.ApiError ? err.message : "Login failed";
      setError(msg);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, firstName?: string, lastName?: string, rememberMe?: boolean) => {
    setError(null);
    try {
      const response = await api.authApi.register(email, password, firstName, lastName, rememberMe);
      setUser(response.user as AuthUser);
      return { isNewUser: response.isNewUser, verificationSent: response.verificationSent };
    } catch (err) {
      const msg = err instanceof api.ApiError ? err.message : "Registration failed";
      setError(msg);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string, rememberMe?: boolean) => {
    setError(null);
    try {
      const response = await api.authApi.loginWithGoogle(idToken, rememberMe);
      setUser(response.user as AuthUser);
    } catch (err) {
      const msg = err instanceof api.ApiError ? err.message : "Google sign-in failed";
      setError(msg);
      throw err;
    }
  }, []);

  const loginWithMicrosoft = useCallback(async (accessToken: string, rememberMe?: boolean) => {
    setError(null);
    try {
      const response = await api.authApi.loginWithMicrosoft(accessToken, rememberMe);
      setUser(response.user as AuthUser);
    } catch (err) {
      const msg = err instanceof api.ApiError ? err.message : "Microsoft sign-in failed";
      setError(msg);
      throw err;
    }
  }, []);

  const loginWithApple = useCallback(async (identityToken: string, fullName?: { givenName?: string; familyName?: string }, email?: string, rememberMe?: boolean) => {
    setError(null);
    try {
      const response = await api.authApi.loginWithApple(identityToken, fullName, email, rememberMe);
      setUser(response.user as AuthUser);
    } catch (err) {
      const msg = err instanceof api.ApiError ? err.message : "Apple sign-in failed";
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.authApi.logout();
    } catch {
      // ignore logout errors
    } finally {
      setUser(null);
      api.setAuthToken(null);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await api.authApi.logoutAll();
    } catch {
      // ignore logout errors
    } finally {
      setUser(null);
      api.setAuthToken(null);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await api.authApi.resendVerification(email);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await api.authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    await api.authApi.resetPassword(token, newPassword);
  }, []);

  const syncSettings = useCallback(async () => {
    try {
      const localSettings = localStorage.getItem("guest_settings");
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        await api.authApi.syncSettings(parsed);
        localStorage.removeItem("guest_settings");
      }
    } catch (err) {
      console.error("Failed to sync settings:", err);
    }
  }, []);

  const authValue = {
    user, loading, error, login, register,
    loginWithGoogle, loginWithMicrosoft, loginWithApple,
    logout, logoutAll, refreshUser,
    resendVerification, forgotPassword, resetPassword,
    syncSettings, clearError,
  };

  return createElement(AuthContext.Provider, { value: authValue }, children);
}
