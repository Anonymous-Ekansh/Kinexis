"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./resources.css";

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
    icon: "🏫",
    accent: "lime",
    href: "https://rslookup.abs.moe/prof",
    type: "link",
    section: "academic",
  },
  {
    title: "Find All Labs",
    description: "Locate labs across campus — CS labs, electronics labs, physics labs, and more.",
    icon: "🔬",
    accent: "cyan",
    href: "https://rslookup.abs.moe/lab",
    type: "link",
    section: "academic",
  },
  {
    title: "GPA Calculator",
    description: "Calculate your semester and cumulative GPA with SNU's grading scale.",
    icon: "📊",
    accent: "purple",
    href: "https://rslookup.abs.moe/gpa",
    type: "link",
    section: "academic",
  },
  {
    title: "Attendance Calculator",
    description: "Track your attendance percentage and figure out how many classes you can skip.",
    icon: "📋",
    accent: "coral",
    href: "https://rslookup.abs.moe/attendance",
    type: "link",
    section: "academic",
  },
  {
    title: "Amenities & Timings",
    description: "Check timings for the mess, gym, library, sports complex, and other campus amenities.",
    icon: "⏰",
    accent: "lime",
    href: "https://rslookup.abs.moe/amenity",
    type: "link",
    section: "academic",
  },

  // ── Campus Life ──
  {
    title: "Upcoming Events",
    description: "Never miss a hackathon, fest, workshop, or social. See everything happening on campus.",
    icon: "🎉",
    accent: "coral",
    href: "https://kinexis.in/events",
    type: "link",
    section: "campus",
  },
  {
    title: "All Clubs",
    description: "Browse 40+ student clubs across tech, arts, sports, culture, and entrepreneurship.",
    icon: "🎭",
    accent: "purple",
    href: "https://kinexis.in/clubs",
    type: "link",
    section: "campus",
  },

  // ── Navigation ──
  {
    title: "Interactive Campus Map",
    description: "Find your way around campus with an interactive, searchable map of all buildings and blocks.",
    icon: "🗺️",
    accent: "cyan",
    href: "https://maps.rohitjg.com/",
    type: "link",
    section: "navigation",
  },
  {
    title: "Google Earth 3D View",
    description: "Explore the campus in immersive 3D with Google Earth — great for new students.",
    icon: "🌐",
    accent: "lime",
    href: "https://earth.google.com/earth/d/1rJBpRt96G15WO5OWFTcx9jBcj6lwozJH?usp=sharing",
    type: "link",
    section: "navigation",
  },

  // ── Swayam ──
  {
    title: "Swayam Course Guide",
    description: "Complete guide to enrolling, completing, and getting credits for Swayam/NPTEL courses.",
    icon: "📄",
    accent: "purple",
    href: "#",
    type: "pdf",
    section: "swayam",
  },

  // ── CCC / UWE / Major Elective ──
  {
    title: "CCC Course Guide",
    description: "Comprehensive guide to Cross-cutting Capacity courses — selections, credits, and tips.",
    icon: "📄",
    accent: "cyan",
    href: "#",
    type: "pdf",
    section: "courses",
  },
  {
    title: "UWE Course Guide",
    description: "Everything you need to know about University Wide Electives — options and recommendations.",
    icon: "📄",
    accent: "lime",
    href: "#",
    type: "pdf",
    section: "courses",
  },
  {
    title: "Major Elective Guide",
    description: "How to choose the right major electives — department-wise breakdown and prerequisites.",
    icon: "📄",
    accent: "coral",
    href: "#",
    type: "pdf",
    section: "courses",
  },

  // ── UG Handbook ──
  {
    title: "UG Handbook",
    description: "The official undergraduate handbook — academic policies, grading system, rules, and more.",
    icon: "📘",
    accent: "purple",
    href: "#",
    type: "pdf",
    section: "handbook",
  },

  // ── SNU Links & Setup ──
  {
    title: "SNU Wiki — Setup Guide",
    description: "Official wiki for WiFi setup, Net ID activation, email configuration, and IT resources.",
    icon: "🔗",
    accent: "cyan",
    href: "https://wiki.snu.edu.in/index.php?title=Main_Page",
    type: "link",
    section: "setup",
  },
  {
    title: "SNU Links Guide",
    description: "One PDF with all essential SNU links, portals, and how-tos — bookmark this.",
    icon: "📄",
    accent: "lime",
    href: "#",
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
   LOGO SVG (reused from landing page)
   ═══════════════════════════════════════════ */

function LogoSVG() {
  return (
    <svg width={180} height={38} viewBox="0 15 420 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(18,18) scale(0.38)">
        <circle cx="36" cy="20" r="5.5" fill="#9EF01A" />
        <circle cx="36" cy="60" r="7.5" fill="#9EF01A" />
        <circle cx="36" cy="100" r="5.5" fill="#9EF01A" />
        <line x1="36" y1="25.5" x2="36" y2="52.5" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="36" y1="67.5" x2="36" y2="94.5" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="92" cy="20" r="5.5" fill="#9EF01A" />
        <path d="M43 53 Q60 36 87 23" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <circle cx="92" cy="100" r="5.5" fill="#9EF01A" />
        <path d="M43 67 Q60 84 87 97" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </g>
      <line x1="65" y1="22" x2="65" y2="78" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <text
        x="76" y="58"
        fontFamily="'Syne','Inter',sans-serif"
        fontSize="42"
        fontWeight="800"
        fill="#FFFFFF"
        letterSpacing="-1.5"
      >
        kinexis
      </text>
    </svg>
  );
}

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
  const [authUser, setAuthUser] = useState<{ initials: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── Auth check for nav avatar ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const initials = (user.email || "?").slice(0, 2).toUpperCase();
        setAuthUser({ initials });
      }
    })();
  }, []);

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

  /* ── Escape key for menu ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  /* ── Body scroll lock for menu ── */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

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
      {/* ── NAV ── */}
      <nav>
        <Link href="/" className="logo-svg" style={{ display: "flex", alignItems: "center", flexShrink: 0, textDecoration: "none" }}>
          <LogoSVG />
        </Link>
        <div className="nav-links">
          <Link href="/" style={{ textDecoration: "none" }}>Home</Link>
          <Link href="/resources" style={{ textDecoration: "none", color: "#fff" }}>Resources</Link>
          <a href="https://kinexis.in/events" target="_blank" rel="noopener noreferrer">Events</a>
          <a href="https://kinexis.in/clubs" target="_blank" rel="noopener noreferrer">Clubs</a>
        </div>
        <div className="nav-r">
          {authUser ? (
            <Link href="/profile" prefetch={false} style={{ textDecoration: "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#9EF01A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-syne),'Syne',sans-serif", fontSize: 12, fontWeight: 800, color: "#111", cursor: "pointer" }}>
                {authUser.initials}
              </div>
            </Link>
          ) : (
            <>
              <Link href="/login" prefetch={false} className="btn-login">Log in</Link>
              <Link href="/signup" prefetch={false} className="btn-signup">Sign up free</Link>
            </>
          )}
          <button className={`hamburger${menuOpen ? " open" : ""}`} aria-label="Menu" onClick={toggleMenu}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU OVERLAY ── */}
      <div className={`menu-overlay${menuOpen ? " open" : ""}`} onClick={toggleMenu} />

      {/* ── MOBILE SIDE PANEL ── */}
      <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
        <div className="mobile-menu-header">
          <LogoSVG />
          <button className="mobile-menu-close" onClick={toggleMenu} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="2" y1="2" x2="14" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="14" y1="2" x2="2" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mobile-menu-links">
          <Link href="/" onClick={toggleMenu}>Home</Link>
          <Link href="/resources" onClick={toggleMenu}>Resources</Link>
          <a href="https://kinexis.in/events" target="_blank" rel="noopener noreferrer" onClick={toggleMenu}>Events</a>
          <a href="https://kinexis.in/clubs" target="_blank" rel="noopener noreferrer" onClick={toggleMenu}>Clubs</a>
        </div>
        <div className="mobile-menu-ctas">
          {authUser ? (
            <Link href="/profile" prefetch={false} className="btn-signup-m">My Profile</Link>
          ) : (
            <>
              <Link href="/signup" prefetch={false} className="btn-signup-m">Sign up free</Link>
              <Link href="/login" prefetch={false} className="btn-login-m">Log in</Link>
            </>
          )}
        </div>
      </div>

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
            All the <b>tools, documents, and links</b> you need across your SNU journey — from GPA calculators to campus maps to course guides.
          </p>
          <div className="res-search">
            <svg className="res-search-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              id="resourceSearch"
              type="text"
              placeholder="Search resources — e.g. GPA, labs, WiFi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── SECTIONS ── */}
      {filteredSections.length === 0 && searchQuery.trim() && (
        <div className="res-empty">
          <div className="res-empty-icon">🔍</div>
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
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        style={item.href === "#" ? { cursor: "default" } : undefined}
                      >
                        <div className="res-card-icon">
                          {item.icon}
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
