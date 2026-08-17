"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TopNav from "@/components/TopNav";
import "./resources.css";

/* ═══════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════ */

const iconMap: Record<string, React.ReactNode> = {
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 3v15M9 7v.01M9 11v.01M9 15v.01M17 8v.01M17 12v.01M17 16v.01" /></svg>
  ),
  flask: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v6.5L4 20h16L14 9.5V3M7.5 16h9" /></svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M7 16l4-4 4 4 5-6" /></svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><circle cx="17" cy="8" r="2.5" /><path d="M21 21v-1.5a3 3 0 00-3-3h-.5" /></svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" /><path d="M9 3v15M15 6v15" /></svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8" /><path d="M12 3a15 15 0 010 18 15 15 0 010-18z" /></svg>
  ),
  fileText: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><path d="M14 2v6h6M10 13h4M10 17h4M8 9h2" /></svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /><path d="M8 7h8M8 11h5" /></svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
  ),
};

/* ═══════════════════════════════════════════
   RESOURCE DATA
   ═══════════════════════════════════════════ */

interface ResourceItem {
  title: string;
  description: string;
  icon: string;
  accent: "lime" | "cyan" | "purple" | "coral";
  href: string;
  type: "link" | "pdf";
  section: string;
}

const resources: ResourceItem[] = [
  // ── Academic Tools ──
  {
    title: "Find Professor Offices",
    description: "Look up office locations and room numbers for all professors across departments.",
    icon: "building",
    accent: "lime",
    href: "https://rslookup.abs.moe/prof",
    type: "link",
    section: "academic",
  },
  {
    title: "Find All Labs",
    description: "Locate labs across campus including CS, electronics, physics, and more.",
    icon: "flask",
    accent: "cyan",
    href: "https://rslookup.abs.moe/lab",
    type: "link",
    section: "academic",
  },
  {
    title: "GPA Calculator",
    description: "Calculate your semester and cumulative GPA with SNU's grading scale.",
    icon: "chart",
    accent: "purple",
    href: "https://rslookup.abs.moe/gpa",
    type: "link",
    section: "academic",
  },
  {
    title: "Attendance Calculator",
    description: "Track your attendance percentage and figure out how many classes you can skip.",
    icon: "clipboard",
    accent: "coral",
    href: "https://rslookup.abs.moe/attendance",
    type: "link",
    section: "academic",
  },
  {
    title: "Timetable Planner",
    description: "Plan your semester timetable and check for class collisions.",
    icon: "calendar",
    accent: "purple",
    href: "https://scooby.rohitjg.com/collision-checker",
    type: "link",
    section: "academic",
  },
  {
    title: "Amenities & Timings",
    description: "Check timings for the mess, gym, library, sports complex, and other campus amenities.",
    icon: "clock",
    accent: "lime",
    href: "https://rslookup.abs.moe/amenity",
    type: "link",
    section: "academic",
  },

  // ── Campus Life ──
  {
    title: "Upcoming Events",
    description: "Never miss a hackathon, fest, workshop, or social. See everything happening on campus.",
    icon: "calendar",
    accent: "coral",
    href: "https://kinexis.in/events",
    type: "link",
    section: "campus",
  },
  {
    title: "All Clubs",
    description: "Browse 40+ student clubs across tech, arts, sports, culture, and entrepreneurship.",
    icon: "users",
    accent: "purple",
    href: "https://kinexis.in/clubs",
    type: "link",
    section: "campus",
  },

  // ── Navigation ──
  {
    title: "Interactive Campus Map",
    description: "Find your way around campus with an interactive, searchable map of all buildings and blocks.",
    icon: "map",
    accent: "cyan",
    href: "https://maps.rohitjg.com/",
    type: "link",
    section: "navigation",
  },
  {
    title: "Google Earth 3D View",
    description: "Explore the campus in immersive 3D with Google Earth, great for new students.",
    icon: "globe",
    accent: "lime",
    href: "https://earth.google.com/earth/d/1rJBpRt96G15WO5OWFTcx9jBcj6lwozJH?usp=sharing",
    type: "link",
    section: "navigation",
  },

  // ── Swayam ──
  {
    title: "Academic Policy (Swayam)",
    description: "Complete academic policy and guidelines for enrolling and getting credits for Swayam/NPTEL courses.",
    icon: "fileText",
    accent: "purple",
    href: "/resources/AcademicPolicySwayam.pdf",
    type: "pdf",
    section: "swayam",
  },

  // ── CCC / UWE / Major Elective ──
  {
    title: "All Course Information",
    description: "All course information including CCC, UWE, Majors.",
    icon: "link",
    accent: "purple",
    href: "https://snuncr.sharepoint.com/sites/CourseManagement/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FCourseManagement%2FShared%20Documents%2FCurrent%20Course%20Outline%2FMonsoon%202026%20PDFs&viewid=5f8b6019%2D4eef%2D4cab%2Da0ef%2Dfc7ebd57c9f4&as=json",
    type: "link",
    section: "courses",
  },
  {
    title: "CCC Bidding User Manual",
    description: "The official user manual for bidding on Cross-cutting Capacity courses.",
    icon: "fileText",
    accent: "cyan",
    href: "/resources/CCCBiddingUserManual.pdf",
    type: "pdf",
    section: "courses",
  },
  {
    title: "CCC / UWE / Minors Guide (Unofficial)",
    description: "A comprehensive unofficial guide for the 2029 batch regarding CCC, UWE, and minor electives.",
    icon: "fileText",
    accent: "lime",
    href: "/resources/CCCUWEMinorsElectiveGuide.pdf",
    type: "pdf",
    section: "courses",
  },
  {
    title: "Course Bidding Guide (Unofficial)",
    description: "An unofficial guide with tips and strategies for successful course bidding.",
    icon: "fileText",
    accent: "coral",
    href: "/resources/CourseBiddingUnofficialGuide.pdf",
    type: "pdf",
    section: "courses",
  },
  {
    title: "Minor Programs Requirement",
    description: "Official requirements and details for pursuing a minor program.",
    icon: "fileText",
    accent: "purple",
    href: "/resources/MinorPrograms.pdf",
    type: "pdf",
    section: "courses",
  },

  // ── UG Handbook ──
  {
    title: "UG Handbook 2025",
    description: "The official undergraduate handbook with academic policies, grading system, rules, and more.",
    icon: "book",
    accent: "purple",
    href: "/resources/StudentHandbook2025.pdf",
    type: "pdf",
    section: "handbook",
  },

  // ── SNU Links & Setup ──
  {
    title: "SNU Wiki Setup Guide",
    description: "Official wiki for WiFi setup, Net ID activation, email configuration, and IT resources.",
    icon: "link",
    accent: "cyan",
    href: "https://wiki.snu.edu.in/index.php?title=Main_Page",
    type: "link",
    section: "setup",
  },
  {
    title: "SNU Links Guide",
    description: "One PDF with all essential SNU links, portals, and how-tos. Bookmark this.",
    icon: "fileText",
    accent: "lime",
    href: "/resources/SNULinksGuide.pdf",
    type: "pdf",
    section: "setup",
  },
];

