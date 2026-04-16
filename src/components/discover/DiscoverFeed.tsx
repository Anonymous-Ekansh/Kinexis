"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import ProfileCard from "./ProfileCard";
import FeaturedMatch from "./FeaturedMatch";
import TeamCard from "./TeamCard";
import EventCard from "./EventCard";
import ClubCard from "./ClubCard";

/* ── FALLBACK DATA ── */
const FALLBACK_PROFILES = [
  { id: "ee4542f2-29fc-4b4c-9410-514d970fee1b", initials: "EK", name: "Ekansh", batch: "CS · 4th yr · IIT Delhi", vibe: "Core Founder of Kinexis", vibeBg: "rgba(158,240,26,.1)", vibeColor: "var(--lime)", tags: ["Product", "React", "Node.js"], accent: "var(--lime)" },
  { id: "ff7d3892-d087-48d4-a83e-e9721a2bf722", initials: "NK", name: "Novesh kaushik", batch: "Design · 2nd yr · NID", vibe: "Design enthusiast", vibeBg: "rgba(34,211,238,.1)", vibeColor: "var(--cyan)", tags: ["UI/UX", "Figma"], accent: "var(--cyan)" },
  { id: "13e95aad-0ece-4d25-9823-de1ed95fad0e", initials: "NK", name: "Novesh Kaushik 1", batch: "ECE · 3rd yr · BITS", vibe: "Tech explorer", vibeBg: "rgba(167,139,250,.1)", vibeColor: "var(--purple)", tags: ["Frontend", "React"], accent: "var(--purple)" },
];

/* ── Helpers ── */
const ACCENT_COLORS = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];
const VIBE_BGS = ["rgba(158,240,26,.1)", "rgba(34,211,238,.1)", "rgba(167,139,250,.1)", "rgba(251,113,133,.1)"];
const VIBE_COLORS = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];
const PAGE_SIZE = 3;

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function mapUserToProfile(user: any, i: number) {
  return {
    id: user.id,
    initials: getInitials(user.full_name),
    name: user.full_name || "Unnamed",
    batch: `${user.stream ? user.stream.slice(0, 15) : "Student"} · ${user.year || ""}`,
    vibe: user.currently_focused_on || "Exploring Kinexis",
    vibeBg: VIBE_BGS[i % VIBE_BGS.length],
    vibeColor: VIBE_COLORS[i % VIBE_COLORS.length],
    tags: (user.interests || []).slice(0, 3),
    accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
  };
}

