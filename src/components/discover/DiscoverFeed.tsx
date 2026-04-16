"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
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





const FALLBACK_CLUBS = [
  { name: "ML Society", members: 140, category: "AI · Research", accent: "var(--lime)" },
  { name: "E-Cell", members: 112, category: "Startup · Venture", accent: "var(--coral)" },
  { name: "Design Club", members: 89, category: "UI/UX · Visual", accent: "var(--cyan)" },
  { name: "Robotics Society", members: 72, category: "Hardware · IoT", accent: "var(--purple)" },
  { name: "Open Source Cell", members: 95, category: "OSS · Contribute", accent: "var(--cyan)" },
  { name: "Writers' Room", members: 54, category: "Writing · Journalism", accent: "var(--purple)" },
  { name: "Finance & Invest", members: 61, category: "Markets · FinTech", accent: "var(--coral)" },
  { name: "Coding Club", members: 103, category: "CP · DSA", accent: "var(--lime)" },
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

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, minHeight: 120 }}>
      <div className="pf-skeleton pf-skeleton-line" style={{ width: "60%", marginBottom: 8 }} />
      <div className="pf-skeleton pf-skeleton-line-sm" style={{ width: "40%", marginBottom: 12 }} />
      <div className="pf-skeleton" style={{ height: 24, width: "80%", borderRadius: 8 }} />
    </div>
  );
}

