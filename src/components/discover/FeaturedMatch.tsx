"use client";

import { useState } from "react";

interface FeaturedProfile {
  initials: string;
  name: string;
  role: string;
  vibe: string;
  match: number;
  bg: string;
  tags: string[];
  icebreaker: string;
}

const FALLBACK_PROFILES: FeaturedProfile[] = [
  {
    initials: "AR",
    name: "Aanya Rao",
    role: "CS · 3rd yr · IIT Delhi",
    vibe: "Both into ML + Hackathons",
    match: 94,
    bg: "var(--lime)",
    tags: ["Machine Learning", "React", "Python", "Looking for team"],
    icebreaker:
      "💬 Icebreaker: Ask Aanya about her CNN-based plant disease detection project — she's looking for a backend dev.",
  },
  {
    initials: "RK",
    name: "Rohan Kapoor",
    role: "Design · 2nd yr · NID",
    vibe: "Both into Design + Startups",
    match: 88,
    bg: "var(--cyan)",
    tags: ["UI/UX", "Figma", "Design Systems", "Looking for team"],
    icebreaker:
      "💬 Icebreaker: Rohan redesigned his campus app for 2k users — ask about his Figma component library.",
  },
  {
    initials: "VN",
    name: "Vikram Nair",
    role: "ECE · 3rd yr · BITS",
    vibe: "Both into Embedded + Robotics",
    match: 82,
    bg: "var(--purple)",
    tags: ["Embedded", "ROS", "C++", "Open Source"],
    icebreaker:
      "💬 Icebreaker: Vikram built an autonomous drone for his final year project — ask about sensor fusion.",
  },
  {
    initials: "SM",
    name: "Sara Mehta",
    role: "BMS · 4th yr · SRCC",
    vibe: "Both into Product + GTM strategy",
    match: 79,
    bg: "var(--coral)",
    tags: ["Product", "GTM", "Finance", "Startup"],
    icebreaker:
      "💬 Icebreaker: Sara launched a D2C skincare brand in college — ask her about go-to-market strategy.",
  },
];

const ACCENT_COLORS = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function buildProfiles(users: any[]): FeaturedProfile[] {
  if (!users || users.length === 0) return FALLBACK_PROFILES;
  
  const mapped: FeaturedProfile[] = users.slice(0, 4).map((u: any, i: number) => ({
    initials: getInitials(u.full_name),
    name: u.full_name || "Unnamed",
    role: `${u.stream ? u.stream.slice(0, 15) : "Student"} · ${u.year || ""}`,
    vibe: u.currently_focused_on || "Exploring interests",
    match: Math.floor(70 + Math.random() * 25),
    bg: ACCENT_COLORS[i % ACCENT_COLORS.length],
    tags: [...(u.interests || []).slice(0, 3), ...((u.looking_for || []).includes("Hackathon team") ? ["Looking for team"] : [])],
    icebreaker: u.currently_focused_on
      ? `💬 Icebreaker: Ask ${u.full_name?.split(" ")[0] || "them"} about ${u.currently_focused_on.toLowerCase()}.`
      : `💬 Icebreaker: Say hi to ${u.full_name?.split(" ")[0] || "them"} and discover shared interests!`,
  }));
  // Fill up to 4 with fallback
  const remaining = FALLBACK_PROFILES.slice(mapped.length);
  return [...mapped, ...remaining].slice(0, 4);
}

interface FeaturedMatchProps {
  users?: any[];
}

export default function FeaturedMatch({ users }: FeaturedMatchProps) {
  const [profiles] = useState<FeaturedProfile[]>(() => buildProfiles(users || []));
  const [idx, setIdx] = useState(0);

  const p = profiles[idx];
  const next = () => setIdx((prev) => (prev + 1) % profiles.length);

  return (
    <div className="disc-featured">
      <div className="disc-featured-grid" />
      <div className="disc-featured-glow" />
      <div className="disc-featured-inner">
        <div className="disc-featured-av-wrap">
          <div className="disc-featured-av" style={{ background: p.bg }}>{p.initials}</div>
          <span className="disc-featured-match-pct">{p.match}% match</span>
        </div>
        <div className="disc-featured-body">
          <div className="disc-featured-name">{p.name}</div>
          <div className="disc-featured-role">{p.role}</div>
          <div className="disc-featured-vibe">◈ {p.vibe}</div>
          <div className="disc-featured-tags">
            {p.tags.map((t) => (
              <span
                key={t}
                className={`disc-featured-tag${t === "Looking for team" ? " disc-featured-tag-special" : ""}`}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="disc-featured-ice">{p.icebreaker}</div>
          <div className="disc-featured-actions">
            <button className="disc-featured-btn-connect">Follow</button>
            <button className="disc-featured-btn-skip" onClick={next}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
