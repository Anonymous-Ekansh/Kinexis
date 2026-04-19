"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted || resolved) return;
      setUser(user);
      if (user) {
        supabase.from('users').select('id, stream').eq('id', user.id).single()
          .then(({ data }) => {
            if (mounted && !resolved) {
              setHasProfile(!!(data && data.stream));
              setLoading(false);
            }
          });
      } else {
        setHasProfile(false);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        resolved = true;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const { data: profile } = await supabase
            .from('users').select('id, stream').eq('id', newSession.user.id).single();
          if (mounted) setHasProfile(!!(profile && profile.stream));
        } else {
          setHasProfile(false);
        }
        if (mounted) setLoading(false);
      }
    );

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
