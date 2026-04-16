"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import "./feed.css";

/* ── Constants ── */
const POST_TYPE_LABELS: Record<string, string> = {
  thread: "Thread",
  confession: "Confession 🤫",
  meme: "Meme",
  professor_rating: "Grade Professors",
};
const POST_TYPE_COLORS: Record<string, string> = {
  thread: "var(--lime)",
  confession: "var(--purple)",
  meme: "var(--cyan)",
  professor_rating: "var(--coral)",
};
const POST_TYPE_BGS: Record<string, string> = {
  thread: "rgba(158,240,26,0.15)",
  confession: "rgba(167,139,250,0.15)",
  meme: "rgba(34,211,238,0.15)",
  professor_rating: "rgba(251,113,133,0.15)",
};
const TABS = ["All", "Threads", "Confessions", "Memes", "Grade Professors", "Leaderboard"];
const TAB_TO_TYPE: Record<string, string> = {
  Threads: "thread",
  Confessions: "confession",
  Memes: "meme",
  "Grade Professors": "professor_rating",
};

/* ── Helpers ── */
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

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "★" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}

/* ── Main Component ── */
export default function FeedPageClient({ userId }: { userId: string }) {
  /* State */
  const [posts, setPosts] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, { total: number; userVote: number }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [sortBy, setSortBy] = useState("Top Upvoted");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  /* Modal */
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("thread");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState("");
  const [formAnon, setFormAnon] = useState(false);
  const [formProfName, setFormProfName] = useState("");
  const [formProfSubject, setFormProfSubject] = useState("");
  const [formProfRating, setFormProfRating] = useState(0);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Thread view */
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  /* Sidebar */
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  /* ── Fetch profile ── */
  useEffect(() => {
    supabase.from("users").select("id, full_name, stream, year, avatar_url").eq("id", userId).single().then(({ data }) => {
      if (data) setProfile(data);
    });
  }, [userId]);

  /* ── Fetch posts + votes ── */
  const fetchPosts = useCallback(async () => {
    const { data: postsData, error } = await supabase
      .from("public_feed_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Feed fetch error:", error);
      setLoading(false);
      return;
    }

    if (postsData) {
      // Resolve author names for non-anonymous posts
      const userIds = postsData.filter(p => !p.is_anonymous && p.user_id).map(p => p.user_id);
      const uniqueUserIds = [...new Set(userIds)];
      let authorMap: Record<string, any> = {};

      if (uniqueUserIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name, stream, year, avatar_url").in("id", uniqueUserIds);
        if (users) users.forEach(u => { authorMap[u.id] = u; });
      }

      const enriched = postsData.map(p => ({
        ...p,
        author: p.is_anonymous ? null : (p.user_id ? authorMap[p.user_id] : null),
      }));
      setPosts(enriched);

      // Fetch votes for all posts
      const postIds = enriched.map(p => p.id);
      if (postIds.length > 0) {
        const { data: votesData } = await supabase.from("feed_votes").select("post_id, user_id, vote").in("post_id", postIds);
        const voteMap: Record<string, { total: number; userVote: number }> = {};
        postIds.forEach(id => { voteMap[id] = { total: 0, userVote: 0 }; });
        if (votesData) {
          votesData.forEach((v: any) => {
            if (!voteMap[v.post_id]) voteMap[v.post_id] = { total: 0, userVote: 0 };
            voteMap[v.post_id].total += v.vote;
            if (v.user_id === userId) voteMap[v.post_id].userVote = v.vote;
          });
        }
        setVotes(voteMap);
      }
    }
    setLoading(false);
  }, [userId]);

  /* ── Fetch leaderboard ── */
  const fetchLeaderboard = useCallback(async () => {
    // Top users by total upvotes received on their posts
    const { data: allVotes } = await supabase.from("feed_votes").select("post_id, vote");
    if (!allVotes) return;

    // Get all posts to map post→author
    const { data: allPosts } = await supabase.from("feed_posts").select("id, user_id");
    if (!allPosts) return;

    const postOwnerMap: Record<string, string> = {};
    allPosts.forEach(p => { postOwnerMap[p.id] = p.user_id; });

    const userScores: Record<string, number> = {};
    allVotes.forEach((v: any) => {
      const owner = postOwnerMap[v.post_id];
      if (owner && v.vote === 1) {
        userScores[owner] = (userScores[owner] || 0) + 1;
      }
    });

    const sorted = Object.entries(userScores).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topUserIds = sorted.map(([uid]) => uid);

    if (topUserIds.length === 0) { setLeaderboard([]); return; }

    const { data: users } = await supabase.from("users").select("id, full_name, stream, year").in("id", topUserIds);
    const userMap: Record<string, any> = {};
    if (users) users.forEach(u => { userMap[u.id] = u; });

    const lb = sorted.map(([uid, score]) => ({ ...userMap[uid], score, id: uid })).filter(u => u.full_name);
    setLeaderboard(lb);
  }, []);

  /* ── Fetch trending tags ── */
  const fetchTrending = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase.from("feed_posts").select("tags").gte("created_at", weekAgo);
    if (!data) return;

    const freq: Record<string, number> = {};
    data.forEach((p: any) => {
      (p.tags || []).forEach((t: string) => { freq[t] = (freq[t] || 0) + 1; });
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);
    setTrendingTags(top);
  }, []);

  /* ── Initial fetch ── */
  useEffect(() => {
    fetchPosts();
    fetchLeaderboard();
    fetchTrending();
  }, [fetchPosts, fetchLeaderboard, fetchTrending]);

  /* ── Realtime ── */
  useEffect(() => {
    const postChannel = supabase.channel("realtime:feed_posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_posts" }, () => { fetchPosts(); fetchLeaderboard(); fetchTrending(); })
      .subscribe();

    const voteChannel = supabase.channel("realtime:feed_votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_votes" }, () => { fetchPosts(); fetchLeaderboard(); })
      .subscribe();

    return () => { supabase.removeChannel(postChannel); supabase.removeChannel(voteChannel); };
  }, [fetchPosts, fetchLeaderboard, fetchTrending]);

  /* ── Vote handler ── */
  const handleVote = async (postId: string, voteVal: number) => {
    const current = votes[postId]?.userVote || 0;
    if (current === voteVal) {
      // Remove vote
      await supabase.from("feed_votes").delete().match({ post_id: postId, user_id: userId });
      setVotes(prev => ({ ...prev, [postId]: { total: (prev[postId]?.total || 0) - voteVal, userVote: 0 } }));
    } else {
      if (current !== 0) {
        // Remove old vote first
        await supabase.from("feed_votes").delete().match({ post_id: postId, user_id: userId });
      }
      await supabase.from("feed_votes").insert({ post_id: postId, user_id: userId, vote: voteVal });
      setVotes(prev => ({ ...prev, [postId]: { total: (prev[postId]?.total || 0) - current + voteVal, userVote: voteVal } }));
      if (voteVal === 1) {
        logActivity({ userId, activityType: "upvote_post", targetId: postId, targetType: "post" });
      }
    }
  };

  /* ── Submit post ── */
  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    const payload: any = {
      user_id: userId,
      post_type: modalType,
      title: formTitle,
      body: formBody,
      tags: formTags,
      is_anonymous: formAnon,
    };
    if (modalType === "professor_rating") {
      payload.professor_name = formProfName;
      payload.professor_subject = formProfSubject;
      payload.professor_rating = formProfRating;
    }
    if (modalType === "meme" && formImageUrl) {
      payload.image_url = formImageUrl;
    }

    const { data: newPosts, error } = await supabase.from("feed_posts").insert(payload).select();
    setSubmitting(false);
    if (error) { alert("Failed: " + error.message); return; }

    const newPost = newPosts?.[0];

    // Log activity
    logActivity({ userId, activityType: `post_${modalType === "professor_rating" ? "thread" : modalType}`, targetTitle: formTitle, targetId: newPost?.id, targetType: "post" });

    setShowModal(false);
    setFormTitle(""); setFormBody(""); setFormTags([]); setFormAnon(false);
    setFormProfName(""); setFormProfSubject(""); setFormProfRating(0); setFormImageUrl("");
    setModalType("thread");
  };

  /* ── Open thread ── */
  const openThread = async (post: any) => {
    setSelectedPost(post);
    setCommentLoading(true);
    const { data } = await supabase.from("feed_comments").select("*").eq("post_id", post.id).order("created_at", { ascending: true });
    if (data) {
      // Resolve comment authors
      const uids = data.filter(c => !c.is_anonymous && c.user_id).map(c => c.user_id);
      const uniq = [...new Set(uids)];
      let aMap: Record<string, any> = {};
      if (uniq.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name, avatar_url").in("id", uniq);
        if (users) users.forEach(u => { aMap[u.id] = u; });
      }
      setComments(data.map(c => ({ ...c, author: c.is_anonymous ? null : aMap[c.user_id] })));
    }
    setCommentLoading(false);
  };

  /* ── Submit comment ── */
  const handleComment = async () => {
    if (!commentBody.trim() || !selectedPost) return;
    const { error } = await supabase.from("feed_comments").insert({
      post_id: selectedPost.id,
      user_id: userId,
      body: commentBody,
      is_anonymous: false,
    });
    if (error) { alert("Failed: " + error.message); return; }
    // Update count
    await supabase.from("feed_posts").update({ comment_count: (selectedPost.comment_count || 0) + 1 }).eq("id", selectedPost.id);
    logActivity({ userId, activityType: "comment_post", targetTitle: selectedPost.title, targetId: selectedPost.id, targetType: "post" });
    setCommentBody("");
    openThread(selectedPost);
  };

  /* ── Share ── */
  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/feed?post=${postId}`;
    navigator.clipboard.writeText(url);
  };

  /* ── Add tag helper ── */
  const addTag = (val: string) => {
    const clean = val.trim();
    if (!clean || formTags.includes(clean)) return;
    setFormTags(prev => [...prev, clean]);
    setFormTagInput("");
  };

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    if (activeTab === "Leaderboard") return posts;
    let list = posts;
    if (activeTab !== "All") {
      const type = TAB_TO_TYPE[activeTab];
      if (type) list = list.filter(p => p.post_type === type);
    }
    if (activeTag) {
      list = list.filter(p => p.tags && p.tags.includes(activeTag));
    }
    return list;
  }, [posts, activeTab, activeTag]);

  /* ── Sorted by votes/date ── */
  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "Top Upvoted") {
      list.sort((a, b) => (votes[b.id]?.total || 0) - (votes[a.id]?.total || 0));
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [filtered, votes, sortBy]);

  /* ── Render ── */
  return (
    <>
      {/* Header */}
      <div className="fd-header">
        <div className="fd-header-inner">
          <div className="fd-breadcrumb">Kinexis / <span>Campus Feed</span></div>
          <div className="fd-title">Campus Feed</div>
          <div className="fd-sub">Threads, confessions, memes, professor ratings — everything on campus, unfiltered.</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fd-tabs">
        {TABS.map(tab => (
          <div key={tab} className={`fd-tab ${activeTab === tab ? "active" : ""}`} onClick={() => { setActiveTab(tab); setSelectedPost(null); }}>{tab}</div>
        ))}
      </div>

      {/* Main */}
      <div className="fd-main">
        {loading ? (
          <div className="fd-loading">Loading campus feed...</div>
        ) : activeTab === "Leaderboard" ? (
          /* ── Full Leaderboard ── */
          <div className="fd-layout">
            <div className="fd-lb-full">
              <div className="fd-sb-title" style={{ fontSize: 16, marginBottom: 18 }}>Top Contributors</div>
              {leaderboard.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 13 }}>No data yet. Start posting!</div>
              ) : (
                leaderboard.map((u, i) => {
                  const rankColors = ["var(--lime)", "#f59e0b", "#fb923c"];
                  const color = i < 3 ? rankColors[i] : "var(--muted)";
                  return (
                    <div key={u.id} className="fd-lb-item">
                      <div className="fd-lb-rank" style={{ color }}>{i + 1}</div>
                      <div className="fd-lb-av" style={{ background: POST_TYPE_BGS[["thread","confession","meme","professor_rating"][i % 4]], color: POST_TYPE_COLORS[["thread","confession","meme","professor_rating"][i % 4]] }}>{getInitials(u.full_name)}</div>
                      <div className="fd-lb-info">
                        <div className="fd-lb-name">{u.full_name}</div>
                        <div className="fd-lb-meta">{u.stream || ""}{u.year ? ` · ${u.year}` : ""}</div>
                      </div>
                      <div className="fd-lb-score" style={{ color }}>{u.score >= 1000 ? `${(u.score / 1000).toFixed(1)}k` : u.score}</div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="fd-sidebar">{renderSidebar()}</div>
          </div>
        ) : selectedPost ? (
          /* ── Thread View ── */
          <div className="fd-layout">
            <div>
              <button className="fd-thread-back" onClick={() => setSelectedPost(null)}>← Back to feed</button>
              <div className="fd-thread-full" style={{ "--card-accent": POST_TYPE_COLORS[selectedPost.post_type] } as React.CSSProperties}>
                <div className="fd-card-top">
                  <span className={`fd-type-badge ${selectedPost.post_type}`}>{POST_TYPE_LABELS[selectedPost.post_type]}</span>
                  {(selectedPost.tags || []).map((t: string, i: number) => <span key={i} className="fd-card-tag" onClick={(e) => { e.stopPropagation(); setActiveTag(t); setSelectedPost(null); }} style={{ cursor: "pointer" }}>{t}</span>)}
                </div>
                <div className="fd-card-title" style={{ fontSize: 20 }}>{selectedPost.title}</div>
                {selectedPost.professor_rating && (
                  <div className="fd-card-stars">
                    <span className="stars">{renderStars(selectedPost.professor_rating)}</span>
                    <span className="rating">{selectedPost.professor_rating} / 5</span>
                  </div>
                )}
                <div className="fd-card-body-text" style={{ marginBottom: 16 }}>{selectedPost.body}</div>
                {selectedPost.image_url && <img src={selectedPost.image_url} alt="" className="fd-card-img" />}
                <div className="fd-card-footer">
                  {renderAuthor(selectedPost)}
                  <span className="fd-card-dot" />
                  <span className="fd-card-meta">{timeAgo(selectedPost.created_at)}</span>
                  <span className="fd-card-dot" />
                  <span className="fd-card-comments">💬 {selectedPost.comment_count || 0} comments</span>
                </div>
              </div>

              <div className="fd-comment-form">
                <textarea className="fd-comment-input" placeholder="Write a comment..." value={commentBody} onChange={e => setCommentBody(e.target.value)} />
                <button className="fd-comment-submit" onClick={handleComment}>Post</button>
              </div>

              <div className="fd-comments-list">
                {commentLoading ? (
                  <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No comments yet. Be the first!</div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="fd-comment">
                      <div className="fd-comment-top">
                        <div className="fd-comment-av" style={{ background: "rgba(158,240,26,0.15)", color: "var(--lime)" }}>
                          {c.author?.avatar_url ? <img src={c.author.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : getInitials(c.author?.full_name || (c.is_anonymous ? null : null))}
                        </div>
                        <span className="fd-comment-name">{c.is_anonymous ? "Anonymous 🎭" : (c.author?.full_name || "User")}</span>
                        <span className="fd-comment-time">{timeAgo(c.created_at)}</span>
                      </div>
                      <div className="fd-comment-body">{c.body}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="fd-sidebar">{renderSidebar()}</div>
          </div>
        ) : (
          /* ── Feed View ── */
          <div className="fd-layout">
            <div>
              {/* Compose Bar */}
              <div className="fd-compose" onClick={() => setShowModal(true)}>
                <div className="fd-compose-av">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : getInitials(profile?.full_name)}
                </div>
                <div className="fd-compose-text">What&apos;s on your mind?</div>
                <div className="fd-compose-btns">
                  <span className="fd-compose-btn thread" onClick={e => { e.stopPropagation(); setModalType("thread"); setShowModal(true); }}>Thread</span>
                  <span className="fd-compose-btn confess" onClick={e => { e.stopPropagation(); setModalType("confession"); setFormAnon(true); setShowModal(true); }}>Confess</span>
                  <span className="fd-compose-btn meme" onClick={e => { e.stopPropagation(); setModalType("meme"); setShowModal(true); }}>Meme</span>
                </div>
              </div>

              {/* Filters & Sort */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 20 }}>
                {/* Sort Chips */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sub)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sort:</span>
                  {["Top Upvoted", "Newest First"].map(s => (
                    <button 
                      key={s}
                      onClick={() => setSortBy(s)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 20,
                        backgroundColor: sortBy === s ? "var(--lime)" : "rgba(255,255,255,0.05)",
                        color: sortBy === s ? "#000" : "var(--sub)",
                        border: "1px solid",
                        borderColor: sortBy === s ? "var(--lime)" : "rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Active Tag Filter */}
                {activeTag && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sub)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Filtered by:</span>
                    <button 
                      onClick={() => setActiveTag(null)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 20,
                        backgroundColor: "rgba(34, 211, 238, 0.15)",
                        color: "var(--cyan)",
                        border: "1px solid rgba(34, 211, 238, 0.3)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      #{activeTag} <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Posts */}
              <div className="fd-posts">
                {sorted.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>No posts yet. Be the first!</div>
                ) : (
                  sorted.map(post => {
                    const voteData = votes[post.id] || { total: 0, userVote: 0 };
                    return (
                      <div key={post.id} className="fd-card" style={{ "--card-accent": POST_TYPE_COLORS[post.post_type] } as React.CSSProperties} onClick={() => openThread(post)}>
                        {/* Vote Column */}
                        <div className="fd-vote" onClick={e => e.stopPropagation()}>
                          <button className={`fd-vote-btn ${voteData.userVote === 1 ? "up-active" : ""}`} onClick={() => handleVote(post.id, 1)}>▲</button>
                          <div className="fd-vote-count">{voteData.total}</div>
                          <button className={`fd-vote-btn ${voteData.userVote === -1 ? "down-active" : ""}`} onClick={() => handleVote(post.id, -1)}>▼</button>
                        </div>
                        {/* Body */}
                        <div className="fd-card-body">
                          <div className="fd-card-top">
                            <span className={`fd-type-badge ${post.post_type}`}>{POST_TYPE_LABELS[post.post_type]}</span>
                            {(post.tags || []).slice(0, 3).map((t: string, i: number) => (
                              <span key={i} className="fd-card-tag" onClick={(e) => { e.stopPropagation(); setActiveTag(t); }} style={{ cursor: "pointer" }}>{t}</span>
                            ))}
                          </div>
                          <div className="fd-card-title">{post.title}</div>
                          {post.professor_name && (
                            <div className="fd-card-title" style={{ fontSize: 14, color: "var(--sub)", fontWeight: 700, fontFamily: "'Syne',sans-serif", marginBottom: 4 }}>
                              {post.professor_name} — {post.professor_subject}
                            </div>
                          )}
                          {post.professor_rating && (
                            <div className="fd-card-stars">
                              <span className="stars">{renderStars(post.professor_rating)}</span>
                              <span className="rating">{post.professor_rating} / 5</span>
                            </div>
                          )}
                          <div className="fd-card-body-text">{post.body}</div>
                          {post.image_url && <img src={post.image_url} alt="" className="fd-card-img" />}
                          <div className="fd-card-footer">
                            {renderAuthor(post)}
                            <span className="fd-card-dot" />
                            <span className="fd-card-meta">{timeAgo(post.created_at)}</span>
                            <span className="fd-card-dot" />
                            <span className="fd-card-comments">💬 {post.comment_count || 0} comments</span>
                            <span className="fd-card-dot" />
                            <button className="fd-card-share" onClick={e => { e.stopPropagation(); handleShare(post.id); }}>↗ Share</button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="fd-sidebar">{renderSidebar()}</div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fd-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="fd-modal" onClick={e => e.stopPropagation()}>
            <div className="fd-modal-title">Create a Post</div>

            <label className="fd-modal-label">Post Type</label>
            <div className="fd-modal-type-btns">
              {Object.entries(POST_TYPE_LABELS).map(([key, label]) => (
                <button key={key} className={`fd-modal-type-btn ${modalType === key ? "active" : ""}`} onClick={() => setModalType(key)}>{label}</button>
              ))}
            </div>

            <label className="fd-modal-label">Title</label>
            <input className="fd-modal-input" placeholder="What's happening?" value={formTitle} onChange={e => setFormTitle(e.target.value)} />

            {modalType === "professor_rating" && (
              <>
                <label className="fd-modal-label">Professor Name</label>
                <input className="fd-modal-input" placeholder="e.g. Dr. Anand Sharma" value={formProfName} onChange={e => setFormProfName(e.target.value)} />
                <label className="fd-modal-label">Subject</label>
                <input className="fd-modal-input" placeholder="e.g. Data Structures & Algorithms" value={formProfSubject} onChange={e => setFormProfSubject(e.target.value)} />
                <label className="fd-modal-label">Rating</label>
                <div className="fd-modal-stars">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className="fd-modal-star" style={{ color: s <= formProfRating ? "#f59e0b" : "var(--muted)", cursor: "pointer" }} onClick={() => setFormProfRating(s)}>★</span>
                  ))}
                </div>
              </>
            )}

            {modalType === "meme" && (
              <>
                <label className="fd-modal-label">Meme Image URL</label>
                <input className="fd-modal-input" placeholder="https://..." value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} />
              </>
            )}

            <label className="fd-modal-label">Body</label>
            <textarea className="fd-modal-textarea" placeholder="Tell us more..." value={formBody} onChange={e => setFormBody(e.target.value)} />

            <label className="fd-modal-label">Tags</label>
            <input className="fd-modal-input" placeholder="Press Enter to add tags" value={formTagInput} onChange={e => setFormTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(formTagInput); } }} />
            {formTags.length > 0 && (
              <div className="fd-modal-tags">
                {formTags.map((t, i) => <span key={i} className="fd-modal-tag">{t}<button onClick={() => setFormTags(prev => prev.filter((_, j) => j !== i))}>×</button></span>)}
              </div>
            )}

            <div className="fd-modal-anon" onClick={() => setFormAnon(!formAnon)}>
              <div className={`fd-modal-anon-track ${formAnon ? "on" : ""}`}><div className="fd-modal-anon-thumb" /></div>
              <span className="fd-modal-anon-label">Post anonymously {formAnon ? "🎭" : ""}</span>
            </div>

            <div className="fd-modal-actions">
              <button className="fd-modal-submit" onClick={handleSubmit} disabled={submitting || !formTitle.trim()}>{submitting ? "Posting..." : "Post It"}</button>
              <button className="fd-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  /* ── Render helpers ── */
  function renderAuthor(post: any) {
    if (post.is_anonymous) {
      return (
        <div className="fd-card-author">
          <div className="fd-card-author-av" style={{ background: "rgba(167,139,250,0.15)", color: "var(--purple)" }}>🎭</div>
          <span className="fd-card-author-name">Anonymous</span>
        </div>
      );
    }
    const author = post.author;
    return (
      <div className="fd-card-author">
        <div className="fd-card-author-av" style={{ background: "rgba(158,240,26,0.15)", color: "var(--lime)" }}>
          {author?.avatar_url ? <img src={author.avatar_url} alt="" /> : getInitials(author?.full_name)}
        </div>
        <span className="fd-card-author-name">{author?.full_name?.split(" ").map((w: string, i: number) => i === 0 ? w : w[0] + ".").join(" ") || "User"}</span>
      </div>
    );
  }

  function renderSidebar() {
    return (
      <>
        {/* Leaderboard */}
        <div className="fd-sb-card">
          <div className="fd-sb-title">Top Contributors</div>
          {leaderboard.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>No data yet.</div>
          ) : (
            leaderboard.slice(0, 7).map((u, i) => {
              const rankColors = ["var(--lime)", "#f59e0b", "#fb923c"];
              const color = i < 3 ? rankColors[i] : "var(--muted)";
              const types = ["thread", "confession", "meme", "professor_rating"];
              return (
                <div key={u.id} className="fd-lb-item">
                  <div className="fd-lb-rank" style={{ color }}>{i + 1}</div>
                  <div className="fd-lb-av" style={{ background: POST_TYPE_BGS[types[i % 4]], color: POST_TYPE_COLORS[types[i % 4]] }}>{getInitials(u.full_name)}</div>
                  <div className="fd-lb-info">
                    <div className="fd-lb-name">{u.full_name}</div>
                    <div className="fd-lb-meta">{u.stream || ""}{u.year ? ` · ${u.year}` : ""}</div>
                  </div>
                  <div className="fd-lb-score" style={{ color }}>{u.score >= 1000 ? `${(u.score / 1000).toFixed(1)}k` : u.score}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Trending Tags */}
        <div className="fd-sb-card">
          <div className="fd-sb-title">Trending This Week</div>
          <div className="fd-trending-tags">
            {trendingTags.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>No trending tags yet.</div>
            ) : (
              trendingTags.map((tag, i) => <span key={i} className="fd-trending-tag" onClick={() => setActiveTag(tag)} style={{ cursor: "pointer" }}>#{tag}</span>)
            )}
          </div>
        </div>

        {/* Quick Post */}
        <div className="fd-sb-card">
          <div className="fd-sb-title" style={{ marginBottom: 6 }}>Quick Post</div>
          <div className="fd-qp-item" onClick={() => { setModalType("confession"); setFormAnon(true); setShowModal(true); }}>
            <div className="fd-qp-dot" style={{ background: "var(--purple)" }} />
            <span className="fd-qp-label">Post a confession anonymously</span>
          </div>
          <div className="fd-qp-item" onClick={() => { setModalType("professor_rating"); setShowModal(true); }}>
            <div className="fd-qp-dot" style={{ background: "var(--coral)" }} />
            <span className="fd-qp-label">Grade a professor</span>
          </div>
          <div className="fd-qp-item" onClick={() => { setModalType("meme"); setShowModal(true); }}>
            <div className="fd-qp-dot" style={{ background: "var(--cyan)" }} />
            <span className="fd-qp-label">Drop a meme</span>
          </div>
          <div className="fd-qp-item" onClick={() => { setModalType("thread"); setShowModal(true); }}>
            <div className="fd-qp-dot" style={{ background: "var(--lime)" }} />
            <span className="fd-qp-label">Start a thread</span>
          </div>
        </div>
      </>
    );
  }
}
