"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
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
  const [resolvedUser, setResolvedUser] = useState<User | null>(user ?? null);
  const effectiveUser = user ?? resolvedUser;
  const currentUserId = effectiveUser?.id ?? null;
  const authPending = authLoading && !currentUserId;
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const followCheckVersionRef = useRef(0);

  useEffect(() => {
    if (user) {
      setResolvedUser(user);
    }
  }, [user]);

  useEffect(() => {
    if (user || authLoading) return;

    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!cancelled) {
        setResolvedUser(authUser ?? null);
      }
    }).catch((err) => {
      console.warn("[FollowButton] auth fallback error:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const checkFollowStatus = useCallback(async (uid: string) => {
    const requestVersion = ++followCheckVersionRef.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", uid)
        .eq("following_id", targetUserId)
        .limit(1);

      if (error) {
        console.error("[FollowButton] checkFollowStatus query error:", error.message);
        if (followCheckVersionRef.current !== requestVersion) return;
        setIsFollowing(false);
      } else {
        if (followCheckVersionRef.current !== requestVersion) return;
        setIsFollowing((data?.length || 0) > 0);
      }
    } catch (err) {
      console.error("[FollowButton] checkFollowStatus error:", err);
    } finally {
      if (followCheckVersionRef.current !== requestVersion) return;
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (authPending) {
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
  }, [currentUserId, authPending, targetUserId, checkFollowStatus]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (authPending || loading || actionInProgress) return;

    let actingUser = effectiveUser;

    if (!actingUser) {
      const { data: { user: fallbackUser } } = await supabase.auth.getUser();
      if (fallbackUser) {
        setResolvedUser(fallbackUser);
        actingUser = fallbackUser;
      }
    }

    if (!actingUser) {
      window.location.href = "/login";
      return;
    }

    if (actingUser.id === targetUserId) return;

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
          .eq("follower_id", actingUser.id)
          .eq("following_id", targetUserId);
        if (error) throw error;
        logActivity({ userId: actingUser.id, activityType: "unfollow_user", targetId: targetUserId, targetType: "user" });
      } else {
        const { data: existingFollow, error: existingError } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", actingUser.id)
          .eq("following_id", targetUserId)
          .limit(1);

        if (existingError) throw existingError;

        if (!existingFollow || existingFollow.length === 0) {
          const { error } = await supabase
            .from("follows")
            .insert({ follower_id: actingUser.id, following_id: targetUserId });
          if (error) throw error;
        }

        logActivity({ userId: actingUser.id, activityType: "follow_user", targetId: targetUserId, targetType: "user" });
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
  if (effectiveUser && effectiveUser.id === targetUserId) return null;

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
      disabled={authPending || loading || actionInProgress}
      style={authPending || loading ? { opacity: 0.6 } : undefined}
    >
      {buttonText}
    </button>
  );
}
