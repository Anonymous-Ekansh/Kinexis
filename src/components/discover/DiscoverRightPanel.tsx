"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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



export default function DiscoverRightPanel() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [people, setPeople] = useState<PersonDisplay[]>(FALLBACK_PEOPLE);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      try {
        const userId = user?.id || "";

        // Fetch current user's interests for matching
        let myInterests: string[] = [];
        if (userId) {
          const { data: me } = await supabase
            .from("users")
            .select("interests")
            .eq("id", userId)
            .single();
          myInterests = (me?.interests || []).map((t: string) => t.toLowerCase());
        }

        // Fetch other users (grab more to rank by interest overlap)
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, stream, year, interests")
          .neq("id", userId)
          .limit(30);

        if (!cancelled && users && users.length > 0) {
          // Score each user by number of matching interests
          const scored = users.map((u: any) => {
            const theirInterests = (u.interests || []).map((t: string) => t.toLowerCase());
            const matchCount = myInterests.length > 0
              ? theirInterests.filter((t: string) => myInterests.includes(t)).length
              : 0;
            return { ...u, matchCount };
          });

          // Sort by match count descending, then by name
          scored.sort((a: any, b: any) => b.matchCount - a.matchCount || (a.full_name || "").localeCompare(b.full_name || ""));

          const top3 = scored.slice(0, 3);
          const mapped: PersonDisplay[] = top3.map((u: any, i: number) => {
            // Show matching tags first, then others
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
          setPeople(mapped);
        }



        const todayISO = new Date().toISOString().split('T')[0];
        const { data: evData } = await supabase
          .from("events")
          .select("id, title, event_date, clubs:club_id(name, accent_color)")
          .gte("event_date", todayISO)
          .order("event_date", { ascending: true })
          .limit(3);
        if (!cancelled) {
          if (evData && evData.length > 0) {
            setEvents(evData.map((e: any) => {
              const d = new Date(e.event_date);
              return {
                id: e.id,
                day: d.getDate().toString(),
                month: d.toLocaleDateString("en-US", { month: "short" }),
                color: e.clubs?.accent_color === "cyan" ? "var(--cyan)" : e.clubs?.accent_color === "purple" ? "var(--purple)" : e.clubs?.accent_color === "coral" ? "var(--coral)" : "var(--lime)",
                name: e.title,
                org: e.clubs?.name || "Campus"
              };
            }));
          } else {
            setEvents([]);
          }
        }
      } catch {
        // Keep fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const navigateToProfile = (id: string) => {
    router.push(`/profile/${id}`);
  };

  return (
    <aside className="disc-right">
      {/* People like you, nearby */}
      <div className="disc-rp-label">PEOPLE LIKE YOU, NEARBY</div>
      <div className="disc-rp-people">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="disc-rp-person" style={{ opacity: 0.5 }}>
              <div className="pf-skeleton" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="pf-skeleton pf-skeleton-line" style={{ width: "70%", marginBottom: 4 }} />
                <div className="pf-skeleton pf-skeleton-line-sm" style={{ width: "50%" }} />
              </div>
            </div>
          ))
        ) : (
          people.map((p, i) => (
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
          ))
        )}
      </div>

      {/* Upcoming events */}
      <div className="disc-rp-label">UPCOMING EVENTS</div>
      <div className="disc-rp-events">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="disc-rp-event" style={{ opacity: 0.5 }}>
              <div className="pf-skeleton" style={{ width: 40, height: 44, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="pf-skeleton pf-skeleton-line" style={{ width: "70%", marginBottom: 4 }} />
                <div className="pf-skeleton pf-skeleton-line-sm" style={{ width: "45%" }} />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <div style={{ color: "var(--text-secondary, rgba(255,255,255,0.45))", fontSize: 13, padding: "12px 0" }}>No upcoming events</div>
        ) : (
          events.map((e, i) => (
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