/* ═══════════════════════════════════════════
   SECTIONS CONFIG
   ═══════════════════════════════════════════ */

interface SectionConfig {
  id: string;
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  subtitle: string;
  alt: boolean;
  columns: 2 | 3;
}

const sections: SectionConfig[] = [
  {
    id: "academic",
    eyebrow: "Academic Tools",
    eyebrowColor: "var(--lime)",
    title: "Everything for your academics.",
    subtitle: "Calculators, finders, and essential tools to stay on top of your coursework.",
    alt: false,
    columns: 3,
  },
  {
    id: "campus",
    eyebrow: "Campus Life",
    eyebrowColor: "var(--coral)",
    title: "Stay plugged into campus.",
    subtitle: "Events, clubs, and everything happening around you.",
    alt: true,
    columns: 2,
  },
  {
    id: "navigation",
    eyebrow: "Navigation",
    eyebrowColor: "var(--cyan)",
    title: "Find your way around.",
    subtitle: "Interactive maps and 3D views to navigate the campus like a pro.",
    alt: false,
    columns: 2,
  },
  {
    id: "swayam",
    eyebrow: "Swayam / NPTEL",
    eyebrowColor: "var(--purple)",
    title: "Swayam course resources.",
    subtitle: "Guides and documents for NPTEL and Swayam online courses.",
    alt: true,
    columns: 2,
  },
  {
    id: "courses",
    eyebrow: "CCC / UWE / Major Elective",
    eyebrowColor: "var(--lime)",
    title: "Course selection guides.",
    subtitle: "PDF guides for choosing the right electives and cross-cutting courses.",
    alt: false,
    columns: 3,
  },
  {
    id: "handbook",
    eyebrow: "UG Handbook",
    eyebrowColor: "var(--coral)",
    title: "Official handbooks & policies.",
    subtitle: "The complete undergraduate handbook with academic rules and regulations.",
    alt: true,
    columns: 2,
  },
  {
    id: "setup",
    eyebrow: "SNU Links & Setup",
    eyebrowColor: "var(--cyan)",
    title: "Get connected.",
    subtitle: "WiFi, Net ID, email setup, and essential university portals.",
    alt: false,
    columns: 2,
  },
];


