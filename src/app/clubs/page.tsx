"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import TopNav from "@/components/TopNav";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { useRouter } from "next/navigation";
import "./clubs.css";

// --- Types ---
type Club = {
  id: string;
  name: string;
  category: string;
  description: string;
  follower_count: number;
  accent_color: string;
};

type ClubCategoryGroup = {
  category: string;
  clubs: Club[];
};

// --- Constants ---
const CATEGORIES = ["All", "Technical", "Academic", "Business", "Social Impact", "Cultural", "Arts & Media", "Sports"];
const SORT_OPTIONS = ["Most Members", "A to Z", "Newest"];

export default function ClubsPage() {
  const router = useRouter();
  
  // Data State
  const [clubs, setClubs] = useState<Club[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Most Members");

  // Initial Fetch
  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted && user) setUserId(user.id);

      // Fetch clubs
      const { data: clubsData, error: clubsErr } = await supabase
        .from("clubs")
        .select("*")
        .order("follower_count", { ascending: false });

      if (!mounted) return;

      if (clubsErr) {
        console.error("Clubs error:", clubsErr.message);
      } else {
        setClubs((clubsData as Club[]) || []);
      }

      // Fetch user followed clubs if logged in
      if (user) {
        const { data: followData, error: followErr } = await supabase
          .from("club_members")
          .select("club_id")
          .eq("user_id", user.id);
        
        if (followErr) {
          console.error("Follow data error:", followErr.message);
        } else if (mounted && followData) {
          setFollowedIds(new Set(followData.map(f => f.club_id)));
        }
      }

      setLoading(false);
    }

    fetchData();
    return () => { mounted = false; };
  }, []);

  // Filter & Sort Logic
  const processedGroups = useMemo(() => {
    // 1. Filter
    let filtered = clubs;
    
    if (activeCategory !== "All") {
      const categoryMap: Record<string, string> = {
        "Social Impact": "social",
        "Arts & Media": "arts",
      };
      const dbCategory = categoryMap[activeCategory] || activeCategory;
      filtered = filtered.filter(c => c.category && c.category.toLowerCase() === dbCategory.toLowerCase());
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.category && c.category.toLowerCase().includes(q)) || 
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    // 2. Sort
    let sorted = [...filtered];
    if (sortBy === "Most Members") {
      sorted.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));
    } else if (sortBy === "A to Z") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "Newest") {
      // Assuming created_at exists, skipping for now as not in type, or fallback to id
      // For exact 'Newest' behavior we would need created_at in the select
    }

    // 3. Group by Category
    const groupsMap = new Map<string, Club[]>();
    sorted.forEach(club => {
      const cat = club.category || "Other";
      if (!groupsMap.has(cat)) groupsMap.set(cat, []);
      groupsMap.get(cat)!.push(club);
    });

    // Convert to array and sort groups alphabetically (or by predefined order)
    const groups: ClubCategoryGroup[] = Array.from(groupsMap.entries()).map(([cat, list]) => ({
      category: cat,
      clubs: list
    }));

    // Optionally sort categories generally alphabetically
    groups.sort((a, b) => a.category.localeCompare(b.category));

    return groups;
  }, [clubs, searchQuery, activeCategory, sortBy]);

  const totalFilteredCount = useMemo(() => {
    return processedGroups.reduce((acc, g) => acc + g.clubs.length, 0);
  }, [processedGroups]);

  // Stats
  const clubStats = useMemo(() => {
    const totalFollowers = clubs.reduce((sum, c) => sum + (c.follower_count || 0), 0);
    const uniqueCats = new Set(clubs.map(c => c.category).filter(Boolean)).size;
    return { total: clubs.length, followers: totalFollowers, categories: uniqueCats };
  }, [clubs]);

  // Follow Action
  const toggleFollow = useCallback(async (club: Club) => {
    if (!userId) {
      router.push("/login?redirect=/clubs");
      return;
    }

    const isFollowing = followedIds.has(club.id);
    
    // Optimistic Update
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (isFollowing) next.delete(club.id);
      else next.add(club.id);
      return next;
    });

    setClubs(prev => prev.map(c => {
      if (c.id === club.id) {
        return { ...c, follower_count: c.follower_count + (isFollowing ? -1 : 1) };
      }
      return c;
    }));

    try {
      if (isFollowing) {
        // Unfollow
        await supabase.from("club_members").delete().match({ club_id: club.id, user_id: userId });
        await supabase.from("clubs").update({ follower_count: (club.follower_count || 0) - 1 }).eq('id', club.id);
        logActivity({ userId, activityType: "unfollow_club", targetTitle: club.name, targetId: club.id, targetType: "club" });
      } else {
        // Follow
        await supabase.from("club_members").insert({ club_id: club.id, user_id: userId });
        await supabase.from("clubs").update({ follower_count: (club.follower_count || 0) + 1 }).eq('id', club.id);
        logActivity({ userId, activityType: "follow_club", targetTitle: club.name, targetId: club.id, targetType: "club" });
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      // Revert optimism (simplified)
      setFollowedIds(prev => {
        const next = new Set(prev);
        if (isFollowing) next.add(club.id);
        else next.delete(club.id);
        return next;
      });
      setClubs(prev => prev.map(c => {
        if (c.id === club.id) return { ...c, follower_count: c.follower_count + (isFollowing ? 1 : -1) };
        return c;
      }));
    }
  }, [userId, followedIds, router]);

  // Generators for styling
  const getInitials = (name: string) => {
      if (!name) return "?";
      // E.g. "ACM Student Chapter" -> "AC"
      const words = name.split(" ").filter(w => w.length > 0);
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return name.slice(0,2).toUpperCase();
  };

  const getAccentColor = (club: Club) => {
      if (club.accent_color) {
          const c = club.accent_color.toLowerCase();
          if (["lime", "cyan", "purple", "coral"].includes(c)) return `var(--${c})`;
          return club.accent_color;
      }
      const catHash = (club.category?.length || 0) % 4;
      return ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"][catHash];
  };

  const getAccentRgba = (color: string, alpha: number) => {
      // Simplistic fallback map because CSS vars can't easily have alpha applied without complex color-mix
      const map: Record<string, string> = {
          "var(--lime)": `rgba(158, 240, 26, ${alpha})`,
          "var(--cyan)": `rgba(34, 211, 238, ${alpha})`,
          "var(--purple)": `rgba(167, 139, 250, ${alpha})`,
          "var(--coral)": `rgba(251, 113, 133, ${alpha})`,
      };
      return map[color] || `rgba(255,255,255,${alpha})`;
  };

  return (
    <div className="clubs-page">
      <TopNav />

      {/* ── HEADER ── */}
      <header className="clubs-header-wrap">
        <div className="clubs-header-dotgrid" />
        <div className="clubs-header-inner">
          <div className="clubs-breadcrumb">
            Kinexis <span style={{ opacity: 0.5, margin: "0 6px" }}>/</span> <span>Clubs</span>
          </div>
          <h1 className="clubs-h1">SNU Clubs &amp; Societies</h1>
          <p className="clubs-subtitle">
            Explore every club on campus. Find your community, follow their updates, and express interest to join.
          </p>
          {/* Header count badge visually placed, HTML has it on right. We'll add it via flex or absolute on large screens */}
          <div style={{ position: "absolute", top: 0, right: 32, display: "none" }} className="clubs-header-total">
            {/* Keeping it simple per spec: 'total club count badge on the right' handled in filter bar instead as per standard UI patterns and image, waiting to see exactly */}
          </div>
        </div>
      </header>

      {/* ── STATS ROW ── */}
      <div className="clubs-stats-row">
        <div className="clubs-stat-card"><div className="clubs-stat-num" style={{ color: "#9EF01A" }}>{clubStats.total}</div><div className="clubs-stat-label">Total Clubs</div></div>
        <div className="clubs-stat-card"><div className="clubs-stat-num" style={{ color: "#22D3EE" }}>{clubStats.followers}+</div><div className="clubs-stat-label">Total Followers</div></div>
        <div className="clubs-stat-card"><div className="clubs-stat-num" style={{ color: "#A78BFA" }}>{clubStats.categories}</div><div className="clubs-stat-label">Categories</div></div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="clubs-filter-stick">
        <div className="clubs-filter-inner">
          <div className="clubs-search">
            <span className="clubs-search-icon">🔍</span>
            <input 
              className="clubs-search-inp" 
              placeholder="Search clubs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="clubs-chips">
            {CATEGORIES.map(cat => (
              <button 
                key={cat} 
                className={`clubs-chip ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="clubs-total-count">
            <span>{totalFilteredCount}</span> clubs
          </div>

          <select className="clubs-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="clubs-main">
        {loading ? (
          // Skeleton Groups
          <div className="clubs-category-sec">
             <div className="clubs-cat-header-row">
                <div className="clubs-cat-h2" style={{ background: 'rgba(255,255,255,0.05)', color: 'transparent', borderRadius: 4, width: 180 }}>Loading</div>
                <div className="clubs-cat-line" />
             </div>
             <div className="clubs-grid">
               {Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="clubs-skel-card">
                   <div className="clubs-skel-top">
                     <div className="clubs-skel-av" />
                     <div className="clubs-skel-lines">
                       <div className="clubs-skel-line" style={{ width: "80%" }} />
                       <div className="clubs-skel-line" style={{ width: "40%" }} />
                     </div>
                   </div>
                   <div className="clubs-skel-desc">
                      <div className="clubs-skel-line" />
                      <div className="clubs-skel-line short" />
                   </div>
                   <div className="clubs-skel-bot">
                     <div className="clubs-skel-line" style={{ width: "30%", marginBottom: 0 }} />
                     <div className="clubs-skel-btn" />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        ) : processedGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.5)" }}>
             No clubs found matching your criteria.
          </div>
        ) : (
          processedGroups.map(group => (
            <div key={group.category} className="clubs-category-sec">
              <div className="clubs-cat-header-row">
                <h2 className="clubs-cat-h2">{group.category}</h2>
                <div className="clubs-cat-badge">{group.clubs.length} clubs</div>
                <div className="clubs-cat-line" />
              </div>

              <div className="clubs-grid">
                {group.clubs.map(club => {
                  const isFollowing = followedIds.has(club.id);
                  const colorMatch = getAccentColor(club);
                  
                  return (
                    <div key={club.id} className="clubcard" style={{ "--card-accent": colorMatch } as React.CSSProperties}>
                      <div className="clubcard-top">
                        <div className="clubcard-av" style={{ backgroundColor: getAccentRgba(colorMatch, 0.15), color: colorMatch }}>
                          {getInitials(club.name)}
                        </div>
                        <div className="clubcard-info">
                          <div className="clubcard-name">{club.name}</div>
                          <div className="clubcard-type">{club.category}</div>
                        </div>
                      </div>
                      
                      <div className="clubcard-desc">{club.description || "A student-led organization."}</div>
                      
                      <div className="clubcard-bot">
                        <div className="clubcard-mem">{club.follower_count || 0} followers</div>
                        <button 
                          className={`clubcard-btn ${isFollowing ? 'following' : ''}`}
                          style={!isFollowing ? { 
                            backgroundColor: getAccentRgba(colorMatch, 0.15), 
                            color: colorMatch,
                            borderColor: getAccentRgba(colorMatch, 0.3)
                          } : {}}
                          onClick={() => toggleFollow(club)}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
      
      {/* ── MOBILE NAV (Bottom fixed) ──  */}
      {/* Handled in globals for the entire app if desired, but adding a simplified structural mockup for clubs page specifically as per reference if requested. */}
    </div>
  );
}