export default function DiscoverFeed({ initialData, userId }: { initialData: any, userId: string }) {
  const feedRef = useRef<HTMLDivElement>(null);
  
  const [allProfiles, setAllProfiles] = useState<any[]>(() => {
    let combined = FALLBACK_PROFILES;
    if (initialData?.initialFeedProfiles?.length > 0) {
      const mapped = initialData.initialFeedProfiles.map(mapUserToProfile);
      const realIds = new Set(mapped.map((p: any) => p.id));
      const fallbackFiltered = FALLBACK_PROFILES.filter(p => !realIds.has(p.id));
      combined = [...mapped, ...fallbackFiltered].slice(0, 10);
    }
    return combined;
  });

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(allProfiles.length > PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Derived datasets
  const collabs = useMemo(() => {
    if (!initialData?.initialCollabs) return [];
    return initialData.initialCollabs.slice(0, 4).map((c: any, i: number) => {
      const spotsOpen = Math.max(0, (c.spots_total || 1) - (c.spots_filled || 0));
      const authorName = c.author?.full_name || null;
      return {
        title: c.title || "Untitled Collab",
        subtitle: `${c.category || "Social"} · ${c.spots_filled || 1} members`,
        needs: (c.looking_for || [])[0] || "Collaborator",
        members: [{ initials: getInitials(authorName), bg: ACCENT_COLORS[i % ACCENT_COLORS.length] }],
        spotsOpen,
        tags: (c.tags || []).slice(0, 3),
        accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
      };
    });
  }, [initialData?.initialCollabs]);

  const events = useMemo(() => {
    if (!initialData?.initialEvents) return [];
    return initialData.initialEvents.map((ev: any, i: number) => {
      const eventDate = ev.event_date ? new Date(ev.event_date) : null;
      const day = eventDate ? eventDate.getDate().toString() : "";
      const month = eventDate ? eventDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "";
      const rawType = ev.event_type || ev.type || ev.metadata?.tags?.[0] || "Event";
      const orgName = ev.metadata?.organizer || ev.clubs?.name || "Campus";
      const location = ev.location || ev.metadata?.location || ev.metadata?.event_location || null;
      return { type: rawType, title: ev.title || "Untitled Event", org: orgName, accent: ACCENT_COLORS[i % ACCENT_COLORS.length], attendees: [], featured: i === 0, date: { day, month }, location };
    });
  }, [initialData?.initialEvents]);

  const clubs = useMemo(() => {
    if (!initialData?.initialClubs) return [];
    return initialData.initialClubs.map((club: any, i: number) => {
      const accentVar = club.accent_color ? (["lime", "cyan", "purple", "coral"].includes(club.accent_color.toLowerCase()) ? `var(--${club.accent_color.toLowerCase()})` : club.accent_color) : ACCENT_COLORS[i % ACCENT_COLORS.length];
      return { name: club.name || "Unnamed Club", members: club.follower_count || 0, category: club.category || "General", accent: accentVar };
    });
  }, [initialData?.initialClubs]);

  const trendingTags = initialData?.initialTrendingTags || [];

  /* Real-time subscription for new users */
  useEffect(() => {
    const channel = supabase
      .channel("discover-users")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "users" }, (payload) => {
        const newUser = payload.new;
        if (newUser.id === userId) return;
        const mapped = mapUserToProfile(newUser, allProfiles.length);
        setAllProfiles(prev => {
          if (prev.some(p => p.id === mapped.id)) return prev;
          return [mapped, ...prev];
        });
        setHasMore(true);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [userId, allProfiles.length]);

  const start = page * PAGE_SIZE;
  const visibleProfiles = allProfiles.slice(start, start + PAGE_SIZE);
  const canGoNext = start + PAGE_SIZE < allProfiles.length;
  const canGoPrev = page > 0;

  const handleSeeNext = useCallback(() => {
    const nextStart = (page + 1) * PAGE_SIZE;
    if (nextStart < allProfiles.length) {
      setPage(p => p + 1);
    } else {
      setPage(0);
    }
  }, [page, allProfiles.length]);

  const handleSeePrev = useCallback(() => setPage(p => Math.max(0, p - 1)), []);

  /* Scroll reveal */
  useEffect(() => {
    const sections = feedRef.current?.querySelectorAll(".disc-reveal");
    if (!sections) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [allProfiles]);

  return (
    <main className="disc-feed" ref={feedRef}>
      {/* Top bar */}
      <div className="disc-topbar">
        <h1 className="disc-topbar-title">Discover</h1>
      </div>

      {/* Search */}
      <div className="disc-search">
        <span className="disc-search-icon">🔍</span>
        <input className="disc-search-input" placeholder="Search people, projects, events, clubs…" type="text" />
        <span className="disc-search-shortcut">⌘K</span>
      </div>

      {/* Trending */}
      <div className="disc-trending">
        <span className="disc-trending-label">
          <span className="disc-trending-dot" />
          Trending
        </span>
        {trendingTags.length === 0 ? (
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>No trending tags this week</span>
        ) : (
          trendingTags.map((tag: string) => (
            <button key={tag} className="disc-trending-pill">#{tag}</button>
          ))
        )}
      </div>

      {/* Top Matches */}
      <div className="disc-reveal">
        <div className="disc-sec-h">
          <h2 className="disc-sec-title">Top Matches</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {canGoPrev && (
              <button className="disc-sec-action" onClick={handleSeePrev}>← Previous</button>
            )}
            <button className="disc-sec-action" onClick={handleSeeNext} disabled={loadingMore} style={{ opacity: loadingMore ? 0.5 : 1 }}>
              {loadingMore ? "Loading…" : canGoNext || hasMore ? "See next →" : "Back to start →"}
            </button>
          </div>
        </div>
        <div className="disc-profiles-grid">
          {visibleProfiles.map((p) => (
            <ProfileCard key={p.id} {...p} />
          ))}
        </div>
        {allProfiles.length > PAGE_SIZE && (
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, allProfiles.length)} of {allProfiles.length}
          </div>
        )}
      </div>

      {/* Featured Match */}
      <div className="disc-reveal">
        <div className="disc-sec-h">
          <h2 className="disc-sec-title">Featured Match</h2>
        </div>
        <FeaturedMatch />
      </div>

      {/* Open Collabs */}
      <div className="disc-reveal">
        <div className="disc-sec-h">
          <h2 className="disc-sec-title">Open Collabs</h2>
          <Link href="/collabs" prefetch={false} className="disc-sec-action" style={{ textDecoration: "none" }}>Browse all →</Link>
        </div>
        {collabs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No open collabs right now</div>
        ) : (
          <div className="disc-teams-grid">
            {collabs.map((t: any, i: number) => <TeamCard key={i} {...t} />)}
          </div>
        )}
      </div>

      {/* Events Near You */}
      <div className="disc-reveal">
        <div className="disc-sec-h">
          <h2 className="disc-sec-title">Events Near You</h2>
          <Link href="/events" prefetch={false} className="disc-sec-action" style={{ textDecoration: "none" }}>All events →</Link>
        </div>
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No upcoming events</div>
        ) : (
          <div className="disc-events-grid">
            {events.map((e: any, i: number) => <EventCard key={i} {...e} />)}
          </div>
        )}
      </div>

      {/* Clubs & Cells */}
      <div className="disc-reveal">
        <div className="disc-sec-h">
          <h2 className="disc-sec-title">Clubs &amp; Cells</h2>
          <Link href="/clubs" prefetch={false} className="disc-sec-action" style={{ textDecoration: "none" }}>See all →</Link>
        </div>
        {clubs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No clubs found</div>
        ) : (
          <div className="disc-clubs-row">
            {clubs.map((c: any) => <ClubCard key={c.name} {...c} />)}
          </div>
        )}
      </div>
    </main>
  );
}
