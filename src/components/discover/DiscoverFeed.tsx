"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import ProfileCard from "./ProfileCard";
import FeaturedMatch from "./FeaturedMatch";
import TeamCard from "./TeamCard";
import EventCard from "./EventCard";
import ClubCard from "./ClubCard";

interface DiscoverFeedProps {
  initialData: any;
  userId: string;
  onSearchNavigate?: (query: string) => void;
}

/* ── FALLBACK DATA ── */
// Removed: FAKE IDs cause Foreign Key conflicts in the database when trying to follow.

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

export default function DiscoverFeed({ initialData, userId, onSearchNavigate }: DiscoverFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  
  const [allProfiles, setAllProfiles] = useState<any[]>(() => {
    if (initialData?.initialFeedProfiles?.length > 0) {
      return initialData.initialFeedProfiles.map(mapUserToProfile).slice(0, 10);
    }
    return [];
  });

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(allProfiles.length > PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        category: c.category || "Social",
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

  /* ── Search filtering ── */
  const isSearching = searchQuery.trim().length > 0;
  const q = searchQuery.trim().toLowerCase();

  const filteredProfiles = useMemo(() => {
    if (!isSearching) return allProfiles;
    return allProfiles.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.batch.toLowerCase().includes(q) ||
      p.vibe.toLowerCase().includes(q) ||
      p.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [allProfiles, q, isSearching]);

  const filteredCollabs = useMemo(() => {
    if (!isSearching) return collabs;
    return collabs.filter((c: any) =>
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [collabs, q, isSearching]);

  const filteredEvents = useMemo(() => {
    if (!isSearching) return events;
    return events.filter((e: any) =>
      e.title.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.org.toLowerCase().includes(q) ||
      (e.location && e.location.toLowerCase().includes(q))
    );
  }, [events, q, isSearching]);

  const filteredClubs = useMemo(() => {
    if (!isSearching) return clubs;
    return clubs.filter((c: any) =>
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }, [clubs, q, isSearching]);

  const noResults = isSearching &&
    filteredProfiles.length === 0 &&
    filteredCollabs.length === 0 &&
    filteredEvents.length === 0 &&
    filteredClubs.length === 0;

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

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const profilesToShow = isSearching ? filteredProfiles : allProfiles;
  const start = page * PAGE_SIZE;
  const visibleProfiles = profilesToShow.slice(start, start + PAGE_SIZE);
  const canGoNext = start + PAGE_SIZE < profilesToShow.length;
  const canGoPrev = page > 0;

  const handleSeeNext = useCallback(() => {
    const nextStart = (page + 1) * PAGE_SIZE;
    if (nextStart < profilesToShow.length) {
      setPage(p => p + 1);
    } else {
      setPage(0);
    }
  }, [page, profilesToShow.length]);

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
  }, [allProfiles, filteredProfiles]);

  return (
    <main className="disc-feed" ref={feedRef}>
      {/* Top bar */}
      <div className="disc-topbar">
        <h1 className="disc-topbar-title">Discover</h1>
      </div>

      {/* Search */}
      <div className="disc-search">
        <span className="disc-search-icon">🔍</span>
        <input
          className="disc-search-input"
          placeholder="Search people, projects, events, clubs…"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim() && onSearchNavigate) {
              onSearchNavigate(searchQuery.trim());
            }
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 16,
              padding: "0 8px",
            }}
          >
            ✕
          </button>
        )}
        <span className="disc-search-shortcut">⌘K</span>
      </div>

      {/* No results message */}
      {noResults && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No results for &ldquo;{searchQuery}&rdquo;</div>
          <div style={{ fontSize: 13 }}>Try a different search term, or press Enter to search all people</div>
        </div>
      )}

      {/* Trending — hide while searching */}
      {!isSearching && (
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
      )}

      {/* Top Matches */}
      {(!isSearching || filteredProfiles.length > 0) && (
        <div className="disc-reveal">
          <div className="disc-sec-h">
            <h2 className="disc-sec-title">{isSearching ? "People" : "Top Matches"}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {canGoPrev && (
                <button className="disc-sec-action" onClick={handleSeePrev}>← Previous</button>
              )}
              {profilesToShow.length > PAGE_SIZE && (
                <button className="disc-sec-action" onClick={handleSeeNext} disabled={loadingMore} style={{ opacity: loadingMore ? 0.5 : 1 }}>
                  {loadingMore ? "Loading…" : canGoNext || hasMore ? "See next →" : "Back to start →"}
                </button>
              )}
            </div>
          </div>
          <div className="disc-profiles-grid">
            {visibleProfiles.map((p) => (
              <ProfileCard key={p.id} {...p} />
            ))}
          </div>
          {profilesToShow.length > PAGE_SIZE && (
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, profilesToShow.length)} of {profilesToShow.length}
            </div>
          )}
        </div>
      )}

      {/* Featured Match — hide while searching */}
      {!isSearching && (
        <div className="disc-reveal">
          <div className="disc-sec-h">
            <h2 className="disc-sec-title">Featured Match</h2>
          </div>
          <FeaturedMatch users={initialData?.initialFeedProfiles} />
        </div>
      )}

      {/* Open Collabs */}
      {(!isSearching || filteredCollabs.length > 0) && (
        <div className="disc-reveal">
          <div className="disc-sec-h">
            <h2 className="disc-sec-title">Open Collabs</h2>
            <Link href="/collabs" prefetch={false} className="disc-sec-action" style={{ textDecoration: "none" }}>Browse all →</Link>
          </div>
          {(isSearching ? filteredCollabs : collabs).length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No open collabs right now</div>
          ) : (
            <div className="disc-teams-grid">
              {(isSearching ? filteredCollabs : collabs).map((t: any, i: number) => <TeamCard key={i} {...t} />)}
            </div>
          )}
        </div>
      )}

      {/* Events Near You */}
      {(!isSearching || filteredEvents.length > 0) && (
        <div className="disc-reveal">
          <div className="disc-sec-h">
            <h2 className="disc-sec-title">Events Near You</h2>
            <Link href="/events" prefetch={false} className="disc-sec-action" style={{ textDecoration: "none" }}>All events →</Link>
          </div>
          {(isSearching ? filteredEvents : events).length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No upcoming events</div>
          ) : (
            <div className="disc-events-grid">
              {(isSearching ? filteredEvents : events).map((e: any, i: number) => <EventCard key={i} {...e} />)}
            </div>
          )}
        </div>
      )}

      {/* Clubs & Cells */}
      {(!isSearching || filteredClubs.length > 0) && (
        <div className="disc-reveal">
          <div className="disc-sec-h">
            <h2 className="disc-sec-title">Clubs &amp; Cells</h2>
            <Link href="/clubs" prefetch={false} className="disc-sec-action" style={{ textDecoration: "none" }}>See all →</Link>
          </div>
          {(isSearching ? filteredClubs : clubs).length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No clubs found</div>
          ) : (
            <div className="disc-clubs-row">
              {(isSearching ? filteredClubs : clubs).map((c: any) => <ClubCard key={c.name} {...c} />)}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
