"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import FollowButton from "../shared/FollowButton";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  full_name: string;
  stream: string;
  year: string;
  batch_year: string;
  avatar_url: string;
  current_user_follows: boolean;
}

interface NetworkPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfileId: string;
  onFollowChange?: () => void;
}

export default function NetworkPanel({
  isOpen,
  onClose,
  initialProfileId,
  onFollowChange,
}: NetworkPanelProps) {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      fetchData();
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, initialProfileId]);

  async function fetchData() {
    setLoading(true);
    setCurrentUserId(user?.id || null);

    // Fetch Followers
    const { data: fers } = await supabase.rpc("get_followers", { 
      target_user_id: initialProfileId, 
      viewer_id: user?.id 
    });
    
    // Fetch Following
    const { data: fing } = await supabase.rpc("get_following", { 
      target_user_id: initialProfileId, 
      viewer_id: user?.id 
    });

    if (fers) setFollowers(fers);
    if (fing) setFollowing(fing);
    setLoading(false);
  }

  const toggleFollowInList = async (targetId: string, isCurrentlyFollowing: boolean, listType: "followers" | "following") => {
    if (!currentUserId) return;

    if (isCurrentlyFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", targetId);
      if (!error) {
        updateList(targetId, false);
        onFollowChange?.();
      }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: currentUserId, following_id: targetId });
      if (!error) {
        updateList(targetId, true);
        onFollowChange?.();
      }
    }
  };

  const updateList = (id: string, newVal: boolean) => {
    setFollowers(prev => prev.map(u => u.id === id ? { ...u, current_user_follows: newVal } : u));
    setFollowing(prev => prev.map(u => u.id === id ? { ...u, current_user_follows: newVal } : u));
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const content = (
    <div className="pf-network-panel-overlay" onClick={onClose}>
      <div className="pf-network-modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="pf-network-modal-h">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌐</span>
            <h2 className="pf-modal-title text-xl">Campus Network</h2>
          </div>
          <button className="pf-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="pf-network-grid-2">
          {/* FOLLOWERS COLUMN */}
          <div className="pf-network-col">
            <div className="pf-network-col-h">
              <span className="pf-network-col-title">Followers</span>
              <span className="pf-network-col-count">{followers.length}</span>
            </div>
            
            <div className="pf-network-scroll">
              {loading ? <Skeletons /> : followers.length === 0 ? (
                <EmptyState message="No followers yet. Start sharing your profile!" />
              ) : (
                followers.map(user => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    onFollowChange={onFollowChange}
                  />
                ))
              )}
            </div>
          </div>

          {/* FOLLOWING COLUMN */}
          <div className="pf-network-col border-l border-white/5">
            <div className="pf-network-col-h">
              <span className="pf-network-col-title">Following</span>
              <span className="pf-network-col-count">{following.length}</span>
            </div>
            
            <div className="pf-network-scroll">
              {loading ? <Skeletons /> : following.length === 0 ? (
                <EmptyState message="Not following anyone yet. Discover people on the home page!" />
              ) : (
                following.map(user => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    onFollowChange={onFollowChange}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function UserCard({ user, onFollowChange }: { user: User, onFollowChange?: () => void }) {
  return (
    <div className="pf-network-user-card group">
      <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="pf-network-av-lg">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="pf-network-name-lg truncate">{user.full_name}</div>
          <div className="pf-network-sub-lg truncate">{user.stream}</div>
          <div className="pf-network-sub-sm truncate text-white/30">{user.year} · {user.batch_year}</div>
        </div>
      </Link>
      
      <FollowButton 
        targetUserId={user.id} 
        onFollowChange={() => onFollowChange?.()}
      />
    </div>
  );
}

function Skeletons() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="pf-network-user-card pf-skeleton h-[72px]" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center opacity-40">
      <div className="text-3xl mb-3">🕸️</div>
      <div className="text-sm italic">{message}</div>
    </div>
  );
}
