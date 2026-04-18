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

    async function getInitialSession() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (mounted) {
        setUser(user);
        setSession(null); // session comes from onAuthStateChange
        
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('id, stream')
            .eq('id', user.id)
            .single();
          setHasProfile(!!(profile && profile.stream));
        } else {
          setHasProfile(false);
        }
        
        setLoading(false);
      }
    }

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('id, stream')
              .eq('id', newSession.user.id)
              .single();
            setHasProfile(!!(profile && profile.stream));
          } else {
            setHasProfile(false);
          }
          
          setLoading(false);
        }
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
