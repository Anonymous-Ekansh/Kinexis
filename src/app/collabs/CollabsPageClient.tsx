"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import "./collabs.css";

const ACCENT_COLORS = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];
const ACCENT_BGS = [
  "rgba(158,240,26,0.15)",
  "rgba(34,211,238,0.15)",
  "rgba(167,139,250,0.15)",
  "rgba(251,113,133,0.15)",
];
const CATEGORIES = ["Tech", "Creative", "Sports", "Social", "Research", "Business", "Lifestyle"];
const FILTERS = ["All", "Open to Join", ...CATEGORIES];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / 604800)}w ago`;
}

const STATUS_MAP: Record<string, { icon: string; label: string; color: string }> = {
  open: { icon: "🟢", label: "Open to join", color: "var(--lime)" },
  building: { icon: "🟡", label: "In progress", color: "#f59e0b" },
  ideation: { icon: "💡", label: "Just an idea", color: "var(--cyan)" },
  closed: { icon: "🔴", label: "Team full", color: "var(--coral)" },
};

export default function CollabsPageClient({ userId, initialData }: { userId: string, initialData: any }) {
  const [allCollabs, setAllCollabs] = useState<any[]>(initialData?.initialCollabs || []);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Most Recent");
  const [showModal, setShowModal] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState(initialData?.initialStats || { total: 0, open: 0, involved: 0, thisWeek: 0 });

  // Modal state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("Social");
  const [formLookingFor, setFormLookingFor] = useState<string[]>([]);
  const [formLookingInput, setFormLookingInput] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState("");
  const [formSpots, setFormSpots] = useState(1);
  const [formOpen, setFormOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Part 1 — Join button state
  const [requestStatusMap, setRequestStatusMap] = useState<Record<string, string>>(initialData?.initialRequestStatuses || {});
  const [membershipSet, setMembershipSet] = useState<Set<string>>(new Set(initialData?.initialMembershipIds || []));

  // Part 2 — Join modal state
  const [joinModalCollab, setJoinModalCollab] = useState<any | null>(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Part 3 & 8 — Detail modal state
  const [detailCollab, setDetailCollab] = useState<any | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [collabMembers, setCollabMembers] = useState<any[]>([]);
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});

  // Part 7 — Activity state
  const [activityItems, setActivityItems] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile for activity panel avatars
  useEffect(() => {
    if (!userId) return;
    supabase.from("users").select("id, full_name, avatar_url").eq("id", userId).single().then(({ data }) => {
      if (data) setUserProfile(data);
    });
  }, [userId]);

  const fetchCollabs = useCallback(async (append = false, customOffset = 0) => {
    const { data, error } = await supabase
      .from("collabs")
      .select(`*, author:author_id(id, full_name, stream, batch_year, avatar_url)`)
      .order("created_at", { ascending: false })
      .range(customOffset, customOffset + 11);

    if (error) {
      console.error("Collabs fetch error:", error);
      if (!append) setLoading(false);
      return;
    }
    if (data) {
      if (data.length < 12) setHasMore(false);
      else setHasMore(true);
      if (append) {
        setAllCollabs(prev => [...prev, ...data]);
      } else {
        setAllCollabs(data);
      }
    }
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from("collabs").select("id", { count: "exact", head: true }),
      supabase.from("collabs").select("id", { count: "exact", head: true }).eq("is_open_collab", true),
      supabase.from("collabs").select("spots_filled"),
      supabase.from("collabs").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);
    const involved = (r3.data || []).reduce((sum: number, r: any) => sum + (r.spots_filled || 0), 0);
    setStats({
      total: r1.count || 0,
      open: r2.count || 0,
      involved,
      thisWeek: r4.count || 0,
    });
  }, []);

  // Initial fetch removed since data comes from server

  const handleLoadMore = () => {
    const next = offset + 12;
    setOffset(next);
    fetchCollabs(true, next);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const { data: user, error: userErr } = await supabase.from("users").select("stream, batch_year").eq("id", userId).single();
      if (userErr) console.error("User fetch error:", userErr);
      const { data: newCollab, error } = await supabase.from("collabs").insert({
        author_id: userId,
        title: formTitle,
        description: formDesc,
        category: formCategory,
        looking_for: formLookingFor,
        tags: formTags,
        spots_total: formSpots,
        spots_filled: 1,
        status: "open",
        is_open_collab: formOpen,
        stream: user?.stream || null,
        batch_year: user?.batch_year || null,
      }).select("id").single();
      if (error) {
        alert("Failed to post collab: " + error.message);
        return;
      }
      await supabase.from("collab_members").insert({
        collab_id: newCollab.id,
        user_id: userId,
        role: "creator",
      });
      alert("Your collab is live! 🎉");
      setShowModal(false);
      setFormTitle(""); setFormDesc(""); setFormCategory("Social"); setFormLookingFor([]); setFormTags([]); setFormSpots(1); setFormOpen(true);
      setOffset(0);
      fetchCollabs();
      fetchStats();
    } catch (err: any) {
      console.error("handleSubmit error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Part 1: Join button state ---
  const getJoinButtonState = useCallback((collab: any): { label: string; disabled: boolean; hidden: boolean } => {
    const authorId = collab.author_id || collab.author?.id;
    if (authorId === userId) return { label: "", disabled: true, hidden: true };
    if (collab.status === "closed" || (collab.spots_filled || 0) >= (collab.spots_total || 1)) return { label: "Full", disabled: true, hidden: false };
    if (membershipSet.has(collab.id) || requestStatusMap[collab.id] === "accepted") return { label: "Joined ✓", disabled: true, hidden: false };
    if (requestStatusMap[collab.id] === "pending") return { label: "Requested", disabled: true, hidden: false };
    if (requestStatusMap[collab.id] === "declined") return { label: "Declined", disabled: true, hidden: false };
    return { label: "Join", disabled: false, hidden: false };
  }, [userId, membershipSet, requestStatusMap]);

  // --- Part 2: Join modal ---
  const handleJoinClick = useCallback((collab: any) => {
    setJoinModalCollab(collab);
    setJoinMessage("");
    setJoinError("");
  }, []);

  const handleJoinSubmit = useCallback(async () => {
    if (!joinModalCollab || joinSubmitting) return;
    setJoinSubmitting(true);
    setJoinError("");

    const { data, error } = await supabase.rpc("request_to_join_collab", {
      p_collab_id: joinModalCollab.id,
      p_user_id: userId,
      p_message: joinMessage.trim() || null,
    });

    setJoinSubmitting(false);

    if (error) {
      setJoinError(error.message);
      return;
    }

    if (data && typeof data === "string" && data !== "success") {
      setJoinError(data);
      return;
    }

    setRequestStatusMap(prev => ({ ...prev, [joinModalCollab.id]: "pending" }));
    setJoinModalCollab(null);
    setJoinMessage("");
  }, [joinModalCollab, joinSubmitting, joinMessage, userId]);

  // --- Part 3 & 8: Detail modal ---
  const openDetail = useCallback(async (collab: any) => {
    setDetailCollab(collab);
    setPendingRequests([]);
    setCollabMembers([]);
    setRequestErrors({});

    const authorId = collab.author_id || collab.author?.id;

    // Always fetch members
    const { data: members } = await supabase
      .from("collab_members_with_profiles")
      .select("*")
      .eq("collab_id", collab.id);
    if (members) setCollabMembers(members);

    // If author, fetch pending requests
    if (authorId === userId) {
      const { data: requests } = await supabase
        .from("pending_requests_with_profiles")
        .select("*")
        .eq("collab_id", collab.id);
      if (requests) setPendingRequests(requests);
    }
  }, [userId]);

  // --- Part 4: Accept ---
  const handleAccept = useCallback(async (requestId: string) => {
    setRequestErrors(prev => ({ ...prev, [requestId]: "" }));

    const { data, error } = await supabase.rpc("accept_collab_request", {
      p_request_id: requestId,
      p_actor_id: userId,
    });

    if (error) {
      setRequestErrors(prev => ({ ...prev, [requestId]: error.message }));
      return;
    }
    if (data && typeof data === "string" && data !== "success") {
      setRequestErrors(prev => ({ ...prev, [requestId]: data }));
      return;
    }

    setPendingRequests(prev => prev.filter(r => r.id !== requestId));

    if (detailCollab) {
      const newFilled = (detailCollab.spots_filled || 0) + 1;
      const isFull = newFilled >= (detailCollab.spots_total || 1);
      const updated = { ...detailCollab, spots_filled: newFilled, status: isFull ? "closed" : detailCollab.status };
      setDetailCollab(updated);
      if (isFull) setPendingRequests([]);
      setAllCollabs(prev => prev.map(c => c.id === detailCollab.id ? { ...c, spots_filled: newFilled, status: isFull ? "closed" : c.status } : c));

      // Refetch members
      const { data: members } = await supabase
        .from("collab_members_with_profiles")
        .select("*")
        .eq("collab_id", detailCollab.id);
      if (members) setCollabMembers(members);
    }
  }, [userId, detailCollab]);

  // --- Part 5: Decline ---
  const handleDecline = useCallback(async (requestId: string) => {
    setRequestErrors(prev => ({ ...prev, [requestId]: "" }));

    const { data, error } = await supabase.rpc("decline_collab_request", {
      p_request_id: requestId,
      p_actor_id: userId,
    });

    if (error) {
      setRequestErrors(prev => ({ ...prev, [requestId]: error.message }));
      return;
    }
    if (data && typeof data === "string" && data !== "success") {
      setRequestErrors(prev => ({ ...prev, [requestId]: data }));
      return;
    }

    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, [userId]);

  // --- Part 6: Live spot counter via Supabase Realtime ---
  useEffect(() => {
    const channel = supabase.channel("collabs_spots_realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "collabs" }, (payload: any) => {
        const updated = payload.new;
        setAllCollabs(prev => prev.map(c =>
          c.id === updated.id
            ? { ...c, spots_filled: updated.spots_filled, status: updated.status }
            : c
        ));
        setDetailCollab((prev: any) => {
          if (prev && prev.id === updated.id) {
            return { ...prev, spots_filled: updated.spots_filled, status: updated.status };
          }
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Part 7: Recent activity panel ---
  const fetchActivity = useCallback(async () => {
    if (!userId) return;

    // 1. Requests the current user sent
    const { data: myRequests } = await supabase
      .from("collab_requests")
      .select("id, collab_id, status, created_at, collabs:collab_id(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // 2. Requests others sent to collabs the current user created
    const { data: myCollabs } = await supabase
      .from("collabs")
      .select("id")
      .eq("author_id", userId);

    const myCollabIds = (myCollabs || []).map((c: any) => c.id);

    let incomingRequests: any[] = [];
    if (myCollabIds.length > 0) {
      const { data } = await supabase
        .from("collab_requests")
        .select("id, collab_id, user_id, status, created_at, collabs:collab_id(title), requester:user_id(full_name, avatar_url)")
        .in("collab_id", myCollabIds)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      incomingRequests = data || [];
    }

    const items: any[] = [];

    (myRequests || []).forEach((r: any) => {
      const title = r.collabs?.title || "a collab";
      let boldText = "You";
      let plainText = "";
      if (r.status === "pending") plainText = `requested to join ${title}`;
      else if (r.status === "accepted") plainText = `joined ${title}`;
      else if (r.status === "declined") { boldText = "Your"; plainText = `request to ${title} was declined`; }
      if (!plainText) return;

      items.push({
        id: `my-${r.id}`,
        avatarName: userProfile?.full_name || null,
        created_at: r.created_at,
        boldText,
        plainText,
      });
    });

    incomingRequests.forEach((r: any) => {
      const title = r.collabs?.title || "a collab";
      const name = r.requester?.full_name || "Someone";
      let boldText = name.split(" ")[0];
      let plainText = "";

      if (r.status === "pending") plainText = `wants to join ${title}`;
      else if (r.status === "accepted") plainText = `joined ${title}`;
      else if (r.status === "declined") { boldText = "You"; plainText = `declined ${name} for ${title}`; }
      if (!plainText) return;

      items.push({
        id: `in-${r.id}`,
        avatarName: r.status === "declined" ? (userProfile?.full_name || null) : (r.requester?.full_name || null),
        created_at: r.created_at,
        boldText,
        plainText,
      });
    });

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setActivityItems(items.slice(0, 10));
  }, [userId, userProfile]);

  useEffect(() => {
    fetchActivity();

    const channel = supabase.channel("collab_requests_activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_requests" }, () => {
        fetchActivity();
        // Also refresh request statuses for join buttons
        if (userId) {
          supabase.from("collab_requests").select("collab_id, status").eq("user_id", userId).then(({ data }) => {
            if (data) {
              const map: Record<string, string> = {};
              data.forEach((r: any) => { map[r.collab_id] = r.status; });
              setRequestStatusMap(map);
            }
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchActivity, userId]);

  // filtering
  const filtered = useMemo(() => {
    let result = allCollabs;
    if (activeFilter === "Open to Join") result = result.filter(c => c.is_open_collab && c.status === "open");
    else if (activeFilter !== "All") result = result.filter(c => c.category?.toLowerCase() === activeFilter.toLowerCase());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || (c.tags || []).some((t: string) => t.toLowerCase().includes(q)));
    }
    return result;
  }, [allCollabs, activeFilter, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "Most Active") arr.sort((a, b) => (b.spots_filled || 0) - (a.spots_filled || 0));
    else if (sortBy === "Spots Available") arr.sort((a, b) => ((b.spots_total || 0) - (b.spots_filled || 0)) - ((a.spots_total || 0) - (a.spots_filled || 0)));
    return arr;
  }, [filtered, sortBy]);

  const featuredCollab = useMemo(() => allCollabs.find(c => c.is_featured) || null, [allCollabs]);
  const gridCollabs = useMemo(() => sorted.filter(c => c.id !== featuredCollab?.id), [sorted, featuredCollab]);

  // sidebar: aggregate looking_for
  const topSkills = useMemo(() => {
    const freq: Record<string, number> = {};
    allCollabs.forEach(c => (c.looking_for || []).forEach((s: string) => { freq[s] = (freq[s] || 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [allCollabs]);
  const maxSkillCount = topSkills.length > 0 ? topSkills[0][1] : 1;

  const addTag = (type: "looking" | "tag", val: string) => {
    const clean = val.trim();
    if (!clean) return;
    if (type === "looking") {
      if (!formLookingFor.includes(clean)) setFormLookingFor(prev => [...prev, clean]);
      setFormLookingInput("");
    } else {
      if (!formTags.includes(clean)) setFormTags(prev => [...prev, clean]);
      setFormTagInput("");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="cb-page-header">
        <div className="cb-ph-inner">
          <div className="cb-ph-left">
            <div className="cb-ph-breadcrumb">Kinexis / <span>Collabs</span></div>
            <div className="cb-ph-title">Find Your People</div>
            <div className="cb-ph-sub">Post anything you want to do together — a project, a trip, a team, a vibe.</div>
          </div>
          <button className="cb-btn-post" onClick={() => setShowModal(true)}>+ Post a Collab</button>
        </div>
      </div>

      {/* Stats */}
      <div className="cb-stats-row">
        <div className="cb-stat-card"><div className="cb-stat-num" style={{ color: "var(--lime)" }}>{stats.total}</div><div className="cb-stat-label">Active Collabs</div></div>
        <div className="cb-stat-card"><div className="cb-stat-num" style={{ color: "var(--cyan)" }}>{stats.open}</div><div className="cb-stat-label">Open to Join</div></div>
        <div className="cb-stat-card"><div className="cb-stat-num" style={{ color: "var(--purple)" }}>{stats.involved}+</div><div className="cb-stat-label">Students Involved</div></div>
        <div className="cb-stat-card"><div className="cb-stat-num" style={{ color: "var(--coral)" }}>{stats.thisWeek}</div><div className="cb-stat-label">Posted This Week</div></div>
      </div>

      {/* Filter bar */}
      <div className="cb-filter-bar">
        <div className="cb-filter-inner">
          <div className="cb-filter-search">
            <svg className="cb-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input type="text" placeholder="Search collabs, people, vibes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="cb-filter-chips">
            {FILTERS.map(f => (
              <div key={f} className={`cb-chip ${activeFilter === f ? "active" : ""}`} onClick={() => setActiveFilter(f)}>{f}</div>
            ))}
          </div>
          <div className="cb-filter-right">
            <select className="cb-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option>Most Recent</option>
              <option>Most Active</option>
              <option>Spots Available</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="cb-main">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>Loading collabs...</div>
        ) : allCollabs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>No collabs yet. Be the first to post one!</div>
        ) : (
          <div className="cb-layout">
            <div>
              {/* Featured */}
              {featuredCollab && (() => {
                const fBtn = getJoinButtonState(featuredCollab);
                return (
                  <>
                    <div className="cb-section-label">Featured Collab</div>
                    <div className="cb-featured" onClick={() => openDetail(featuredCollab)}>
                      <div className="cb-featured-body">
                        <div className="cb-featured-top">
                          <div className="cb-featured-badges">
                            <span className="cb-badge featured">Featured</span>
                            {featuredCollab.is_open_collab && <span className="cb-badge open">Open to Join</span>}
                            <span className="cb-badge cat">{featuredCollab.category || "Social"}</span>
                          </div>
                          <div className="cb-featured-avatars">
                            <div className="av-circle" style={{ background: ACCENT_BGS[0], color: ACCENT_COLORS[0] }}>{getInitials(featuredCollab.author?.full_name)}</div>
                          </div>
                        </div>
                        <div className="cb-featured-title">{featuredCollab.title}</div>
                        <div className="cb-featured-desc">{featuredCollab.description}</div>
                        {featuredCollab.tags?.length > 0 && (
                          <div className="cb-featured-tags">
                            {featuredCollab.tags.map((t: string, i: number) => <span key={i} className="cb-tag">{t}</span>)}
                          </div>
                        )}
                        <div className="cb-featured-footer">
                          <div className="cb-featured-meta">
                            <span>◦ {featuredCollab.stream || ""}{featuredCollab.batch_year ? `, ${featuredCollab.batch_year}` : ""}</span>
                            <span>◦ Started {timeAgo(featuredCollab.created_at)}</span>
                            <span>◦ {featuredCollab.spots_filled} of {featuredCollab.spots_total} spots filled</span>
                          </div>
                          <div className="cb-featured-actions">
                            {!fBtn.hidden && (
                              <button
                                className="cb-btn-join"
                                disabled={fBtn.disabled}
                                onClick={e => { e.stopPropagation(); if (!fBtn.disabled) handleJoinClick(featuredCollab); }}
                              >{fBtn.label}</button>
                            )}
                            <button className="cb-btn-view" onClick={e => { e.stopPropagation(); openDetail(featuredCollab); }}>View Details</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Grid */}
              <div className="cb-section-label">All Collabs</div>
              <div className="cb-grid">
                {gridCollabs.map((c, idx) => {
                  const accent = ACCENT_COLORS[idx % 4];
                  const accentBg = ACCENT_BGS[idx % 4];
                  const st = STATUS_MAP[c.status] || STATUS_MAP.open;
                  const spotsOpen = (c.spots_total || 1) - (c.spots_filled || 0);
                  const btn = getJoinButtonState(c);

                  return (
                    <div key={c.id} className="cb-card" style={{ "--card-accent": accent } as React.CSSProperties} onClick={() => openDetail(c)}>
                      <div className="cb-card-top">
                        <span className="cb-badge cat">{c.category || "Social"}</span>
                        <span className="cb-card-status" style={{ color: st.color }}>{st.icon} {st.label}</span>
                      </div>
                      <div className="cb-card-title">{c.title}</div>
                      <div className="cb-card-desc">{c.description}</div>
                      {c.tags?.length > 0 && (
                        <div className="cb-card-tags">
                          {c.tags.slice(0, 4).map((t: string, i: number) => <span key={i} className="cb-tag">{t}</span>)}
                        </div>
                      )}
                      <div className="cb-card-footer">
                        <div className="cb-card-members">
                          <div className="av-small" style={{ background: accentBg, color: accent }}>{getInitials(c.author?.full_name)}</div>
                          <span>{spotsOpen <= 0 ? <span style={{ color: "var(--coral)" }}>Team full</span> : `${c.spots_filled || 1} members · ${spotsOpen} spots open`}</span>
                        </div>
                        {!btn.hidden && (
                          <button
                            className={`cb-btn-card ${btn.label === "Join" ? "join" : "view"}`}
                            disabled={btn.disabled}
                            onClick={e => { e.stopPropagation(); if (!btn.disabled) handleJoinClick(c); }}
                          >{btn.label}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {gridCollabs.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)" }}>No collabs match your filters.</div>
              )}

              {hasMore && (
                <div className="cb-load-more">
                  <button className="cb-btn-load" onClick={handleLoadMore}>Show more collabs</button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="cb-sidebar">
              <div className="cb-sidebar-card">
                <div className="cb-sidebar-title">What People Need</div>
                {topSkills.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>No data yet.</div>
                ) : (
                  topSkills.map(([skill, count], i) => (
                    <div key={skill} className="cb-skill-item">
                      <div>
                        <div className="cb-skill-name">{skill}</div>
                        <div className="cb-skill-bar" style={{ width: "100%" }}>
                          <div className="cb-skill-bar-fill" style={{ width: `${(count / maxSkillCount) * 100}%`, background: ACCENT_COLORS[i % 4] }} />
                        </div>
                      </div>
                      <div className="cb-skill-count">{count} collabs</div>
                    </div>
                  ))
                )}
              </div>

              {/* Part 7 — Recent Activity wired to real data */}
              <div className="cb-sidebar-card">
                <div className="cb-sidebar-title">Recent Activity</div>
                {activityItems.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>No recent activity.</div>
                ) : (
                  activityItems.map((item: any) => (
                    <div key={item.id} className="cb-activity-item">
                      <div className="cb-activity-av" style={{ background: "rgba(158,240,26,0.15)", color: "var(--lime)" }}>{getInitials(item.avatarName)}</div>
                      <div>
                        <div className="cb-activity-text"><b>{item.boldText}</b> {item.plainText}</div>
                        <div className="cb-activity-time">{timeAgo(item.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="cb-sidebar-card" style={{ background: "rgba(158,240,26,0.04)", borderColor: "rgba(158,240,26,0.18)" }}>
                <div className="cb-sidebar-title" style={{ color: "var(--lime)" }}>Got something in mind?</div>
                <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.6, marginBottom: 12 }}>Whether it's a startup, a reel, or just someone to hit the gym with — post it and find your people.</div>
                <button className="cb-btn-post" style={{ width: "100%", borderRadius: 8, fontSize: 13, padding: 10 }} onClick={() => setShowModal(true)}>Post a Collab</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Collab Modal */}
      {showModal && (
        <div className="cb-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cb-modal" onClick={e => e.stopPropagation()}>
            <div className="cb-modal-title">Post a Collab</div>

            <label className="cb-modal-label">What do you want to do?</label>
            <input className="cb-modal-input" placeholder="e.g. Find a gym partner, make a reel, build an app..." value={formTitle} onChange={e => setFormTitle(e.target.value)} />

            <label className="cb-modal-label">Category</label>
            <div className="cb-modal-cats">
              {CATEGORIES.map(c => (
                <div key={c} className={`cb-modal-cat ${formCategory === c ? "active" : ""}`} onClick={() => setFormCategory(c)}>{c}</div>
              ))}
            </div>

            <label className="cb-modal-label">Describe the vibe</label>
            <textarea className="cb-modal-textarea" placeholder="Who are you looking for? What's the plan? Any requirements?" value={formDesc} onChange={e => setFormDesc(e.target.value)} />

            <label className="cb-modal-label">Looking for</label>
            <input className="cb-modal-input" placeholder="e.g. Gym partner, Video editor, Anyone fun (press Enter)" value={formLookingInput} onChange={e => setFormLookingInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag("looking", formLookingInput); } }} />
            {formLookingFor.length > 0 && (
              <div className="cb-modal-tags">
                {formLookingFor.map((t, i) => <span key={i} className="cb-modal-tag">{t}<button onClick={() => setFormLookingFor(prev => prev.filter((_, j) => j !== i))}>×</button></span>)}
              </div>
            )}

            <label className="cb-modal-label">Tags</label>
            <input className="cb-modal-input" placeholder="e.g. Morning, Adarsh Nagar, Reels (press Enter)" value={formTagInput} onChange={e => setFormTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag("tag", formTagInput); } }} />
            {formTags.length > 0 && (
              <div className="cb-modal-tags">
                {formTags.map((t, i) => <span key={i} className="cb-modal-tag">{t}<button onClick={() => setFormTags(prev => prev.filter((_, j) => j !== i))}>×</button></span>)}
              </div>
            )}

            <div className="cb-modal-row">
              <div>
                <label className="cb-modal-label" style={{ marginBottom: 6 }}>How many spots?</label>
                <div className="cb-modal-stepper">
                  <button onClick={() => setFormSpots(Math.max(1, formSpots - 1))}>−</button>
                  <span>{formSpots}</span>
                  <button onClick={() => setFormSpots(Math.min(20, formSpots + 1))}>+</button>
                </div>
              </div>
              <div>
                <label className="cb-modal-label" style={{ marginBottom: 6 }}>Open to anyone?</label>
                <div className="cb-modal-toggle" onClick={() => setFormOpen(!formOpen)}>
                  <div className={`cb-toggle-track ${formOpen ? "on" : ""}`}><div className="cb-toggle-thumb" /></div>
                  <span className="cb-toggle-label">{formOpen ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>

            <div className="cb-modal-actions">
              <button className="cb-btn-submit" onClick={handleSubmit} disabled={submitting}>{submitting ? "Posting..." : "Post It"}</button>
              <button className="cb-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Part 2 — Join Modal */}
      {joinModalCollab && (
        <div className="cb-modal-overlay" onClick={() => setJoinModalCollab(null)}>
          <div className="cb-modal" onClick={e => e.stopPropagation()}>
            <div className="cb-modal-title">{joinModalCollab.title}</div>
            <label className="cb-modal-label">Introduce yourself (optional)</label>
            <textarea
              className="cb-modal-textarea"
              placeholder="Tell the creator a bit about yourself and why you'd like to join..."
              value={joinMessage}
              onChange={e => setJoinMessage(e.target.value)}
            />
            {joinError && (
              <div style={{ fontSize: 12, color: "var(--coral)", marginBottom: 12 }}>{joinError}</div>
            )}
            <div className="cb-modal-actions">
              <button className="cb-btn-submit" onClick={handleJoinSubmit} disabled={joinSubmitting}>{joinSubmitting ? "Sending..." : "Send Request"}</button>
              <button className="cb-btn-cancel" onClick={() => setJoinModalCollab(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Parts 3, 4, 5, 8 — Detail Modal */}
      {detailCollab && (
        <div className="cb-modal-overlay" onClick={() => setDetailCollab(null)}>
          <div className="cb-modal" onClick={e => e.stopPropagation()}>
            <div className="cb-modal-title">{detailCollab.title}</div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              <span className="cb-badge cat">{detailCollab.category || "Social"}</span>
              {(() => {
                const st = STATUS_MAP[detailCollab.status] || STATUS_MAP.open;
                return <span className="cb-badge cat" style={{ color: st.color, borderColor: st.color }}>{st.icon} {st.label}</span>;
              })()}
            </div>

            <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.65, marginBottom: 14 }}>{detailCollab.description}</div>

            {detailCollab.tags?.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                {detailCollab.tags.map((t: string, i: number) => <span key={i} className="cb-tag">{t}</span>)}
              </div>
            )}

            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
              {detailCollab.spots_filled || 0} of {detailCollab.spots_total || 1} spots filled
              {(detailCollab.spots_filled || 0) >= (detailCollab.spots_total || 1) && (
                <span style={{ color: "var(--coral)", marginLeft: 8 }}>— Team is full</span>
              )}
            </div>

            {/* Part 3 — Join Requests (author only) */}
            {(detailCollab.author_id || detailCollab.author?.id) === userId && (
              <>
                <div className="cb-section-label" style={{ marginTop: 8 }}>Join Requests</div>
                {(detailCollab.spots_filled || 0) >= (detailCollab.spots_total || 1) ? (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>This collab is full. No more requests can be accepted.</div>
                ) : pendingRequests.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>No pending requests.</div>
                ) : (
                  pendingRequests.map((req: any) => (
                    <div key={req.id} style={{ marginBottom: 12 }}>
                      <div className="cb-activity-item" style={{ borderBottom: "none", paddingBottom: 4 }}>
                        <div className="cb-activity-av" style={{ background: "rgba(158,240,26,0.15)", color: "var(--lime)" }}>{getInitials(req.full_name)}</div>
                        <div style={{ flex: 1 }}>
                          <div className="cb-activity-text"><b>{req.full_name || "Someone"}</b> · {req.stream || ""}{req.batch_year ? `, ${req.batch_year}` : ""}</div>
                          {req.message && <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 4, fontStyle: "italic" }}>&ldquo;{req.message}&rdquo;</div>}
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            <button className="cb-btn-card view" onClick={() => handleDecline(req.id)}>Decline</button>
                            <button className="cb-btn-card join" onClick={() => handleAccept(req.id)}>Accept</button>
                          </div>
                          {requestErrors[req.id] && (
                            <div style={{ fontSize: 11, color: "var(--coral)", marginTop: 4 }}>{requestErrors[req.id]}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Part 8 — Members list */}
            <div className="cb-section-label" style={{ marginTop: 8 }}>Team Members</div>
            {collabMembers.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>No members yet.</div>
            ) : (
              collabMembers.map((m: any) => (
                <div key={m.user_id || m.id} className="cb-activity-item">
                  <div className="cb-activity-av" style={{ background: "rgba(158,240,26,0.15)", color: "var(--lime)" }}>{getInitials(m.full_name)}</div>
                  <div>
                    <div className="cb-activity-text">
                      <b>{m.full_name || "Unknown"}</b>
                      {m.role === "creator" && <span style={{ fontSize: 10, marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: "rgba(158,240,26,0.1)", color: "var(--lime)", fontWeight: 700 }}>Creator</span>}
                    </div>
                    <div className="cb-activity-time">{m.stream || ""}{m.batch_year ? ` · ${m.batch_year}` : ""}</div>
                  </div>
                </div>
              ))
            )}

            <div className="cb-modal-actions" style={{ marginTop: 14 }}>
              <button className="cb-btn-cancel" onClick={() => setDetailCollab(null)} style={{ flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
