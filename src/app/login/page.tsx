"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="24" fill="#1C1C28" />
      <g transform="translate(-4,0)">
        <circle cx="36" cy="20" r="5.5" fill="#9EF01A" />
        <circle cx="36" cy="60" r="7.5" fill="#9EF01A" />
        <circle cx="36" cy="100" r="5.5" fill="#9EF01A" />
        <line x1="36" y1="25.5" x2="36" y2="52.5" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="36" y1="67.5" x2="36" y2="94.5" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="92" cy="20" r="5.5" fill="#9EF01A" />
        <path d="M43 53 Q60 36 87 23" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <circle cx="92" cy="100" r="5.5" fill="#9EF01A" />
        <path d="M43 67 Q60 84 87 97" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace("/discover");
    })();
  }, [router]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${originUrl}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <LogoMark /> Kinexis
        </h1>
        <p className="auth-subtitle">Welcome back</p>

        <button className="auth-google-btn" onClick={handleGoogleLogin} disabled={loading}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-form">
          <input type="email" placeholder="Email address" className="auth-input" />
          <input type="password" placeholder="Password" className="auth-input" />
          <button className="auth-submit-btn">Login with Email</button>
        </div>

        <div className="auth-footer">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
