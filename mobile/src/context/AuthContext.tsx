import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import type { AuthUser, Role } from "../types";
import { auth as authApi } from "../api/endpoints";

const TOKEN_KEY = "safesms.token";
const USER_KEY = "safesms.user";

interface AuthState {
  status: "loading" | "authenticated" | "unauthenticated";
  token: string | null;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; role?: Role; displayName?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function storeCreds(token: string, user: AuthUser) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}
async function clearCreds() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", token: null, user: null });

  // On cold start, try to rehydrate the session. If the token works we skip
  // straight to the app; if it's been revoked/expired we drop to the login screen.
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userStr = await SecureStore.getItemAsync(USER_KEY);
        if (!token || !userStr) {
          setState({ status: "unauthenticated", token: null, user: null });
          return;
        }
        // Verify the token still works; otherwise drop it.
        try {
          const user = await authApi.me(token);
          setState({ status: "authenticated", token, user });
        } catch {
          await clearCreds();
          setState({ status: "unauthenticated", token: null, user: null });
        }
      } catch {
        setState({ status: "unauthenticated", token: null, user: null });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    await storeCreds(token, user);
    setState({ status: "authenticated", token, user });
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; role?: Role; displayName?: string; phone?: string }) => {
      const { token, user } = await authApi.register(input);
      await storeCreds(token, user);
      setState({ status: "authenticated", token, user });
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearCreds();
    setState({ status: "unauthenticated", token: null, user: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
