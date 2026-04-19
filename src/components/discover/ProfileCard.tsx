"use client";

import { useRouter } from "next/navigation";
import FollowButton from "../shared/FollowButton";

interface ProfileCardProps {
  id: string;
  initials: string;
  name: string;
  batch: string;
  vibe: string;
  vibeBg: string;
  vibeColor: string;
  tags: string[];
  accent: string;
  online?: boolean;
}

export default function ProfileCard({
  id,
  initials,
  name,
  batch,
  vibe,
  vibeBg,
  vibeColor,
  tags,
  accent,
  online = true,
}: ProfileCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/profile/${id}`);
  };

  return (
    <div className="disc-pcard cursor-pointer" style={{ borderLeftColor: accent }} onClick={handleCardClick}>
      <div className="disc-pcard-top">
        <div className="disc-pcard-av" style={{ background: accent }}>{initials}</div>
        <div>
          <div className="disc-pcard-name">{name}</div>
          <div className="disc-pcard-batch">{batch}</div>
        </div>
      </div>
      <div className="disc-pcard-vibe" style={{ background: vibeBg, color: vibeColor }}>
        ◈ {vibe}
      </div>
      <div className="disc-pcard-tags">
        {tags.map((t) => (
          <span key={t} className="disc-pcard-tag">{t}</span>
        ))}
      </div>
      {online && (
        <div className="disc-pcard-status">
          <span className="disc-pcard-online-dot" />
          Active now
        </div>
      )}
      <FollowButton 
        targetUserId={id} 
        className="disc-pcard-connect" 
      />
    </div>
  );
}
