"use client";

import { useState, useEffect, useRef } from "react";
import { 
  motion, 
  useMotionValue, 
  useAnimationFrame, 
  animate, 
  useTransform, 
  MotionValue, 
  useSpring,
  PanInfo
} from "framer-motion";

/* ── Profile Data ── */
export interface ProfileData {
  initials: string;
  name: string;
  batch: string;
  stream: string;
  tags: string[];
  status: string;
  color: string;
  textColor?: string;
  bio: string;
  projects: string[];
}

const profiles: ProfileData[] = [
  {
    initials: "NK", name: "Novesh Kaushik", batch: "1st yr", stream: "BTech CSE",
    tags: ["AI", "CP", "Hackathon"], status: "Looking for hackathon team",
    color: "var(--lime)", bio: "Competitive programmer obsessed with AI-powered tools. Won 3 national hackathons last year. Currently exploring LLM agents and fine-tuning.",
    projects: ["AI chatbot for campus queries", "Leetcode rating tracker"],
  },
  {
    initials: "EJ", name: "Ekansh Jain", batch: "1st yr", stream: "BTech CSE",
    tags: ["Startups", "React", "Trading"], status: "Building something cool",
    color: "var(--cyan)", bio: "Full-stack dev with a passion for fintech. Building trading dashboards and consumer apps. Always looking for co-founders.",
    projects: ["Student stock portfolio app", "Campus marketplace MVP"],
  },
  {
    initials: "MG", name: "Misti Garg", batch: "1st yr", stream: "BTech CSE",
    tags: ["ML", "Research", "NLP"], status: "Looking for research collab",
    color: "var(--purple)", textColor: "#fff", bio: "Research-oriented student working on ML papers. Interested in NLP and computer vision.",
    projects: ["Sentiment analysis on campus reviews", "Image classification pipeline"],
  },
  {
    initials: "SM", name: "Sneha Mehta", batch: "4th yr", stream: "BMS",
    tags: ["Marketing", "Branding", "Ops"], status: "Mentoring juniors on placements",
    color: "var(--coral)", textColor: "#fff", bio: "Campus placement coordinator with internships at top brands. Loves building GTM strategies.",
    projects: ["Campus hiring portal", "Student brand ambassador network"],
  },
  {
    initials: "AK", name: "Aanya Kumar", batch: "2nd yr", stream: "Intl Relations",
    tags: ["MUN", "Policy", "Debating"], status: "Organising campus MUN",
    color: "var(--lime)", bio: "Delegate at 12+ national MUN conferences. Passionate about diplomacy and public policy.",
    projects: ["Campus MUN 2025", "Policy brief on education reform"],
  },
  {
    initials: "NR", name: "Nikhil Rao", batch: "3rd yr", stream: "Eco + Finance",
    tags: ["Investing", "FinTech", "Startups"], status: "Building a student VC fund",
    color: "var(--cyan)", bio: "Aspiring venture capitalist. Runs a student investment circle.",
    projects: ["Student micro-VC fund", "FinLit workshop series"],
  },
  {
    initials: "PD", name: "Priya Desai", batch: "2nd yr", stream: "BSc Physics",
    tags: ["Quantum", "Research", "Python"], status: "Looking for lab partners",
    color: "var(--purple)", textColor: "#fff", bio: "Quantum computing enthusiast exploring qubits and quantum algorithms.",
    projects: ["Quantum random walk simulator", "Physics visualisation toolkit"],
  },
  {
    initials: "RT", name: "Rohan Tiwari", batch: "3rd yr", stream: "BTech ECE",
    tags: ["IoT", "Embedded", "Robotics"], status: "Recruiting for SIH team",
    color: "var(--coral)", textColor: "#fff", bio: "Hardware hacker and embedded systems enthusiast. Built 3 IoT prototypes.",
    projects: ["Smart irrigation IoT system", "Campus air quality monitor"],
  },
];

const TOTAL = profiles.length;

