"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ACCENT_HEX, type ClubAccent } from "@/data/channelsMock";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "./cropImage";
import { PencilIcon, TrashIcon, PinIcon, CalendarIcon, MapPinIcon, LockIcon, LinkIcon, ChartIcon, DotsIcon, PaperclipIcon, ThumbsUpIcon, ThumbsDownIcon, MessageSquareIcon, BoltIcon } from "./icons";
import "./channels.css";

type SidebarClub = { id: string; name: string; initials: string; accent: ClubAccent; description: string; follower_count: number; pinned_message: string | null; category: string; type: string; tags: string[]; role: string; };
type Post = { id: string; club_id: string; author_id: string; post_type: string; title: string | null; body: string; image_url: string | null; edited: boolean; metadata: any; created_at: string; author_name: string; author_avatar: string | null; author_initials: string; };
type EventItem = { id: string; title: string | null; metadata: any; created_at: string; };
type LeadItem = { id: string; full_name: string; avatar_url: string | null; stream: string; year: string; initials: string; };
type MemberItem = LeadItem & { role: string; membership_id: string; };
type EmojiCounts = Record<string, Record<string, number>>;
type UserReactions = Record<string, Set<string>>;

const TABS = ["Posts", "Events", "Members", "About"] as const;
type TabId = (typeof TABS)[number];

const POST_TYPE_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  update: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", label: "Update" },
  announcement: { bg: "rgba(158,240,26,0.1)", border: "rgba(158,240,26,0.22)", color: "#9EF01A", label: "Announcement" },
  event: { bg: "rgba(34,211,238,0.1)", border: "rgba(34,211,238,0.22)", color: "#22D3EE", label: "Upcoming Event" },
  resource: { bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.22)", color: "#A78BFA", label: "Resource" },
  poll: { bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.22)", color: "#A78BFA", label: "Poll" },
};

