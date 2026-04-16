export type ClubAccent = "lime" | "cyan" | "purple" | "coral";

export type ChannelClub = {
  id: string;
  name: string;
  icon: string;
  accent: ClubAccent;
  hasUnread: boolean;
  section: "member" | "following";
  memberCount: number;
  lastActivity: string;
  channelBadges: string[];
  description: string;
  statsLine: string;
  pinned: string;
  leads: { name: string; role: string; initials: string }[];
  upcomingEvents: {
    id: string;
    title: string;
    date: string;
    type: string;
    typeTone: "workshop" | "deadline" | "meetup" | "default";
  }[];
};

export type PostType = "Announcement" | "Event" | "Poll" | "Update" | "Media";

export type ChannelPost = {
  id: string;
  clubId: string;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  time: string;
  type: PostType;
  bodyHtml?: string;
  imageUrl?: string;
  eventEmbed?: {
    title: string;
    date: string;
    time: string;
    location: string;
    tags: string[];
    seats: string;
  };
  poll?: {
    question: string;
    options: { label: string; votes: number }[];
  };
  likes: number;
  comments: { name: string; initials: string; text: string }[];
};

export const ACCENT_HEX: Record<ClubAccent, string> = {
  lime: "#9EF01A",
  cyan: "#22D3EE",
  purple: "#A78BFA",
  coral: "#FB7185",
};

