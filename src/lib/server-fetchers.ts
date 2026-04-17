import { createClient } from "@/lib/supabase-server";

// --- Feed Data ---
export async function getFeedData(userId: string) {
  const supabase = await createClient();
  const { data: postsData } = await supabase.from("public_feed_posts").select("*").order("created_at", { ascending: false }).limit(50);
  let postsObj: any[] = [];
  let voteMap: Record<string, { total: number; userVote: number }> = {};
  
  if (postsData) {
    const userIds = postsData.filter((p: any) => !p.is_anonymous && p.user_id).map((p: any) => p.user_id);
    const uniqueUserIds = [...new Set(userIds)];
    let authorMap: Record<string, any> = {};

    if (uniqueUserIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, full_name, stream, year, avatar_url").in("id", uniqueUserIds);
      if (users) users.forEach((u: any) => { authorMap[u.id] = u; });
    }

    postsObj = postsData.map((p: any) => ({
      ...p,
      author: p.is_anonymous ? null : (p.user_id ? authorMap[p.user_id] : null),
    }));

    const postIds = postsObj.map(p => p.id);
    if (postIds.length > 0) {
      const { data: votesData } = await supabase.from("feed_votes").select("post_id, user_id, vote").in("post_id", postIds);
      postIds.forEach(id => { voteMap[id] = { total: 0, userVote: 0 }; });
      if (votesData) {
        votesData.forEach((v: any) => {
          if (!voteMap[v.post_id]) voteMap[v.post_id] = { total: 0, userVote: 0 };
          voteMap[v.post_id].total += v.vote;
          if (v.user_id === userId) voteMap[v.post_id].userVote = v.vote;
        });
      }
    }
  }

  const { data: allVotes } = await supabase.from("feed_votes").select("post_id, vote");
  const { data: allPosts } = await supabase.from("feed_posts").select("id, user_id");
  let leaderboard: any[] = [];
  if (allVotes && allPosts) {
    const postOwnerMap: Record<string, string> = {};
    allPosts.forEach((p: any) => { postOwnerMap[p.id] = p.user_id; });

    const userScores: Record<string, number> = {};
    allVotes.forEach((v: any) => {
      const owner = postOwnerMap[v.post_id];
      if (owner && v.vote === 1) {
        userScores[owner] = (userScores[owner] || 0) + 1;
      }
    });

    const sorted = Object.entries(userScores).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topUserIds = sorted.map(([uid]) => uid);

    if (topUserIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, full_name, stream, year").in("id", topUserIds);
      const userMap: Record<string, any> = {};
      if (users) users.forEach((u: any) => { userMap[u.id] = u; });

      leaderboard = sorted.map(([uid, score]) => ({ ...userMap[uid], score, id: uid })).filter((u: any) => u.full_name);
    }
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: trendingData } = await supabase.from("feed_posts").select("tags").gte("created_at", weekAgo);
  let trendingTags: string[] = [];
  if (trendingData) {
    const freq: Record<string, number> = {};
    trendingData.forEach((p: any) => {
      (p.tags || []).forEach((t: string) => { freq[t] = (freq[t] || 0) + 1; });
    });
    trendingTags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);
  }

  const { data: profile } = await supabase.from("users").select("id, full_name, stream, year, avatar_url").eq("id", userId).single();

  return { initialPosts: postsObj, initialVotes: voteMap, initialLeaderboard: leaderboard, initialTrending: trendingTags, initialProfile: profile };
}

