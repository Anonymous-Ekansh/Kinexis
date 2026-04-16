"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProfileCardStack from "./components/ProfileCardStack";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

interface StreamItem {
  name: string;
  count: string;
  color: string;
  tags: string[];
}

const streams: Record<string, StreamItem[]> = {
  btech: [
    { name: "Computer Science", count: "312 students", color: "var(--lime)", tags: ["React", "ML", "Open Source"] },
    { name: "Electronics (ECE)", count: "245 students", color: "var(--cyan)", tags: ["Embedded", "VLSI", "IoT"] },
    { name: "Mechanical", count: "198 students", color: "var(--purple)", tags: ["CAD", "Robotics", "Thermal"] },
    { name: "Chemical Engg", count: "134 students", color: "var(--coral)", tags: ["Process", "Materials", "Bio"] },
    { name: "Civil Engg", count: "167 students", color: "var(--lime)", tags: ["Structures", "GIS", "Env"] },
    { name: "Biotechnology", count: "89 students", color: "var(--cyan)", tags: ["Lab", "Research", "Bio"] },
  ],
  bsc: [
    { name: "BSc Physics", count: "89 students", color: "var(--cyan)", tags: ["Quantum", "Astrophysics", "Lab"] },
    { name: "BSc Chemistry", count: "67 students", color: "var(--purple)", tags: ["Organic", "Analytical", "Lab"] },
    { name: "BSc Mathematics", count: "76 students", color: "var(--lime)", tags: ["Stats", "ML", "Pure Maths"] },
    { name: "BSc Economics", count: "88 students", color: "var(--coral)", tags: ["Macro", "Research", "Policy"] },
    { name: "BSc IT / CS", count: "112 students", color: "var(--cyan)", tags: ["Dev", "Data", "Networks"] },
    { name: "BSc Life Sciences", count: "54 students", color: "var(--purple)", tags: ["Botany", "Zoology", "Ecology"] },
  ],
  commerce: [
    { name: "BMS", count: "143 students", color: "var(--lime)", tags: ["Marketing", "Ops", "Strategy"] },
    { name: "Eco + Finance", count: "98 students", color: "var(--cyan)", tags: ["Investing", "FinTech", "Markets"] },
    { name: "B.Com", count: "167 students", color: "var(--purple)", tags: ["Accounting", "Tax", "Audit"] },
    { name: "Economics (Hons)", count: "112 students", color: "var(--coral)", tags: ["Research", "Policy", "Econometrics"] },
    { name: "BAF", count: "76 students", color: "var(--lime)", tags: ["Finance", "Accounts", "Banking"] },
    { name: "BMM", count: "89 students", color: "var(--cyan)", tags: ["Media", "PR", "Advertising"] },
  ],
  social: [
    { name: "International Relations", count: "55 students", color: "var(--purple)", tags: ["MUN", "Policy", "Diplomacy"] },
    { name: "Political Science", count: "72 students", color: "var(--coral)", tags: ["Governance", "Law", "Research"] },
    { name: "Psychology", count: "94 students", color: "var(--cyan)", tags: ["Counselling", "Research", "Behaviour"] },
    { name: "History", count: "48 students", color: "var(--lime)", tags: ["Archives", "Writing", "Research"] },
    { name: "Sociology", count: "61 students", color: "var(--purple)", tags: ["Research", "Culture", "Policy"] },
    { name: "English Literature", count: "83 students", color: "var(--coral)", tags: ["Writing", "Journalism", "Publishing"] },
  ],
};

const interests = [
  { label: "Startups", color: "var(--lime)" },
  { label: "AI & ML", color: "var(--cyan)" },
  { label: "Music", color: "var(--purple)" },
  { label: "Robotics", color: "var(--coral)" },
  { label: "Finance", color: "var(--lime)" },
  { label: "Photography", color: "var(--cyan)" },
  { label: "UI Design", color: "var(--purple)" },
  { label: "Research", color: "var(--coral)" },
  { label: "Open Source", color: "var(--lime)" },
  { label: "Drama", color: "var(--cyan)" },
  { label: "MUN & Policy", color: "var(--purple)" },
  { label: "App Dev", color: "var(--coral)" },
  { label: "Content Writing", color: "var(--lime)" },
  { label: "Hardware", color: "var(--cyan)" },
  { label: "Filmmaking", color: "var(--purple)" },
  { label: "Chess", color: "var(--coral)" },
];

