"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface SessionUser {
  name: string;
}

interface UserContextValue {
  user: SessionUser | null;
  login: (name: string) => void;
  guest: () => void;
  signOut: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

function readUser(): SessionUser | null {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    // Hydrate from localStorage after mount only: `localStorage` doesn't
    // exist during SSR, so reading it before mount would produce a client
    // render that mismatches the server-rendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readUser());
  }, []);

  const login = (name: string) => {
    const u: SessionUser = { name: (name || "PLAYER1").toUpperCase().slice(0, 10) };
    setUser(u);
    try {
      localStorage.setItem("av_user", JSON.stringify(u));
    } catch {}
  };

  const guest = () => {
    const u: SessionUser = { name: "INVITADO" };
    setUser(u);
    try {
      localStorage.setItem("av_user", JSON.stringify(u));
    } catch {}
  };

  const signOut = () => {
    setUser(null);
    try {
      localStorage.removeItem("av_user");
    } catch {}
  };

  return (
    <UserContext.Provider value={{ user, login, guest, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
