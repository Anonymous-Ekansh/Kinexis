"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import CropModal from "@/components/profile/CropModal";
import NetworkPanel from "@/components/profile/NetworkPanel";
import FollowButton from "@/components/shared/FollowButton";
import "../profile.css";

interface ProfilePageClientProps {
  profileId: string;
  viewerId: string | null;
  initialData: {
    initialProfile: any;
    initialProjects: any[];
    initialActivities: any[];
    initialCollabs: any[];
    initialFollowersCount: number;
    initialFollowingCount: number;
    initialSocialLinks: any[];
    initialIsFollowing: boolean;
    initialSimilarPeople: any[];
    isOwnProfile: boolean;
  };
}

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface Profile {
  id: string;
  full_name: string | null;
  stream: string | null;
  year: string | null;
  batch_year: string | null;
  interests: string[] | null;
  looking_for: string[] | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  cover_position?: number | null;
  clubs: string[] | null;
  currently_focused_on: string | null;
  karma_points?: number | null;
  created_at?: string | null;
}

interface Project {
  id: string;
  title: string;
  role: string | null;
  status: string;
  tech_tags: string[];
  badge_text: string | null;
  badge_color: string | null;
}

interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: string;
  target_title: string | null;
  target_id: string | null;
  target_type: string | null;
  is_read: boolean;
  created_at: string;
  // Legacy fallbacks
  type?: string;
  description?: string;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  label: string | null;
}



const LOOKING_FOR_OPTIONS = [
  "Build something", "Hackathon team", "Startup idea", "Creative projects",
  "Meet new people", "Just exploring", "Events & fests", "Study partner",
];
const LOOKING_FOR_COLORS = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function calcCompletion(p: Profile): number {
  const fields: (keyof Profile)[] = ["full_name", "stream", "year", "batch_year", "interests", "looking_for", "bio", "avatar_url", "clubs", "currently_focused_on"];
  let filled = 0;
  for (const f of fields) {
    const v = p[f];
    if (v && (typeof v !== "object" || (Array.isArray(v) && v.length > 0))) filled++;
  }
  return Math.round((filled / fields.length) * 100);
}

/* ═══ ACTIVITY HELPERS ═══ */

function activityTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}



