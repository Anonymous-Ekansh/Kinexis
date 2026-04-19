"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id ?? null;
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const followCheckVersionRef = useRef(0);

  const checkFollowStatus = useCallback(async (uid: string) => {
    const requestVersion = ++followCheckVersionRef.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", uid)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) {
        console.error("[FollowButton] checkFollowStatus query error:", error.message);
        if (followCheckVersionRef.current !== requestVersion) return;
        setIsFollowing(false);
      } else {
        if (followCheckVersionRef.current !== requestVersion) return;
        setIsFollowing(!!data);
      }
    } catch (err) {
      console.error("[FollowButton] checkFollowStatus error:", err);
    } finally {
      if (followCheckVersionRef.current !== requestVersion) return;
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (authLoading) {
      followCheckVersionRef.current += 1;
      setLoading(true);
      return;
    }

    if (currentUserId && currentUserId !== targetUserId) {
      checkFollowStatus(currentUserId);
      return;
    }

    followCheckVersionRef.current += 1;
    setIsFollowing(false);
    setLoading(false);
  }, [currentUserId, authLoading, targetUserId, checkFollowStatus]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (authLoading || loading || actionInProgress) return;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (user.id === targetUserId) return;

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
        if (error) throw error;
        logActivity({ userId: user.id, activityType: "unfollow_user", targetId: targetUserId, targetType: "user" });
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (error) throw error;
        logActivity({ userId: user.id, activityType: "follow_user", targetId: targetUserId, targetType: "user" });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("activityUpdated"));
      }

      onFollowChange?.(nextState);
      
      // Tell Next.js router to drop cached payloads for this route
      router.refresh();
    } catch (err: any) {
      console.warn("Follow failed:", err.message || err);
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
      type="button"
      className={`pf-btn-net-follow ${isFollowing ? "following" : ""} ${className}`}
      onClick={handleFollow}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      disabled={authLoading || loading || actionInProgress}
      style={authLoading || loading ? { opacity: 0.6 } : undefined}
    >
      {buttonText}
    </button>
  );
}
