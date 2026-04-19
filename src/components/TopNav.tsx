"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import NetworkPanel from "./profile/NetworkPanel";
import "@/app/profile/profile.css"; // Reuse nav styling

function LogoSVG() {
  return (
    <svg width={180} height={38} viewBox="0 15 420 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(18,18) scale(0.38)">
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
      <line x1="65" y1="22" x2="65" y2="78" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <text x="76" y="58" fontFamily="'Syne','Inter',sans-serif" fontSize="42" fontWeight="800" fill="#FFFFFF" letterSpacing="-1.5">kinexis</text>
    </svg>
  );
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [resolvedUser, setResolvedUser] = useState<User | null>(user ?? null);
  const [profile, setProfile] = useState<any>(null);
  const [ddOpen, setDdOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const effectiveUser = user ?? resolvedUser;

  useEffect(() => {
    if (user) {
      setResolvedUser(user);
    }
  }, [user]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setResolvedUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user || authLoading) return;

    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!cancelled) {
        setResolvedUser(authUser ?? null);
      }
    }).catch((err) => {
      console.warn("TopNav auth fallback error:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!effectiveUser) {
      if (!authLoading) setProfile(null);
      return;
    }

    let cancelled = false;
    const fallbackProfile = {
      id: effectiveUser.id,
      full_name:
        effectiveUser.user_metadata?.full_name ||
        effectiveUser.user_metadata?.name ||
        effectiveUser.email?.split("@")[0] ||
        "User",
      stream: effectiveUser.user_metadata?.stream || "",
      year: effectiveUser.user_metadata?.year || "",
      avatar_url:
        effectiveUser.user_metadata?.avatar_url ||
        effectiveUser.user_metadata?.picture ||
        null,
    };

    setProfile((prev: any) => prev?.id === effectiveUser.id ? { ...fallbackProfile, ...prev } : fallbackProfile);

    (async () => {
      try {
        const { data: prof } = await supabase
          .from("users")
          .select("id, full_name, stream, year, avatar_url")
          .eq("id", effectiveUser.id)
          .maybeSingle();

        if (!cancelled) {
          if (prof) setProfile({ ...fallbackProfile, ...prof });
          else setProfile(fallbackProfile);
        }
      } catch (err) {
        console.warn("TopNav profile fetch error:", err);
        if (!cancelled) setProfile(fallbackProfile);
      }
    })();

    return () => { cancelled = true; };
  }, [effectiveUser?.id, pathname, authLoading]);

  /* Close dropdown */
  useEffect(() => {
    if (!ddOpen) return;
    const handler = () => setDdOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [ddOpen]);

  /* Escape key for mobile menu */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  /* Body scroll lock */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const toggleMenu = useCallback(() => setMenuOpen(v => !v), []);

  return (
    <>
      <nav className="pf-nav">
        <Link href="/" prefetch={false} style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <LogoSVG />
        </Link>
        <div className="pf-nav-links">
          <Link href="/discover" prefetch={false} className={pathname === "/discover" ? "active" : ""}>Discover</Link>
          <Link href="/channels" prefetch={false} className={pathname === "/channels" ? "active" : ""}>Channels</Link>
          <Link href="/feed" prefetch={false} className={pathname === "/feed" ? "active" : ""}>Campus Feed</Link>
          <Link href="/collabs" prefetch={false} className={pathname === "/collabs" ? "active" : ""}>Collabs</Link>
          <Link href="/events" prefetch={false} className={pathname === "/events" ? "active" : ""}>Events</Link>
          <Link href="/clubs" prefetch={false} className={pathname === "/clubs" ? "active" : ""}>Clubs</Link>
        </div>
        <div className="pf-nav-r">
          <Link href="/messages" prefetch={false} className={`pf-nav-notif ${pathname === "/messages" ? "active" : ""}`} style={{ textDecoration: 'none', color: 'var(--lime)' }} title="Messages"><MessageSquare size={15} /></Link>
          {profile ? (
            <>
              <div className="pf-nav-profile" onClick={e => { e.stopPropagation(); setDdOpen(v => !v); }}>
                <div className="pf-nav-av" style={{ position: "relative" }}>
                  <span>{getInitials(profile.full_name)}</span>
                  {profile.avatar_url && (
                    <Image src={profile.avatar_url} alt="" width={34} height={34} 
                      style={{ objectFit: "cover", width: "100%", height: "100%", borderRadius: "inherit", position: "absolute", inset: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>
                <div>
                  <div className="pf-nav-profile-name">{profile.full_name?.split(" ")[0] || "User"}</div>
                  <div className="pf-nav-profile-role">{profile.stream ? profile.stream.slice(0, 20) : ""}</div>
                </div>
                <span className="pf-nav-chevron">▾</span>
              </div>
              <div className={`pf-dropdown${ddOpen ? " open" : ""}`} onClick={e => e.stopPropagation()}>
                <div className="pf-dd-header">
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{profile.full_name || "User"}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>{profile.stream || ""}{profile.year ? ` · ${profile.year}` : ""}</div>
                </div>
                <Link href="/profile" prefetch={false} style={{ textDecoration: "none", display: "block" }} className="pf-dd-item">◌ &nbsp;My Profile</Link>
                <div 
                  className="pf-dd-item" 
                  onClick={(e) => { e.stopPropagation(); setNetworkOpen(true); setDdOpen(false); }}
                  style={{ cursor: "pointer" }}
                >
                  ◎ &nbsp;My Network
                </div>
                <Link href="/saved" prefetch={false} style={{ textDecoration: "none", display: "block" }} className="pf-dd-item">◻ &nbsp;Saved</Link>
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
                <div className="pf-dd-item" style={{ color: "#FB7185" }} onClick={handleSignOut}>↪ &nbsp;Log out</div>
              </div>
            </>
          ) : (
            <div className="pf-skeleton pf-skeleton-avatar" style={{ width: 34, height: 34, borderRadius: 9 }} />
          )}
          <button className={`pf-hamburger${menuOpen ? " open" : ""}`} onClick={toggleMenu} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>

        {profile && (
          <NetworkPanel 
            isOpen={networkOpen} 
            onClose={() => setNetworkOpen(false)} 
            initialProfileId={profile.id} 
          />
        )}
      </nav>

      {/* Mobile menu overlay */}
      <div className={`pf-menu-overlay${menuOpen ? " open" : ""}`} onClick={toggleMenu} />

      {/* Mobile side menu */}
      <div className={`pf-mobile-menu${menuOpen ? " open" : ""}`}>
        <div className="pf-mobile-menu-header">
          <LogoSVG />
          <button className="pf-mobile-menu-close" onClick={toggleMenu} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="2" y1="2" x2="14" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="14" y1="2" x2="2" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="pf-mobile-menu-links">
          <Link href="/discover" prefetch={false} onClick={toggleMenu} className={pathname === "/discover" ? "active" : ""}>Discover</Link>
          <Link href="/channels" prefetch={false} onClick={toggleMenu} className={pathname === "/channels" ? "active" : ""}>Channels</Link>
          <Link href="/feed" prefetch={false} onClick={toggleMenu} className={pathname === "/feed" ? "active" : ""}>Campus Feed</Link>
          <Link href="/collabs" prefetch={false} onClick={toggleMenu} className={pathname === "/collabs" ? "active" : ""}>Collabs</Link>
          <Link href="/events" prefetch={false} onClick={toggleMenu} className={pathname === "/events" ? "active" : ""}>Events</Link>
          <Link href="/messages" prefetch={false} onClick={toggleMenu} className={pathname === "/messages" ? "active" : ""}>Messages</Link>
          <Link href="/clubs" prefetch={false} onClick={toggleMenu} className={pathname === "/clubs" ? "active" : ""}>Clubs</Link>
        </div>
        <div className="pf-mobile-menu-ctas">
          {profile ? (
            <>
              <Link href="/profile" prefetch={false} className="pf-mobile-menu-btn-primary" onClick={toggleMenu}>My Profile</Link>
              <button className="pf-mobile-menu-btn-secondary" onClick={() => { toggleMenu(); handleSignOut(); }}>Log out</button>
            </>
          ) : (
            <>
              <Link href="/signup" prefetch={false} className="pf-mobile-menu-btn-primary">Sign up free</Link>
              <Link href="/login" prefetch={false} className="pf-mobile-menu-btn-secondary" onClick={toggleMenu}>Log in</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