export default function ProfileCardStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 480 });
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  // Core rotation value
  const rotationRaw = useMotionValue(0);
  // Spring for "butter smooth" movement
  const rotation = useSpring(rotationRaw, {
    stiffness: 60,
    damping: 30,
    mass: 1
  });

  // Auto-spin velocity (slightly slower)
  // Spin faster when idle, slow down / stop when interacting
  const AUTO_SPIN_SPEED = isHovered || isInteracting ? 0.05 : 0.35; 

  /* Measure container */
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width, h: rect.height });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* Continuous Auto-Rotation Loop */
  useAnimationFrame((time, delta) => {
    if (!isInteracting) {
      const current = rotationRaw.get();
      // Increase rotation based on time delta for consistent speed across refresh rates
      rotationRaw.set(current + AUTO_SPIN_SPEED * (delta / 16.67));
    }
  });

  /* Active Index tracking for Navigation Dots */
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    return rotation.on("change", (v) => {
      let closestIdx = 0;
      let minDiff = 360;
      for (let i = 0; i < TOTAL; i++) {
        const offset = (360 / TOTAL) * i;
        let angle = (v + offset) % 360;
        if (angle < 0) angle += 360;
        let diff = Math.abs(angle - 90);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) { minDiff = diff; closestIdx = i; }
      }
      setActiveIndex(closestIdx);
    });
  }, [rotation]);

  /* Manual Click to Rotate */
  const handleCardClick = (index: number) => {
    if (isInteracting) return;

    const angleOffset = (360 / TOTAL) * index;
    const currentRot = rotationRaw.get();
    
    // Find shortest angular path to target (90 - offset)
    const targetBase = 90 - angleOffset;
    let normalizedCurrent = ((currentRot % 360) + 360) % 360;
    let targetNormalized = ((targetBase % 360) + 360) % 360;
    
    let diff = targetNormalized - normalizedCurrent;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    animate(rotationRaw, currentRot + diff, {
      type: "spring", stiffness: 100, damping: 25, mass: 1
    });
  };

  /* Unified Pan Gesture Handler (Mouse/Touch) */
  const onPan = (event: any, info: PanInfo) => {
    // Map linear X movement to angular rotation
    // Invert the direction so swipe-left moves cards left and swipe-right moves them right
    const sensitivity = 0.25; 
    const deltaRot = info.delta.x * sensitivity;
    rotationRaw.set(rotationRaw.get() - deltaRot);
  };

  const isMobile = containerSize.w < 768;
  const isSmallMobile = containerSize.w < 480;

  // Stretch the arc MUCH wider on mobile to give extreme breathing room
  const radiusX = isSmallMobile ? containerSize.w * 0.80 : isMobile ? containerSize.w * 0.55 : containerSize.w * 0.38;
  const radiusY = isMobile ? containerSize.h * 0.20 : containerSize.h * 0.30;
  const centerX = containerSize.w / 2;
  const centerY = isMobile ? containerSize.h * 0.85 : containerSize.h * 0.85;

  return (
    <div className="arc-section" style={{ overflow: 'hidden' }}>
      <div
        className="arc-carousel-layout"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          position: 'relative', 
          perspective: 1200, 
          userSelect: 'none',
          touchAction: 'none'
        }}
      >

        {/* The interactive stage */}
        <motion.div 
          className="arc-stage" 
          ref={containerRef}
          onPanStart={() => setIsInteracting(true)}
          onPan={onPan}
          onPanEnd={() => setIsInteracting(false)}
          style={{ 
            cursor: isInteracting ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        >
          {profiles.map((profile, index) => (
            <ProfileCardNode
              key={profile.name}
              profile={profile}
              index={index}
              total={TOTAL}
              globalRotation={rotation} 
              radiusX={radiusX}
              radiusY={radiusY}
              centerX={centerX}
              centerY={centerY}
              isMobile={isMobile}
              isSmallMobile={isSmallMobile}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </motion.div>

        {/* Navigation dots */}
        <div className="arc-dots">
          {profiles.map((p, i) => (
            <button
              key={i}
              className={`arc-dot ${i === activeIndex ? "arc-dot-active" : ""}`}
              onClick={() => handleCardClick(i)}
              aria-label={`Go to ${p.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileCardNode({ 
  profile, index, total, globalRotation,
  radiusX, radiusY, centerX, centerY, 
  isMobile, isSmallMobile, onClick
}: {
  profile: ProfileData;
  index: number;
  total: number;
  globalRotation: MotionValue<number>;
  radiusX: number;
  radiusY: number;
  centerX: number;
  centerY: number;
  isMobile: boolean;
  isSmallMobile: boolean;
  onClick: () => void;
}) {

  const angleOffset = (360 / total) * index;
  // Further reduce card size on mobile (from 180 to 160) for personal breathing room
  const cardWidth = isSmallMobile ? 160 : isMobile ? 210 : 260;
  const cardHeight = isSmallMobile ? 230 : isMobile ? 270 : 320;

  // X position
  const x = useTransform(globalRotation, (rot: number) => {
    const angleDeg = (rot + angleOffset) % 360;
    const angleRad = angleDeg * (Math.PI / 180);
    return centerX + radiusX * Math.cos(angleRad) - (cardWidth / 2);
  });

  // Y position
  const y = useTransform(globalRotation, (rot: number) => {
    const angleDeg = (rot + angleOffset) % 360;
    const angleRad = angleDeg * (Math.PI / 180);
    return centerY - radiusY * Math.sin(angleRad) - (cardHeight / 2);
  });

  // Scale: Sharp drop-off for mobile to emphasize the center card
  const scale = useTransform(globalRotation, (rot: number) => {
    let currentAngle = (rot + angleOffset) % 360;
    if (currentAngle < 0) currentAngle += 360;

    let distFromTop = Math.abs(currentAngle - 90);
    if (distFromTop > 180) distFromTop = 360 - distFromTop;

    const progress = distFromTop / 180; 
    const minScale = isMobile ? 0.45 : 0.65;
    return 1 - (progress * (1 - minScale));
  });

  // RotationY: Wheel tilt
  const rotateY = useTransform(globalRotation, (rot: number) => {
    let currentAngle = (rot + angleOffset) % 360;
    if (currentAngle < 0) currentAngle += 360;
    
    let delta = currentAngle - 90;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    return delta * (isMobile ? 0.3 : 0.45);
  });

  // Opacity: Much sharper fade on mobile so only 3 cards are clearly visible
  const opacity = useTransform(globalRotation, (rot: number) => {
    let currentAngle = (rot + angleOffset) % 360;
    if (currentAngle < 0) currentAngle += 360;

    // Narrower focus cone for mobile
    const cone = isMobile ? 40 : 60;
    const center = 90;
    
    let distFromCenter = Math.abs(currentAngle - center);
    if (distFromCenter > 180) distFromCenter = 360 - distFromCenter;

    if (distFromCenter < cone) return 1;
    
    const fadeRange = isMobile ? 40 : 60;
    return Math.max(0, 1 - (distFromCenter - cone) / fadeRange);
  });

  // Z-Index: Highest at the center top (90)
  const zIndex = useTransform(globalRotation, (rot: number) => {
    let currentAngle = (rot + angleOffset) % 360;
    if (currentAngle < 0) currentAngle += 360;
    let distFromTop = Math.abs(currentAngle - 90);
    if (distFromTop > 180) distFromTop = 360 - distFromTop;
    return Math.floor(200 - distFromTop);
  });

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 0, left: 0,
        x, y, scale, rotateY, opacity, zIndex,
        width: cardWidth,
        height: cardHeight,
        transformStyle: 'preserve-3d',
        pointerEvents: 'auto'
      }}
      onClick={onClick}
    >
      <div 
        className="arc-full-card" 
        style={{ 
          borderColor: profile.color, 
          height: '100%', 
          margin: 0,
          background: 'rgba(34, 34, 58, 0.95)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          padding: isSmallMobile ? '16px 14px' : '22px 20px'
        }}
      >
        <div className="arc-fc-avatar-wrap" style={{ marginTop: isSmallMobile ? 4 : 8, marginBottom: isSmallMobile ? 10 : 14 }}>
          <div
            className="arc-fc-avatar"
            style={{ 
              background: profile.color, 
              color: profile.textColor || "#111",
              width: isSmallMobile ? 48 : 64,
              height: isSmallMobile ? 48 : 64,
              fontSize: isSmallMobile ? 16 : 20
            }}
          >
            {profile.initials}
          </div>
        </div>
        <div className="arc-fc-info">
          <div className="arc-fc-name" style={{ fontSize: isSmallMobile ? 13 : 15 }}>{profile.name}</div>
          <div className="arc-fc-stream" style={{ fontSize: isSmallMobile ? 10 : 12, opacity: 0.7 }}>{profile.stream}</div>
        </div>
        
        {!isSmallMobile && (
          <div className="arc-fc-tags" style={{ marginTop: 12 }}>
            {profile.tags.slice(0, 3).map((tag) => (
              <span className="arc-fc-tag" key={tag}>{tag}</span>
            ))}
          </div>
        )}
        
        <div className="arc-fc-status" style={{ fontSize: isSmallMobile ? 10 : 12, marginTop: 'auto' }}>
          <div className="arc-fc-dot" style={{ background: profile.color }} />
          {profile.status}
        </div>
      </div>
    </motion.div>
  );
}
