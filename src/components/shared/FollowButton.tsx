"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ targetUserId, className = "", onFollowChange }: FollowButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const checkFollowStatus = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", uid)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) {
        console.error("[FollowButton] checkFollowStatus query error:", error.message);
        setIsFollowing(false);
      } else {
        setIsFollowing(!!data);
      }
    } catch (err) {
      console.error("[FollowButton] checkFollowStatus error:", err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (user) {
      if (user.id !== targetUserId) {
        checkFollowStatus(user.id);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user, targetUserId, checkFollowStatus]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (user.id === targetUserId || actionInProgress) return;

    setActionInProgress(true);

    // Optimistic Update
    const wasFollowing = isFollowing;
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      if (wasFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        if (error) {
          console.error("[FollowButton] Unfollow error:", error.message);
          setIsFollowing(wasFollowing); // Revert on error
          return;
        }
        logActivity({ userId: user.id, activityType: "unfollow_user", targetId: targetUserId, targetType: "user" });
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (error) {
          console.error("[FollowButton] Follow error:", error.message);
          setIsFollowing(wasFollowing); // Revert on error
          return;
        }
        logActivity({ userId: user.id, activityType: "follow_user", targetId: targetUserId, targetType: "user" });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("activityUpdated"));
      }

      onFollowChange?.(nextState);
    } catch (err) {
      console.error("[FollowButton] handleFollow error:", err);
      setIsFollowing(wasFollowing); // Revert on error
    } finally {
      setActionInProgress(false);
    }
  };

  // Hide only for own profile (and only after we know who the user is)
  if (user && user.id === targetUserId) return null;

  // Determine button text
  let buttonText = "Follow";
  if (!loading) {
    if (isFollowing) {
      buttonText = isHovering ? "Unfollow" : "Following";
    } else {
      buttonText = "Follow";
    }
  }

  return (
    <button 
      className={`pf-btn-net-follow ${isFollowing ? "following" : ""} ${className}`}
      onClick={handleFollow}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      disabled={loading || actionInProgress}
      style={loading ? { opacity: 0.6 } : undefined}
    >
      {buttonText}
    </button>
  );
}
