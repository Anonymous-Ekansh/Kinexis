"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function FollowButton({ targetUserId, className = "", onFollowChange }: {
  targetUserId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user || user.id === targetUserId) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      if (!cancelled) {
        setIsFollowing(!!data);
        setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [targetUserId]);

  if (!loading && (!userId || userId === targetUserId)) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId || busy) return;
    setBusy(true);
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (isFollowing) {
        await supabase.from("follows").delete()
          .eq("follower_id", userId).eq("following_id", targetUserId);
      } else {
        await supabase.from("follows").insert(
          { follower_id: userId, following_id: targetUserId }
        );
      }
      onFollowChange?.(next);
    } catch {
      setIsFollowing(!next); // revert
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={`pf-btn-net-follow ${isFollowing ? "following" : ""} ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading || busy}
      style={loading ? { opacity: 0.5 } : undefined}
    >
      {loading ? "..." : isFollowing ? (hover ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}
