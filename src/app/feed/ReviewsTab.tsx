"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import "./reviews.css";

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

/* ── Star Rating Picker ── */
function StarPicker({ value, onChange, size = 24 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="rv-star-picker">
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          className={`rv-star ${s <= (hover || value) ? "filled" : ""}`}
          style={{ fontSize: size }}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/* ── Star Display ── */
function StarDisplay({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="rv-stars-display" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={s <= rating ? "rv-star-on" : "rv-star-off"}>★</span>
      ))}
      <span className="rv-rating-num">{rating}/5</span>
    </span>
  );
}

/* ═══════════════════════════════════
   MAIN REVIEWS TAB COMPONENT
   ═══════════════════════════════════ */
export default function ReviewsTab({ userId }: { userId: string }) {
  const [section, setSection] = useState<"cafes" | "courses" | "campus">("cafes");

  return (
    <div className="rv-wrap">
      {/* Sub-section pill switcher */}
      <div className="rv-pills">
        {([
          { key: "cafes" as const, label: "☕ Cafes", emoji: "☕" },
          { key: "courses" as const, label: "📚 CCC Courses", emoji: "📚" },
          { key: "campus" as const, label: "🏫 Campus Things", emoji: "🏫" },
        ]).map(p => (
          <button
            key={p.key}
            className={`rv-pill ${section === p.key ? "active" : ""}`}
            onClick={() => setSection(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {section === "cafes" && <CafesSection userId={userId} />}
      {section === "courses" && <CoursesSection userId={userId} />}
      {section === "campus" && <CampusSection userId={userId} />}
    </div>
  );
}

/* ═══════════════════════════════════
   CAFES SECTION
   ═══════════════════════════════════ */
function CafesSection({ userId }: { userId: string }) {
  const [cafes, setCafes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  /* Form state */
  const [formRating, setFormRating] = useState(0);
  const [formBody, setFormBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Fetch cafes */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("cafes").select("*").order("name");
      setCafes(data || []);
      setLoading(false);
    })();
  }, []);

  /* Fetch posts for selected cafe */
  const fetchPosts = useCallback(async (cafeId: string) => {
    setPostsLoading(true);
    const { data } = await supabase
      .from("cafe_posts")
      .select("*")
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const uids = [...new Set(data.map((p: any) => p.user_id).filter(Boolean))];
      let userMap: Record<string, any> = {};
      if (uids.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name, avatar_url").in("id", uids);
        if (users) users.forEach(u => { userMap[u.id] = u; });
      }
      setPosts(data.map((p: any) => ({ ...p, author: userMap[p.user_id] || null })));
    } else {
      setPosts([]);
    }
    setPostsLoading(false);
  }, []);

  const openCafe = (cafe: any) => {
    setSelectedCafe(cafe);
    fetchPosts(cafe.id);
  };

  /* Submit post */
  const handleSubmit = async () => {
    if (!formBody.trim() || formRating === 0 || !selectedCafe) return;
    setSubmitting(true);
    const { error } = await supabase.from("cafe_posts").insert({
      cafe_id: selectedCafe.id,
      user_id: userId,
      rating: formRating,
      body: formBody,
    });
    setSubmitting(false);
    if (error) { alert("Failed: " + error.message); return; }
    setFormRating(0);
    setFormBody("");
    fetchPosts(selectedCafe.id);
  };

  /* Calculate avg rating for a cafe from its posts */
  const getCafeStats = (cafeId: string) => {
    // We only have stats when viewing posts — for the grid we show review_count from the table
    return null;
  };

  if (loading) {
    return <div className="rv-loading">Loading cafes...</div>;
  }

  /* ── Thread view for a single cafe ── */
  if (selectedCafe) {
    const avgRating = posts.length > 0 ? Math.round(posts.reduce((sum, p) => sum + p.rating, 0) / posts.length * 10) / 10 : 0;
    return (
      <div className="rv-thread-wrap">
        <button className="rv-back" onClick={() => { setSelectedCafe(null); setPosts([]); }}>← Back to cafes</button>
        
        <div className="rv-cafe-hero">
          <div className="rv-cafe-hero-icon">☕</div>
          <div className="rv-cafe-hero-info">
            <div className="rv-cafe-hero-name">{selectedCafe.name}</div>
            <div className="rv-cafe-hero-loc">{selectedCafe.location}</div>
            {selectedCafe.description && <div className="rv-cafe-hero-desc">{selectedCafe.description}</div>}
          </div>
          <div className="rv-cafe-hero-stats">
            {posts.length > 0 && (
              <>
                <div className="rv-hero-avg">{avgRating}</div>
                <StarDisplay rating={Math.round(avgRating)} size={14} />
                <div className="rv-hero-count">{posts.length} review{posts.length !== 1 ? "s" : ""}</div>
              </>
            )}
          </div>
        </div>

        {/* Write a post form */}
        <div className="rv-form-card">
          <div className="rv-form-title">Write a review</div>
          <StarPicker value={formRating} onChange={setFormRating} size={28} />
          <textarea
            className="rv-form-textarea"
            placeholder="Share your experience..."
            value={formBody}
            onChange={e => setFormBody(e.target.value)}
          />
          <button
            className="rv-form-submit"
            onClick={handleSubmit}
            disabled={submitting || !formBody.trim() || formRating === 0}
          >
            {submitting ? "Posting..." : "Post Review"}
          </button>
        </div>

        {/* Posts list */}
        <div className="rv-posts-list">
          {postsLoading ? (
            <div className="rv-loading">Loading reviews...</div>
          ) : posts.length === 0 ? (
            <div className="rv-empty">No reviews yet — be the first to share your thoughts!</div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="rv-post-card">
                <div className="rv-post-header">
                  <div className="rv-post-avatar" style={{ background: "rgba(158,240,26,0.15)", color: "var(--lime)" }}>
                    {getInitials(post.author?.full_name)}
                  </div>
                  <div className="rv-post-author-info">
                    <span className="rv-post-author">{post.author?.full_name || "User"}</span>
                    <span className="rv-post-time">{timeAgo(post.created_at)}</span>
                  </div>
                  <StarDisplay rating={post.rating} />
                </div>
                <div className="rv-post-body">{post.body}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  /* ── Cafes grid ── */
  return (
    <div className="rv-cafes-grid">
      {cafes.length === 0 ? (
        <div className="rv-empty">No cafes found.</div>
      ) : (
        cafes.map((cafe, i) => {
          const accents = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];
          const bgs = ["rgba(158,240,26,0.12)", "rgba(34,211,238,0.12)", "rgba(167,139,250,0.12)", "rgba(251,113,133,0.12)"];
          const accent = accents[i % 4];
          const bg = bgs[i % 4];
          const emojis = ["☕", "🍵", "🧁", "🍕", "🥪", "🍳", "🌯", "🥤", "🍕", "🍚", "🍦"];
          return (
            <div
              key={cafe.id}
              className="rv-cafe-card"
              style={{ "--cafe-accent": accent } as React.CSSProperties}
              onClick={() => openCafe(cafe)}
            >
              <div className="rv-cafe-emoji" style={{ background: bg, color: accent }}>
                {emojis[i % emojis.length]}
              </div>
              <div className="rv-cafe-name">{cafe.name}</div>
              <div className="rv-cafe-loc">{cafe.location}</div>
              {cafe.description && (
                <div className="rv-cafe-desc">{cafe.description}</div>
              )}
              <div className="rv-cafe-footer">
                <span className="rv-cafe-cta" style={{ color: accent }}>View reviews →</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   COURSES SECTION
   ═══════════════════════════════════ */
function CoursesSection({ userId }: { userId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  /* Form state */
  const [formTitle, setFormTitle] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [formBody, setFormBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("course_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const uids = [...new Set(data.map((r: any) => r.user_id).filter(Boolean))];
      let userMap: Record<string, any> = {};
      if (uids.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name, avatar_url").in("id", uids);
        if (users) users.forEach(u => { userMap[u.id] = u; });
      }
      setReviews(data.map((r: any) => ({ ...r, author: userMap[r.user_id] || null })));
    } else {
      setReviews([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formBody.trim() || formRating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("course_reviews").insert({
      user_id: userId,
      course_title: formTitle,
      rating: formRating,
      body: formBody,
    });
    setSubmitting(false);
    if (error) { alert("Failed: " + error.message); return; }
    setFormTitle("");
    setFormRating(0);
    setFormBody("");
    setShowForm(false);
    fetchReviews();
  };

  if (loading) return <div className="rv-loading">Loading course reviews...</div>;

  return (
    <div>
      <div className="rv-section-header">
        <div>
          <div className="rv-section-title">CCC Course Reviews</div>
          <div className="rv-section-sub">Honest reviews from students who&apos;ve been through it.</div>
        </div>
        <button className="rv-add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Review a course"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rv-form-card" style={{ marginBottom: 20 }}>
          <div className="rv-form-title">Review a course</div>
          <label className="rv-form-label">Course Title</label>
          <input
            className="rv-form-input"
            placeholder="e.g. Data Structures & Algorithms"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
          />
          <label className="rv-form-label">Your Rating</label>
          <StarPicker value={formRating} onChange={setFormRating} size={28} />
          <label className="rv-form-label">Your Review</label>
          <textarea
            className="rv-form-textarea"
            placeholder="What did you think of this course?"
            value={formBody}
            onChange={e => setFormBody(e.target.value)}
          />
          <button
            className="rv-form-submit"
            onClick={handleSubmit}
            disabled={submitting || !formTitle.trim() || !formBody.trim() || formRating === 0}
          >
            {submitting ? "Posting..." : "Submit Review"}
          </button>
        </div>
      )}

      {/* Reviews list */}
      <div className="rv-reviews-list">
        {reviews.length === 0 ? (
          <div className="rv-empty">No course reviews yet. Be the first to share!</div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="rv-review-card">
              <div className="rv-review-top">
                <div className="rv-review-badge course">📚 Course</div>
                <StarDisplay rating={review.rating} />
              </div>
              <div className="rv-review-title">{review.course_title}</div>
              <div className="rv-review-body">{review.body}</div>
              <div className="rv-review-footer">
                <div className="rv-review-author-wrap">
                  <div className="rv-post-avatar small" style={{ background: "rgba(34,211,238,0.15)", color: "var(--cyan)" }}>
                    {getInitials(review.author?.full_name)}
                  </div>
                  <span className="rv-review-author">{review.author?.full_name || "User"}</span>
                </div>
                <span className="rv-review-time">{timeAgo(review.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   CAMPUS THINGS SECTION
   ═══════════════════════════════════ */
function CampusSection({ userId }: { userId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  /* Form state */
  const [formTitle, setFormTitle] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [formBody, setFormBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("campus_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const uids = [...new Set(data.map((r: any) => r.user_id).filter(Boolean))];
      let userMap: Record<string, any> = {};
      if (uids.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name, avatar_url").in("id", uids);
        if (users) users.forEach(u => { userMap[u.id] = u; });
      }
      setReviews(data.map((r: any) => ({ ...r, author: userMap[r.user_id] || null })));
    } else {
      setReviews([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formBody.trim() || formRating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("campus_reviews").insert({
      user_id: userId,
      title: formTitle,
      rating: formRating,
      body: formBody,
    });
    setSubmitting(false);
    if (error) { alert("Failed: " + error.message); return; }
    setFormTitle("");
    setFormRating(0);
    setFormBody("");
    setShowForm(false);
    fetchReviews();
  };

  if (loading) return <div className="rv-loading">Loading campus reviews...</div>;

  return (
    <div>
      <div className="rv-section-header">
        <div>
          <div className="rv-section-title">Campus Things</div>
          <div className="rv-section-sub">Rate anything on campus — facilities, services, experiences.</div>
        </div>
        <button className="rv-add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Write a review"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rv-form-card" style={{ marginBottom: 20 }}>
          <div className="rv-form-title">Review something on campus</div>
          <label className="rv-form-label">What are you reviewing?</label>
          <input
            className="rv-form-input"
            placeholder="e.g. Library Wi-Fi, Hostel Laundry, Sports Complex"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
          />
          <label className="rv-form-label">Your Rating</label>
          <StarPicker value={formRating} onChange={setFormRating} size={28} />
          <label className="rv-form-label">Your Review</label>
          <textarea
            className="rv-form-textarea"
            placeholder="Tell us about your experience..."
            value={formBody}
            onChange={e => setFormBody(e.target.value)}
          />
          <button
            className="rv-form-submit"
            onClick={handleSubmit}
            disabled={submitting || !formTitle.trim() || !formBody.trim() || formRating === 0}
          >
            {submitting ? "Posting..." : "Submit Review"}
          </button>
        </div>
      )}

      {/* Reviews list */}
      <div className="rv-reviews-list">
        {reviews.length === 0 ? (
          <div className="rv-empty">No campus reviews yet. Be the first to share!</div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="rv-review-card">
              <div className="rv-review-top">
                <div className="rv-review-badge campus">🏫 Campus</div>
                <StarDisplay rating={review.rating} />
              </div>
              <div className="rv-review-title">{review.title}</div>
              <div className="rv-review-body">{review.body}</div>
              <div className="rv-review-footer">
                <div className="rv-review-author-wrap">
                  <div className="rv-post-avatar small" style={{ background: "rgba(167,139,250,0.15)", color: "var(--purple)" }}>
                    {getInitials(review.author?.full_name)}
                  </div>
                  <span className="rv-review-author">{review.author?.full_name || "User"}</span>
                </div>
                <span className="rv-review-time">{timeAgo(review.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