// --- Events Data ---
export async function getEventsData(userId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('events')
    .select(`*, clubs:club_id(name, initials, accent_color)`)
    .gte('event_date', today)
    .order('event_date', { ascending: true });

  let mapData: any[] = [];
  let orgMap: Record<string, string> = {};

  if (data) {
    mapData = data.map((e: any) => ({
      ...e,
      event_date: e.event_date || e.created_at,
      location: e.location || e.metadata?.location || e.metadata?.event_location || null,
      start_time: e.metadata?.event_time || e.metadata?.start_time || null,
      description: e.body || e.content || e.description || e.metadata?.event_desc || "",
      event_tags: (e.metadata?.tags || e.metadata?.event_tags || []).map((t: string) => ({ tag: t })),
      form_url: e.metadata?.registration_url || e.metadata?.event_url || e.form_url || null,
      rsvp_count: e.metadata?.rsvp_count || e.rsvp_count || 0,
      organizer: e.metadata?.organizer || e.organizer || null
    })).sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const orgIds = mapData.map((e: any) => e.organizer).filter((o: string) => o && uuidRegex.test(o));
    
    if (orgIds.length > 0) {
      const uniqueIds = Array.from(new Set(orgIds));
      const { data: users } = await supabase.from('users').select('id, full_name').in('id', uniqueIds);
      if (users) {
        users.forEach((u: any) => {
          if (u.full_name) orgMap[u.id] = u.full_name;
        });
      }
    }
  }
  let initialInterestedIds: string[] = [];
  if (data && data.length > 0 && userId) {
    const eventIds = mapData.map((e: any) => e.id);
    const { data: interestData } = await supabase.from("event_interest").select("event_id").eq("user_id", userId).in("event_id", eventIds);
    if (interestData) initialInterestedIds = interestData.map((row: any) => row.event_id);
  }

  return { initialEvents: mapData, initialOrganizerMap: orgMap, initialInterestedIds };
}

