"use client";

import { createContext, useContext, useState } from "react";
import type { AuthUser } from "@/lib/auth-types";

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ initialUser, children }: { initialUser: AuthUser | null; children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
