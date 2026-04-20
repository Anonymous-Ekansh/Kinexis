"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./events.css";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function InterestButton({ eventId, userId, initialCount, initialInterested }: { eventId: string; userId: string; initialCount: number; initialInterested: boolean }) {
  const router = useRouter();
  const [isInterested, setIsInterested] = useState(initialInterested);
  const [count, setCount] = useState(initialCount);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;

    const wasInterested = isInterested;
    
    // Optimistic Update
    setIsInterested(!wasInterested);
    setCount(prev => wasInterested ? prev - 1 : prev + 1);

    if (wasInterested) {
      // Remove interest
      const { error } = await supabase
        .from('event_interest')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase error:', error.message, error.code, error.details);
        // Revert UI on error
        setIsInterested(true);
        setCount(prev => prev + 1);
        return;
      }
    } else {
      // Add interest
      const { error } = await supabase
        .from('event_interest')
        .insert({ event_id: eventId, user_id: userId });

      if (error) {
        console.error('Supabase error:', error.message, error.code, error.details);
        // Revert UI on error
        setIsInterested(false);
        setCount(prev => prev - 1);
        return;
      }
    }
    
    // Invalidate Next.js router cache to ensure subsequent navigations are fresh
    router.refresh();
  };

  return (
    <button 
      className={`btn-ec ${isInterested ? 'filled coral' : 'purple'}`} 
      onClick={handleToggle}
    >
      Interested {count > 0 ? `· ${count}` : ''}
    </button>
  );
}