/* ═══════════════════════════════════════════
   LOGO SVG COMPONENT
   ═══════════════════════════════════════════ */

function LogoSVG({
  width,
  height,
  viewBox,
  gTransform,
  lineCoords,
  textCoords,
  showAnimClasses = false,
}: {
  width: number;
  height: number;
  viewBox: string;
  gTransform: string;
  lineCoords: { x1: string; y1: string; x2: string; y2: string };
  textCoords: { x: string; y: string; fontSize: string };
  showAnimClasses?: boolean;
}) {
  return (
    <svg
      className={showAnimClasses ? "intro-logo-svg" : undefined}
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={gTransform}>
        <circle className={showAnimClasses ? "logo-circle" : undefined} data-delay={showAnimClasses ? "0" : undefined} cx="36" cy="20" r="5.5" fill="#9EF01A" />
        <circle className={showAnimClasses ? "logo-circle" : undefined} data-delay={showAnimClasses ? "1" : undefined} cx="36" cy="60" r="7.5" fill="#9EF01A" />
        <circle className={showAnimClasses ? "logo-circle" : undefined} data-delay={showAnimClasses ? "2" : undefined} cx="36" cy="100" r="5.5" fill="#9EF01A" />
        <line className={showAnimClasses ? "logo-line" : undefined} data-delay={showAnimClasses ? "3" : undefined} x1="36" y1="25.5" x2="36" y2="52.5" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" />
        <line className={showAnimClasses ? "logo-line" : undefined} data-delay={showAnimClasses ? "4" : undefined} x1="36" y1="67.5" x2="36" y2="94.5" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" />
        <circle className={showAnimClasses ? "logo-circle" : undefined} data-delay={showAnimClasses ? "5" : undefined} cx="92" cy="20" r="5.5" fill="#9EF01A" />
        <path className={showAnimClasses ? "logo-path" : undefined} data-delay={showAnimClasses ? "6" : undefined} d="M43 53 Q60 36 87 23" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <circle className={showAnimClasses ? "logo-circle" : undefined} data-delay={showAnimClasses ? "7" : undefined} cx="92" cy="100" r="5.5" fill="#9EF01A" />
        <path className={showAnimClasses ? "logo-path" : undefined} data-delay={showAnimClasses ? "8" : undefined} d="M43 67 Q60 84 87 97" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </g>
      <line
        className={showAnimClasses ? "logo-divider" : undefined}
        x1="65"
        y1={lineCoords.y1}
        x2="65"
        y2={lineCoords.y2}
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="1"
      />
      <text
        className={showAnimClasses ? "logo-text" : undefined}
        x={textCoords.x}
        y={textCoords.y}
        fontFamily="'Syne','Inter',sans-serif"
        fontSize={textCoords.fontSize}
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
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */

export default function Home() {
  const router = useRouter();

  /* ── state ── */
  const [introClass, setIntroClass] = useState("");
  const [mainVisible, setMainVisible] = useState(false);
  const [activeStream, setActiveStream] = useState("btech");
  const [streamAnimKey, setStreamAnimKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string; email?: string | null; initials: string } | null>(null);

  /* ── Waitlist / Tally state ── */
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistMsg, setWaitlistMsg] = useState<{ text: string; color: string }>({ text: "", color: "" });
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  /* ── refs ── */
  const streamGridRef = useRef<HTMLDivElement>(null);

  /* ── Auth redirect ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/discover");
        return;
      }
    })();
  }, [router]);

  /* ── Check auth for nav avatar (non-blocking) ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const initials = (user.email || "?").slice(0, 2).toUpperCase();
        setAuthUser({ id: user.id, email: user.email, initials });
      }
    })();
  }, []);

  /* ── Intro animation ── */
  useEffect(() => {
    document.body.classList.add("intro-active");
    const t1 = setTimeout(() => setIntroClass("animate-in"), 100);
    const t2 = setTimeout(() => {
      setIntroClass("animate-in hidden");
      setMainVisible(true);
      document.body.classList.remove("intro-active");
    }, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
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
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal, .reveal-grid, .reveal-list").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── Stream grid animation retrigger ── */
  useEffect(() => {
    const grid = streamGridRef.current;
    if (!grid) return;
    grid.classList.remove("visible");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => grid.classList.add("visible"));
    });
  }, [streamAnimKey]);

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
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /* ── Helpers ── */
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const switchStream = useCallback((key: string) => {
    setActiveStream(key);
    setStreamAnimKey((k) => k + 1);
  }, []);

  /* ── Tally submission ── */
  const TALLY_FORM_ID = "68xd4B";
  const EMAIL_FIELD_ID = "fbf74616-1586-4049-a1f2-7b718c01d486";

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const handleWaitlistSubmit = useCallback(async () => {
    const email = waitlistEmail.trim();
    if (!email) {
      setWaitlistMsg({ text: "Please enter your email.", color: "#FB7185" });
      return;
    }
    if (!isValidEmail(email)) {
      setWaitlistMsg({ text: "Please enter a valid email address.", color: "#FB7185" });
      return;
    }

    setWaitlistSubmitting(true);
    setWaitlistMsg({ text: "Submitting...", color: "rgba(255,255,255,0.5)" });

    const payload = {
      sessionUuid: uuid(),
      respondentUuid: uuid(),
      responses: { [EMAIL_FIELD_ID]: email },
      captchas: {},
      isCompleted: true,
      password: null,
    };

    try {
      const res = await fetch(`https://api.tally.so/forms/${TALLY_FORM_ID}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "tally-version": "2025-01-15" },
        body: JSON.stringify(payload),
      });
      if (res.ok || res.status === 201) {
        setWaitlistEmail("");
        setWaitlistMsg({ text: "You're on the waitlist! 🎉", color: "#9EF01A" });
      } else {
        throw new Error("Status " + res.status);
      }
    } catch (err) {
      console.error("Tally submission error:", err);
      setWaitlistMsg({ text: "Something went wrong. Please try again.", color: "#FB7185" });
    } finally {
      setWaitlistSubmitting(false);
    }
  }, [waitlistEmail]);

  /* ── Current stream data ── */
  const currentStream = streams[activeStream] || streams.btech;
  const streamTabs: { key: string; label: string }[] = [
    { key: "btech", label: "BTech" },
    { key: "bsc", label: "BSc Sciences" },
    { key: "commerce", label: "Commerce & Eco" },
    { key: "social", label: "Social Sciences" },
  ];

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <>
      {/* ── INTRO OVERLAY ── */}
      <div className={`intro-overlay ${introClass}`} id="introOverlay">
        <div className="intro-glow" />
        <div className="intro-logo-wrap">
          <LogoSVG
            width={300}
            height={80}
            viewBox="0 0 300 80"
            gTransform="translate(8,8) scale(0.52)"
            lineCoords={{ x1: "65", y1: "8", x2: "65", y2: "72" }}
            textCoords={{ x: "76", y: "50", fontSize: "36" }}
            showAnimClasses
          />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className={`main-content${mainVisible ? " visible" : ""}`} id="mainContent">
        {/* NAV */}
        <nav>
          <div className="logo-svg" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <LogoSVG
              width={180}
              height={38}
              viewBox="0 15 420 70"
              gTransform="translate(18,18) scale(0.38)"
              lineCoords={{ x1: "65", y1: "22", x2: "65", y2: "78" }}
              textCoords={{ x: "76", y: "58", fontSize: "42" }}
            />
          </div>
          <div className="nav-links">
            <a>Discover</a>
            <a>Projects</a>
            <a>Events</a>
            <a>Clubs</a>
            <a>Streams</a>
          </div>
          <div className="nav-r">
            {authUser ? (
              <Link href="/profile" style={{ textDecoration: "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#9EF01A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-syne),'Syne',sans-serif", fontSize: 12, fontWeight: 800, color: "#111", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}>
                  {authUser.initials}
                </div>
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-login">Log in</Link>
                <Link href="/signup" className="btn-signup">Sign up free</Link>
              </>
            )}
            <button className={`hamburger${menuOpen ? " open" : ""}`} aria-label="Menu" onClick={toggleMenu}>
              <span /><span /><span />
            </button>
          </div>
        </nav>

        {/* OVERLAY */}
        <div className={`menu-overlay${menuOpen ? " open" : ""}`} onClick={toggleMenu} />

        {/* SIDE PANEL */}
        <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
          <div className="mobile-menu-header">
            <LogoSVG
              width={148}
              height={38}
              viewBox="0 0 420 120"
              gTransform="translate(18,28) scale(0.38)"
              lineCoords={{ x1: "65", y1: "16", x2: "65", y2: "104" }}
              textCoords={{ x: "76", y: "68", fontSize: "42" }}
            />
            <button className="mobile-menu-close" onClick={toggleMenu} aria-label="Close">
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="2" y1="2" x2="14" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="14" y1="2" x2="2" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mobile-menu-links">
            <a onClick={toggleMenu}>Discover</a>
            <a onClick={toggleMenu}>Projects</a>
            <Link href="/events" onClick={toggleMenu}>Events</Link>
            <a onClick={toggleMenu}>Clubs</a>
            <a onClick={toggleMenu}>Streams</a>
          </div>
          <div className="mobile-menu-ctas">
            {authUser ? (
              <Link href="/profile" className="btn-signup-m">My Profile</Link>
            ) : (
              <>
                <Link href="/signup" className="btn-signup-m">Sign up free</Link>
                <Link href="/login" className="btn-login-m">Log in</Link>
              </>
            )}
          </div>
        </div>

        {/* HERO */}
        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-inner">
            <div className="hero-badge">
              <div className="badge-dot" />
              <span className="badge-text">FOR EVERY STREAM · EVERY BATCH · KINEXIS.IN</span>
            </div>
            <h1 className="hero-h1">Meet the people who will</h1>
            <div className="hero-h2">build your future with you.</div>
            <p className="hero-sub">
              Kinexis connects students across <b>every stream and batch</b> by interests and ambition.
              Find collaborators, not just classmates.
            </p>
            <div className="hero-ctas">
              <Link href="/signup" className="cta-primary">Create your profile →</Link>
              <Link href="/login" className="cta-secondary">Log in</Link>
            </div>
            <div className="hero-sp">
              <div className="av-stack">
                <div className="av" style={{ background: "var(--lime)" }}>A</div>
                <div className="av" style={{ background: "var(--cyan)" }}>P</div>
                <div className="av" style={{ background: "var(--purple)", color: "#fff" }}>R</div>
                <div className="av" style={{ background: "var(--coral)", color: "#fff" }}>S</div>
                <div className="av" style={{ background: "var(--lime)" }}>M</div>
              </div>
              <span className="sp-text"><b>500+ students</b> already on the waitlist</span>
            </div>
          </div>
        </section>

        {/* INTEREST STRIP */}
        <div className="strip">
          <div className="marquee">
            {[...interests, ...interests].map((item, i) => (
              <span className="ipill" key={i}>
                <span className="ipill-dot" style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="stats-bar reveal-grid">
          <div className="stat"><div className="stat-n" style={{ color: "#ffffff" }}>500+</div><div className="stat-l">Students waiting</div></div>
          <div className="stat"><div className="stat-n" style={{ color: "#ffffff" }}>18</div><div className="stat-l">Streams &amp; departments</div></div>
          <div className="stat"><div className="stat-n" style={{ color: "#ffffff" }}>40+</div><div className="stat-l">Active clubs</div></div>
          <div className="stat"><div className="stat-n" style={{ color: "#ffffff" }}>80+</div><div className="stat-l">Open projects</div></div>
        </div>

        {/* STREAMS */}
        <section className="sec">
          <div className="eyebrow reveal" style={{ color: "var(--lime)" }}>Every Stream</div>
          <div className="sec-h reveal">Find your people,<br />whatever you study.</div>
          <p className="sec-sub reveal">From BTech labs to Economics seminars to MUN debates — Kinexis works across every stream.</p>
          <div className="stream-tabs reveal">
            {streamTabs.map((tab) => (
              <button
                key={tab.key}
                className={`stab${activeStream === tab.key ? " active" : ""}`}
                onClick={() => switchStream(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="stream-grid reveal-grid" ref={streamGridRef} key={streamAnimKey}>
            {currentStream.map((s, i) => (
              <div className="scard" style={{ borderTopColor: s.color }} key={i}>
                <div className="scard-name">{s.name}</div>
                <div className="scard-count">{s.count}</div>
                <div className="scard-tags">
                  {s.tags.map((t) => (
                    <span className="scard-tag" key={t}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PROFILES */}
        <section className="sec-alt">
          <div className="eyebrow reveal" style={{ color: "var(--cyan)" }}>People on Kinexis</div>
          <div className="sec-h reveal">Your future teammates<br />are already here.</div>
          <p className="sec-sub reveal">Real students from every stream — showing what they&apos;re building, learning, and looking for.</p>
          <ProfileCardStack />
        </section>

        {/* PROJECTS */}
        <section className="sec">
          <div className="eyebrow reveal" style={{ color: "var(--purple)" }}>Open Projects</div>
          <div className="sec-h reveal">Ideas looking for builders.</div>
          <p className="sec-sub reveal">Real projects from students across every stream — each one needs someone like you.</p>
          <div className="projects-list reveal-list">
            {[
              { name: "Campus food delivery app", meta: "Aryan S. · BTech CSE · 3 members so far", skills: ["Flutter", "UI Design", "Firebase"], badge: "Open", badgeColor: "var(--lime)", borderColor: "var(--lime)" },
              { name: "Economics research — inflation & student spending", meta: "Priya K. · BSc Economics · 2 members so far", skills: ["Data Analysis", "Writing", "Excel"], badge: "Forming", badgeColor: "var(--cyan)", borderColor: "var(--cyan)" },
              { name: "Campus MUN 2025 — organising committee", meta: "Aanya K. · Intl Relations · 4 members so far", skills: ["Event Mgmt", "Writing", "Logistics"], badge: "Active", badgeColor: "var(--purple)", borderColor: "var(--purple)" },
              { name: "SIH 2025 — smart irrigation IoT system", meta: "Rohan V. · BTech ECE · 2 members so far", skills: ["IoT", "Python", "ML", "Hardware"], badge: "New", badgeColor: "var(--coral)", borderColor: "var(--coral)" },
            ].map((p, i) => (
              <div className="pj" style={{ borderLeftColor: p.borderColor }} key={i}>
                <div className="pj-l">
                  <div className="pj-name">{p.name}</div>
                  <div className="pj-meta">{p.meta}</div>
                  <div className="pj-skills">{p.skills.map((s) => <span className="pj-skill" key={s}>{s}</span>)}</div>
                </div>
                <div className="pj-r"><span className="pj-badge" style={{ color: p.badgeColor }}>{p.badge}</span></div>
              </div>
            ))}
          </div>
        </section>

        {/* EVENTS */}
        <section className="sec-alt">
          <div className="eyebrow reveal" style={{ color: "var(--coral)" }}>Happening on Campus</div>
          <div className="sec-h reveal">Never miss what&apos;s going on.</div>
          <p className="sec-sub reveal">Discover events, workshops, hackathons and socials at your college.</p>
          <div className="events-grid reveal-grid">
            {/* Featured event */}
            <div className="ecard ecard-featured" style={{ borderTopColor: "var(--lime)" }}>
              <div className="ef-left">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <span className="ecard-badge" style={{ color: "var(--lime)" }}>FEATURED · HACKATHON</span>
                  <span className="ecard-date">28 March 2025</span>
                </div>
                <div style={{ fontFamily: "var(--font-syne),'Syne',sans-serif", fontSize: "19px", fontWeight: 800, color: "#fff", lineHeight: 1.25, marginBottom: "8px" }}>
                  Smart India Hackathon<br />2025 — Campus Round
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>Organised by E-Cell · Open to all streams</div>
                <div className="ecard-footer">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="ecard-avs">
                      <div className="ecard-av" style={{ background: "var(--lime)" }}>A</div>
                      <div className="ecard-av" style={{ background: "var(--cyan)" }}>P</div>
                      <div className="ecard-av" style={{ background: "var(--purple)", color: "#fff" }}>R</div>
                      <div className="ecard-av" style={{ background: "var(--coral)", color: "#fff" }}>S</div>
                    </div>
                    <span className="ecard-going-text">48 students going</span>
                  </div>
                  <button className="ecard-join">Register →</button>
                </div>
              </div>
              <div className="ef-right">
                <div className="ef-num" style={{ color: "var(--lime)" }}>28</div>
                <div className="ef-month">MARCH</div>
                <div className="ef-loc">10:00 AM</div>
                <div className="ef-loc">Main Auditorium</div>
              </div>
            </div>

            {/* Regular events */}
            {[
              { type: "WORKSHOP", color: "var(--cyan)", date: "22 Mar", title: "Intro to ML for Non-CS Students", org: "Coding Club · Room 204", avs: [{ bg: "var(--cyan)", l: "M" }, { bg: "var(--purple)", l: "K", tc: "#fff" }], going: "22 going", btn: "RSVP →" },
              { type: "SOCIAL", color: "var(--coral)", date: "25 Mar", title: "Interdepartmental Open Mic Night", org: "Music Club · Amphitheatre", avs: [{ bg: "var(--coral)", l: "R", tc: "#fff" }, { bg: "var(--lime)", l: "S" }, { bg: "var(--cyan)", l: "T" }], going: "67 going", btn: "RSVP →" },
              { type: "TALK", color: "var(--purple)", date: "30 Mar", title: "From Campus to Startup: A Founder's Journey", org: "E-Cell · Seminar Hall", avs: [{ bg: "var(--purple)", l: "A", tc: "#fff" }, { bg: "var(--lime)", l: "B" }], going: "34 going", btn: "RSVP →" },
            ].map((ev, i) => (
              <div className="ecard" style={{ borderTopColor: ev.color }} key={i}>
                <div className="ecard-top"><span className="ecard-badge" style={{ color: ev.color }}>{ev.type}</span><span className="ecard-date">{ev.date}</span></div>
                <div className="ecard-body">
                  <div className="ecard-title">{ev.title}</div>
                  <div className="ecard-org">{ev.org}</div>
                  <div className="ecard-footer">
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div className="ecard-avs">
                        {ev.avs.map((a, j) => (
                          <div className="ecard-av" style={{ background: a.bg, color: a.tc || "#111" }} key={j}>{a.l}</div>
                        ))}
                      </div>
                      <span className="ecard-going-text">{ev.going}</span>
                    </div>
                    <button className="ecard-join">{ev.btn}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CLUBS */}
        <section className="sec">
          <div className="eyebrow reveal" style={{ color: "var(--purple)" }}>Student Clubs</div>
          <div className="sec-h reveal">Find your club. Or start one.</div>
          <p className="sec-sub reveal">40+ active student clubs across tech, arts, sports, culture, and entrepreneurship.</p>
          <div className="clubs-row reveal-grid">
            {[
              { name: "Coding Club", members: "234 members", tag: "Tech", color: "var(--lime)" },
              { name: "Music Society", members: "187 members", tag: "Arts", color: "var(--coral)" },
              { name: "E-Cell", members: "312 members", tag: "Startups", color: "var(--cyan)" },
              { name: "Robotics Club", members: "143 members", tag: "Tech", color: "var(--purple)" },
              { name: "Design Club", members: "98 members", tag: "Creative", color: "var(--lime)" },
              { name: "Photography", members: "112 members", tag: "Creative", color: "var(--coral)" },
              { name: "Finance Club", members: "167 members", tag: "Business", color: "var(--cyan)" },
              { name: "Drama Society", members: "89 members", tag: "Arts", color: "var(--purple)" },
              { name: "Sports Club", members: "276 members", tag: "Sports", color: "var(--lime)" },
              { name: "MUN Club", members: "134 members", tag: "Policy", color: "var(--coral)" },
            ].map((c, i) => (
              <div className="club-card" style={{ borderTopColor: c.color }} key={i}>
                <div className="club-name">{c.name}</div>
                <div className="club-members">{c.members}</div>
                <span className="club-tag">{c.tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* WHAT CHANGED */}
        <section className="sec-alt">
          <div className="eyebrow reveal" style={{ color: "var(--lime)" }}>The Difference</div>
          <div className="sec-h reveal">What changes when the<br />right people find each other.</div>
          <div className="transform-grid reveal-grid">
            <div className="tc before">
              <div className="tc-label">Before Kinexis</div>
              {[
                { icon: "💡", h: "Ideas stay ideas", d: "Great ideas die because you can't find the right people to build with." },
                { icon: "🔒", h: "Stuck in your department", d: "You only know 30 people from class. 1,000 others are invisible." },
                { icon: "🔇", h: "Seniors are strangers", d: "Freshers miss out on years of advice sitting just one batch above." },
                { icon: "📭", h: "Events go unnoticed", d: "Hackathons and workshops happen — most students never hear about them." },
              ].map((item, i) => (
                <div className="tc-item" key={i}><div className="tc-icon">{item.icon}</div><div><div className="tc-h">{item.h}</div><div className="tc-d">{item.d}</div></div></div>
              ))}
            </div>
            <div className="tc after">
              <div className="tc-label">With Kinexis</div>
              {[
                { icon: "🚀", h: "Ideas become projects", d: "Post what you're building. The right teammates find you through shared interests." },
                { icon: "🌐", h: "Your whole campus is visible", d: "Discover students across CSE, Economics, BMS, Sciences — any stream." },
                { icon: "🤝", h: "Seniors become mentors", d: "Connect with seniors who share your interests and have walked the path before." },
                { icon: "📡", h: "Nothing passes you by", d: "Follow clubs and interests. Every relevant event lands in your feed automatically." },
              ].map((item, i) => (
                <div className="tc-item" key={i}><div className="tc-icon">{item.icon}</div><div><div className="tc-h">{item.h}</div><div className="tc-d">{item.d}</div></div></div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO WE ARE */}
        <section className="sec">
          <div className="eyebrow reveal" style={{ color: "var(--coral)" }}>Who We Are</div>
          <div className="about-inner reveal">
            <div className="about-quote">
              We built Kinexis because we were tired of sitting next to our future teammates and <em>never knowing it.</em>
            </div>
            <p className="about-body">
              On every campus, students have big ideas, rare skills, and shared ambitions —
              but <b>departments keep them apart.</b> The CSE student who needs a designer.
              The Economics student who wants to start a research group.
              The ECE fresher who just needs one senior who gets it.<br /><br />
              Kinexis is the layer that finally connects all of it —
              <b>free, for every student, across every stream.</b>
            </p>
          </div>
        </section>

        {/* FINAL CTA */}
        <div className="final">
          <div className="final-inner reveal">
            <div className="final-glow" />
            <div className="final-h">Your campus is full of people<br />who <em>get it.</em></div>
            <p className="final-sub">Create your profile. Find your people. Build something real.</p>
            <div className="final-form">
              <input
                className="final-inp"
                id="waitlistEmail"
                placeholder="enter your college email"
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleWaitlistSubmit(); } }}
              />
              <button
                className="final-btn"
                id="waitlistBtn"
                type="button"
                disabled={waitlistSubmitting}
                style={waitlistSubmitting ? { opacity: 0.6 } : undefined}
                onClick={handleWaitlistSubmit}
              >
                Join waitlist →
              </button>
            </div>
            {waitlistMsg.text && (
              <div id="waitlistMsg" style={{ fontSize: "13px", marginTop: "8px", minHeight: "20px", position: "relative", zIndex: 2, color: waitlistMsg.color }}>
                {waitlistMsg.text}
              </div>
            )}

          </div>
        </div>

        {/* FOOTER */}
        <footer>
          <span className="foot-l">© 2025 Kinexis</span>
          <span className="foot-r">kinexis.in</span>
        </footer>
      </div>
    </>
  );
}
