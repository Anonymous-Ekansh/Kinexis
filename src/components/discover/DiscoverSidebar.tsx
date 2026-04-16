"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const SIDEBAR_LINKS = [
  { id: "foryou", icon: "◉", label: "For You", badge: "12 new" },
  { id: "people", icon: "◎", label: "People" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function DiscoverSidebar({ activeSection = "foryou", onSectionChange }: { activeSection?: string; onSectionChange?: (id: string) => void }) {
  const [activeLink, setActiveLink] = useState(activeSection);
  const { user, loading: authLoading } = useAuth();

  const [activity, setActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel1: any = null;
    let channel2: any = null;
    let fetchFn: (() => void) | null = null;

    (async () => {
      if (authLoading) return;
      try {
        const currentUserId = user?.id;
        if (!currentUserId) { setLoadingActivity(false); return; }
        if (!cancelled) setProfileId(currentUserId);

        const fetchActivity = async () => {
          console.log('Fetching activity in DiscoverSidebar for user:', currentUserId);
          const { data, error } = await supabase.rpc('get_user_activity', { p_user_id: currentUserId });
          console.log('RPC get_user_activity response:', { data, error });
          if (!error && data && !cancelled) {
             setActivity((data as any[]).slice(0, 5));
          }
        };
        fetchFn = fetchActivity;

        await fetchActivity();
        window.addEventListener('activityUpdated', fetchActivity);

        channel1 = supabase
          .channel('disc-act-follows')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, fetchActivity)
          .subscribe();
        channel2 = supabase
          .channel('disc-act-interests')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'event_interest' }, fetchActivity)
          .subscribe();

      } catch {
        // Keep fallback
      } finally {
        if (!cancelled) setLoadingActivity(false);
      }
    })();
    return () => { 
      cancelled = true; 
      if (channel1) supabase.removeChannel(channel1); 
      if (channel2) supabase.removeChannel(channel2);
      if (fetchFn) window.removeEventListener('activityUpdated', fetchFn);
    };
  }, [user, authLoading]);

  return (
    <aside className="disc-sidebar">
      {/* Discover nav */}
      <div className="disc-sb-label">DISCOVER</div>
      <div className="disc-sb-links">
        {SIDEBAR_LINKS.map((l) => (
          <button
            key={l.id}
            className={`disc-sb-link${activeLink === l.id ? " active" : ""}`}
            onClick={() => { setActiveLink(l.id); onSectionChange?.(l.id); }}
          >
            <span className="disc-sb-link-icon">{l.icon}</span>
            {l.label}
            {l.badge && <span className="disc-sb-badge">{l.badge}</span>}
          </button>
        ))}
      </div>

      <div className="disc-sb-divider" />

      {/* Activity */}
      <div className="disc-sb-label">ACTIVITY</div>
      <div className="disc-sb-activity">
        {loadingActivity ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="disc-sb-act-item">
              <div className="pf-skeleton" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="pf-skeleton pf-skeleton-line" style={{ width: "80%", marginBottom: 4 }} />
                <div className="pf-skeleton pf-skeleton-line-sm" style={{ width: "40%" }} />
              </div>
            </div>
          ))
        ) : activity.length > 0 ? (
          activity.map((a, i) => (
            <div key={i} className="disc-sb-act-item">
              <div className="disc-sb-act-icon" style={{ background: "rgba(158,240,26,.12)" }}>⚡</div>
              <div>
                <div className="disc-sb-act-text">{a.description}</div>
                <div className="disc-sb-act-time">{timeAgo(a.created_at)}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 13, color: "var(--sub)", padding: "10px 0", textAlign: "center" }}>No recent activity</div>
        )}
      </div>

      <div className="disc-sb-divider" />

      {/* My Campus */}
      <div className="disc-sb-label">MY CAMPUS</div>
      <div className="disc-sb-links">
        {profileId ? (
          <Link href={`/profile/${profileId}`} className="disc-sb-link" style={{ textDecoration: "none" }}>
            <span className="disc-sb-link-icon">◌</span> My Profile
          </Link>
        ) : (
          <button className="disc-sb-link">
            <span className="disc-sb-link-icon">◌</span> My Profile
          </button>
        )}
        <button className="disc-sb-link">
          <span className="disc-sb-link-icon">◎</span> My Connections
        </button>
      </div>

    </aside>
  );
}