// --- Collabs Data ---
export async function getCollabsData() {
  const supabase = await createClient();
  const { data: collabsData } = await supabase
    .from("collabs")
    .select(`*, author:author_id(id, full_name, stream, batch_year, avatar_url)`)
    .order("created_at", { ascending: false })
    .range(0, 11);

  const [r1, r2, r3, r4] = await Promise.all([
    supabase.from("collabs").select("id", { count: "exact", head: true }),
    supabase.from("collabs").select("id", { count: "exact", head: true }).eq("is_open_collab", true),
    supabase.from("collabs").select("spots_filled"),
    supabase.from("collabs").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);
  const involved = (r3.data || []).reduce((sum: number, r: any) => sum + (r.spots_filled || 0), 0);
  const stats = {
    total: r1.count || 0,
    open: r2.count || 0,
    involved,
    thisWeek: r4.count || 0,
  };

  return { initialCollabs: collabsData || [], initialStats: stats };
}

// --- Channels Data ---
function getInitials(name: string): string {
  if (!name) return "?";
  const w = name.split(" ").filter((x: string) => x);
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export async function getChannelsData(userId: string) {
  const supabase = await createClient();
  const { data: currentUser } = await supabase.from("users").select("role").eq("id", userId).single();
  const userRole = currentUser?.role || "user";
  
  const { data: memberRows } = await supabase.from("club_members").select("club_id, role").eq("user_id", userId);
  if (!memberRows || memberRows.length === 0) return { initialClubs: [], initialRoleByClub: {}, initialFollowingByClub: {}, initialActiveId: null, initialPosts: [], initialEmojiCounts: {}, initialUserReactions: {}, initialEvents: [], initialLeads: [], initialAllMembers: [], userRole };

  const clubIds = memberRows.map((r: any) => r.club_id);
  const { data: clubsData } = await supabase.from("clubs").select("*").in("id", clubIds);
  if (!clubsData) return { initialClubs: [], initialRoleByClub: {}, initialFollowingByClub: {}, initialActiveId: null, initialPosts: [], initialEmojiCounts: {}, initialUserReactions: {}, initialEvents: [], initialLeads: [], initialAllMembers: [], userRole };

  const rm: Record<string, string> = {};
  for (const r of memberRows) rm[r.club_id] = r.role || "follower";
  
  const mappedClubs: any[] = [];
  const roles: Record<string, string> = {};
  const fs: Record<string, boolean> = {};

  for (const c of clubsData) {
    const accent = (c.accent_color || "lime");
    const role = rm[c.id] || "follower";
    mappedClubs.push({ id: c.id, name: c.name || "", initials: c.initials || getInitials(c.name || ""), accent, description: c.description || "", follower_count: c.follower_count || 0, pinned_message: c.pinned_message || null, category: c.category || "", type: c.type || "", tags: c.tags || [], role });
    roles[c.id] = role;
    fs[c.id] = true;
  }

  const activeId = mappedClubs.length > 0 ? mappedClubs[0].id : null;
  
  let initialPosts: any[] = [];
  let initialEmojiCounts: Record<string, any> = {};
  let initialUserReactions: Record<string, any> = {};
  let initialEvents: any[] = [];
  let initialLeads: any[] = [];
  let initialAllMembers: any[] = [];

  if (activeId) {
    const { data: pd } = await supabase.from("channel_posts").select("*").eq("club_id", activeId).order("created_at", { ascending: false });
    if (pd) {
      const aids = [...new Set(pd.map((p: any) => p.author_id).filter(Boolean))];
      let am: Record<string, any> = {};
      if (aids.length > 0) {
        const { data: ad } = await supabase.from("users").select("id, full_name, avatar_url").in("id", aids);
        if (ad) for (const a of ad) am[a.id] = a;
      }
      initialPosts = pd.map((p: any) => { const a = am[p.author_id] || {}; return { id: p.id, club_id: p.club_id, author_id: p.author_id, post_type: p.post_type || "update", title: p.title, body: p.body || "", image_url: p.image_url, edited: p.edited || false, metadata: p.metadata || {}, created_at: p.created_at, author_name: a.full_name || "Unknown", author_avatar: a.avatar_url, author_initials: getInitials(a.full_name || "") }; });
      
      if (initialPosts.length > 0) {
        const pids = initialPosts.map(p => p.id);
        const { data: rx } = await supabase.from("post_reactions").select("post_id, user_id, emoji").in("post_id", pids);
        if (rx) {
          for (const r of rx) {
            if (!initialEmojiCounts[r.post_id]) initialEmojiCounts[r.post_id] = {};
            initialEmojiCounts[r.post_id][r.emoji] = (initialEmojiCounts[r.post_id][r.emoji] || 0) + 1;
            if (r.user_id === userId) {
              if (!initialUserReactions[r.post_id]) initialUserReactions[r.post_id] = new Set();
              initialUserReactions[r.post_id].add(r.emoji);
            }
          }
        }
      }
    }

    const { data: ed } = await supabase.from("channel_posts").select("id, title, metadata, created_at").eq("club_id", activeId).eq("post_type", "event").gte("metadata->>event_date", new Date().toISOString().split("T")[0]).order("created_at", { ascending: false }).limit(2);
    if (ed) initialEvents = ed.map((e: any) => ({ id: e.id, title: e.title, metadata: e.metadata || {}, created_at: e.created_at }));

    const { data: mr } = await supabase.from("club_members").select("user_id, role").eq("club_id", activeId).eq("role", "moderator");
    if (mr && mr.length > 0) {
      const uids = mr.map((x: any) => x.user_id);
      const { data: mu } = await supabase.from("users").select("id, full_name, avatar_url, stream, year").in("id", uids);
      if (mu) initialLeads = mu.map((u: any) => ({ id: u.id, full_name: u.full_name || "Unknown", avatar_url: u.avatar_url, stream: u.stream || "", year: u.year || "", initials: getInitials(u.full_name || "") }));
    }
    
    // Convert sets to arrays for serialization
    Object.keys(initialUserReactions).forEach(k => {
      initialUserReactions[k] = Array.from(initialUserReactions[k]);
    });
  }

  return { initialClubs: mappedClubs, initialRoleByClub: roles, initialFollowingByClub: fs, initialActiveId: activeId, initialPosts, initialEmojiCounts, initialUserReactions, initialEvents, initialLeads, userRole };
}

// --- Discover Data ---
export async function getDiscoverData(userId: string) {
  const supabase = await createClient();

  // Parallel fetches
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const todayISO = new Date().toISOString().split("T")[0];

  const p_me = supabase.from("users").select("*").eq("id", userId).single();
  const p_users = supabase.from("users").select("*").neq("id", userId).limit(50);
  const p_votes = supabase.from("feed_votes").select("post_id, vote");
  const p_posts = supabase.from("feed_posts").select("id, user_id");
  const p_collabs = supabase.from("collabs").select("id, title, category, description, looking_for, tags, spots_total, spots_filled, status, author:author_id(full_name)").eq("status", "open").order("created_at", { ascending: false }).limit(20);
  const p_events = supabase.from("events").select("*, clubs:club_id(name, initials, accent_color)").gte("event_date", todayISO).order("event_date", { ascending: true }).limit(5);
  const p_clubs = supabase.from("clubs").select("id, name, category, follower_count, accent_color").gt("follower_count", 0).order("follower_count", { ascending: false }).limit(6);
  const p_trending = supabase.from("feed_posts").select("tags").gte("created_at", weekAgo);
  const p_activity = supabase.from("activity").select("id, user_id, type, target_id, title, metadata, created_at, users!activity_user_id_fkey(id, full_name, avatar_url)").order("created_at", { ascending: false }).limit(15);

  const [res_me, res_users, res_votes, res_posts, res_collabs, res_events, res_clubs, res_trending, res_activity] = await Promise.all([
    p_me, p_users, p_votes, p_posts, p_collabs, p_events, p_clubs, p_trending, p_activity
  ]);

  if (res_users.error) {
    console.error("[getDiscoverData] Users query error:", res_users.error.message);
  }

  const allUsers = res_users.data || [];
  
  // DiscoverFeed Profiles (Recent 10)
  const dfProfiles = [...allUsers].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 10);

  // DiscoverRightPanel People (Matched)
  const myInterests = (res_me.data?.interests || []).map((t: string) => t.toLowerCase());
  const scoredUsers = allUsers.map((u: any) => {
    const theirInterests = (u.interests || []).map((t: string) => t.toLowerCase());
    const matchCount = myInterests.length > 0 ? theirInterests.filter((t: string) => myInterests.includes(t)).length : 0;
    return { ...u, matchCount };
  });
  scoredUsers.sort((a: any, b: any) => b.matchCount - a.matchCount || (b.follower_count || 0) - (a.follower_count || 0) || (a.full_name || "").localeCompare(b.full_name || ""));
  // Always show at least 3 people, even if no interest matches
  const dpPeople = scoredUsers.slice(0, 3);

  // DiscoverPeople (Top Users via score)
  const postOwnerMap: Record<string, string> = {};
  (res_posts.data || []).forEach((p: any) => { postOwnerMap[p.id] = p.user_id; });
  const userScores: Record<string, number> = {};
  (res_votes.data || []).forEach((v: any) => {
    const owner = postOwnerMap[v.post_id];
    if (owner && v.vote === 1) userScores[owner] = (userScores[owner] || 0) + 1;
  });
  const allPeopleRanked = allUsers.map((u: any) => {
    const upvotes = userScores[u.id] || 0;
    const followers = u.follower_count || 0;
    return { ...u, score: upvotes + followers, upvotes, followers };
  }).sort((a: any, b: any) => b.score - a.score || new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  // Trending tags
  const freq: Record<string, number> = {};
  (res_trending.data || []).forEach((p: any) => {
    (p.tags || []).forEach((t: string) => { freq[t] = (freq[t] || 0) + 1; });
  });
  const topTrending = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);

  return {
    initialFeedProfiles: dfProfiles,
    initialRightPanelPeople: dpPeople,
    initialPeopleMatched: myInterests, // pass my interests for formatting in client
    initialTopUsers: allPeopleRanked,
    initialCollabs: res_collabs.data || [],
    initialEvents: res_events.data || [],
    initialClubs: res_clubs.data || [],
    initialTrendingTags: topTrending,
    initialActivity: res_activity.data || []
  };
}

// --- Messages Data ---
export async function getMessagesData(userId: string) {
  const supabase = await createClient();

  // 1. Fetch Conversations
  const { data: convsData } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  let initialConversations: any[] = [];
  if (convsData) {
    const validConvs = convsData.filter((c: any) => {
      if (c.user1_id === userId && c.deleted_by_user1) return false;
      if (c.user2_id === userId && c.deleted_by_user2) return false;
      return true;
    });

    initialConversations = await Promise.all(validConvs.map(async (c: any) => {
      const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
      const { data: user } = await supabase.from('users').select('id, full_name, avatar_url, stream, year').eq('id', otherId).single();
      const { data: lastMessage } = await supabase.from('messages').select('*').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { count: unreadCount } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', c.id).neq('sender_id', userId).eq('is_read', false);
      const { data: presence } = await supabase.from('user_presence').select('*').eq('user_id', otherId).maybeSingle();
      return { ...c, otherUser: user, lastMessage, unreadCount: unreadCount || 0, presence };
    }));
  }

  // 2. Fetch Requests
  const { data: reqsData } = await supabase
    .from('message_requests')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  let initialRequests: any[] = [];
  if (reqsData) {
    initialRequests = await Promise.all(reqsData.map(async (r: any) => {
      const { data: sender } = await supabase.from('users').select('id, full_name, avatar_url').eq('id', r.sender_id).single();
      return { ...r, sender };
    }));
  }

  // 3. Fetch Sent Requests
  const { data: sentReqsData } = await supabase
    .from('message_requests')
    .select('*')
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  let initialSentRequests: any[] = [];
  if (sentReqsData) {
    initialSentRequests = await Promise.all(sentReqsData.map(async (r: any) => {
      const { data: receiver } = await supabase.from('users').select('id, full_name, avatar_url').eq('id', r.receiver_id).single();
      return { ...r, sender: receiver }; // RequestCard expects 'sender' to display the other person
    }));
  }

  return { initialConversations, initialRequests, initialSentRequests };
}

// --- Profile Data ---
export async function getProfileData(profileId: string, viewerId: string | null) {
  const supabase = await createClient();

  const isOwnProfile = viewerId === profileId;

  // Fire all independent queries in parallel
  const [
    res_profile,
    res_projects,
    res_activity,
    res_collabs,
    res_followersCount,
    res_followingCount,
    res_socialLinks,
    res_similarUsers,
  ] = await Promise.all([
    // 1. Profile
    supabase.from("users").select("*").eq("id", profileId).single(),
    // 2. Projects
    supabase.from("projects").select("*").eq("user_id", profileId).order("created_at", { ascending: false }),
    // 3. Activity (RPC)
    supabase.rpc("get_user_activity", { p_user_id: profileId }),
    // 4. Collabs
    supabase.from("collabs").select("*").eq("author_id", profileId).order("created_at", { ascending: false }),
    // 5. Followers count
    supabase.rpc("get_followers_count", { target_user_id: profileId }),
    // 6. Following count
    supabase.rpc("get_following_count", { target_user_id: profileId }),
    // 7. Social links
    supabase.from("social_links").select("*").eq("user_id", profileId),
    // 8. Similar people candidates
    supabase.from("users").select("id, full_name, stream, interests, clubs, avatar_url").neq("id", profileId).limit(50),
  ]);

  const profile = res_profile.data;
  if (!profile) {
    return { initialProfile: null, initialProjects: [], initialActivities: [], initialCollabs: [], initialFollowersCount: 0, initialFollowingCount: 0, initialSocialLinks: [], initialIsFollowing: false, initialSimilarPeople: [], isOwnProfile };
  }

  // Check if viewer is following this profile (only if not own profile)
  let initialIsFollowing = false;
  if (viewerId && !isOwnProfile) {
    const { data: isF, error: rpcErr } = await supabase.rpc("is_following", { f_id: viewerId, t_id: profileId });
    if (rpcErr || isF === null) {
      const { data: directCheck } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", viewerId)
        .eq("following_id", profileId)
        .maybeSingle();
      initialIsFollowing = !!directCheck;
    } else {
      initialIsFollowing = !!isF;
    }
  }

  // Mark activity as read on own profile
  if (isOwnProfile && viewerId) {
    supabase.from("activity").update({ is_read: true }).eq("user_id", viewerId).eq("is_read", false).then(() => {});
  }

  // Compute similar people
  const myInterests: string[] = (profile.interests as string[] | null) || [];
  const myClubs: string[] = (profile.clubs as string[] | null) || [];
  let initialSimilarPeople: any[] = [];

  if ((myInterests.length > 0 || myClubs.length > 0) && res_similarUsers.data) {
    const scored = res_similarUsers.data.map((u: any) => {
      const uInterests: string[] = u.interests || [];
      const uClubs: string[] = u.clubs || [];
      const sharedInterests = myInterests.filter(i => uInterests.map((x: string) => x.toLowerCase()).includes(i.toLowerCase()));
      const sharedClubs = myClubs.filter(c => uClubs.map((x: string) => x.toLowerCase()).includes(c.toLowerCase()));
      const sharedTags = [...sharedInterests, ...sharedClubs.map(c => `🏛 ${c}`)];
      return { ...u, interests: uInterests, clubs: uClubs, sharedTags, score: sharedTags.length };
    })
    .filter(u => u.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
    initialSimilarPeople = scored;
  }

  return {
    initialProfile: profile,
    initialProjects: res_projects.data || [],
    initialActivities: ((res_activity.data as any[]) || []).slice(0, 5),
    initialCollabs: res_collabs.data || [],
    initialFollowersCount: typeof res_followersCount.data === 'number' ? res_followersCount.data : 0,
    initialFollowingCount: typeof res_followingCount.data === 'number' ? res_followingCount.data : 0,
    initialSocialLinks: res_socialLinks.data || [],
    initialIsFollowing,
    initialSimilarPeople,
    isOwnProfile,
  };
}
