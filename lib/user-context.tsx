"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

export interface SessionUser {
  name: string;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export interface LoginParams {
  email: string;
  password: string;
  /** Present on the "CREAR CUENTA" tab: triggers signUp instead of signInWithPassword. */
  name?: string;
}

interface UserContextValue {
  user: SessionUser | null;
  login: (params: LoginParams) => Promise<AuthResult>;
  guest: () => void;
  signOut: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

// The guest flag lives on its own key, separate from any real Supabase
// session, so "jugar como invitado" never touches Supabase.
const GUEST_KEY = "av_guest";

function normalizeName(name: string): string {
  return (name || "PLAYER1").toUpperCase().slice(0, 10);
}

function readGuestFlag(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

function toSupabaseError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Ocurrió un error inesperado.";
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Hydrate after mount only: `localStorage` doesn't exist during SSR,
    // and reading the Supabase session is async — either one before mount
    // would produce a client render that mismatches the server-rendered HTML.
    let cancelled = false;

    async function hydrate() {
      if (readGuestFlag()) {
         
        setUser({ name: "INVITADO" });
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled && session?.user) {
         
        setUser({ name: normalizeName(session.user.user_metadata?.name) });
      }
    }
    hydrate();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ name: normalizeName(session.user.user_metadata?.name) });
      } else if (!readGuestFlag()) {
        setUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async ({
    email,
    password,
    name,
  }: LoginParams): Promise<AuthResult> => {
    const { data, error } = name
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: normalizeName(name) } },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { ok: false, error: toSupabaseError(error) };
    }

    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {}

    if (data.user) {
      setUser({
        name: normalizeName(data.user.user_metadata?.name ?? name ?? ""),
      });
    }
    return { ok: true };
  };

  const guest = () => {
    setUser({ name: "INVITADO" });
    try {
      localStorage.setItem(GUEST_KEY, "1");
    } catch {}
  };

  const signOut = () => {
    setUser(null);
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {}
    supabase.auth.signOut();
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