function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export default function DiscoverFeed() {
  const feedRef = useRef<HTMLDivElement>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const { user, loading: authLoading } = useAuth();

  /* Initial fetch — get all available profiles */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      try {
        const uid = user?.id || "";
        if (!cancelled) setUserId(uid);

        const { data: users, error } = await supabase
          .from("users")
          .select("id, full_name, stream, year, interests, currently_focused_on, avatar_url")
          .neq("id", uid)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!cancelled) {
          if (users && users.length > 0) {
            const mapped = users.map(mapUserToProfile);
            // Merge: real profiles + fallback (without dupes)
            const realIds = new Set(mapped.map(p => p.id));
            const fallbackFiltered = FALLBACK_PROFILES.filter(p => !realIds.has(p.id));
            const combined = [...mapped, ...fallbackFiltered].slice(0, 10);
            setAllProfiles(combined);
            setHasMore(combined.length > PAGE_SIZE);
          } else {
            setAllProfiles(FALLBACK_PROFILES);
            setHasMore(FALLBACK_PROFILES.length > PAGE_SIZE);
          }
        }
      } catch (err) {
        console.error("DiscoverFeed fetch error:", err);
        setAllProfiles(FALLBACK_PROFILES);
        setHasMore(FALLBACK_PROFILES.length > PAGE_SIZE);
      } finally {
        if (!cancelled) setLoadingProfiles(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  /* Fetch open collabs from Supabase */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("collabs")
          .select("id, title, category, description, looking_for, tags, spots_total, spots_filled, status, author:author_id(full_name)")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(20);

        if (!cancelled && data && data.length > 0) {
          // Sort by most spots available, then by recency (already desc)
          const sorted = [...data].sort((a: any, b: any) => {
            const spotsA = (a.spots_total || 1) - (a.spots_filled || 0);
            const spotsB = (b.spots_total || 1) - (b.spots_filled || 0);
            return spotsB - spotsA;
          });

          const top4 = sorted.slice(0, 4).map((c: any, i: number) => {
            const spotsOpen = Math.max(0, (c.spots_total || 1) - (c.spots_filled || 0));
            const authorName = c.author?.full_name || null;
            const authorInitials = authorName ? authorName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "?";
            return {
              title: c.title || "Untitled Collab",
              subtitle: `${c.category || "Social"} · ${c.spots_filled || 1} members`,
              needs: (c.looking_for || [])[0] || "Collaborator",
              members: [{ initials: authorInitials, bg: ACCENT_COLORS[i % ACCENT_COLORS.length] }],
              spotsOpen,
              tags: (c.tags || []).slice(0, 3),
              accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
            };
          });
          setCollabs(top4);
        } else if (!cancelled) {
          setCollabs([]);
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoadingCollabs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Fetch 5 upcoming events from Supabase */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("events")
          .select(`*, clubs:club_id(name, initials, accent_color)`)
          .gte("event_date", today)
          .order("event_date", { ascending: true })
          .limit(5);

        if (!cancelled && !error && data && data.length > 0) {
          const mapped = data.map((ev: any, i: number) => {
            const eventDate = ev.event_date ? new Date(ev.event_date) : null;
            const day = eventDate ? eventDate.getDate().toString() : "";
            const month = eventDate
              ? eventDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
              : "";
            const rawType = ev.event_type || ev.type || ev.metadata?.tags?.[0] || "Event";
            const orgName = ev.metadata?.organizer || ev.clubs?.name || "Campus";
            const location = ev.location || ev.metadata?.location || ev.metadata?.event_location || null;
            return {
              type: rawType,
              title: ev.title || "Untitled Event",
              org: orgName,
              accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
              attendees: [],
              featured: i === 0,
              date: { day, month },
              location,
            };
          });
          setEvents(mapped);
        } else if (!cancelled) {
          setEvents([]);
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Fetch top 6 most followed clubs from Supabase */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("clubs")
          .select("id, name, category, follower_count, accent_color")
          .gt("follower_count", 0)
          .order("follower_count", { ascending: false })
          .limit(6);

        if (!cancelled && !error && data && data.length > 0) {
          const mapped = data.map((club: any, i: number) => {
            const accentVar = club.accent_color
              ? (["lime", "cyan", "purple", "coral"].includes(club.accent_color.toLowerCase())
                ? `var(--${club.accent_color.toLowerCase()})`
                : club.accent_color)
              : ACCENT_COLORS[i % ACCENT_COLORS.length];
            return {
              name: club.name || "Unnamed Club",
              members: club.follower_count || 0,
              category: club.category || "General",
              accent: accentVar,
            };
          });
          setClubs(mapped);
        } else if (!cancelled) {
          setClubs([]);
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoadingClubs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Fetch trending tags from feed_posts (same as campus feed) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data } = await supabase.from("feed_posts").select("tags").gte("created_at", weekAgo);
        if (!cancelled && data) {
          const freq: Record<string, number> = {};
          data.forEach((p: any) => {
            (p.tags || []).forEach((t: string) => { freq[t] = (freq[t] || 0) + 1; });
          });
          const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
          setTrendingTags(top);
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoadingTrending(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  /* Paginated profiles for current view */
  const start = page * PAGE_SIZE;
  const visibleProfiles = allProfiles.slice(start, start + PAGE_SIZE);
  const canGoNext = start + PAGE_SIZE < allProfiles.length;
  const canGoPrev = page > 0;

  /* See next handler — paginate within the cached 10 profiles */
  const handleSeeNext = useCallback(() => {
    const nextStart = (page + 1) * PAGE_SIZE;
    if (nextStart < allProfiles.length) {
      setPage(p => p + 1);
    } else {
      setPage(0);
    }
  }, [page, allProfiles.length]);

  const handleSeePrev = useCallback(() => {
    setPage(p => Math.max(0, p - 1));
  }, []);

  /* Scroll reveal */
  useEffect(() => {
    const sections = feedRef.current?.querySelectorAll(".disc-reveal");
    if (!sections) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [loadingProfiles]);

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
        />
        <span className="disc-search-shortcut">⌘K</span>
      </div>

      {/* Trending */}
      <div className="disc-trending">
        <span className="disc-trending-label">
          <span className="disc-trending-dot" />
          Trending
        </span>
        {loadingTrending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="disc-trending-pill" style={{ opacity: 0.4, pointerEvents: "none" }}>
              <span className="pf-skeleton" style={{ width: 60, height: 14, borderRadius: 6, display: "inline-block" }} />
            </span>
          ))
        ) : trendingTags.length === 0 ? (
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>No trending tags this week</span>
        ) : (
          trendingTags.map((tag) => (
            <button key={tag} className="disc-trending-pill">
              #{tag}
            </button>
          ))
        )}
      </div>

      {/* Top Matches */}
      <div className="disc-reveal">
        <div className="disc-sec-h">
          <h2 className="disc-sec-title">Top Matches</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {canGoPrev && (
              <button className="disc-sec-action" onClick={handleSeePrev}>
                ← Previous
              </button>
            )}
            <button
              className="disc-sec-action"
              onClick={handleSeeNext}
              disabled={loadingMore}
              style={{ opacity: loadingMore ? 0.5 : 1 }}
            >
              {loadingMore ? "Loading…" : canGoNext || hasMore ? "See next →" : "Back to start →"}
            </button>
          </div>
        </div>
        {loadingProfiles ? (
          <SkeletonRow count={3} />
        ) : loadingMore ? (
          <SkeletonRow count={3} />
        ) : (
          <div className="disc-profiles-grid">
            {visibleProfiles.map((p) => (
              <ProfileCard key={p.id} {...p} />
            ))}
          </div>
        )}
        {!loadingProfiles && allProfiles.length > PAGE_SIZE && (
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
        {loadingCollabs ? (
          <SkeletonRow count={4} />
        ) : collabs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No open collabs right now</div>
        ) : (
          <div className="disc-teams-grid">
            {collabs.map((t, i) => (
              <TeamCard key={i} {...t} />
            ))}
          </div>
        )}
      </div>

      {/* Events Near You */}
      <div className="disc-reveal">
        <div className="disc-sec-h">
          <h2 className="disc-sec-title">Events Near You</h2>
          <Link href="/events" prefetch={false} className="disc-sec-action" style={{ textDecoration: "none" }}>All events →</Link>
        </div>
        {loadingEvents ? (
          <SkeletonRow count={5} />
        ) : events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No upcoming events</div>
        ) : (
          <div className="disc-events-grid">
            {events.map((e, i) => (
              <EventCard key={i} {...e} />
            ))}
          </div>
        )}
      </div>

      {/* Clubs & Cells */}
      <div className="disc-reveal">
        <div className="disc-sec-h">
          <h2 className="disc-sec-title">Clubs &amp; Cells</h2>
          <Link href="/clubs" prefetch={false} className="disc-sec-action" style={{ textDecoration: "none" }}>See all →</Link>
        </div>
        {loadingClubs ? (
          <SkeletonRow count={6} />
        ) : clubs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No clubs found</div>
        ) : (
          <div className="disc-clubs-row">
            {clubs.map((c) => (
              <ClubCard key={c.name} {...c} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
