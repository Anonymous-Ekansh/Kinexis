"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { useAuth } from "@/contexts/AuthContext";

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ targetUserId, className = "", onFollowChange }: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const checkFollowStatus = useCallback(async (uid: string) => {
    const { data } = await supabase.rpc("is_following", { 
      f_id: uid, 
      t_id: targetUserId 
    });
    setIsFollowing(!!data);
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    if (user) {
      setCurrentUserId(user.id);
      if (user.id !== targetUserId) {
        checkFollowStatus(user.id);
      } else {
        setLoading(false);
      }
    } else {
      setCurrentUserId(null);
      setLoading(false);
    }
  }, [user, targetUserId, checkFollowStatus]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }

    if (currentUserId === targetUserId) return;

    // Optimistic Update
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId);
      logActivity({ userId: currentUserId, activityType: "unfollow_user", targetId: targetUserId, targetType: "user" });
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: targetUserId });
      logActivity({ userId: currentUserId, activityType: "follow_user", targetId: targetUserId, targetType: "user" });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("activityUpdated"));
    }

    onFollowChange?.(nextState);
  };

  // Hide only for own profile
  if (currentUserId && currentUserId === targetUserId) return null;

  return (
    <button 
      className={`pf-btn-net-follow ${isFollowing ? "following" : ""} ${className}`}
      onClick={handleFollow}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      disabled={loading}
      style={loading ? { opacity: 0.6 } : undefined}
    >
      {loading ? "Follow" : isFollowing ? (isHovering ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}

