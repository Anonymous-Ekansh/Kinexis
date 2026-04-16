const fs = require('fs');
let content = fs.readFileSync('src/app/events/EventsPageClient.tsx', 'utf-8');

// Replace InterestButton
content = content.replace(/function InterestButton\(\{ eventId, userId \}: \{ eventId: string; userId: string \}\) \{[\s\S]*?const handleToggle/, `function InterestButton({ eventId, userId, initialCount, initialInterested }: { eventId: string; userId: string; initialCount: number; initialInterested: boolean }) {
  const [isInterested, setIsInterested] = useState(initialInterested);
  const [count, setCount] = useState(initialCount);

  const handleToggle`);

// Replace Signature & State
content = content.replace(/export default function EventsPageClient\(\{ userId \}: \{ userId: string \}\) \{[\s\S]*?  useEffect\(\(\) => \{[\s\S]*?    fetchEvents\(\);[\s\S]*?    return \(\) => \{ m = false; supabase\.removeChannel\(channel\); \};[\s\S]*?  \}, \[userId\]\);/, `export default function EventsPageClient({ userId, initialData }: { userId: string, initialData: any }) {
  const [allEvents, setAllEvents] = useState<any[]>(initialData?.initialEvents || []);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [organizerMap, setOrganizerMap] = useState<Record<string, string>>(initialData?.initialOrganizerMap || {});
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set(initialData?.initialInterestedIds || []));`);

// Fix the InterestButton instantiations:
// 1. In featured event
content = content.replace(/<InterestButton eventId=\{featuredEvent\.id\} userId=\{userId\} \/>/g, `<InterestButton eventId={featuredEvent.id} userId={userId} initialCount={featuredEvent.rsvp_count || 0} initialInterested={interestedIds.has(featuredEvent.id)} />`);

// 2. In normal event loop
content = content.replace(/<InterestButton eventId=\{ev\.id\} userId=\{userId\} \/>/g, `<InterestButton eventId={ev.id} userId={userId} initialCount={ev.rsvp_count || 0} initialInterested={interestedIds.has(ev.id)} />`);

fs.writeFileSync('src/app/events/EventsPageClient.tsx', content);