export const CHANNEL_CLUBS: ChannelClub[] = [
  {
    id: "cipher",
    name: "Cipher",
    icon: "CP",
    accent: "lime",
    hasUnread: true,
    section: "member",
    memberCount: 1240,
    lastActivity: "Active today",
    channelBadges: ["OFFICIAL CHANNEL", "ANNOUNCEMENTS"],
    description:
      "Competitive programming & DSA community. Weekly contests, editorials, and interview prep.",
    statsLine: "· 1.2k members · 48 posts · Active today",
    pinned:
      "Welcome to Cipher’s channel — check pinned resources for the contest calendar and how to get rated on the internal leaderboard.",
    leads: [
      { name: "Rohan Sharma", role: "Club Lead", initials: "RS" },
      { name: "Priya Mehta", role: "Tech Lead", initials: "PM" },
      { name: "Arjun Nair", role: "Contest Lead", initials: "AN" },
      { name: "Sneha Iyer", role: "Outreach", initials: "SI" },
    ],
    upcomingEvents: [
      {
        id: "e1",
        title: "Weekly Contest #42",
        date: "Mar 28",
        type: "Contest",
        typeTone: "default",
      },
      {
        id: "e2",
        title: "Graphs Deep Dive",
        date: "Apr 2",
        type: "Workshop",
        typeTone: "workshop",
      },
      {
        id: "e3",
        title: "ICPC Tryouts Close",
        date: "Apr 8",
        type: "Deadline",
        typeTone: "deadline",
      },
    ],
  },
  {
    id: "acm",
    name: "ACM SNU",
    icon: "AC",
    accent: "cyan",
    hasUnread: true,
    section: "following",
    memberCount: 890,
    lastActivity: "2h ago",
    channelBadges: ["OFFICIAL CHANNEL"],
    description: "ACM Student Chapter — algorithms, systems, and campus tech events.",
    statsLine: "· 890 members · 31 posts · Active today",
    pinned: "ACM membership drive closes this Friday — fill the Google Form linked in bio.",
    leads: [
      { name: "Dev Kapoor", role: "Chair", initials: "DK" },
      { name: "Neha Bose", role: "Vice Chair", initials: "NB" },
    ],
    upcomingEvents: [
      { id: "a1", title: "Systems Reading Group", date: "Mar 25", type: "Meetup", typeTone: "meetup" },
    ],
  },
  {
    id: "analytica",
    name: "Analytica",
    icon: "AN",
    accent: "lime",
    hasUnread: false,
    section: "member",
    memberCount: 410,
    lastActivity: "Yesterday",
    channelBadges: ["ANNOUNCEMENTS"],
    description: "Data science, analytics competitions, and industry talks.",
    statsLine: "· 410 members · 22 posts · Active yesterday",
    pinned: "Dataset of the month: campus sustainability survey — contribute on the shared drive.",
    leads: [{ name: "Kavya Reddy", role: "Lead", initials: "KR" }],
    upcomingEvents: [],
  },
  {
    id: "ai",
    name: "AI Club SNU",
    icon: "AI",
    accent: "purple",
    hasUnread: false,
    section: "following",
    memberCount: 760,
    lastActivity: "3h ago",
    channelBadges: ["OFFICIAL CHANNEL"],
    description: "ML reading groups, paper clubs, and build nights.",
    statsLine: "· 760 members · 56 posts · Active today",
    pinned: "Next paper club: Attention Is All You Need — skim sections 1–3 before session.",
    leads: [{ name: "Ishaan Verma", role: "President", initials: "IV" }],
    upcomingEvents: [],
  },
  {
    id: "inferno",
    name: "Inferno",
    icon: "IF",
    accent: "coral",
    hasUnread: false,
    section: "member",
    memberCount: 320,
    lastActivity: "5h ago",
    channelBadges: ["OFFICIAL CHANNEL", "MEDIA"],
    description: "Dance crew — showcases, workshops, and audition updates.",
    statsLine: "· 320 members · 18 posts · Active today",
    pinned: "Audition slot booking opens Monday 9 AM — link drops here first.",
    leads: [{ name: "Meera Joshi", role: "Captain", initials: "MJ" }],
    upcomingEvents: [],
  },
  {
    id: "pixels",
    name: "Pixels",
    icon: "PX",
    accent: "cyan",
    hasUnread: false,
    section: "following",
    memberCount: 280,
    lastActivity: "1d ago",
    channelBadges: ["ANNOUNCEMENTS"],
    description: "Design community — UI/UX critiques and brand sprints.",
    statsLine: "· 280 members · 14 posts",
    pinned: "Figma library refresh — use the new component kit for all club decks.",
    leads: [{ name: "Aditya Sen", role: "Creative Lead", initials: "AS" }],
    upcomingEvents: [],
  },
  {
    id: "ecell",
    name: "E-Cell SNU",
    icon: "EC",
    accent: "purple",
    hasUnread: false,
    section: "following",
    memberCount: 540,
    lastActivity: "Active today",
    channelBadges: ["OFFICIAL CHANNEL"],
    description: "Entrepreneurship cell — pitch nights, founder talks, incubation.",
    statsLine: "· 540 members · 40 posts · Active today",
    pinned: "Pitch deck clinic this Wednesday — sign up in #events.",
    leads: [{ name: "Rahul Anand", role: "Secretary", initials: "RA" }],
    upcomingEvents: [],
  },
  {
    id: "tedx",
    name: "TEDx SNU",
    icon: "TX",
    accent: "lime",
    hasUnread: false,
    section: "following",
    memberCount: 610,
    lastActivity: "4h ago",
    channelBadges: ["ANNOUNCEMENTS"],
    description: "Ideas worth spreading — speaker curation and salon events.",
    statsLine: "· 610 members · 27 posts",
    pinned: "Salon theme vote closes tonight — react with emoji on the form message.",
    leads: [{ name: "Ananya Ghosh", role: "Licensee", initials: "AG" }],
    upcomingEvents: [],
  },
  {
    id: "go_green",
    name: "Go Green",
    icon: "GG",
    accent: "lime",
    hasUnread: false,
    section: "following",
    memberCount: 190,
    lastActivity: "2d ago",
    channelBadges: ["OFFICIAL CHANNEL"],
    description: "Sustainability drives, waste audits, and campus green initiatives.",
    statsLine: "· 190 members · 9 posts",
    pinned: "Campus cleanup: Saturday 7 AM at Main Gate — bring gloves.",
    leads: [{ name: "Vikram Patil", role: "Coordinator", initials: "VP" }],
    upcomingEvents: [],
  },
  {
    id: "faction",
    name: "FACTion",
    icon: "FA",
    accent: "cyan",
    hasUnread: false,
    section: "following",
    memberCount: 240,
    lastActivity: "Yesterday",
    channelBadges: ["ANNOUNCEMENTS"],
    description: "Fact-checking & media literacy — workshops and publication reviews.",
    statsLine: "· 240 members · 11 posts",
    pinned: "New verification checklist for club posts — mandatory for all leads.",
    leads: [{ name: "Zara Khan", role: "Editor", initials: "ZK" }],
    upcomingEvents: [],
  },
];