/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function ProfilePageClient({ profileId, viewerId, initialData }: ProfilePageClientProps) {
  const router = useRouter();
  const loggedInUserId = viewerId;
  const isOwnProfile = initialData.isOwnProfile;

  // Core Data State (initialized from server data)
  const [isFollowing, setIsFollowing] = useState(initialData.initialIsFollowing);
  const [profile, setProfile] = useState<Profile | null>(initialData.initialProfile as Profile | null);
  const [projects, setProjects] = useState<Project[]>(initialData.initialProjects as Project[]);
  const [userCollabs, setUserCollabs] = useState<any[]>(initialData.initialCollabs);
  const [activities, setActivities] = useState<ActivityItem[]>(initialData.initialActivities as ActivityItem[]);
  const [followersCount, setFollowersCount] = useState(initialData.initialFollowersCount);
  const [followingCount, setFollowingCount] = useState(initialData.initialFollowingCount);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialData.initialSocialLinks as SocialLink[]);

  // UI State
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ddOpen, setDdOpen] = useState(false);
  
  // Image Upload & Crop State
  const [cropFileSrc, setCropFileSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"avatar" | "cover" | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Image Menus & Adjust State
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [avatarRemoveConfirming, setAvatarRemoveConfirming] = useState(false);
  const [coverRemoveConfirming, setCoverRemoveConfirming] = useState(false);

  const [isAdjustingCover, setIsAdjustingCover] = useState(false);

  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);
  const [confirmRemoveCover, setConfirmRemoveCover] = useState(false);

  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const coverMenuRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Edit Profile State

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", stream: "", year: "", batch_year: "", bio: "", currently_focused_on: "" });
  const [addingInterest, setAddingInterest] = useState(false);
  const [interestInput, setInterestInput] = useState("");
  const [editLooking, setEditLooking] = useState(false);
  const [lookingDraft, setLookingDraft] = useState<string[]>([]);
  const [addingClub, setAddingClub] = useState(false);
  const [clubInput, setClubInput] = useState("");
  const [editBio, setEditBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");

  // Projects State
  const [addingProject, setAddingProject] = useState(false);
  const [projForm, setProjForm] = useState({ title: "", role: "", status: "Active", tech_tags: "", badge_text: "", badge_color: "lime" });

  // Socials State
  const [addingSocial, setAddingSocial] = useState(false);
  const [socialForm, setSocialForm] = useState({ platform: "github", url: "" });

  // Network Modal State
  const [showNetwork, setShowNetwork] = useState(false);

  // Similar People State
  const [similarPeople, setSimilarPeople] = useState<{
    id: string; full_name: string; stream: string | null;
    interests: string[]; clubs: string[]; avatar_url: string | null;
    sharedTags: string[];
  }[]>(initialData.initialSimilarPeople);

  // Cover position from profile
  const initialCoverPos = (initialData.initialProfile as any)?.cover_position;
  const [coverPosition, setCoverPosition] = useState<number>(initialCoverPos != null ? initialCoverPos : 50);

  /* Scroll reveal */
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.05 });
    document.querySelectorAll(".pf-reveal").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);



  /* ── PREVENT OUTSIDE CLICK DROPDOWN ── */
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!avatarMenuRef.current?.contains(e.target as Node)) setShowAvatarMenu(false);
      if (!coverMenuRef.current?.contains(e.target as Node)) setShowCoverMenu(false);
      setDdOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* ── REALTIME ACTIVITY ── */
  useEffect(() => {
    if (!profileId) return;

    const fetchActivity = async () => {
      const { data, error } = await supabase.rpc('get_user_activity', { p_user_id: profileId });
      if (!error && data) {
         setActivities((data as any[]).slice(0, 5) as ActivityItem[]);
      }
    };

    const c1 = supabase.channel('prof-act-follows')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, fetchActivity)
      .subscribe();
    const c2 = supabase.channel('prof-act-interest')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_interest' }, fetchActivity)
      .subscribe();

    window.addEventListener("activityUpdated", fetchActivity);

    return () => { 
      supabase.removeChannel(c1); 
      supabase.removeChannel(c2); 
      window.removeEventListener("activityUpdated", fetchActivity);
    }
  }, [profileId]);

  /* ── REALTIME COLLABS ── */
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase.channel(`public:collabs:${profileId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'collabs', filter: `author_id=eq.${profileId}` }, (payload) => {
        setUserCollabs(prev => [payload.new as any, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'collabs' }, (payload) => {
        setUserCollabs(prev => prev.filter(c => c.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); }
  }, [profileId]);

  const refreshFollowCounts = useCallback(async () => {
    if (!profileId) return;
    const { data: fCount } = await supabase.rpc("get_followers_count", { target_user_id: profileId });
    if (typeof fCount === 'number') setFollowersCount(fCount);
    const { data: fngCount } = await supabase.rpc("get_following_count", { target_user_id: profileId });
    if (typeof fngCount === 'number') setFollowingCount(fngCount);
  }, [profileId]);

  if (!profile) return (
     <div className="flex items-center justify-center min-h-screen text-white">
       Profile not found
     </div>
  );
  const initials = getInitials(profile.full_name);
  const completion = isOwnProfile ? calcCompletion(profile) : 0;
  const hasAvatar = !!profile.avatar_url;
  const hasCover = !!profile.cover_url;



  /* ═══ PROFILE EDITING HANDLERS ═══ */
  const saveField = async (updates: Record<string, unknown>) => {
    if (!loggedInUserId || !isOwnProfile) return;
    const { error } = await supabase.from("users").update(updates).eq("id", loggedInUserId);
    if (error) { showToast("Failed to save", "error"); }
    else {
      showToast("Saved", "success");
      setProfile(prev => prev ? { ...prev, ...updates } as Profile : prev);
    }
  };

  const openEditMode = () => {
    setEditForm({
      full_name: profile.full_name || "",
      stream: profile.stream || "",
      year: profile.year || "",
      batch_year: profile.batch_year || "",
      bio: profile.bio || "",
      currently_focused_on: profile.currently_focused_on || "",
    });
    setEditMode(true);
  };
  const saveEditMode = async () => { await saveField(editForm); setEditMode(false); };
  
  const addInterest = async (tag: string) => {
    const clean = tag.trim(); if (!clean) return;
    const cur = profile.interests || []; if (cur.includes(clean)) return;
    await saveField({ interests: [...cur, clean] }); setInterestInput("");
  };
  const removeInterest = async (tag: string) => { await saveField({ interests: (profile.interests || []).filter(t => t !== tag) }); };

  const openLookingEdit = () => { setLookingDraft([...(profile.looking_for || [])]); setEditLooking(true); };
  const toggleLookingDraft = (opt: string) => { setLookingDraft(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]); };
  const saveLooking = async () => { await saveField({ looking_for: lookingDraft }); setEditLooking(false); };

  const addClub = async (tag: string) => {
    const clean = tag.trim(); if (!clean) return;
    const cur = profile.clubs || []; if (cur.includes(clean)) return;
    await saveField({ clubs: [...cur, clean] }); setClubInput("");
  };
  const removeClub = async (tag: string) => { await saveField({ clubs: (profile.clubs || []).filter(t => t !== tag) }); };

  const openBioEdit = () => { setBioDraft(profile.bio || ""); setEditBio(true); };
  const saveBio = async () => { await saveField({ bio: bioDraft }); setEditBio(false); };

  /* ═══ COVER & AVATAR UPLOAD ═══ */
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const src = URL.createObjectURL(file);
    setCropFileSrc(src);
    setCropType(type);
    setShowAvatarMenu(false);
    setShowCoverMenu(false);
    e.target.value = ''; // Reset input
  };

  const handleAvatarClick = () => {
    if (hasAvatar) setShowAvatarMenu(prev => !prev);
    else avatarInputRef.current?.click();
  };

  const handleCoverClick = () => {
    if (hasCover) setShowCoverMenu(prev => !prev);
    else coverInputRef.current?.click();
  };

  const handleCropComplete = async (croppedFile: File) => {
    if (!loggedInUserId || !cropType || !isOwnProfile) return;
    setIsUploadingImage(true);
    
    const bucket = cropType === 'avatar' ? 'avatars' : 'covers';
    const filePath = `${loggedInUserId}/${cropType === 'avatar' ? 'avatar' : 'cover'}.jpg`;
    
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, croppedFile, { upsert: true });
    
    if (uploadError) { 
      showToast("Upload failed", "error"); 
      setIsUploadingImage(false);
      return; 
    }
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
    await saveField({ [`${cropType}_url`]: publicUrl });
    
    showToast(`${cropType === 'avatar' ? 'Profile photo' : 'Cover image'} updated ✓`, "success");
    setIsUploadingImage(false);
    setCropFileSrc(null);
    setCropType(null);
  };

  const handleRemoveCover = async () => {
    if (!loggedInUserId || !isOwnProfile) return;
    await supabase.storage.from('covers').remove([`${loggedInUserId}/cover.jpg`]);
    await supabase.from('users').update({ cover_url: null, cover_position: 50 }).eq('id', loggedInUserId);
    setProfile(prev => prev ? ({ ...prev, cover_url: null }) : prev);
    setCoverPosition(50);
    setConfirmRemoveCover(false);
    setIsAdjustingCover(false);
    showToast("Cover removed", "success");
  };

  const handleRemoveAvatar = async () => {
    if (!loggedInUserId || !isOwnProfile) return;
    await supabase.storage.from('avatars').remove([`${loggedInUserId}/avatar.jpg`]);
    await supabase.from('users').update({ avatar_url: null }).eq('id', loggedInUserId);
    setProfile(prev => prev ? ({ ...prev, avatar_url: null }) : prev);
    setConfirmRemoveAvatar(false);
    showToast("Profile photo removed", "success");
  };

  /* ═══ COVER ADJUSTMENT ═══ */
  const handleCoverPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isAdjustingCover) return;
    e.preventDefault(); 
    
    const startY = e.clientY;
    const startPos = coverPosition;
    
    const onMove = (me: PointerEvent) => {
      const deltaY = me.clientY - startY;
      // 2px drag = 1% position change (can adjust sensitivity)
      const newPos = startPos - (deltaY * 0.5); 
      setCoverPosition(Math.max(0, Math.min(100, newPos)));
    };
    
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  
  const saveCoverPosition = async () => {
    setIsAdjustingCover(false);
    await saveField({ cover_position: coverPosition });
  };

  /* ═══ PROJECTS ═══ */
  const saveProject = async () => {
    if (!loggedInUserId || !projForm.title || !isOwnProfile) return;
    const tags = projForm.tech_tags.split(',').map(t => t.trim()).filter(Boolean);
    const { data, error } = await supabase.from("projects").insert({
      user_id: loggedInUserId,
      title: projForm.title,
      role: projForm.role,
      status: projForm.status,
      tech_tags: tags,
      badge_text: projForm.badge_text,
      badge_color: projForm.badge_color
    }).select().single();

    if (error) { showToast("Failed to add project", "error"); return; }
    showToast("Project added", "success");
    setProjects([data, ...projects]);
    setAddingProject(false);
    setProjForm({ title: "", role: "", status: "Active", tech_tags: "", badge_text: "", badge_color: "lime" });

    // Insert an activity record
    logActivity({ userId: loggedInUserId, activityType: "project_added", targetTitle: projForm.title, targetId: data.id, targetType: "project" });
  };

  /* ═══ SOCIAL LINKS ═══ */
  const saveSocialLink = async () => {
    if (!loggedInUserId || !socialForm.url || !isOwnProfile) return;
    const { data, error } = await supabase.from("social_links").insert({
      user_id: loggedInUserId,
      platform: socialForm.platform,
      url: socialForm.url
    }).select().single();
    if (error) { showToast("Failed to add link", "error"); return; }
    setSocialLinks([...socialLinks, data as SocialLink]);
    setAddingSocial(false);
    setSocialForm({ platform: "github", url: "" });
  };

  /* ═══ NETWORK MODAL ═══ */
  const openNetworkModal = () => {
    setShowNetwork(true);
  };


  const handleSignOut = async () => { await supabase.auth.signOut(); router.replace("/"); };

  return (
    <div className="profile-page">

      {/* ── BANNER ── */}
      <div 
        className="pf-banner relative h-[180px] bg-[#1C1C28] overflow-hidden" 
        onClick={(e) => {
          e.stopPropagation();
          // The background grid fallback click logic or adjust logic
        }}
      >
        {!hasCover && <div className="pf-banner-gradient-fallback absolute inset-0 bg-gradient-to-br from-[#22223A] to-[#1C1C28]" />}
        {!hasCover && <><div className="pf-banner-glow-l" /><div className="pf-banner-glow-r" /></>}
        
        {hasCover && (
           <img 
             src={profile.cover_url!} 
             alt="Cover" 
             className={`pf-banner-img absolute inset-0 w-full h-full object-cover ${isAdjustingCover ? "cursor-grab active:cursor-grabbing" : ""}`}
             style={{ objectPosition: `center ${coverPosition}%` }}
             onPointerDown={handleCoverPointerDown}
           />
        )}
        
        {isAdjustingCover && (
          <div className="pf-drag-hint absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md pointer-events-none z-10 animate-fade-in">
            Drag to reposition ↕
          </div>
        )}

        {isUploadingImage && cropType === 'cover' && (
          <div className="pf-image-loading-overlay absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <span className="pf-spinner border-2" />
          </div>
        )}

        <div className="absolute bottom-4 right-7 flex gap-2 z-20">
          {hasCover && !isAdjustingCover && (
            <button 
              className="pf-banner-edit bg-black/50 backdrop-blur border border-white/20 text-white px-3 py-1.5 rounded-full text-[11px] font-semibold hover:bg-black/80 transition-all flex items-center gap-1.5"
              onClick={(e) => { e.stopPropagation(); setIsAdjustingCover(true); setShowCoverMenu(false); setShowAvatarMenu(false); }}
            >
              ↕ Adjust photo
            </button>
          )}

          {isOwnProfile && (
            <button 
              className="pf-banner-edit bg-black/50 backdrop-blur border border-white/20 text-white px-3 py-1.5 rounded-full text-[11px] font-semibold hover:bg-black/80 transition-all focus:outline-none"
              onClick={(e) => { e.stopPropagation(); handleCoverClick(); }}
            >
              {hasCover ? "✎ Edit cover" : "✎ Add cover"}
            </button>
          )}
          
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileSelected(e, 'cover')} />

          {isAdjustingCover && (
            <button 
              className="bg-[#9EF01A] text-black px-4 py-1.5 rounded-full text-[11px] font-bold hover:bg-[#8ce116] transition-all"
              onClick={(e) => { e.stopPropagation(); saveCoverPosition(); }}
            >
              ✓ Save position
            </button>
          )}

          {showCoverMenu && (
            <div ref={coverMenuRef} className="absolute z-50 bottom-12 right-0 bg-[#22223A] border border-white/[0.13] rounded-xl p-1.5 min-w-[190px] shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => { setShowCoverMenu(false); coverInputRef.current?.click(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                📷 Upload new cover
              </button>
              {hasCover && (
                <button 
                  onClick={() => { setShowCoverMenu(false); setConfirmRemoveCover(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#FB7185] hover:bg-white/[0.06] transition-all"
                >
                  🗑️ Remove cover
                </button>
              )}
            </div>
          )}

          {confirmRemoveCover && (
            <div className="absolute z-50 bottom-12 right-0 bg-[#22223A] border border-white/[0.13] rounded-xl p-3 min-w-[190px] shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
              <p className="text-[12px] text-white/70 mb-2 font-medium">Remove cover photo?</p>
              <div className="flex gap-2">
                <button onClick={handleRemoveCover} className="flex-1 py-1.5 rounded-lg bg-[#FB7185]/10 text-[#FB7285] text-[11px] font-bold border border-[#FB7185]/20 hover:bg-[#FB7185] hover:text-white transition-all">Remove</button>
                <button onClick={() => setConfirmRemoveCover(false)} className="flex-1 py-1.5 rounded-lg bg-white/[0.06] text-white/60 text-[11px] font-bold hover:bg-white/[0.1] transition-all">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── OUTER ── */}
      <div className="pf-outer">
        {/* Avatar row */}
        <div className="pf-avatar-row pf-reveal relative z-30">
          <div className="pf-avatar-wrap-container relative">
            <div 
              className={`pf-avatar-wrap relative ${isOwnProfile ? "cursor-pointer" : ""}`} 
              onClick={(e) => { e.stopPropagation(); if (isOwnProfile) handleAvatarClick(); }}
            >
              <div className="pf-big-avatar w-[84px] h-[84px] rounded-[20px] bg-[#9EF01A] flex items-center justify-center font-bold text-2xl text-black border-[3px] border-[#1C1C28] overflow-hidden">
                {hasAvatar ? (
                  <img src={profile.avatar_url!} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
                {isUploadingImage && cropType === 'avatar' && (
                  <div className="pf-image-loading-overlay pf-avatar-overlay absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <span className="pf-spinner border-2" />
                  </div>
                )}
              </div>
              <div className="pf-avatar-status absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-[#1C1C28]" />
            </div>

            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileSelected(e, 'avatar')} />

            {showAvatarMenu && (
              <div ref={avatarMenuRef} className="absolute z-50 top-full mt-2 left-0 bg-[#22223A] border border-white/[0.13] rounded-xl p-1.5 min-w-[180px] shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => { setShowAvatarMenu(false); avatarInputRef.current?.click(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  📷 Upload new photo
                </button>
                <button 
                  onClick={() => { setShowAvatarMenu(false); setConfirmRemoveAvatar(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#FB7185] hover:bg-white/[0.06] transition-all"
                >
                  🗑️ Remove photo
                </button>
              </div>
            )}

            {confirmRemoveAvatar && (
              <div className="absolute z-50 top-full mt-2 left-0 bg-[#22223A] border border-white/[0.13] rounded-xl p-3 min-w-[180px] shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
                <p className="text-[12px] text-white/70 mb-2 font-medium">Remove profile photo?</p>
                <div className="flex gap-2">
                  <button onClick={handleRemoveAvatar} className="flex-1 py-1.5 rounded-lg bg-[#FB7185]/10 text-[#FB7185] text-[11px] font-bold border border-[#FB7185]/20 hover:bg-[#FB7185] hover:text-white transition-all">Remove</button>
                  <button onClick={() => setConfirmRemoveAvatar(false)} className="flex-1 py-1.5 rounded-lg bg-white/[0.06] text-white/60 text-[11px] font-bold hover:bg-white/[0.1] transition-all">Cancel</button>
                </div>
              </div>
            )}
          </div>
          <div className="pf-avatar-actions">
            {isOwnProfile ? (
              <button className="pf-btn-edit-profile" onClick={openEditMode}>✎ Edit profile</button>
            ) : (
              <FollowButton 
                targetUserId={profileId} 
                className="pf-btn-follow"
                onFollowChange={(state) => {
                  if (state) setFollowersCount(v => v + 1);
                  else setFollowersCount(v => Math.max(0, v - 1));
                  setIsFollowing(state);
                }}
              />
            )}
            <button className="pf-btn-share">↗</button>
          </div>
        </div>

        {/* ── PROFILE BODY ── */}
        <div className="pf-body">
          {/* ═══ LEFT CARD ═══ */}
          <div className="pf-left-card pf-reveal pf-reveal-d1">
            <div className="pf-left-inner">
              {editMode ? (
                <>
                  <label className="pf-edit-label">Full name</label>
                  <input className="pf-inline-input" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="Your name" />
                  <label className="pf-edit-label">Stream</label>
                  <select className="pf-inline-select" value={editForm.stream} onChange={e => setEditForm({ ...editForm, stream: e.target.value })}>
                    <option value="" disabled>Pick your stream</option>
                    <optgroup label="Engineering">
                      <option>Computer Science and Engineering</option>
                      <option>Electronics and Communication Engineering</option>
                      <option>Electrical and Computer Engineering</option>
                      <option>Mechanical Engineering</option>
                      <option>Chemical Engineering</option>
                      <option>Biotechnology</option>
                      <option>Civil Engineering</option>
                    </optgroup>
                    <optgroup label="Sciences">
                      <option>Chemistry</option><option>Mathematics</option><option>Physics</option>
                    </optgroup>
                    <optgroup label="Economics & Business">
                      <option>Economics</option><option>Bachelor of Management Studies (BMS)</option><option>MBA</option>
                    </optgroup>
                    <optgroup label="Humanities & Social Sciences">
                      <option>English</option><option>History</option><option>Sociology</option>
                      <option>International Relations and Governance Studies</option><option>Psychology</option>
                    </optgroup>
                  </select>
                  <div className="pf-edit-field-row">
                    <div>
                      <label className="pf-edit-label">Year</label>
                      <select className="pf-inline-select" value={editForm.year} onChange={e => setEditForm({ ...editForm, year: e.target.value })}>
                        <option value="" disabled>Year</option>
                        <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option><option>Postgrad</option>
                      </select>
                    </div>
                    <div>
                      <label className="pf-edit-label">Batch year</label>
                      <input className="pf-inline-input" value={editForm.batch_year} onChange={e => setEditForm({ ...editForm, batch_year: e.target.value })} placeholder="e.g. 2027" maxLength={4} />
                    </div>
                  </div>
                  <label className="pf-edit-label">Bio</label>
                  <textarea className="pf-inline-textarea" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell people about yourself..." rows={3} />
                  <div style={{ marginTop: 8 }} />
                  <label className="pf-edit-label">Currently focused on</label>
                  <input className="pf-inline-input" value={editForm.currently_focused_on} onChange={e => setEditForm({ ...editForm, currently_focused_on: e.target.value })} placeholder="What are you working on?" />
                  <div className="pf-edit-row">
                    <button className="pf-save-btn" onClick={saveEditMode}>Save</button>
                    <button className="pf-cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="pf-name">{profile.full_name || "Unnamed"}</div>
                  <div className="pf-batch">{profile.year || ""}{profile.year ? " · " : ""}Shiv Nadar University</div>
                  {profile.stream && (
                    <div className="pf-stream-badge">
                      <span className="pf-stream-dot" />
                      {profile.stream}
                    </div>
                  )}
                  {editBio && isOwnProfile ? (
                    <div style={{ marginBottom: 18 }}>
                      <textarea className="pf-inline-textarea" value={bioDraft} onChange={e => setBioDraft(e.target.value)} onBlur={saveBio} rows={3} autoFocus placeholder="Write about yourself..." />
                    </div>
                  ) : (
                    profile.bio ? (
                      <div className="pf-bio" {...(isOwnProfile ? { onClick: openBioEdit, style: { cursor: "pointer" } } : {})}>{profile.bio}</div>
                    ) : (
                      isOwnProfile ? (
                        <div className="pf-bio-empty" onClick={openBioEdit}>Click to add a bio...</div>
                      ) : (
                        <div className="pf-bio-empty">No bio yet</div>
                      )
                    )
                  )}

                  {/* Stats */}
                  <div className="pf-stats" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                    <div className="pf-stat" onClick={openNetworkModal} style={{ cursor: "pointer" }}>
                      <div className="pf-stat-n" style={{ color: "var(--lime)" }}>{followersCount}</div>
                      <div className="pf-stat-l">Followers</div>
                    </div>
                    <div className="pf-stat" onClick={openNetworkModal} style={{ cursor: "pointer" }}>
                      <div className="pf-stat-n" style={{ color: "var(--lime)" }}>{followingCount}</div>
                      <div className="pf-stat-l">Following</div>
                    </div>
                    <div className="pf-stat">
                      <div className="pf-stat-n" style={{ color: "var(--cyan)" }}>{(profile.clubs || []).length}</div>
                      <div className="pf-stat-l">Clubs</div>
                    </div>
                    <div className="pf-stat">
                      <div className="pf-stat-n" style={{ color: "var(--purple)" }}>{profile.karma_points ?? 0}</div>
                      <div className="pf-stat-l">Karma</div>
                    </div>
                  </div>

                  {/* Skills & Interests */}
                  <div className="pf-divider" />
                  <div className="pf-section-label">Skills &amp; Interests</div>
                  {(profile.interests && profile.interests.length > 0) ? (
                    <div className="pf-tags">
                      {profile.interests.map(tag => (
                        <span key={tag} className="pf-tag">
                          {tag}
                          {isOwnProfile && <button className="pf-tag-remove" onClick={() => removeInterest(tag)}>×</button>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>No interests yet</div>
                  )}
                  {isOwnProfile && addingInterest && (
                    <div className="pf-tag-input-wrap">
                      <input className="pf-inline-input" style={{ marginBottom: 0 }} value={interestInput} onChange={e => setInterestInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addInterest(interestInput); } }} placeholder="Type & press Enter" autoFocus />
                      <button className="pf-tag-input-add" onClick={() => addInterest(interestInput)}>Add</button>
                    </div>
                  )}
                  {isOwnProfile && <button className="pf-r-card-action" style={{ marginTop: 8 }} onClick={() => setAddingInterest(v => !v)}>+ Add</button>}

                  {/* Open to */}
                  <div className="pf-divider" />
                  <div className="pf-section-label">Open to</div>
                  {editLooking ? (
                    <>
                      <div className="pf-intent-grid">
                        {LOOKING_FOR_OPTIONS.map(opt => (
                          <div key={opt} className={`pf-intent-pill${lookingDraft.includes(opt) ? " selected" : ""}`} onClick={() => toggleLookingDraft(opt)}>
                            <span>{opt}</span>
                            <div className="pf-intent-check">
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pf-edit-row" style={{ marginTop: 10 }}>
                        <button className="pf-save-btn" onClick={saveLooking}>Save</button>
                        <button className="pf-cancel-btn" onClick={() => setEditLooking(false)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {(profile.looking_for && profile.looking_for.length > 0) ? (
                        <div className="pf-looking" {...isOwnProfile ? { onClick: openLookingEdit } : {}}>
                          {profile.looking_for.map((item, i) => (
                            <div key={item} className="pf-looking-item">
                              <div className="pf-looking-dot" style={{ background: LOOKING_FOR_COLORS[i % LOOKING_FOR_COLORS.length] }} />
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pf-bio-empty" {...isOwnProfile ? { onClick: openLookingEdit } : {}}>{isOwnProfile ? "Click to add what you're looking for..." : "Nothing listed"}</div>
                      )}
                      {isOwnProfile && <button className="pf-r-card-action" style={{ marginTop: 8 }} onClick={openLookingEdit}>✎ Edit</button>}
                    </>
                  )}

                  {/* Clubs */}
                  <div className="pf-divider" />
                  <div className="pf-section-label">Clubs &amp; Organizations</div>
                  {(profile.clubs && profile.clubs.length > 0) ? (
                    <div className="pf-tags">
                      {profile.clubs.map(tag => (
                        <span key={tag} className="pf-tag">
                          {tag}
                          {isOwnProfile && <button className="pf-tag-remove" onClick={() => removeClub(tag)}>×</button>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>No clubs yet</div>
                  )}
                  {isOwnProfile && addingClub && (
                    <div className="pf-tag-input-wrap">
                      <input className="pf-inline-input" style={{ marginBottom: 0 }} value={clubInput} onChange={e => setClubInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addClub(clubInput); } }} placeholder="Type club name & Enter" autoFocus />
                      <button className="pf-tag-input-add" onClick={() => addClub(clubInput)}>Add</button>
                    </div>
                  )}
                  {isOwnProfile && (
                    <button className="pf-r-card-action" style={{ marginTop: addingClub ? 0 : 8 }} onClick={() => setAddingClub(!addingClub)}>
                      {addingClub ? "Cancel" : "+ Add club"}
                    </button>
                  )}

                  {/* Social Links */}
                  <div className="pf-divider" />
                  <div className="pf-section-label">Resources &amp; Links</div>
                  <div className="pf-links">
                    {socialLinks.map(link => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="pf-link">
                        <span className="pf-link-icon">{link.platform === 'github' ? 'GH' : link.platform === 'linkedin' ? 'LI' : '✦'}</span>
                        {link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
                      </a>
                    ))}
                    {isOwnProfile && addingSocial ? (
                      <div style={{ marginTop: 8 }}>
                        <select className="pf-inline-select" value={socialForm.platform} onChange={e => setSocialForm({...socialForm, platform: e.target.value})}>
                          <option value="github">GitHub</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="twitter">Twitter/X</option>
                          <option value="instagram">Instagram</option>
                          <option value="website">Website</option>
                          <option value="other">Other</option>
                        </select>
                        <input className="pf-inline-input" placeholder="https://..." value={socialForm.url} onChange={e => setSocialForm({...socialForm, url: e.target.value})}/>
                        <div className="pf-edit-row">
                          <button className="pf-save-btn" onClick={saveSocialLink}>Save Link</button>
                          <button className="pf-cancel-btn" onClick={() => setAddingSocial(false)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      isOwnProfile && <button className="pf-r-card-action" style={{ marginTop: 4 }} onClick={() => setAddingSocial(true)}>+ Add link</button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Left card footer */}
            {!editMode && (
              <div className="pf-left-footer">
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Stream</div>
                <div style={{ fontSize: 11, color: "var(--sub)", fontWeight: 600 }}>{profile.stream || "Not set"}</div>
                {profile.batch_year && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Batch of {profile.batch_year}</div>}
              </div>
            )}
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div className="pf-right-col">

            {/* Collabs / Projects */}
            <div className="pf-r-card pf-reveal pf-reveal-d2">
              <div className="pf-r-card-h" style={{ marginBottom: addingProject ? 8 : 16 }}>
                <span className="pf-r-card-title">Collabs / Projects</span>
                {isOwnProfile && !addingProject && <button className="pf-r-card-action" onClick={() => setAddingProject(true)}>+ Add project</button>}
              </div>

              {/* User's Collabs from collabs page */}
              {userCollabs.length > 0 && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>COLLABS</div>
                  {userCollabs.map((collab: any) => {
                    const statusMap: Record<string, { icon: string; color: string }> = {
                      open: { icon: '🟢', color: 'var(--lime)' },
                      building: { icon: '🟡', color: '#f59e0b' },
                      ideation: { icon: '💡', color: 'var(--cyan)' },
                      closed: { icon: '🔴', color: 'var(--coral)' },
                    };
                    const st = statusMap[collab.status] || statusMap.open;
                    const spotsOpen = (collab.spots_total || 1) - (collab.spots_filled || 0);
                    return (
                      <div key={collab.id} className="pf-proj-item">
                        <div className="pf-proj-icon" style={{ background: 'rgba(34,211,238,0.1)' }}>🤝</div>
                        <div className="pf-proj-body">
                          <div className="pf-proj-title">{collab.title}</div>
                          <div className="pf-proj-role">{collab.category || 'Collab'} · {st.icon} {collab.status}</div>
                          {collab.tags?.length > 0 && (
                            <div className="pf-proj-tags">
                              {collab.tags.slice(0, 4).map((t: string) => <span key={t} className="pf-proj-tag">{t}</span>)}
                              {collab.tags.length > 4 && <span className="pf-proj-tag">+{collab.tags.length - 4}</span>}
                            </div>
                          )}
                        </div>
                        <div className="pf-proj-badge" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--cyan)' }}>
                          {spotsOpen > 0 ? `${spotsOpen} spots open` : 'Full'}
                        </div>
                      </div>
                    );
                  })}
                  {projects.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />}
                </>
              )}

              {/* Projects section heading (only if collabs exist too) */}
              {userCollabs.length > 0 && projects.length > 0 && (
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>PROJECTS</div>
              )}

              {isOwnProfile && addingProject && (
                <div style={{ background: "var(--surface2)", padding: 16, borderRadius: 12, marginBottom: 16, border: "1px solid var(--border)" }}>
                  <label className="pf-edit-label">Project Title</label>
                  <input className="pf-inline-input" placeholder="What are you building?" value={projForm.title} onChange={e => setProjForm({...projForm, title: e.target.value})} />
                  
                  <div className="pf-edit-field-row">
                    <div>
                      <label className="pf-edit-label">Your Role</label>
                      <input className="pf-inline-input" placeholder="e.g. Frontend Dev" value={projForm.role} onChange={e => setProjForm({...projForm, role: e.target.value})} />
                    </div>
                    <div>
                      <label className="pf-edit-label">Status</label>
                      <select className="pf-inline-select" value={projForm.status} onChange={e => setProjForm({...projForm, status: e.target.value})}>
                        <option>Active</option>
                        <option>Completed</option>
                        <option>Seeking team</option>
                        <option>On hold</option>
                      </select>
                    </div>
                  </div>
                  
                  <label className="pf-edit-label">Tech Stack (comma separated)</label>
                  <input className="pf-inline-input" placeholder="React, Node.js, Supabase..." value={projForm.tech_tags} onChange={e => setProjForm({...projForm, tech_tags: e.target.value})} />
                  
                  <div className="pf-edit-field-row">
                    <div>
                      <label className="pf-edit-label">Badge Text (Optional)</label>
                      <input className="pf-inline-input" placeholder="e.g. Winner" value={projForm.badge_text} onChange={e => setProjForm({...projForm, badge_text: e.target.value})} />
                    </div>
                  </div>

                  <div className="pf-edit-row" style={{ marginTop: 8 }}>
                    <button className="pf-save-btn" onClick={saveProject}>Save Project</button>
                    <button className="pf-cancel-btn" onClick={() => setAddingProject(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {projects.length > 0 ? (
                projects.map(proj => (
                  <div key={proj.id} className="pf-proj-item">
                    <div className="pf-proj-icon" style={{ background: "rgba(158,240,26,0.1)" }}>⚡</div>
                    <div className="pf-proj-body">
                      <div className="pf-proj-title">{proj.title}</div>
                      <div className="pf-proj-role">{proj.role || "Contributor"} · {proj.status}</div>
                      {proj.tech_tags && proj.tech_tags.length > 0 && (
                        <div className="pf-proj-tags">
                          {proj.tech_tags.slice(0, 4).map(t => <span key={t} className="pf-proj-tag">{t}</span>)}
                          {proj.tech_tags.length > 4 && <span className="pf-proj-tag">+{proj.tech_tags.length - 4}</span>}
                        </div>
                      )}
                    </div>
                    {proj.badge_text && (
                      <div className="pf-proj-badge" style={{ background: `var(--${proj.badge_color || 'lime'})20`, color: `var(--${proj.badge_color || 'lime'})` }}>{proj.badge_text}</div>
                    )}
                  </div>
                ))
              ) : (
                !addingProject && userCollabs.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: 20 }}>
                    No collabs or projects yet — post a collab or add a project!
                  </div>
                )
              )}
            </div>

            {/* Recent Activity */}
            <div className="pf-r-card pf-reveal pf-reveal-d2">
              <div className="pf-r-card-h">
                <span className="pf-r-card-title">Recent Activity</span>
              </div>
              
              {activities.length > 0 ? (
                activities.map((act, i) => (
                  <div key={act.id || i} className="pf-activity-row">
                    <div className="pf-act-dot" style={{ background: "rgba(158,240,26,0.1)" }}>⚡</div>
                    <div className="pf-act-text">
                      <div className="pf-act-title">{act.description}</div>
                      <div className="pf-act-time">{activityTimeAgo(act.created_at)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: 20 }}>
                  No recent activity
                </div>
              )}
            </div>

            {/* People with similar interests */}
            <div className="pf-r-card pf-reveal pf-reveal-d3">
              <div className="pf-r-card-h">
                <span className="pf-r-card-title">People with similar interests</span>
                <Link href="/discover" prefetch={false} style={{ textDecoration: 'none' }}><span className="pf-r-card-action">See more</span></Link>
              </div>
              <div className="pf-sim-grid">
                {similarPeople.length > 0 ? (
                  similarPeople.map((p, i) => {
                    const colors = ["var(--lime)", "var(--cyan)", "var(--purple)", "var(--coral)"];
                    const color = colors[i % colors.length];
                    const ini = getInitials(p.full_name);
                    return (
                      <div key={p.id} className="pf-sim-card" style={{ borderLeftColor: color, cursor: 'pointer' }} onClick={() => router.push(`/profile/${p.id}`)}>
                        <div className="pf-sim-top">
                          {p.avatar_url ? (
                            <div className="pf-sim-av" style={{ overflow: 'hidden' }}><img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                          ) : (
                            <div className="pf-sim-av" style={{ background: color }}>{ini}</div>
                          )}
                          <div><div className="pf-sim-name">{p.full_name || 'User'}</div><div className="pf-sim-dep">{p.stream || ''}</div></div>
                        </div>
                        <div className="pf-sim-tags">{p.sharedTags.slice(0, 3).map(t => <span key={t} className="pf-sim-tag">{t}</span>)}{p.sharedTags.length > 3 && <span className="pf-sim-tag">+{p.sharedTags.length - 3}</span>}</div>
                        <button className="pf-sim-connect" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${p.id}`); }}>View Profile →</button>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                    {(profile.interests?.length || 0) === 0 && (profile.clubs?.length || 0) === 0
                      ? 'Add interests or clubs to find similar people'
                      : 'No similar people found yet'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="pf-footer">
        <span className="pf-foot-l">© 2026 Kinexis · Made for Indian university students</span>
        <span className="pf-foot-r">kinexis.in</span>
      </footer>

      {/* ── NETWORK PANEL ── */}
      <NetworkPanel 
        isOpen={showNetwork} 
        onClose={() => setShowNetwork(false)} 
        initialProfileId={profileId}
        onFollowChange={refreshFollowCounts}
      />

      {/* ── TOAST ── */}
      {toast && (
        <div className={`pf-toast ${toast.type === "success" ? "pf-toast-success" : "pf-toast-error"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── CROP MODAL ── */}
      {cropFileSrc && cropType && (
        <CropModal
          imageSrc={cropFileSrc}
          type={cropType}
          isUploading={isUploadingImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropFileSrc(null);
            setCropType(null);
          }}
        />
      )}
    </div>
  );
}
