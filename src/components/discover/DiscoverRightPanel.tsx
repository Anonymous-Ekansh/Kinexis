"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

/* ── Fallback data ── */
const FALLBACK_PEOPLE = [
  { id: "ff7d3892-d087-48d4-a83e-e9721a2bf722", initials: "NK", name: "Novesh kaushik", role: "Design · 2nd yr", bg: "var(--lime)", tags: ["ML", "Open Source"] },
  { id: "13e95aad-0ece-4d25-9823-de1ed95fad0e", initials: "NK", name: "Novesh Kaushik 1", role: "ECE · 3rd yr", bg: "var(--cyan)", tags: ["Embedded", "Python"] },
  { id: "ee4542f2-29fc-4b4c-9410-514d970fee1b", initials: "EK", name: "Ekansh", role: "Design · 1st yr", bg: "var(--purple)", tags: ["Figma", "Branding"] },
];

const ACCENT_COLORS = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

interface PersonDisplay {
  id: string;
  initials: string;
  name: string;
  role: string;
  bg: string;
  tags: string[];
}

export default function DiscoverRightPanel({ initialData, userId }: { initialData: any, userId: string }) {
  const router = useRouter();

  const people = useMemo(() => {
    if (!initialData?.initialRightPanelPeople || initialData.initialRightPanelPeople.length === 0) {
      return FALLBACK_PEOPLE;
    }
    const myInterests = initialData.initialPeopleMatched || [];
    return initialData.initialRightPanelPeople.map((u: any, i: number) => {
      const theirInterests: string[] = u.interests || [];
      const matching = theirInterests.filter((t: string) => myInterests.includes(t.toLowerCase()));
      const others = theirInterests.filter((t: string) => !myInterests.includes(t.toLowerCase()));
      const orderedTags = [...matching, ...others].slice(0, 2);

      return {
        id: u.id,
        initials: getInitials(u.full_name),
        name: u.full_name || "Unnamed",
        role: `${u.stream ? u.stream.slice(0, 12) : "Student"} · ${u.year || ""}`,
        bg: ACCENT_COLORS[i % ACCENT_COLORS.length],
        tags: orderedTags,
      };
    });
  }, [initialData?.initialRightPanelPeople, initialData?.initialPeopleMatched]);

  const events = useMemo(() => {
    if (!initialData?.initialEvents) return [];
    return initialData.initialEvents.slice(0, 3).map((e: any) => {
      const d = new Date(e.event_date);
      return {
        id: e.id,
        day: d.getDate().toString(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        color: e.clubs?.accent_color === "cyan" ? "var(--cyan)" : e.clubs?.accent_color === "purple" ? "var(--purple)" : e.clubs?.accent_color === "coral" ? "var(--coral)" : "var(--lime)",
        name: e.title,
        org: e.clubs?.name || "Campus"
      };
    });
  }, [initialData?.initialEvents]);

  const navigateToProfile = (id: string) => {
    router.push(`/profile/${id}`);
  };

  return (
    <aside className="disc-right">
      {/* People like you, nearby */}
      <div className="disc-rp-label">PEOPLE LIKE YOU, NEARBY</div>
      <div className="disc-rp-people">
        {people.map((p: any, i: number) => (
          <div key={i} className="disc-rp-person cursor-pointer" onClick={() => navigateToProfile(p.id)}>
            <div className="disc-rp-av" style={{ background: p.bg }}>{p.initials}</div>
            <div className="disc-rp-person-info">
              <div className="disc-rp-name">{p.name}</div>
              <div className="disc-rp-role">{p.role}</div>
              <div className="disc-rp-tags">
                {p.tags.map((t) => (
                  <span key={t} className="disc-rp-tag">{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div className="disc-rp-label">UPCOMING EVENTS</div>
      <div className="disc-rp-events">
        {events.length === 0 ? (
          <div style={{ color: "var(--text-secondary, rgba(255,255,255,0.45))", fontSize: 13, padding: "12px 0" }}>No upcoming events</div>
        ) : (
          events.map((e: any, i: number) => (
            <div key={e.id || i} className="disc-rp-event">
              <div className="disc-rp-event-date">
                <div className="disc-rp-event-day" style={{ color: e.color }}>{e.day}</div>
                <div className="disc-rp-event-month">{e.month}</div>
              </div>
              <div className="disc-rp-event-info">
                <div className="disc-rp-event-name">{e.name}</div>
                <div className="disc-rp-event-org">{e.org}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