export const CHANNEL_POSTS: ChannelPost[] = [
  {
    id: "p1",
    clubId: "cipher",
    authorName: "Rohan Sharma",
    authorRole: "Club Lead",
    authorInitials: "RS",
    time: "2h ago",
    type: "Event",
    bodyHtml:
      "<p>We’re hosting a <strong>live problem walkthrough</strong> for last week’s contest — bring your solutions and we’ll compare approaches.</p>",
    eventEmbed: {
      title: "Contest Debrief & Upsolving",
      date: "Mar 24",
      time: "6:00 PM",
      location: "Lab 3 · Block B",
      tags: ["Graphs", "Greedy", "Binary Search"],
      seats: "Open seating",
    },
    likes: 38,
    comments: [
      { name: "Aman K", initials: "AK", text: "Will slides be posted after?" },
      { name: "Rohan Sharma", initials: "RS", text: "Yes, same evening in this channel." },
    ],
  },
  {
    id: "p2",
    clubId: "cipher",
    authorName: "Priya Mehta",
    authorRole: "Tech Lead",
    authorInitials: "PM",
    time: "Yesterday",
    type: "Update",
    bodyHtml:
      "<p>HackSNU wrap-up 🏆 Thanks to everyone who shipped. <strong>Top 3 teams</strong> will present at the Cipher showcase next week.</p>",
    likes: 92,
    comments: [{ name: "Neha", initials: "N", text: "Congrats all!" }],
  },
  {
    id: "p3",
    clubId: "cipher",
    authorName: "Arjun Nair",
    authorRole: "Contest Lead",
    authorInitials: "AN",
    time: "3d ago",
    type: "Poll",
    bodyHtml: "<p>Which topic should we run a <strong>mini-series</strong> on next?</p>",
    poll: {
      question: "Next focus",
      options: [
        { label: "DP on trees", votes: 42 },
        { label: "Number theory", votes: 28 },
        { label: "Flow & matching", votes: 19 },
      ],
    },
    likes: 24,
    comments: [],
  },
  {
    id: "p4",
    clubId: "cipher",
    authorName: "Sneha Iyer",
    authorRole: "Outreach",
    authorInitials: "SI",
    time: "5d ago",
    type: "Media",
    bodyHtml: "<p>Throwback from our <strong>winter bootcamp</strong> — more photos in the drive.</p>",
    imageUrl:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    likes: 61,
    comments: [],
  },
  {
    id: "p5",
    clubId: "cipher",
    authorName: "Rohan Sharma",
    authorRole: "Club Lead",
    authorInitials: "RS",
    time: "1w ago",
    type: "Announcement",
    bodyHtml:
      "<ul><li>Contest calendar updated</li><li>New <strong>Ladder</strong> problems dropped</li><li>Pair with a mentor via the form</li></ul>",
    likes: 47,
    comments: [],
  },
  {
    id: "p6",
    clubId: "acm",
    authorName: "Dev Kapoor",
    authorRole: "Chair",
    authorInitials: "DK",
    time: "4h ago",
    type: "Announcement",
    bodyHtml: "<p>Guest lecture on <strong>distributed systems</strong> — RSVP in events tab.</p>",
    likes: 18,
    comments: [],
  },
];

export function getClubById(id: string): ChannelClub | undefined {
  return CHANNEL_CLUBS.find((c) => c.id === id);
}

export function postsForClub(clubId: string): ChannelPost[] {
  return CHANNEL_POSTS.filter((p) => p.clubId === clubId);
}