/* ═══════════════════════════════════════════
   ARROW ICON
   ═══════════════════════════════════════════ */

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8.5h9m0 0L8.5 5m3.5 3.5L8.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2v8.5m0 0L5 7.5m3 3L11 7.5M3 12.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function ResourcesPageClient() {
  const [searchQuery, setSearchQuery] = useState("");

  /* ── Scroll reveal ── */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal, .reveal-grid").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── Filtered resources ── */
  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return resources;
    const q = searchQuery.toLowerCase();
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  /* ── Filtered sections (only show sections with matching results) ── */
  const filteredSections = useMemo(() => {
    return sections.filter((sec) =>
      filteredResources.some((r) => r.section === sec.id)
    );
  }, [filteredResources]);

  return (
    <>
      <TopNav />

      {/* ── HERO ── */}
      <section className="res-hero">
        <div className="res-hero-glow" />
        <div className="res-hero-inner">
          <div className="res-hero-badge">
            <div className="badge-dot" />
            <span>CAMPUS RESOURCE HUB · KINEXIS.IN</span>
          </div>
          <h1 className="res-hero-title">
            Every resource,<br /><em>one place.</em>
          </h1>
          <p className="res-hero-sub">
            All the <b>tools, documents, and links</b> you need across your SNU journey, from GPA calculators to campus maps and course guides.
          </p>
          <div className="res-search">
            <svg className="res-search-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              id="resourceSearch"
              type="text"
              placeholder="Search resources (e.g. GPA, labs, WiFi...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── SECTIONS ── */}
      {filteredSections.length === 0 && searchQuery.trim() && (
        <div className="res-empty">
          <div className="res-empty-icon">{iconMap.search}</div>
          <div className="res-empty-text">No resources found</div>
          <div className="res-empty-sub">Try a different search term</div>
        </div>
      )}

      {filteredSections.map((sec, sectionIdx) => {
        const sectionResources = filteredResources.filter((r) => r.section === sec.id);
        const WrapperTag = sec.alt ? "section" : "section";
        const wrapperClass = sec.alt ? "res-section-alt" : "res-section";
        const gridClass = sec.columns === 2 ? "res-grid-2" : "res-grid";

        return (
          <div key={sec.id}>
            {sectionIdx > 0 && !sec.alt && <hr className="res-divider" />}
            <WrapperTag className={wrapperClass}>
              <div className="res-section-inner">
                <div className="res-eyebrow reveal" style={{ color: sec.eyebrowColor }}>{sec.eyebrow}</div>
                <div className="res-section-title reveal">{sec.title}</div>
                <p className="res-section-sub reveal">{sec.subtitle}</p>
                <div className={`${gridClass} reveal-grid`}>
                  {sectionResources.map((item, i) => {
                    const isExternal = item.type === "link" && item.href !== "#";
                    const isPdf = item.type === "pdf";

                    return (
                      <a
                        key={i}
                        className={`res-card${isPdf ? " res-card-pdf" : ""}`}
                        data-accent={item.accent}
                        href={item.href}
                        target={isExternal || (isPdf && item.href !== "#") ? "_blank" : undefined}
                        rel={isExternal || (isPdf && item.href !== "#") ? "noopener noreferrer" : undefined}
                        style={item.href === "#" ? { cursor: "default" } : undefined}
                      >
                        <div className="res-card-icon">
                          {iconMap[item.icon] || item.icon}
                        </div>
                        <div className="res-card-title">{item.title}</div>
                        <div className="res-card-desc">{item.description}</div>
                        <div className="res-card-arrow">
                          {isPdf ? (
                            item.href === "#" ? (
                              <>Coming soon</>
                            ) : (
                              <>Download PDF <DownloadIcon /></>
                            )
                          ) : (
                            <>Visit <ArrowIcon /></>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </WrapperTag>
          </div>
        );
      })}

      {/* ── FOOTER ── */}
      <footer className="res-footer">
        <span className="foot-l">© 2026 Kinexis</span>
        <span className="foot-r">kinexis.in</span>
      </footer>
    </>
  );
}
