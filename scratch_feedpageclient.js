const fs = require('fs');
let content = fs.readFileSync('src/app/feed/FeedPageClient.tsx', 'utf-8');

// Replace the signature and state
const newSig = `export default function FeedPageClient({ userId, initialData }: { userId: string, initialData: any }) {
  /* State */
  const [posts, setPosts] = useState<any[]>(initialData?.initialPosts || []);
  const [votes, setVotes] = useState<Record<string, { total: number; userVote: number }>>(initialData?.initialVotes || {});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [sortBy, setSortBy] = useState("Top Upvoted");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(initialData?.initialProfile || null);

  /* Modal */`;

content = content.replace(/export default function FeedPageClient\(\{ userId \}: \{ userId: string \}\) \{[\s\S]*?\/\* Modal \*\//, newSig);

// Remove the fetch profile, fetchPosts, fetchLeaderboard, fetchTrending, and real time hooks.
// We will replace them with derived state or manual updates in handleSubmit.

// For leaderboard and trending, since they are static we just use them from initialData.
// Wait, leaderboard and trending are state currently. Let's just update the initial state of those:
content = content.replace(/const \[leaderboard, setLeaderboard\] = useState<any\[\]>\(\[\]\);/g, "const [leaderboard, setLeaderboard] = useState<any[]>(initialData?.initialLeaderboard || []);");
content = content.replace(/const \[trendingTags, setTrendingTags\] = useState<string\[\]>\(\[\]\);/g, "const [trendingTags, setTrendingTags] = useState<string[]>(initialData?.initialTrendingTags || []);");

// Remove everything from /* ── Fetch profile ── */ down to /* ── Vote handler ── */
content = content.replace(/\/\* ── Fetch profile ── \*\/[\s\S]*?\/\* ── Vote handler ── \*\//, '/* ── Vote handler ── */');

// In handleSubmit, we need to manually prepend the post to posts since realtime is gone.
content = content.replace(/const newPost = newPosts\?\.\[0\];/g, `const newPost = newPosts?.[0];
    if (newPost) {
      const enrichedNewPost = {
        ...newPost,
        author: formAnon ? null : profile
      };
      setPosts(prev => [enrichedNewPost, ...prev]);
    }`);

fs.writeFileSync('src/app/feed/FeedPageClient.tsx', content);