export default function EventsPageClient({ userId, initialData }: { userId: string, initialData: any }) {
  const [allEvents, setAllEvents] = useState<any[]>(initialData?.initialEvents || []);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [organizerMap, setOrganizerMap] = useState<Record<string, string>>(initialData?.initialOrganizerMap || {});
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set(initialData?.initialInterestedIds || []));

  const handleShare = (ev: any) => {
    const url = `${window.location.origin}/events?id=${ev.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Event link copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  };


  const filteredEvents = useMemo(() => {
    let result = allEvents;

    // Filter Chips
    if (activeFilter !== "All") {
      result = result.filter(e => {
        const tags = [
          ...(e.metadata?.tags || []),
          ...(e.event_tags || []).map((t: any) => t.tag)
        ].map((t: string) => (t || "").toLowerCase());
        
        const cat = e.event_type?.toLowerCase() || e.type?.toLowerCase() || "";
        const f = activeFilter.toLowerCase();
        
        if (f === "this week") {
          const d = new Date(e.event_date);
          const now = new Date();
          const p = now.getDay();
          const diff = p === 0 ? 6 : p - 1; // days since monday
          const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
          const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
          return d >= monday && d <= sunday;
        }
        
        if (f === "free") return tags.includes("free entry") || tags.includes("free");
        return tags.includes(f) || cat.includes(f);
      });
    }

    // Search input
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        (e.title && e.title.toLowerCase().includes(q)) || 
        (e.body && e.body.toLowerCase().includes(q)) || 
        (e.description && e.description.toLowerCase().includes(q))
      );
    }
    
    // Calendar date selection
    if (selectedDate) {
      result = result.filter(e => {
        const d = new Date(e.event_date);
        const eDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return eDateStr === selectedDate;
      });
    }

    return result;
  }, [allEvents, activeFilter, searchQuery, selectedDate]);

  const featuredEvent = useMemo(() => {
    if (allEvents.length === 0) return null;
    return allEvents.find(e => e.is_featured) || allEvents[0];
  }, [allEvents]);

  const featuredEventId = featuredEvent?.id;

  const upcomingList = useMemo(() => {
    if (!featuredEventId) return filteredEvents;
    return filteredEvents.filter(e => String(e.id) !== String(featuredEventId));
  }, [filteredEvents, featuredEventId]);

  const thisWeekEvents = useMemo(() => {
    const now = new Date();
    const p = now.getDay();
    const diff = p === 0 ? 6 : p - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    
    return allEvents.filter(e => {
      const d = new Date(e.event_date);
      return d >= monday && d <= sunday;
    });
  }, [allEvents]);

  const getEventDates = useMemo(() => {
    const dates = new Set<string>();
    allEvents.forEach(e => {
      if (!e.event_date) return;
      const d = new Date(e.event_date);
      const eDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.add(eDateStr);
    });
    return dates;
  }, [allEvents]);

  const { calendarDays } = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay(); 
    
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remainingDays = 42 - days.length; 
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return { calendarDays: days };
  }, []);

  // Sidebar active days mapping
  const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const tzOffset = 5.5 * 60 * 60 * 1000; // +05:30

  // formatTime removed inline directly

  function formatDate(iso: string) {
    if (!iso) return { day: "", month: "", weekday: "", full: "" };
    const d = new Date(iso);
    return {
      day: d.getDate().toString(),
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
      full: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    };
  }

  const getCategoryDetails = (ev: any) => {
    const raw = ev.event_type || ev.type || ev.event_tags?.[0]?.tag || "Social";
    const name = typeof raw === 'string' ? raw.toLowerCase() : "";
    if (name.includes("technical") || name.includes("hackathon")) return { label: raw, cls: "lime", hex: "var(--lime)" };
    if (name.includes("cultural") || name.includes("performance")) return { label: raw, cls: "coral", hex: "var(--coral)" };
    if (name.includes("talk") || name.includes("tedx") || name.includes("speaker")) return { label: raw, cls: "purple", hex: "var(--purple)" };
    if (name.includes("workshop")) return { label: raw, cls: "cyan", hex: "var(--cyan)" };
    return { label: raw || "Social", cls: "cat", hex: "rgba(255,255,255,0.3)" };
  };

  const getEntryType = (ev: any) => {
    const tags = [
      ...(ev.metadata?.tags || []),
      ...(ev.event_tags || []).map((t: any) => t.tag)
    ].map((t: string) => (t || "").toLowerCase());
    
    if (tags.some(t => t.includes("free"))) return { label: "Free", cls: "free" };
    const priceTag = tags.find(t => t.includes("entry") && /\d/.test(t));
    if (priceTag) return { label: priceTag, cls: "price" };
    if (ev.metadata?.ticketed) return { label: "Paid Entry", cls: "price" };
    return null;
  };


  const resolveOrganizer = (ev: any) => {
    if (ev.organizer && organizerMap[ev.organizer]) return organizerMap[ev.organizer];
    if (ev.organizer && !/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(ev.organizer)) return ev.organizer;
    return ev.clubs?.name || "Campus";
  };

  // Stats
  const evStats = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    const thisWeek = allEvents.filter(e => new Date(e.event_date) <= weekEnd).length;
    const freeCount = allEvents.filter(e => {
      const tags = (e.event_tags || []).map((t: any) => (t.tag || "").toLowerCase());
      return tags.some((t: string) => t.includes("free")) || (!e.metadata?.ticketed && !e.metadata?.price);
    }).length;
    const totalRsvp = allEvents.reduce((sum: number, e: any) => sum + (e.rsvp_count || 0), 0);
    return { total: allEvents.length, thisWeek, free: freeCount, rsvp: totalRsvp };
  }, [allEvents]);

  return (
    <>
      <div className="page-header">
        <div className="ph-glow" />
        <div className="ph-inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="ph-breadcrumb">Kinexis / <span>Events</span></div>
              <div className="ph-title">Campus Events</div>
              <div className="ph-sub">Discover hackathons, fests, workshops, socials, and everything happening at SNU.</div>
            </div>

          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-inner">
          <div className="filter-search">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input 
              type="text" 
              placeholder="Search events..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="search-shortcut">⌘K</div>
          </div>
          <div className="filter-chips">
            {["All", "This Week", "Technical", "Cultural", "Workshops", "Fests", "Social", "Free"].map(f => (
              <div key={f} className={`chip ${activeFilter === f ? "active" : ""}`} onClick={() => setActiveFilter(f)}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="ev-stats-row">
        <div className="ev-stat-card"><div className="ev-stat-num" style={{ color: "var(--lime)" }}>{evStats.total}</div><div className="ev-stat-label">Total Events</div></div>
        <div className="ev-stat-card"><div className="ev-stat-num" style={{ color: "var(--cyan)" }}>{evStats.thisWeek}</div><div className="ev-stat-label">This Week</div></div>
        <div className="ev-stat-card"><div className="ev-stat-num" style={{ color: "var(--purple)" }}>{evStats.free}</div><div className="ev-stat-label">Free Events</div></div>
        <div className="ev-stat-card"><div className="ev-stat-num" style={{ color: "var(--coral)" }}>{evStats.rsvp}+</div><div className="ev-stat-label">Registered</div></div>
      </div>

      <div className="main-events">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>Loading events...</div>
        ) : allEvents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>No upcoming events right now.</div>
        ) : (
          <div className="page-layout">
            <div>
              {featuredEvent && (
                <>
                  <div className="section-label">FEATURED EVENT</div>
                  <div className="featured-event">
                    <div className="fe-banner">
                      <div className="fe-banner-text">{featuredEvent.title.slice(0, 4).toUpperCase()}</div>
                      <div className="fe-badge-wrap">
                        {featuredEvent.is_featured && <span className="ev-badge featured">Featured</span>}
                        {(() => {
                          const catDetails = getCategoryDetails(featuredEvent);
                          const entryType = getEntryType(featuredEvent);
                          return (
                            <>
                              <span className={`ev-badge ${catDetails.cls}`}>{catDetails.label}</span>
                              {entryType && <span className={`ev-badge ${entryType.cls}`}>{entryType.label}</span>}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="fe-body">
                      <div className="fe-top">
                        <span className="fe-date-chip">{formatDate(featuredEvent.event_date).full}</span>
                        <span className="fe-hosted">Hosted by <b>{resolveOrganizer(featuredEvent)}</b></span>
                      </div>
                      <div className="fe-title">{featuredEvent.title}</div>
                      <div className="fe-desc">{featuredEvent.description}</div>
                      <div className="fe-details">
                        {featuredEvent.location && (
                          <div className="fe-detail">
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5C4.29 1.5 2.5 3.29 2.5 5.5c0 3 4 6 4 6s4-3 4-6c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.3"/></svg>
                            {featuredEvent.location}
                          </div>
                        )}
                        <div className="fe-detail">
                          Starts {formatDate(featuredEvent.event_date).day} {formatDate(featuredEvent.event_date).month}, {featuredEvent.event_time ?? "Time TBA"}
                        </div>
                      </div>
                      <div className="fe-actions">
                        <InterestButton eventId={featuredEvent.id} userId={userId} initialInterested={interestedIds.has(featuredEvent.id)} initialCount={featuredEvent.rsvp_count || 0} />
                        <button className="btn-share" onClick={() => handleShare(featuredEvent)}>Share</button>
                      </div>
                      {featuredEvent.rsvp_count > 0 && (
                        <div className="attending-row">
                          <div className="att-avatars">
                            {Array.from({ length: Math.min(featuredEvent.rsvp_count, 4) }).map((_, i) => (
                              <div key={i} className="att-av" style={{ background: "rgba(158,240,26,0.2)", color: "var(--lime)" }}>?</div>
                            ))}
                          </div>
                          <div className="att-count">+{featuredEvent.rsvp_count} registered</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}


              {allEvents.length > 1 && (
                <>
                  <div className="section-label">ALL EVENTS</div>
                  <div className="events-list">
                    {upcomingList.length === 0 && (
                      <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)" }}>
                        {selectedDate ? "No events on this date." : "No events found."}
                      </div>
                    )}
                    {upcomingList.map(ev => {
                      const dt = formatDate(ev.event_date);
                      const catDetails = getCategoryDetails(ev);
                      const entryType = getEntryType(ev);
                      
                      return (
                        <div key={ev.id} className="event-card">
                          <div className="ec-date">
                            <div className="ec-month">{dt.month}</div>
                            <div className="ec-day">{dt.day}</div>
                            <div className="ec-weekday">{dt.weekday}</div>
                            <div className="ec-dot" style={{ background: catDetails.hex }} />
                          </div>
                          
                          <div className="ec-body">
                            <div className="ec-badges">
                              <span className={`ev-badge ${catDetails.cls}`}>{catDetails.label}</span>
                              {entryType && <span className={`ev-badge ${entryType.cls}`}>{entryType.label}</span>}
                            </div>
                            <div className="ec-title">{ev.title}</div>
                            <div className="ec-desc">{ev.description}</div>
                            <div className="ec-meta">
                              {ev.location && (
                                <div className="ec-meta-item">
                                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1C3.5 1 2 2.5 2 4.5c0 2.5 3.5 5.5 3.5 5.5S9 7 9 4.5C9 2.5 7.5 1 5.5 1z" stroke="currentColor" strokeWidth="1.2"/></svg>
                                  {ev.location}
                                </div>
                              )}
                              <div className="ec-meta-item">
                                {ev.event_time ?? "Time TBA"}
                              </div>
                              <div className="ec-meta-item">By {resolveOrganizer(ev)}</div>
                            </div>
                          </div>
                          
                          <div className="ec-right">
                            <InterestButton eventId={ev.id} userId={userId} initialInterested={interestedIds.has(ev.id)} initialCount={ev.rsvp_count || 0} />
                            <button className="btn-share-mini" onClick={(e) => { e.stopPropagation(); handleShare(ev); }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                              Share
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="esidebar">
              <div className="sidebar-card">
                <div className="sc-title">{currentMonth}</div>
                <div className="mini-cal">
                  <div className="cal-grid">
                    <div className="cal-dow">S</div><div className="cal-dow">M</div><div className="cal-dow">T</div><div className="cal-dow">W</div><div className="cal-dow">T</div><div className="cal-dow">F</div><div className="cal-dow">S</div>
                    {calendarDays.map((d, i) => {
                      const dStr = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
                      const isToday = dStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                      const hasEvent = getEventDates.has(dStr);
                      const isSelected = selectedDate === dStr;
                      return (
                        <div 
                          key={i} 
                          className={`cal-day ${!d.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}
                          style={isSelected ? { outline: '1.5px solid var(--lime)', outlineOffset: '-1.5px', background: 'rgba(158,240,26,0.1)' } : {}}
                          onClick={() => {
                            if (selectedDate === dStr) setSelectedDate(null);
                            else setSelectedDate(dStr);
                          }}
                        >
                          {d.date.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="sidebar-card">
                <div className="sc-title">This Week</div>
                {thisWeekEvents.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--sub)", padding: "10px 0" }}>No events this week.</div>
                ) : (
                  thisWeekEvents.slice(0, 4).map((ev: any) => {
                    const d = formatDate(ev.event_date);
                    return (
                      <div key={ev.id} className="upcoming-item">
                        <div className="up-date"><div className="up-d">{d.day}</div><div className="up-m">{d.month}</div></div>
                        <div className="up-info">
                          <div className="up-title">{ev.title}</div>
                          <div className="up-club">{resolveOrganizer(ev)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="sidebar-card">
                <div className="sc-title">Event Categories</div>
                <div className="legend-item"><div className="legend-dot" style={{ background: "var(--lime)" }} /><div className="legend-label">Technical &amp; Hackathons</div></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: "var(--coral)" }} /><div className="legend-label">Cultural &amp; Performances</div></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: "var(--purple)" }} /><div className="legend-label">Talks &amp; TEDx</div></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: "var(--cyan)" }} /><div className="legend-label">Workshops</div></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(255,255,255,0.3)" }} /><div className="legend-label">Social &amp; Open Events</div></div>
              </div>

            </div>
          </div>
        )}
      </div>


    </>
  );
}
