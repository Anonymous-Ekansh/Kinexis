"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

interface Props {
  userId: string;
  onClose: () => void;
}

export default function ProfileCard({ userId, onClose }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ posts: 0, upvotes: 0 });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("users").select("id, full_name, avatar_url, stream, batch_year, bio, interests").eq("id", userId).single();
      if (data) setProfile(data);

      // Stats
      const { count: postCount } = await supabase.from("feed_posts").select("id", { count: "exact", head: true }).eq("user_id", userId);
      const { data: votes } = await supabase.from("feed_votes").select("post_id, vote").eq("vote", 1);
      const { data: userPosts } = await supabase.from("feed_posts").select("id").eq("user_id", userId);
      const postIds = new Set((userPosts || []).map((p: any) => p.id));
      const upvotes = (votes || []).filter((v: any) => postIds.has(v.post_id)).length;

      setStats({ posts: postCount || 0, upvotes });
    }
    load();
  }, [userId]);

  if (!profile) return null;

  return (
    <div className="msg-modal-overlay" onClick={onClose}>
      <div className="msg-profile-card" onClick={e => e.stopPropagation()}>
        <button className="msg-profile-close" onClick={onClose}>×</button>
        <div className="msg-profile-top">
          <div className="msg-profile-av" style={{ background: 'rgba(158,240,26,0.15)', color: 'var(--lime)' }}>
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt="" width={80} height={80} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : getInitials(profile.full_name)}
          </div>
          <div className="msg-profile-name">{profile.full_name || 'User'}</div>
          <div className="msg-profile-meta">{profile.stream || ''}{profile.year ? ` · ${profile.year}` : ''}</div>
        </div>
        {profile.bio && <div className="msg-profile-bio">{profile.bio}</div>}
        <div className="msg-profile-stats">
          <div className="msg-profile-stat"><span className="msg-profile-stat-num">{stats.posts}</span><span className="msg-profile-stat-label">Posts</span></div>
          <div className="msg-profile-stat"><span className="msg-profile-stat-num">{stats.upvotes}</span><span className="msg-profile-stat-label">Upvotes</span></div>
        </div>
        {profile.interests && profile.interests.length > 0 && (
          <div className="msg-profile-tags">
            {profile.interests.map((t: string, i: number) => <span key={i} className="msg-profile-tag">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}