function accentStyle(accent: ClubAccent): CSSProperties {
  const hex = ACCENT_HEX[accent] || ACCENT_HEX.lime;
  return { ["--row-accent" as string]: hex, ["--hero-glow" as string]: `${hex}99`, ["--hero-av" as string]: hex, ["--av-bg" as string]: hex, ["--post-av-bg" as string]: hex, ["--tab-accent" as string]: hex, ["--poll-accent" as string]: hex };
}
function getInitials(name: string): string { if (!name) return "?"; const w = name.split(" ").filter(x => x); return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase(); }
function timeAgo(d: string): string { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const dy = Math.floor(h / 24); if (dy < 7) return `${dy}d ago`; return `${Math.floor(dy / 7)}w ago`; }
function getLastVisited(cid: string): number { try { return parseInt(localStorage.getItem(`ch_visited_${cid}`) || "0", 10); } catch { return 0; } }
function setLastVisited(cid: string) { try { localStorage.setItem(`ch_visited_${cid}`, String(Date.now())); } catch {} }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function formatEventDate(isoString: string) { const d = new Date(isoString); const dp = d.toLocaleDateString("en-US", { month: "long", day: "numeric" }); if (isoString.includes("T") && !isoString.endsWith("T00:00:00.000Z") && !isoString.endsWith("T00:00:00Z")) { return `${dp} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`; } return dp; }
function getBadgeStyle(type: string) { const t = type.toLowerCase(); if (t === "workshop") return { background: "rgba(34,211,238,0.1)", color: "#22D3EE", border: "1px solid rgba(34,211,238,0.22)" }; if (t === "hackathon") return { background: "rgba(251,113,133,0.1)", color: "#FB7185", border: "1px solid rgba(251,113,133,0.22)" }; if (t === "deadline") return { background: "rgba(158,240,26,0.1)", color: "#9EF01A", border: "1px solid rgba(158,240,26,0.22)" }; if (t === "talk") return { background: "rgba(167,139,250,0.1)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.22)" }; return { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid transparent" }; }

export default function ChannelsPageClient({ userId, initialData }: { userId: string, initialData: any }) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>(initialData?.userRole || "user");
  const [clubs, setClubs] = useState<SidebarClub[]>(initialData?.initialClubs || []);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [roleByClub, setRoleByClub] = useState<Record<string, string>>(initialData?.initialRoleByClub || {});
  const [activeId, setActiveId] = useState<string | null>(initialData?.initialActiveId || null);
  const [posts, setPosts] = useState<Post[]>(initialData?.initialPosts || []);
  const [postsLoading, setPostsLoading] = useState(false);
  const [emojiCounts, setEmojiCounts] = useState<EmojiCounts>(initialData?.initialEmojiCounts || {});
  
  useEffect(() => {
    if (initialData) {
      setUserRole(initialData.userRole || "user");
      setClubs(initialData.initialClubs || []);
      setRoleByClub(initialData.initialRoleByClub || {});
      setFollowingByClub(initialData.initialFollowingByClub || {});
    }
  }, [initialData]);

  const processedUserReactions = useMemo(() => {
    if (!initialData?.initialUserReactions) return {};
    const res: UserReactions = {};
    Object.keys(initialData.initialUserReactions).forEach(k => {
      res[k] = new Set(initialData.initialUserReactions[k]);
    });
    return res;
  }, [initialData?.initialUserReactions]);
  
  const [userReactions, setUserReactions] = useState<UserReactions>(processedUserReactions);
  const [events, setEvents] = useState<EventItem[]>(initialData?.initialEvents || []);
  const [leads, setLeads] = useState<LeadItem[]>(initialData?.initialLeads || []);
  const [allMembers, setAllMembers] = useState<MemberItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("Posts");
  const [followingByClub, setFollowingByClub] = useState<Record<string, boolean>>(initialData?.initialFollowingByClub || {});
  const [notifyByClub, setNotifyByClub] = useState<Record<string, boolean>>({});
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [mobileFeed, setMobileFeed] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [composeText, setComposeText] = useState("");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeType, setComposeType] = useState("announcement");
  const [composeImage, setComposeImage] = useState<File | null>(null);
  const [composeSending, setComposeSending] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [eventMeta, setEventMeta] = useState<{ event_title: string; event_date: string; event_time: string; event_location: string; event_desc: string; event_url: string; event_tags: string[]; event_category: string; }>({ event_title: "", event_date: "", event_time: "", event_location: "", event_desc: "", event_url: "", event_tags: [], event_category: "" });
  const [pollChoice, setPollChoice] = useState<Record<string, string>>({});
  const [copiedPost, setCopiedPost] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [latestPostTime, setLatestPostTime] = useState<Record<string, string>>({});
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const realtimeRef = useRef<any>(null);
  const reactionsRef = useRef<any>(null);
  const eventsRealtimeRef = useRef<any>(null);
  // Edit modes
  const [editPinned, setEditPinned] = useState(false);
  const [editPinnedText, setEditPinnedText] = useState("");
  const [editAbout, setEditAbout] = useState(false);
  const [editAboutDesc, setEditAboutDesc] = useState("");
  const [editAboutTags, setEditAboutTags] = useState("");
  const [editHeroDesc, setEditHeroDesc] = useState(false);
  const [editHeroDescText, setEditHeroDescText] = useState("");
  // Crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<any>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  // Event posts for Events tab
  const [eventPosts, setEventPosts] = useState<Post[]>([]);

  useEffect(() => { const mq = window.matchMedia("(max-width: 767px)"); const a = () => { setIsNarrow(mq.matches); if (!mq.matches) setMobileFeed(false); }; a(); mq.addEventListener("change", a); return () => mq.removeEventListener("change", a); }, []);

  // Initialize read IDs and last visited for initial active club on mount
  useEffect(() => {
    if (activeId && !readIds.has(activeId)) {
      setReadIds(new Set([activeId]));
      setLastVisited(activeId);
    }
  }, []);

  const initialActiveIdRef = useRef(initialData?.initialActiveId);
  const initialLoadedRef = useRef(false);

  // === COMBINED FETCH (Posts + Right Panel) ===
  useEffect(() => { 
    if (!activeId) return; 
    let m = true; 
    
    async function f() {
      if (!initialLoadedRef.current && activeId === initialActiveIdRef.current) {
          initialLoadedRef.current = true;
          return;
      }
      setPostsLoading(true);

      // 1. Parallelize independent queries
      const [ 
        { data: pd }, 
        { data: ed }, 
        { data: mr } 
      ] = await Promise.all([
        supabase.from("channel_posts").select("id, club_id, author_id, post_type, title, body, image_url, edited, metadata, created_at").eq("club_id", activeId).order("created_at", { ascending: false }),
        supabase.from("channel_posts").select("id, title, metadata, created_at").eq("club_id", activeId).eq("post_type", "event").gte("metadata->>event_date", new Date().toISOString().split("T")[0]).order("created_at", { ascending: false }).limit(2),
        supabase.from("club_members").select("user_id, role").eq("club_id", activeId).eq("role", "moderator")
      ]);

      if (!m) return; 
      
      // Immediately set independent events
      if (ed) setEvents(ed.map((e: any) => ({ id: e.id, title: e.title, metadata: e.metadata || {}, created_at: e.created_at })));

      if (!pd) { 
        setPosts([]); setPostsLoading(false); 
        if (!mr || mr.length === 0) setLeads([]);
        return; 
      }

      // 2. Parallelize dependent queries (authors, reactions, lead users)
      const aids = [...new Set(pd.map((p: any) => p.author_id).filter(Boolean))];
      const pids = pd.map((p: any) => p.id);
      const leadUids = (mr && mr.length > 0) ? mr.map((x: any) => x.user_id) : [];

      const promises: any[] = [];
      const authorsIndex = aids.length > 0 ? promises.push(supabase.from("users").select("id, full_name, avatar_url").in("id", aids)) - 1 : -1;
      const reactionsIndex = pids.length > 0 ? promises.push(supabase.from("post_reactions").select("post_id, user_id, emoji").in("post_id", pids)) - 1 : -1;
      const leadsIndex = leadUids.length > 0 ? promises.push(supabase.from("users").select("id, full_name, avatar_url, stream, year").in("id", leadUids)) - 1 : -1;

      const results = await Promise.all(promises);
      if (!m) return;

      // Extract authors
      let am: Record<string, any> = {};
      if (authorsIndex !== -1 && results[authorsIndex].data) {
        for (const a of results[authorsIndex].data) am[a.id] = a;
      }

      // Map and set posts
      const mapped: Post[] = pd.map((p: any) => { 
        const a = am[p.author_id] || {}; 
        return { id: p.id, club_id: p.club_id, author_id: p.author_id, post_type: p.post_type || "update", title: p.title, body: p.body || "", image_url: p.image_url, edited: p.edited || false, metadata: p.metadata || {}, created_at: p.created_at, author_name: a.full_name || "Unknown", author_avatar: a.avatar_url, author_initials: getInitials(a.full_name || "") }; 
      });
      
      setPosts(mapped); 
      setPostsLoading(false); 
      if (mapped.length > 0) setLatestPostTime(prev => ({ ...prev, [activeId!]: mapped[0].created_at }));

      // Extract and set reactions
      if (reactionsIndex !== -1 && results[reactionsIndex].data) {
        const ec: EmojiCounts = {}; const ur: UserReactions = {};
        for (const r of results[reactionsIndex].data) { 
          if (!ec[r.post_id]) ec[r.post_id] = {}; 
          ec[r.post_id][r.emoji] = (ec[r.post_id][r.emoji] || 0) + 1; 
          if (r.user_id === userId) { 
            if (!ur[r.post_id]) ur[r.post_id] = new Set(); 
            ur[r.post_id].add(r.emoji); 
          } 
        }
        setEmojiCounts(ec); setUserReactions(ur);
      } else { 
        setEmojiCounts({}); setUserReactions({}); 
      }

      // Extract and set leads
      if (leadsIndex !== -1 && results[leadsIndex].data) {
        setLeads(results[leadsIndex].data.map((u: any) => ({ id: u.id, full_name: u.full_name || "Unknown", avatar_url: u.avatar_url, stream: u.stream || "", year: u.year || "", initials: getInitials(u.full_name || "") })));
      } else {
        setLeads([]);
      }

    } 
    f(); 
    return () => { m = false; }; 
  }, [activeId, userId]);

  // === REALTIME ===
  useEffect(() => { if (!activeId) return;
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    if (reactionsRef.current) supabase.removeChannel(reactionsRef.current);
    const ch1 = supabase.channel(`ch_posts_${activeId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_posts", filter: `club_id=eq.${activeId}` }, async (payload: any) => {
      const np = payload.new; const { data: au } = await supabase.from("users").select("id, full_name, avatar_url").eq("id", np.author_id).single();
      const a: any = au || {}; setPosts(prev => [{ id: np.id, club_id: np.club_id, author_id: np.author_id, post_type: np.post_type || "update", title: np.title, body: np.body || "", image_url: np.image_url, edited: false, metadata: np.metadata || {}, created_at: np.created_at, author_name: a.full_name || "Unknown", author_avatar: a.avatar_url, author_initials: getInitials(a.full_name || "") }, ...prev]);
      if (np.post_type === "event") setEvents(prev => [{ id: np.id, title: np.title, metadata: np.metadata || {}, created_at: np.created_at }, ...prev].sort((x,y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()).slice(0, 2));
    }).subscribe();
    realtimeRef.current = ch1;
    const ch2 = supabase.channel(`ch_rx_${activeId}`).on("postgres_changes", { event: "*", schema: "public", table: "post_reactions" }, () => {
      // Re-fetch reactions for visible posts
      const pids = posts.map(p => p.id); if (pids.length === 0) return;
      supabase.from("post_reactions").select("post_id, user_id, emoji").in("post_id", pids).then(({ data: rx }) => {
        if (!rx) return; const ec: EmojiCounts = {}; const ur: UserReactions = {};
        for (const r of rx) { if (!ec[r.post_id]) ec[r.post_id] = {}; ec[r.post_id][r.emoji] = (ec[r.post_id][r.emoji] || 0) + 1; if (r.user_id === userId) { if (!ur[r.post_id]) ur[r.post_id] = new Set(); ur[r.post_id].add(r.emoji); } }
        setEmojiCounts(ec); setUserReactions(ur);
      });
    }).subscribe();
    reactionsRef.current = ch2;
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, userId]);

  // === DERIVED ===
  const activeClub = useMemo(() => clubs.find(c => c.id === activeId) ?? clubs[0] ?? null, [activeId, clubs]);
  const yourClubs = useMemo(() => clubs.filter(c => c.role === "moderator"), [clubs]);
  const followingClubs = useMemo(() => clubs.filter(c => c.role === "follower"), [clubs]);
  const isModerator = activeId ? roleByClub[activeId] === "moderator" : false;
  const recentlyActive = useMemo(() => { if (!activeId || !latestPostTime[activeId]) return false; return Date.now() - new Date(latestPostTime[activeId]).getTime() < 7 * 86400000; }, [activeId, latestPostTime]);

  // === HANDLERS ===
  const openChannel = useCallback((id: string) => { setActiveId(id); setReadIds(prev => new Set(prev).add(id)); setActiveTab("Posts"); setPinnedExpanded(false); setLastVisited(id); setManageOpen(false); if (isNarrow) setMobileFeed(true); }, [isNarrow]);
  const backToList = useCallback(() => setMobileFeed(false), []);
  const showUnread = (c: SidebarClub) => { if (readIds.has(c.id)) return false; const lp = latestPostTime[c.id]; if (!lp) return false; return new Date(lp).getTime() > getLastVisited(c.id); };

  const toggleReaction = useCallback(async (postId: string, emoji: string) => {
    if (!userId) return;
    const has = userReactions[postId]?.has(emoji);
    const opposite = emoji === "👍" ? "👎" : "👍";
    const hasOpposite = userReactions[postId]?.has(opposite);

    setUserReactions(prev => { 
      const n = { ...prev }; if (!n[postId]) n[postId] = new Set(); 
      const s = new Set(n[postId]); 
      if (has) {
        s.delete(emoji); 
      } else {
        s.add(emoji); 
        if (hasOpposite) s.delete(opposite);
      }
      n[postId] = s; return n; 
    });
    setEmojiCounts(prev => { 
      const n = { ...prev }; if (!n[postId]) n[postId] = {}; 
      const ec = { ...n[postId] };
      if (has) {
        ec[emoji] = Math.max(0, (ec[emoji] || 0) - 1);
      } else {
        ec[emoji] = (ec[emoji] || 0) + 1;
        if (hasOpposite) ec[opposite] = Math.max(0, (ec[opposite] || 0) - 1);
      }
      n[postId] = ec; return n; 
    });

    if (has) {
      await supabase.from("post_reactions").delete().match({ post_id: postId, user_id: userId, emoji });
    } else {
      if (hasOpposite) {
        await supabase.from("post_reactions").delete().match({ post_id: postId, user_id: userId, emoji: opposite });
      }
      await supabase.from("post_reactions").insert({ post_id: postId, user_id: userId, emoji });
    }
  }, [userId, userReactions]);

  const [loadingChannelsFollow, setLoadingChannelsFollow] = useState(false);

  const toggleFollow = useCallback(async () => {
    if (!userId || !activeId || loadingChannelsFollow) return; 
    setLoadingChannelsFollow(true);
    const isF = followingByClub[activeId];
    setFollowingByClub(prev => ({ ...prev, [activeId]: !isF }));
    
    try {
      if (isF) { 
        const { error } = await supabase.from("club_members").delete().match({ club_id: activeId, user_id: userId });
        if (error) throw error;
        
        const club = clubs.find(c => c.id === activeId); 
        if (club) {
           const { error: updErr } = await supabase.from("clubs").update({ follower_count: Math.max(0, (club.follower_count || 0) - 1) }).eq("id", activeId);
           if (updErr) console.error("[Supabase Error] clubs follower_count update:", updErr.message);
        }
        
        setClubs(prev => prev.filter(c => c.id !== activeId)); 
        const rem = clubs.filter(c => c.id !== activeId); 
        setActiveId(rem.length > 0 ? rem[0].id : null);
      } else { 
        const { error } = await supabase.from("club_members").insert({ club_id: activeId, user_id: userId, role: "follower" });
        if (error) throw error;
        
        const club = clubs.find(c => c.id === activeId); 
        if (club) {
           const { error: updErr } = await supabase.from("clubs").update({ follower_count: (club.follower_count || 0) + 1 }).eq("id", activeId);
           if (updErr) console.error("[Supabase Error] clubs follower_count update:", updErr.message);
        }
      }
      
    } catch (err: any) {
      console.error("Failed to toggle follow status:", err);
      // Revert optimistic UI
      setFollowingByClub(prev => ({ ...prev, [activeId]: isF }));
    } finally {
      setLoadingChannelsFollow(false);
    }
  }, [userId, activeId, followingByClub, clubs, loadingChannelsFollow]);

  const handleCompose = useCallback(async () => {
    const isEventValid = composeType === "event" && eventMeta.event_title.trim() && eventMeta.event_date && eventMeta.event_time && eventMeta.event_location.trim() && eventMeta.event_desc.trim() && eventMeta.event_tags.length > 0;
    const isStandardValid = composeType !== "event" && composeText.trim();
    if (!userId || !activeId || composeSending || !(isEventValid || isStandardValid)) return;
    setComposeSending(true); let imageUrl: string | null = null;
    if (croppedBlob) {
      const path = `${activeId}/${userId}/${Date.now()}_cropped.jpg`;
      const { data: ud } = await supabase.storage.from("channel-images").upload(path, croppedBlob);
      if (ud) { const { data: pu } = supabase.storage.from("channel-images").getPublicUrl(ud.path); imageUrl = pu.publicUrl; }
    } else if (composeImage) { const path = `${activeId}/${userId}/${Date.now()}_${composeImage.name}`; const { data: ud } = await supabase.storage.from("channel-images").upload(path, composeImage);
      if (ud) { const { data: pu } = supabase.storage.from("channel-images").getPublicUrl(ud.path); imageUrl = pu.publicUrl; } }
    let metadata: any = {};
    if (composeType === "event") {
      metadata = { 
        event_date: eventMeta.event_date, 
        event_time: eventMeta.event_time, 
        location: eventMeta.event_location, 
        registration_url: eventMeta.event_url || null, 
        tags: eventMeta.event_tags 
      };
    } else if (composeType === "poll") {
      metadata = { question: pollQuestion, options: pollOptions.filter(o => o.trim()).map((o, i) => ({ id: `opt_${i}`, label: o.trim(), votes: 0 })) };
    }
    
    let resolvedTitle = composeTitle.trim() || null;
    let resolvedBody = composeText.trim();
    if (composeType === "event") {
      resolvedTitle = eventMeta.event_title.trim();
      resolvedBody = eventMeta.event_desc.trim();
    }
    
    const payload: any = { club_id: activeId, author_id: userId, post_type: composeType, title: resolvedTitle, body: resolvedBody, image_url: imageUrl, edited: false, metadata };
    
    if (editingPostId) {
      payload.edited = true;
      const { error } = await supabase.from("channel_posts").update(payload).eq("id", editingPostId);
      if (error) { setComposeSending(false); return alert(error.message); }
      setPosts(p => p.map(pst => pst.id === editingPostId ? { ...pst, ...payload } : pst));
    } else {
      const { data, error } = await supabase.from("channel_posts").insert(payload).select().single();
      if (error) { setComposeSending(false); return alert(error.message); }
      if (data) {
        const pClub = clubs.find(c => c.id === activeId);
        const me = allMembers.find(m => m.id === userId);
        const newP: Post = { ...data, author_name: me?.full_name || "Unknown", author_initials: me?.initials || "?", author_avatar: null };
        setPosts(prev => [newP, ...prev]);
      }
    }

    const club2 = clubs.find(c => c.id === activeId);
    await supabase.from("activity").insert({ user_id: userId, type: "channel_post", content: `Posted in ${club2?.name || "a channel"}`, metadata: { club_id: activeId } });
    setComposeText(""); setComposeTitle(""); setComposeType("announcement"); setComposeImage(null); setCroppedBlob(null); setCropSrc(null); setComposeSending(false); setPollQuestion(""); setPollOptions(["", ""]); setEventMeta({ event_title: "", event_date: "", event_time: "", event_location: "", event_desc: "", event_url: "", event_tags: [], event_category: "" });
    setEditingPostId(null);
  }, [userId, activeId, composeText, composeTitle, composeType, composeImage, croppedBlob, composeSending, clubs, eventMeta, pollQuestion, pollOptions, editingPostId, allMembers]);

  const handleShare = useCallback((postId: string) => { navigator.clipboard.writeText(`${window.location.origin}/channels?post=${postId}`); setCopiedPost(postId); setTimeout(() => setCopiedPost(null), 2000); }, []);

  const deletePost = useCallback(async (postId: string) => { await supabase.from("channel_posts").delete().eq("id", postId); setPosts(prev => prev.filter(p => p.id !== postId)); setMenuOpen(null); }, []);

  const votePoll = useCallback(async (postId: string, optId: string) => {
    const lsKey = `poll_vote_${postId}`;
    const previousVote = pollChoice[postId];
    const post = posts.find(p => p.id === postId);
    if (!post || !post.metadata?.options) return;

    let updatedOpts = [...post.metadata.options];
    let newPollChoice = { ...pollChoice };

    if (previousVote === optId) {
      delete newPollChoice[postId];
      try { localStorage.removeItem(lsKey); } catch {}
      updatedOpts = updatedOpts.map((o: any) => o.id === optId ? { ...o, votes: Math.max(0, (o.votes || 0) - 1) } : o);
    } else {
      newPollChoice[postId] = optId;
      try { localStorage.setItem(lsKey, optId); } catch {}
      updatedOpts = updatedOpts.map((o: any) => {
        if (o.id === optId) return { ...o, votes: (o.votes || 0) + 1 };
        if (o.id === previousVote) return { ...o, votes: Math.max(0, (o.votes || 0) - 1) };
        return o;
      });
    }

    setPollChoice(newPollChoice);
    const updatedMeta = { ...post.metadata, options: updatedOpts };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, metadata: updatedMeta } : p));
    await supabase.from("channel_posts").update({ metadata: updatedMeta }).eq("id", postId);
  }, [pollChoice, posts]);

  // === FETCH MEMBERS TAB ===
  useEffect(() => { if (activeTab !== "Members" || !activeId) return; let m = true;
    async function f() { setMembersLoading(true);
      const { data: mr } = await supabase.from("club_members").select("id, user_id, role").eq("club_id", activeId);
      if (!m || !mr) { if (m) setMembersLoading(false); return; }
      const uids = mr.map((x: any) => x.user_id);
      if (uids.length === 0) { if (m) { setAllMembers([]); setMembersLoading(false); } return; }
      const { data: users } = await supabase.from("users").select("id, full_name, avatar_url, stream, year").in("id", uids);
      if (m && users) { const um: Record<string, any> = {}; for (const u of users) um[u.id] = u;
        setAllMembers(mr.map((x: any) => { const u = um[x.user_id] || {}; return { id: u.id || x.user_id, full_name: u.full_name || "Unknown", avatar_url: u.avatar_url, stream: u.stream || "", year: u.year || "", initials: getInitials(u.full_name || ""), role: x.role, membership_id: x.id }; })); }
      if (m) setMembersLoading(false);
    } f(); return () => { m = false; }; }, [activeTab, activeId]);

  // === MANAGE MEMBERS ===
  const promoteToMod = useCallback(async (membershipId: string) => { if (!userId) return;
    await supabase.from("club_members").update({ role: "moderator", promoted_at: new Date().toISOString(), promoted_by: userId }).eq("id", membershipId);
    setAllMembers(prev => prev.map(m => m.membership_id === membershipId ? { ...m, role: "moderator" } : m));
  }, [userId]);
  const demoteToFollower = useCallback(async (membershipId: string) => {
    await supabase.from("club_members").update({ role: "follower", promoted_at: null, promoted_by: null }).eq("id", membershipId);
    setAllMembers(prev => prev.map(m => m.membership_id === membershipId ? { ...m, role: "follower" } : m));
  }, []);

  // === EVENTS TAB — fetch event posts ===
  useEffect(() => { if (activeTab !== "Events" || !activeId) return; let m = true;
    async function f() {
      const { data: ep } = await supabase.from("channel_posts").select("id, title, metadata, created_at").eq("club_id", activeId).eq("post_type", "event").order("created_at", { ascending: false });
      if (!m || !ep) return;
      const aids = [...new Set(ep.map((p: any) => p.author_id).filter(Boolean))];
      let am: Record<string, any> = {};
      if (aids.length > 0) { const { data: ad } = await supabase.from("users").select("id, full_name, avatar_url").in("id", aids); if (ad) for (const a of ad) am[a.id] = a; }
      if (m) setEventPosts(ep.map((p: any) => { const a = am[p.author_id] || {}; return { id: p.id, club_id: p.club_id, author_id: p.author_id, post_type: p.post_type, title: p.title, body: p.body || "", image_url: p.image_url, edited: p.edited || false, metadata: p.metadata || {}, created_at: p.created_at, author_name: a.full_name || "Unknown", author_avatar: a.avatar_url, author_initials: getInitials(a.full_name || "") }; }));
    } f(); return () => { m = false; }; }, [activeTab, activeId]);



  // === RESTORE POLL VOTES FROM LOCALSTORAGE ===
  useEffect(() => { if (posts.length === 0) return;
    const restored: Record<string, string> = {};
    for (const p of posts) { if (p.post_type === "poll" && p.metadata?.options) { try { const v = localStorage.getItem(`poll_vote_${p.id}`); if (v) restored[p.id] = v; } catch {} } }
    if (Object.keys(restored).length > 0) setPollChoice(prev => ({ ...prev, ...restored }));
  }, [posts]);

  // === EDIT SAVE HANDLERS ===
  const savePinned = useCallback(async () => { if (!activeId) return;
    await supabase.from("clubs").update({ pinned_message: editPinnedText }).eq("id", activeId);
    setClubs(prev => prev.map(c => c.id === activeId ? { ...c, pinned_message: editPinnedText } : c));
    setEditPinned(false);
  }, [activeId, editPinnedText]);

  const saveAbout = useCallback(async () => { if (!activeId) return;
    const tagsArr = editAboutTags.split(",").map(t => t.trim()).filter(Boolean);
    await supabase.from("clubs").update({ description: editAboutDesc, tags: tagsArr }).eq("id", activeId);
    setClubs(prev => prev.map(c => c.id === activeId ? { ...c, description: editAboutDesc, tags: tagsArr } : c));
    setEditAbout(false);
  }, [activeId, editAboutDesc, editAboutTags]);

  const saveHeroDesc = useCallback(async () => { if (!activeId) return;
    await supabase.from("clubs").update({ description: editHeroDescText }).eq("id", activeId);
    setClubs(prev => prev.map(c => c.id === activeId ? { ...c, description: editHeroDescText } : c));
    setEditHeroDesc(false);
  }, [activeId, editHeroDescText]);

  // === CROP HANDLERS ===
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setComposeImage(file);
    const reader = new FileReader(); reader.onload = () => { setCropSrc(reader.result as string); setZoom(1); setCrop({ x: 0, y: 0 }); }; reader.readAsDataURL(file);
  }, []);
  const onCropConfirm = useCallback(async () => { if (!cropSrc || !croppedArea) return;
    const blob = await getCroppedImg(cropSrc, croppedArea); setCroppedBlob(blob); setCropSrc(null);
  }, [cropSrc, croppedArea]);

  const heroStyle = activeClub ? accentStyle(activeClub.accent) : {};

  // PART 2 WILL BE APPENDED - RENDER JSX
  // === LOADING STATE ===
  if (clubsLoading) return (<div className="ch-page"><div className="ch-wrap"><aside className="ch-sidebar"><div className="ch-sb-head"><span className="ch-sb-title">Channels</span></div>{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="ch-club-row" style={{ opacity: 0.5, pointerEvents: "none" }}><div className="ch-club-av" style={{ background: "rgba(255,255,255,0.06)", color: "transparent" }}>··</div><div className="ch-club-meta"><div className="ch-club-name" style={{ background: "rgba(255,255,255,0.06)", color: "transparent", borderRadius: 4, width: "70%" }}>Loading</div><div className="ch-club-sub" style={{ background: "rgba(255,255,255,0.04)", color: "transparent", borderRadius: 4, width: "40%", marginTop: 4 }}>...</div></div></div>))}</aside><main className="ch-main"><div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "rgba(255,255,255,0.3)" }}>Loading your channels…</div></main></div></div>);

  if (clubs.length === 0) return (<div className="ch-page"><div className="ch-wrap"><aside className="ch-sidebar"><div className="ch-sb-head"><span className="ch-sb-title">Channels</span><Link href="/clubs" prefetch={false} className="ch-sb-browse">Browse all</Link></div><div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.6 }}>You haven&apos;t followed any clubs yet.<br /><Link href="/clubs" prefetch={false} style={{ color: "#9EF01A", textDecoration: "underline", marginTop: 12, display: "inline-block" }}>Browse clubs &rarr;</Link></div></aside><main className="ch-main"><div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, color: "rgba(255,255,255,0.4)", gap: 16, textAlign: "center", padding: 40 }}><div style={{ opacity: 0.3 }}><BoltIcon size={48} /></div><div style={{ fontSize: 16, fontWeight: 700 }}>No channels yet</div><div style={{ fontSize: 13 }}>Follow clubs to see their channels here.</div><Link href="/clubs" prefetch={false} style={{ color: "#9EF01A", fontWeight: 600, fontSize: 13, marginTop: 8 }}>Browse clubs &rarr;</Link></div></main></div></div>);

  if (!activeClub) return null;

  const renderSidebarRows = (list: SidebarClub[]) => list.map(c => (
    <button key={c.id} type="button" className={`ch-club-row${c.id === activeId ? " active" : ""}`} style={accentStyle(c.accent)} onClick={() => openChannel(c.id)}>
      <div className="ch-club-av">{c.initials}</div>
      <div className="ch-club-meta"><div className="ch-club-name" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.92)", letterSpacing: 0 }}>{c.name}</div><div className="ch-club-sub" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 400, fontSize: 11, color: "rgba(255,255,255,0.40)" }}>{c.follower_count.toLocaleString()} followers</div></div>
      {showUnread(c) ? <span className="ch-unread-dot" aria-hidden /> : null}
      {roleByClub[c.id] === "moderator" && <span style={{ fontSize: 12, opacity: 0.4, marginLeft: "auto" }} onClick={e => { e.stopPropagation(); setActiveId(c.id); setManageOpen(true); }}>⚙</span>}
    </button>
  ));

  return (<div className="channels-page ch-page">
    <div className="ch-mob-chip-strip">
      {[...yourClubs, ...followingClubs].map(c => (
        <button key={c.id} type="button" onClick={() => openChannel(c.id)} className={`ch-mob-chip${c.id === activeId ? " active" : ""}`}>
          <div className="ch-mob-chip-av" style={{ background: c.id === activeId ? ACCENT_HEX[c.accent] || "#9EF01A" : "rgba(255,255,255,0.06)", color: c.id === activeId ? "#111" : "rgba(255,255,255,0.5)" }}>{c.initials}</div>
          <div className="ch-mob-chip-name">{c.name}</div>
          {showUnread(c) && <div className="ch-mob-chip-unread" />}
        </button>
      ))}
    </div>
    <div className="ch-wrap">
      <aside className="ch-sidebar">
        <div className="ch-sb-head"><span className="ch-sb-title">Channels</span><Link href="/clubs" prefetch={false} className="ch-sb-browse">Browse all</Link></div>
        {yourClubs.length > 0 && <><div className="ch-sb-section-label">Your clubs</div>{renderSidebarRows(yourClubs)}</>}
        {followingClubs.length > 0 && <><div className="ch-sb-section-label">Following</div>{renderSidebarRows(followingClubs)}</>}
      </aside>
      <main className="ch-main" style={heroStyle}>
        <div className="ch-sticky-stack">
          <header className="ch-hero"><div className="ch-hero-grid" aria-hidden /><div className="ch-hero-glow" aria-hidden /><div className="ch-hero-inner">
            <div className="ch-hero-icon">{activeClub.initials}</div>
            <div className="ch-hero-text">
              <h1 className="ch-hero-name" style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontSize: 22, fontWeight: 800 }}>{activeClub.name}</h1>
              <div className="ch-hero-badges"><span className="ch-hero-badge" style={{ textTransform: "uppercase" }}>{activeClub.type}</span><span className="ch-hero-badge" style={{ textTransform: "uppercase" }}>{activeClub.category}</span></div>
              <p className="ch-hero-desc">{editHeroDesc ? <><textarea value={editHeroDescText} onChange={e => setEditHeroDescText(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: 8, color: "#fff", fontSize: 13, resize: "vertical", minHeight: 50 }} /><div style={{ display: "flex", gap: 6, marginTop: 6 }}><button type="button" onClick={saveHeroDesc} style={{ padding: "4px 12px", borderRadius: 6, background: "#9EF01A", color: "#1C1C28", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button><button type="button" onClick={() => setEditHeroDesc(false)} style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, cursor: "pointer" }}>Cancel</button></div></> : <>{activeClub.description} {isModerator && <button type="button" onClick={() => { setEditHeroDesc(true); setEditHeroDescText(activeClub.description); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", marginLeft: 4, verticalAlign: "middle" }}><PencilIcon size={12} /></button>}</>}</p>
              <div className="ch-hero-stats">{activeClub.follower_count.toLocaleString()} followers {recentlyActive && <span style={{ color: "#9EF01A", marginLeft: 8 }}>● Active</span>}</div>
              <div className="ch-hero-actions">
                <button type="button" className={`ch-btn-follow${followingByClub[activeId!] ? " following" : ""}`} onClick={toggleFollow}>{followingByClub[activeId!] ? "✓ Following" : "+ Follow"}</button>
              </div>
            </div>
          </div></header>
          <div className="ch-tabs" role="tablist">{TABS.map(t => (<button key={t} type="button" role="tab" aria-selected={activeTab === t} className={`ch-tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>{t}</button>))}</div>
        </div>

        {/* === POSTS TAB === */}
        <section className={`ch-feed${activeTab !== "Posts" ? " ch-panel-hidden" : ""}`} aria-hidden={activeTab !== "Posts"}>
          {(isModerator || userRole === "admin" || userRole === "verified_user") ? (<div className="ch-post" style={{ borderLeft: "3px solid var(--tab-accent, #9EF01A)", paddingLeft: 17, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>{["announcement", "event", "resource", "poll"].filter(t => t === "event" ? true : isModerator).map(t => { const s = POST_TYPE_STYLES[t]; return <button key={t} type="button" onClick={() => setComposeType(t)} style={{ padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 700, fontFamily: "var(--font-inter), Inter, sans-serif", cursor: "pointer", border: `1px solid ${composeType === t ? s.border : "rgba(255,255,255,0.1)"}`, background: composeType === t ? s.bg : "rgba(255,255,255,0.04)", color: composeType === t ? s.color : "rgba(255,255,255,0.5)" }}>{s.label}</button>; })}</div>
            
            {composeType === "event" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                <input value={eventMeta.event_title} onChange={e => setEventMeta(p => ({ ...p, event_title: e.target.value }))} placeholder="Event Title *" style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", color: "#fff", fontSize: 14, fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 700, outline: "none" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="date" value={eventMeta.event_date} onChange={e => setEventMeta(p => ({ ...p, event_date: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "rgba(255,255,255,0.8)", fontSize: 13, colorScheme: "dark" }} />
                  <input type="time" value={eventMeta.event_time} onChange={e => setEventMeta(p => ({ ...p, event_time: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "rgba(255,255,255,0.8)", fontSize: 13, colorScheme: "dark" }} />
                </div>
                <input value={eventMeta.event_location} onChange={e => setEventMeta(p => ({ ...p, event_location: e.target.value }))} placeholder="Location *" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13 }} />
                <textarea value={eventMeta.event_desc} onChange={e => setEventMeta(p => ({ ...p, event_desc: e.target.value }))} placeholder="Event Description *" style={{ width: "100%", minHeight: 80, resize: "vertical", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12, color: "#fff", fontSize: 13 }} />
                <input value={eventMeta.event_url} onChange={e => setEventMeta(p => ({ ...p, event_url: e.target.value }))} placeholder="Registration / Form Link (Optional)" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13 }} />
                
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Tags * (Select multiple)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["Free Entry", "Paid", "Technical", "Cultural", "Workshop", "Hackathon", "Social", "Competition", "Seminar", "Featured"].map(t => {
                      const isSel = eventMeta.event_tags.includes(t);
                      return <button key={t} type="button" onClick={() => setEventMeta(p => ({ ...p, event_tags: isSel ? p.event_tags.filter(x => x !== t) : [...p.event_tags, t] }))} style={{ padding: "4px 10px", borderRadius: 12, fontSize: 11, background: isSel ? "#9EF01A" : "rgba(255,255,255,0.06)", color: isSel ? "#1C1C28" : "rgba(255,255,255,0.6)", border: "none", cursor: "pointer", fontWeight: isSel ? 700 : 400 }}>{t}</button>;
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <input value={composeTitle} onChange={e => setComposeTitle(e.target.value)} placeholder="Add a title (optional)" style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", color: "#fff", fontSize: 14, fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 700, marginBottom: 10, outline: "none" }} />
                {composeType === "poll" && <div style={{ marginBottom: 10 }}><input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Poll question" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13, marginBottom: 8 }} />{pollOptions.map((o, i) => <input key={i} value={o} onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} placeholder={`Option ${i + 1}`} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, marginBottom: 4 }} />)}<button type="button" onClick={() => setPollOptions(p => [...p, ""])} style={{ fontSize: 11, color: "#9EF01A", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>+ Add option</button></div>}
                <textarea className="ch-comment-input" placeholder="Write your update..." value={composeText} onChange={e => setComposeText(e.target.value)} style={{ width: "100%", minHeight: 60, resize: "vertical", marginBottom: 10, fontFamily: "inherit", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12, color: "#fff", fontSize: 13 }} />
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}><PaperclipIcon size={12} /> Attach</button>
              {croppedBlob && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Cropped image ready <button type="button" onClick={() => { setCroppedBlob(null); setComposeImage(null); }} style={{ background: "none", border: "none", color: "#FB7185", cursor: "pointer", fontSize: 11 }}>✕</button></span>}
              {composeImage && !croppedBlob && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{composeImage.name} <button type="button" onClick={() => { setComposeImage(null); setCroppedBlob(null); setCropSrc(null); }} style={{ background: "none", border: "none", color: "#FB7185", cursor: "pointer", fontSize: 11 }}>✕</button></span>}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>{composeType === "event" ? eventMeta.event_desc.length : composeText.length}/1000</span>
              {editingPostId && <button type="button" onClick={() => { setEditingPostId(null); setComposeText(""); setComposeTitle(""); setComposeType("announcement"); }} style={{ background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "6px 16px", fontSize: 12, cursor: "pointer" }}>Cancel</button>}
              <button type="button" onClick={handleCompose} disabled={composeSending || (composeType === "event" ? !(eventMeta.event_title.trim() && eventMeta.event_date && eventMeta.event_time && eventMeta.event_location.trim() && eventMeta.event_desc.trim() && eventMeta.event_tags.length > 0) : !composeText.trim())} style={{ background: (composeType === "event" ? (eventMeta.event_title.trim() && eventMeta.event_date && eventMeta.event_time && eventMeta.event_location.trim() && eventMeta.event_desc.trim() && eventMeta.event_tags.length > 0) : composeText.trim()) ? "#9EF01A" : "rgba(255,255,255,0.06)", color: (composeType === "event" ? (eventMeta.event_title.trim() && eventMeta.event_date && eventMeta.event_time && eventMeta.event_location.trim() && eventMeta.event_desc.trim() && eventMeta.event_tags.length > 0) : composeText.trim()) ? "#1C1C28" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: (composeType === "event" ? (eventMeta.event_title.trim() && eventMeta.event_date && eventMeta.event_time && eventMeta.event_location.trim() && eventMeta.event_desc.trim() && eventMeta.event_tags.length > 0) : composeText.trim()) ? "pointer" : "default" }}>{composeSending ? (editingPostId ? "Saving…" : "Posting…") : (editingPostId ? "Save Edit" : "Send")}</button>
            </div>
          </div>) : (<div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><LockIcon size={12} /> Read-only · Only moderators can post</div>)}

          {postsLoading ? Array.from({ length: 3 }).map((_, i) => (<article key={i} className="ch-post" style={{ opacity: 0.5 }}><div className="ch-post-head"><div className="ch-post-av" style={{ background: "rgba(255,255,255,0.06)", color: "transparent" }}>··</div><div className="ch-post-author"><div className="ch-post-name-row"><span className="ch-post-name" style={{ background: "rgba(255,255,255,0.06)", color: "transparent", borderRadius: 4 }}>Loading</span></div><div className="ch-post-time" style={{ background: "rgba(255,255,255,0.04)", color: "transparent", borderRadius: 4, width: 50 }}>...</div></div></div><div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, height: 60, marginTop: 12 }} /></article>))
          : posts.length === 0 ? (<div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}><div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}><PencilIcon size={36} /></div>No posts in this channel yet.</div>)
          : posts.map(post => { const meta = post.metadata || {}; const pts = post.post_type !== "update" ? POST_TYPE_STYLES[post.post_type] : null; const canEdit = isModerator;
            const borderColorMap: Record<string, string> = { "announcement": "rgba(158,240,26,0.6)", "event": "rgba(34,211,238,0.6)", "poll": "rgba(167,139,250,0.6)", "resource": "rgba(251,113,133,0.6)" };
            const leftBorder = borderColorMap[post.post_type] ? `3px solid ${borderColorMap[post.post_type]}` : undefined;
            return (<article key={post.id} className="ch-post" style={{ borderLeft: leftBorder }}>
              <div className="ch-post-head">
                <div className="ch-post-av">{activeClub.initials}</div>
                <div className="ch-post-author"><div className="ch-post-name-row"><span className="ch-post-name">{activeClub.name}</span><span className="ch-post-role" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>by {post.author_name}</span></div><div className="ch-post-time">{timeAgo(post.created_at)}</div></div>
                {pts && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: pts.bg, border: `1px solid ${pts.border}`, color: pts.color }}>{post.post_type === "event" && <CalendarIcon size={10} />}{post.post_type === "poll" && <ChartIcon size={10} />}{pts.label}</span>}
                {canEdit && <div style={{ position: "relative", marginLeft: 8 }}><button type="button" onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><DotsIcon size={16} /></button>
                  {menuOpen === post.id && <div style={{ position: "absolute", right: 0, top: "100%", background: "#22223A", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 12, padding: 6, zIndex: 50, minWidth: 140, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}><button type="button" onClick={() => { setEditingPostId(post.id); setComposeText(post.body); setComposeTitle(post.title || ""); setComposeType(post.post_type); if (post.post_type === "event") { setEventMeta({ event_title: post.title || "", event_date: meta.event_date || "", event_time: meta.event_time || "", event_location: meta.event_location || "", event_desc: post.body || "", event_url: meta.event_url || "", event_tags: meta.event_tags || [], event_category: meta.event_category || "" }); } else if (post.post_type === "poll") { setPollOptions(meta.options?.map((o: any) => o.label) || ["", ""]); } setMenuOpen(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}><PencilIcon size={13} /> Edit post</button><button type="button" onClick={() => deletePost(post.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", color: "#FB7185", fontSize: 12, cursor: "pointer", borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(251,113,133,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}><TrashIcon size={13} /> Delete post</button></div>}
                </div>}
              </div>
              {post.title && <div style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 800, fontSize: 15, color: "#fff", marginTop: 8, marginBottom: 4 }}>{post.title}</div>}
              {post.body && post.post_type !== "poll" && <div className="ch-post-body"><p>{post.body}</p></div>}
              {post.image_url && <Image width={800} height={400} className="ch-post-img" src={post.image_url} alt="" style={{ height: "auto" }} />}
              {post.edited && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>edited</span>}
              {post.post_type === "event" && <div className="ch-event-card"><div className="ch-event-title" style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 800 }}>{post.title || meta.event_title || "Event"}</div><div className="ch-event-meta" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>{(meta.event_date || meta.event_time) && <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#fff" }}><CalendarIcon size={16} /> {meta.event_date}{meta.event_date && meta.event_time ? " · " : ""}{meta.event_time}</span>}{meta.event_location && <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}><MapPinIcon size={16} /> {meta.event_location}</span>}</div>{meta.event_tags?.length > 0 && <div className="ch-event-tags">{meta.event_tags.map((t: string) => <span key={t} className="ch-event-tag">{t}</span>)}</div>}<div className="ch-event-foot"><button type="button" className="ch-btn-rsvp">RSVP now</button></div></div>}
              {post.post_type === "poll" && meta.options && <div className="ch-poll" style={{ padding: "0 16px 14px" }}>
                <div style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 12 }}>{post.title || post.body}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {meta.options.map((opt: any) => {
                    const totalVotes = meta.options.reduce((s: number, o: any) => s + (o.votes || 0), 0);
                    const count = opt.votes || 0;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isVoted = pollChoice[post.id] === opt.id;
                    const hasVotedAny = !!pollChoice[post.id];
                    return (
                      <button key={opt.id} type="button" onClick={() => votePoll(post.id, opt.id)} style={{ position: "relative", width: "100%", textAlign: "left", background: isVoted ? "transparent" : "#2A2A42", border: `1.5px solid ${isVoted ? "rgba(158,240,26,0.4)" : "rgba(255,255,255,0.13)"}`, borderRadius: 10, padding: "10px 14px", overflow: "hidden", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, background: isVoted ? "rgba(158,240,26,0.15)" : "rgba(255,255,255,0.06)", width: hasVotedAny ? `${pct}%` : "0%", transition: "width 0.4s ease", borderRadius: 10, zIndex: 0 }} />
                        <span style={{ position: "relative", zIndex: 1, fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 13, fontWeight: isVoted ? 700 : 500, color: isVoted ? "#9EF01A" : "rgba(255,255,255,0.85)" }}>{opt.label}</span>
                        {hasVotedAny && <span style={{ position: "relative", zIndex: 1, fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 12, fontWeight: isVoted ? 700 : 500, color: isVoted ? "#9EF01A" : "rgba(255,255,255,0.4)" }}>{pct}%</span>}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 400, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{meta.options.reduce((s: number, o: any) => s + (o.votes || 0), 0)} votes</span>
                  {meta.end_date && <span style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 400, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Ends {fmtDate(meta.end_date)}</span>}
                </div>
              </div>}
              <div className="ch-post-foot" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {(() => {
                    const upActive = userReactions[post.id]?.has("👍");
                    const upCount = emojiCounts[post.id]?.["👍"] || 0;
                    return (
                      <button type="button" onClick={() => toggleReaction(post.id, "👍")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 8, background: "transparent", border: "none", color: upActive ? "#9EF01A" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-inter), Inter, sans-serif", cursor: "pointer", transition: "all 0.15s" }}>
                        <ThumbsUpIcon size={14} color={upActive ? "#9EF01A" : "rgba(255,255,255,0.4)"} />
                        {upCount > 0 && <span>{upCount}</span>}
                      </button>
                    );
                  })()}
                  {(() => {
                    const downActive = userReactions[post.id]?.has("👎");
                    return (
                      <button type="button" onClick={() => toggleReaction(post.id, "👎")} style={{ display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: 8, background: downActive ? "rgba(251,113,133,0.15)" : "transparent", border: downActive ? "1px solid rgba(251,113,133,0.3)" : "1px solid transparent", color: downActive ? "#FB7185" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.15s", marginLeft: 2 }}>
                        <ThumbsDownIcon size={14} color={downActive ? "#FB7185" : "rgba(255,255,255,0.4)"} />
                      </button>
                    );
                  })()}

                </div>
                <button type="button" onClick={() => handleShare(post.id)} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "var(--font-inter), Inter, sans-serif" }}><LinkIcon size={12} /> {copiedPost === post.id ? "Copied" : "Share"}</button>
              </div>
            </article>); })}
        </section>

        {/* === EVENTS TAB === */}
        <section className={`ch-simple-panel${activeTab !== "Events" ? " ch-panel-hidden" : ""}`}><div className="ch-simple-card">
          <h3 style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 800 }}>Channel Events</h3>
          {eventPosts.length === 0 && events.length === 0 && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No events posted yet.</p>}
          {eventPosts.map(ep => { const meta = ep.metadata || {}; return <div key={ep.id} className="ch-event-row" style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}><div style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>{meta.event_title || ep.title || "Event"}</div>{meta.event_date && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}><CalendarIcon size={12} /> {meta.event_date}{meta.event_time ? ` at ${meta.event_time}` : ""}</div>}{meta.event_location && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}><MapPinIcon size={12} /> {meta.event_location}</div>}{ep.body && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{ep.body}</p>}</div>; })}
          {events.length > 0 && <><h3 style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 800, marginTop: 20 }}>Upcoming</h3>{events.map(e => { const meta = e.metadata || {}; return <div key={e.id} className="ch-event-row" style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}><div style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 700, color: "#fff" }}>{meta.event_title || e.title}</div><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}><CalendarIcon size={12} /> {meta.event_date ? fmtDate(meta.event_date) : "TBD"} <span style={{ fontSize: 10, background: "rgba(34,211,238,0.1)", color: "#22D3EE", padding: "2px 8px", borderRadius: 8 }}>{meta.event_type || meta.event_tags?.[0] || "Event"}</span></div></div>; })}</>}
        </div></section>

        {/* === MEMBERS TAB === */}
        <section className={`ch-simple-panel${activeTab !== "Members" ? " ch-panel-hidden" : ""}`}><div className="ch-simple-card">
          {membersLoading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading members…</p> : <>
          <h3>Moderators</h3>{allMembers.filter(m => m.role === "moderator").map(m => <div key={m.id} className="ch-member-row" onClick={() => router.push(`/profile/${m.id}`)} style={{ cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}><div className="ch-lead-av">{m.initials}</div><div><div className="ch-lead-name">{m.full_name} {m.id === userId && <span style={{ fontSize: 10, background: "rgba(158,240,26,0.15)", color: "#9EF01A", padding: "2px 6px", borderRadius: 8, marginLeft: 6 }}>You</span>}</div><div className="ch-lead-role">{m.stream}{m.year ? ` · ${m.year}` : ""}</div></div></div>)}
          <h3 style={{ marginTop: 20 }}>Followers ({allMembers.filter(m => m.role === "follower").length})</h3>{allMembers.filter(m => m.role === "follower").map(m => <div key={m.id} className="ch-member-row" onClick={() => router.push(`/profile/${m.id}`)} style={{ cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}><div className="ch-lead-av">{m.initials}</div><div><div className="ch-lead-name">{m.full_name}</div><div className="ch-lead-role">{m.stream}{m.year ? ` · ${m.year}` : ""}</div></div></div>)}
          </>}
        </div></section>

        {/* === ABOUT TAB === */}
        <section className={`ch-simple-panel${activeTab !== "About" ? " ch-panel-hidden" : ""}`}><div className="ch-simple-card ch-about-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 800 }}>About {activeClub.name}</h3>{isModerator && !editAbout && <button type="button" onClick={() => { setEditAbout(true); setEditAboutDesc(activeClub.description); setEditAboutTags(activeClub.tags?.join(", ") || ""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><PencilIcon size={14} /></button>}</div>
          {editAbout ? <><textarea value={editAboutDesc} onChange={e => setEditAboutDesc(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: 10, color: "#fff", fontSize: 13, resize: "vertical", minHeight: 80, marginTop: 8 }} /><input value={editAboutTags} onChange={e => setEditAboutTags(e.target.value)} placeholder="Tags (comma separated)" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, marginTop: 8 }} /><div style={{ display: "flex", gap: 6, marginTop: 8 }}><button type="button" onClick={saveAbout} style={{ padding: "4px 12px", borderRadius: 6, background: "#9EF01A", color: "#1C1C28", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button><button type="button" onClick={() => setEditAbout(false)} style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, cursor: "pointer" }}>Cancel</button></div></>
          : <><p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>{activeClub.description}</p>{activeClub.tags?.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>{activeClub.tags.map(t => <span key={t} style={{ padding: "4px 10px", borderRadius: 12, fontSize: 11, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>{t}</span>)}</div>}</>}
        </div></section>
      </main>

      {/* === RIGHT PANEL === */}
      <aside className="ch-right" aria-label="Channel context">
        <div style={{ marginBottom: 32 }}>
          <div className="ch-r-label" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)", marginBottom: 12 }}>Pinned</div>
          <div className="ch-r-card" style={{ borderLeft: "2px solid rgba(158,240,26,0.3)", background: "rgba(158,240,26,0.03)", padding: 14, borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600, fontSize: 12, color: "#9EF01A", marginBottom: 8 }}><PinIcon size={12} /> Pinned {isModerator && !editPinned && <button type="button" onClick={() => { setEditPinned(true); setEditPinnedText(activeClub.pinned_message || activeClub.description); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", marginLeft: "auto" }}><PencilIcon size={11} /></button>}</div>
            {editPinned ? <><textarea value={editPinnedText} onChange={e => setEditPinnedText(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: 8, color: "#fff", fontSize: 12, resize: "vertical", minHeight: 50, marginTop: 8 }} /><div style={{ display: "flex", gap: 6, marginTop: 6 }}><button type="button" onClick={savePinned} style={{ padding: "4px 12px", borderRadius: 6, background: "#9EF01A", color: "#1C1C28", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button><button type="button" onClick={() => setEditPinned(false)} style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, cursor: "pointer" }}>Cancel</button></div></>
            : <><p className={`ch-pinned-text${pinnedExpanded ? " expanded" : ""}`} style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 400, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.62)" }}>{activeClub.pinned_message || activeClub.description}</p><button type="button" className="ch-pinned-more" onClick={() => setPinnedExpanded(v => !v)} style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#9EF01A", marginTop: 6 }}>{pinnedExpanded ? "Show less" : "Show more"}</button></>}
          </div>
        </div>
        <div style={{ marginBottom: 32 }}>
          <div className="ch-r-label" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)", marginBottom: 16 }}>Upcoming Events</div>
          {events.length === 0 && <div style={{ fontSize: 12, fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 400, fontStyle: "italic", color: "rgba(255,255,255,0.32)" }}>No upcoming events.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map((e) => {
              const meta = e.metadata || {};
              const badgeType = meta.event_type || meta.event_tags?.[0] || "Event";
              const dateStr = (meta.event_date && meta.event_time) ? `${meta.event_date} · ${meta.event_time}` : (meta.event_date || meta.event_time || "");
              return (
                <div key={e.id} className="ch-r-event" style={{ padding: 14, background: "#22223A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                  <div className="ch-r-event-title" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 6 }}>
                    {meta.event_title || e.title || "Event"}
                  </div>
                  {dateStr && <div className="ch-r-event-date" style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>
                    <CalendarIcon size={11} /> {dateStr}
                  </div>}
                  <span style={{ display: "inline-block", fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12, ...getBadgeStyle(badgeType) }}>
                    {badgeType}
                  </span>
                </div>
              );
            })}
          </div>
          {events.length > 0 && <button type="button" onClick={() => setActiveTab("Events")} style={{ background: "none", border: "none", fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#9EF01A", cursor: "pointer", marginTop: 12, padding: 0, textAlign: "left", width: "100%" }}>View all events &rarr;</button>}
        </div>
        <div>
          <div className="ch-r-label" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)", marginBottom: 16 }}>Club Leads</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {leads.length > 0 ? leads.map(l => <div key={l.id} className="ch-lead-row" style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="ch-lead-av" style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-inter), Inter, sans-serif", color: "#fff" }}>{l.initials}</div><div><div className="ch-lead-name" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.92)", marginBottom: 2 }}>{l.full_name}</div><div className="ch-lead-role" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.40)" }}>{l.stream}{l.year ? ` · ${l.year}` : ""}</div></div></div>) : <div style={{ fontSize: 12, fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 400, fontStyle: "italic", color: "rgba(255,255,255,0.28)" }}>No moderators assigned.</div>}
          </div>
        </div>
      </aside>
    </div>


    {/* === MANAGE MEMBERS PANEL === */}
    {manageOpen && <><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }} onClick={() => setManageOpen(false)} /><div className="ch-manage-modal">
      <div className="ch-manage-drag" />
      <div className="ch-manage-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}><h2 className="ch-manage-title" style={{ fontFamily: "var(--font-syne), Syne, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>Manage Members</h2><button type="button" onClick={() => setManageOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer", marginLeft: "auto" }}>✕</button></div>
      {membersLoading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : <>
        <h3 style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>Moderators</h3>
        {allMembers.filter(m => m.role === "moderator").map(m => <div key={m.membership_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}><div className="ch-lead-av">{m.initials}</div><div style={{ flex: 1 }}><div className="ch-lead-name">{m.full_name} {m.id === userId && <span style={{ fontSize: 10, background: "rgba(158,240,26,0.15)", color: "#9EF01A", padding: "2px 6px", borderRadius: 8, marginLeft: 4 }}>You</span>}</div></div>{m.id !== userId && <button type="button" onClick={() => demoteToFollower(m.membership_id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.25)", color: "#FB7185", cursor: "pointer" }}>Remove</button>}</div>)}
        <h3 style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 20, marginBottom: 12 }}>Followers</h3>
        {allMembers.filter(m => m.role === "follower").map(m => <div key={m.membership_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}><div className="ch-lead-av">{m.initials}</div><div style={{ flex: 1 }}><div className="ch-lead-name">{m.full_name}</div></div><button type="button" onClick={() => promoteToMod(m.membership_id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(158,240,26,0.1)", border: "1px solid rgba(158,240,26,0.25)", color: "#9EF01A", cursor: "pointer" }}>Make Moderator</button><button type="button" onClick={async () => { await supabase.from("club_members").delete().eq("id", m.membership_id); const club = clubs.find(c => c.id === activeId); if (club) await supabase.from("clubs").update({ follower_count: Math.max(0, (club.follower_count || 0) - 1) }).eq("id", activeId!); setAllMembers(prev => prev.filter(x => x.membership_id !== m.membership_id)); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.25)", color: "#FB7185", cursor: "pointer", marginLeft: 4 }}>Remove</button></div>)}
      </>}
    </div></div></>}

    {/* === CROP MODAL === */}
    {cropSrc && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "90vw", maxWidth: 600, height: "50vh", background: "#1C1C28", borderRadius: 12, overflow: "hidden" }}>
        <Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={16 / 9} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_: any, area: any) => setCroppedArea(area)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Zoom</label>
        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: 160 }} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button type="button" onClick={onCropConfirm} style={{ padding: "8px 24px", borderRadius: 8, background: "#9EF01A", color: "#1C1C28", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Crop & Upload</button>
        <button type="button" onClick={() => { setCropSrc(null); setComposeImage(null); }} style={{ padding: "8px 24px", borderRadius: 8, background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>}
  </div>);
}
