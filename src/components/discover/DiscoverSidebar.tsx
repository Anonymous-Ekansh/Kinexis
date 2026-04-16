"use client";

import { useState } from "react";
import Link from "next/link";

const SIDEBAR_LINKS = [
  { id: "foryou", icon: "◉", label: "For You", badge: "12 new" },
  { id: "people", icon: "◎", label: "People" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function formatActivityDescription(act: any): string {
  if (act.description) return act.description;
  const targetName = act.metadata?.target_name || act.title || "something";
  const actorName = act.users?.full_name || "Someone";
  switch (act.type) {
    case 'follow': return `${actorName} followed you`;
    case 'event_rsvp': return `${actorName} RSVP'd to ${targetName}`;
    case 'new_post': return `${actorName} posted in ${targetName}`;
    case 'club_join': return `${actorName} joined ${targetName}`;
    default: return `${actorName} interacted with ${targetName}`;
  }
}

interface Props {
  activeSection?: string;
  onSectionChange?: (id: string) => void;
  userId?: string;
  initialActivity?: any[];
}

export default function DiscoverSidebar({ activeSection = "foryou", onSectionChange, userId, initialActivity = [] }: Props) {
  const [activeLink, setActiveLink] = useState(activeSection);
  const activity = (initialActivity || []).slice(0, 5);

  return (
    <aside className="disc-sidebar">
      {/* Discover nav */}
      <div className="disc-sb-label">DISCOVER</div>
      <div className="disc-sb-links">
        {SIDEBAR_LINKS.map((l) => (
          <button
            key={l.id}
            className={`disc-sb-link${activeLink === l.id ? " active" : ""}`}
            onClick={() => { setActiveLink(l.id); onSectionChange?.(l.id); }}
          >
            <span className="disc-sb-link-icon">{l.icon}</span>
            {l.label}
            {l.badge && <span className="disc-sb-badge">{l.badge}</span>}
          </button>
        ))}
      </div>

      <div className="disc-sb-divider" />

      {/* Activity */}
      <div className="disc-sb-label">ACTIVITY</div>
      <div className="disc-sb-activity">
        {activity.length > 0 ? (
          activity.map((a: any, i: number) => (
            <div key={a.id || i} className="disc-sb-act-item">
              <div className="disc-sb-act-icon" style={{ background: "rgba(158,240,26,.12)" }}>⚡</div>
              <div>
                <div className="disc-sb-act-text">{formatActivityDescription(a)}</div>
                <div className="disc-sb-act-time">{timeAgo(a.created_at)}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 13, color: "var(--sub)", padding: "10px 0", textAlign: "center" }}>No recent activity</div>
        )}
      </div>

      <div className="disc-sb-divider" />

      {/* My Campus */}
      <div className="disc-sb-label">MY CAMPUS</div>
      <div className="disc-sb-links">
        {userId ? (
          <Link href={`/profile/${userId}`} prefetch={false} className="disc-sb-link" style={{ textDecoration: "none" }}>
            <span className="disc-sb-link-icon">◌</span> My Profile
          </Link>
        ) : (
          <button className="disc-sb-link">
            <span className="disc-sb-link-icon">◌</span> My Profile
          </button>
        )}
        <button className="disc-sb-link">
          <span className="disc-sb-link-icon">◎</span> My Connections
        </button>
      </div>

    </aside>
  );
}
