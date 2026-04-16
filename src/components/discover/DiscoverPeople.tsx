"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import ProfileCard from "./ProfileCard";

/* ── Helpers ── */
const ACCENT_COLORS = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];
const VIBE_BGS = ["rgba(158,240,26,.1)", "rgba(34,211,238,.1)", "rgba(167,139,250,.1)", "rgba(251,113,133,.1)"];
const VIBE_COLORS = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];

const INTEREST_FILTERS = [
  "All",
  "ML/AI",
  "Web Dev",
  "Design",
  "Robotics",
  "Open Source",
  "Hackathons",
  "Backend",
  "Frontend",
  "Data Science",
  "Blockchain",
  "Cloud",
  "DevOps",
  "Mobile Dev",
  "Cybersecurity",
  "Product",
  "Marketing",
  "Finance",
  "Content",
  "Photography",
  "Music",
  "Video Editing",
  "Research",
  "Competitive Programming",
  "Game Dev",
  "UI/UX",
  "IoT",
  "AR/VR",
  "NLP",
  "Startup",
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function DiscoverPeople({ initialData, userId }: { initialData: any, userId: string }) {
  const feedRef = useRef<HTMLDivElement>(null);
  
  const people = useMemo(() => {
    if (!initialData?.initialTopUsers) return [];
    return initialData.initialTopUsers.map((u: any, i: number) => ({
      id: u.id,
      initials: getInitials(u.full_name),
      name: u.full_name || "Unnamed",
      batch: `${u.stream ? u.stream.slice(0, 15) : "Student"} · ${u.year || ""}`,
      vibe: u.currently_focused_on || "Exploring Kinexis",
      vibeBg: VIBE_BGS[i % VIBE_BGS.length],
      vibeColor: VIBE_COLORS[i % VIBE_COLORS.length],
      tags: (u.interests || []).slice(0, 3),
      allInterests: (u.interests || []) as string[],
      accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
      upvotes: u.upvotes || 0,
      followers: u.followers || 0,
      fullName: (u.full_name || "").toLowerCase(),
    }));
  }, [initialData?.initialTopUsers]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"upvotes" | "followers" | "recent">("recent");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showAllFilters, setShowAllFilters] = useState(false);

  // Filter + sort
  const displayPeople = useMemo(() => {
    let list = people;

    // Interest filter
    if (activeFilter !== "All") {
      const q = activeFilter.toLowerCase();
      list = list.filter((p: any) =>
        p.allInterests.some((t: string) => t.toLowerCase().includes(q)) ||
        p.tags.some((t: string) => t.toLowerCase().includes(q)) ||
        p.vibe.toLowerCase().includes(q) ||
        p.batch.toLowerCase().includes(q)
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p: any) =>
        p.fullName.includes(q) ||
        p.batch.toLowerCase().includes(q) ||
        p.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    const sorted = [...list];
    if (sortBy === "upvotes") {
      sorted.sort((a, b) => b.upvotes - a.upvotes);
    } else if (sortBy === "followers") {
      sorted.sort((a, b) => b.followers - a.followers);
    }
    // "recent" keeps the default order (already sorted by created_at desc)

    return sorted;
  }, [people, searchQuery, sortBy, activeFilter]);

  // Scroll reveal
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
  }, [displayPeople]);

  const visibleFilters = showAllFilters ? INTEREST_FILTERS : INTEREST_FILTERS.slice(0, 10);

  return (
    <main className="disc-feed" ref={feedRef}>
      {/* Top bar */}
      <div className="disc-topbar">
        <h1 className="disc-topbar-title">People</h1>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {`${displayPeople.length} people`}
        </span>
      </div>

      {/* Search */}
      <div className="disc-search">
        <span className="disc-search-icon">🔍</span>
        <input
          className="disc-search-input"
          placeholder="Search by name, stream, or interest…"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Sort chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginRight: 4, fontWeight: 500 }}>Sort by</span>
        {[
          { key: "recent" as const, label: "Recent", activeColor: "var(--purple)", activeBg: "rgba(167,139,250,.15)", activeBorder: "rgba(167,139,250,.3)" },
          { key: "upvotes" as const, label: "Most Upvotes", activeColor: "var(--lime)", activeBg: "rgba(158,240,26,.15)", activeBorder: "rgba(158,240,26,.3)" },
          { key: "followers" as const, label: "Most Followers", activeColor: "var(--cyan)", activeBg: "rgba(34,211,238,.15)", activeBorder: "rgba(34,211,238,.3)" },
        ].map((s) => (
          <button
            key={s.key}
            className="disc-trending-pill"
            onClick={() => setSortBy(s.key)}
            style={sortBy === s.key
              ? { background: s.activeBg, color: s.activeColor, borderColor: s.activeBorder }
              : {}
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Interest / Skill filter chips */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 500 }}>Filter by interest</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {visibleFilters.map((f) => (
            <button
              key={f}
              className="disc-trending-pill"
              onClick={() => setActiveFilter(f)}
              style={activeFilter === f
                ? { background: "rgba(158,240,26,.12)", color: "var(--lime)", borderColor: "rgba(158,240,26,.25)" }
                : {}
              }
            >
              {f}
            </button>
          ))}
          {!showAllFilters && INTEREST_FILTERS.length > 10 && (
            <button
              className="disc-trending-pill"
              onClick={() => setShowAllFilters(true)}
              style={{ color: "var(--cyan)", borderColor: "rgba(34,211,238,.2)" }}
            >
              +{INTEREST_FILTERS.length - 10} more
            </button>
          )}
          {showAllFilters && (
            <button
              className="disc-trending-pill"
              onClick={() => setShowAllFilters(false)}
              style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,.1)" }}
            >
              Show less
            </button>
          )}
        </div>
      </div>

      {/* People Grid */}
      <div className="disc-reveal visible">
        {displayPeople.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>
            {searchQuery
              ? `No people found matching "${searchQuery}"`
              : activeFilter !== "All"
                ? `No people found with interest "${activeFilter}"`
                : "No people to show"}
          </div>
        ) : (
          <div className="disc-profiles-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {displayPeople.map((p: any) => (
              <ProfileCard
                key={p.id}
                id={p.id}
                initials={p.initials}
                name={p.name}
                batch={p.batch}
                vibe={p.vibe}
                vibeBg={p.vibeBg}
                vibeColor={p.vibeColor}
                tags={p.tags}
                accent={p.accent}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
