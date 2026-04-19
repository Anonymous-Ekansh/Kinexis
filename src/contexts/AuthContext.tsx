"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hasProfile: boolean | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  hasProfile: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const authStateVersionRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    let activeProfileRequest = 0;

    const loadProfile = async (nextUser: User | null) => {
      if (!mounted) return;
      if (!nextUser) {
        setHasProfile(false);
        return;
      }

      const requestId = ++activeProfileRequest;
      const { data: profile } = await supabase
        .from("users")
        .select("id, stream")
        .eq("id", nextUser.id)
        .maybeSingle();

      if (!mounted || activeProfileRequest !== requestId) return;
      setHasProfile(!!(profile && profile.stream));
    };

    const applyAuthState = async (nextSession: Session | null, nextUser: User | null) => {
      if (!mounted) return;
      const version = ++authStateVersionRef.current;

      setSession(nextSession);
      setUser(nextUser);
      await loadProfile(nextUser);

      if (!mounted || authStateVersionRef.current !== version) return;
      setLoading(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          authStateVersionRef.current += 1;
          activeProfileRequest += 1;
          setSession(null);
          setUser(null);
          setHasProfile(false);
          setLoading(false);
          return;
        }

        const nextUser = nextSession?.user ?? null;
        await applyAuthState(nextSession, nextUser);
      }
    );

    async function initializeAuth() {
      try {
        const {
          data: { user: initialUser },
        } = await supabase.auth.getUser();

        if (!mounted) return;
        await applyAuthState(null, initialUser ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, hasProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
