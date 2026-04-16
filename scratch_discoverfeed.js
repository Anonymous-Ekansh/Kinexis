const fs = require('fs');
let content = fs.readFileSync('src/components/discover/DiscoverFeed.tsx', 'utf-8');

const regex = /export default function DiscoverFeed\(\) \{([\s\S]*?)  \/\* Paginated profiles for current view \*\//;

const replacement = `export default function DiscoverFeed({ initialData, userId }: { initialData: any, userId: string }) {
  const feedRef = useRef<HTMLDivElement>(null);

  const [allProfiles, setAllProfiles] = useState<any[]>(() => {
    if (!initialData || !initialData.initialFeedProfiles) return FALLBACK_PROFILES;
    const mapped = initialData.initialFeedProfiles.map(mapUserToProfile);
    const realIds = new Set(mapped.map((p: any) => p.id));
    const fallbackFiltered = FALLBACK_PROFILES.filter(p => !realIds.has(p.id));
    const combined = [...mapped, ...fallbackFiltered].slice(0, 10);
    return combined;
  });

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(allProfiles.length > PAGE_SIZE);

  const collabs = initialData?.initialCollabs
    ? initialData.initialCollabs.slice(0, 4).map((c: any, i: number) => {
        const spotsOpen = Math.max(0, (c.spots_total || 1) - (c.spots_filled || 0));
        const authorName = c.author?.full_name || null;
        const authorInitials = authorName ? authorName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "?";
        return {
          title: c.title || "Untitled Collab",
          subtitle: \`\${c.category || "Social"} · \${c.spots_filled || 1} members\`,
          needs: (c.looking_for || [])[0] || "Collaborator",
          members: [{ initials: authorInitials, bg: ACCENT_COLORS[i % ACCENT_COLORS.length] }],
          spotsOpen,
          tags: (c.tags || []).slice(0, 3),
          accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
        };
      })
    : [];

  const events = initialData?.initialEvents
    ? initialData.initialEvents.map((ev: any, i: number) => {
        const eventDate = ev.event_date ? new Date(ev.event_date) : null;
        const day = eventDate ? eventDate.getDate().toString() : "";
        const month = eventDate
          ? eventDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
          : "";
        const rawType = ev.event_type || ev.type || ev.metadata?.tags?.[0] || "Event";
        const orgName = ev.metadata?.organizer || ev.clubs?.name || "Campus";
        const location = ev.location || ev.metadata?.location || ev.metadata?.event_location || null;
        return {
          type: rawType,
          title: ev.title || "Untitled Event",
          org: orgName,
          accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
          attendees: [],
          featured: i === 0,
          date: { day, month },
          location,
        };
      })
    : [];

  const clubs = initialData?.initialClubs
    ? initialData.initialClubs.map((club: any, i: number) => {
        const accentVar = club.accent_color
          ? (["lime", "cyan", "purple", "coral"].includes(club.accent_color.toLowerCase())
            ? \`var(--\${club.accent_color.toLowerCase()})\`
            : club.accent_color)
          : ACCENT_COLORS[i % ACCENT_COLORS.length];
        return {
          name: club.name || "Unnamed Club",
          members: club.follower_count || 0,
          category: club.category || "General",
          accent: accentVar,
        };
      })
    : [];

  const trendingTags = initialData?.initialTrendingTags || [];

  /* Real-time subscription for new users */
  useEffect(() => {
    const channel = supabase
      .channel("discover-users")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "users" }, (payload) => {
        const newUser = payload.new;
        if (newUser.id === userId) return;
        const mapped = mapUserToProfile(newUser, allProfiles.length);
        setAllProfiles(prev => {
          if (prev.some(p => p.id === mapped.id)) return prev;
          return [mapped, ...prev];
        });
        setHasMore(true);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [userId, allProfiles.length]);

  /* Paginated profiles for current view */`;

let newContent = content.replace(regex, replacement);

// Remove loading indicators
newContent = newContent.replace(/\{loadingTrending \? \([\s\S]*?\) : trendingTags\.length === 0/g, "{trendingTags.length === 0");
newContent = newContent.replace(/\{loadingProfiles \? \([\s\S]*?\) : loadingMore \? \([\s\S]*?\) : \(/g, "{(");
// remove } )} wait, the JSX ending for the skeleton needs care.
// Let's do string replacement for the parts in JSX instead of regex which might be brittle.
fs.writeFileSync('src/components/discover/DiscoverFeed.tsx.new', newContent);
