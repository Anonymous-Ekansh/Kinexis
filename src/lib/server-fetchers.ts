import { createClient } from "@/lib/supabase-server";

// --- Feed Data ---
export async function getFeedData(userId: string) {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // Phase 1: All independent queries in parallel
  const [postsRes, allVotesRes, allPostsRes, trendingRes, profileRes] = await Promise.all([
    supabase.from("public_feed_posts").select("id, user_id, post_type, title, body, tags, image_url, is_anonymous, professor_name, subject, star_rating, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("feed_votes").select("post_id, user_id, vote"),
    supabase.from("feed_posts").select("id, user_id"),
    supabase.from("feed_posts").select("tags").gte("created_at", weekAgo),
    supabase.from("users").select("id, full_name, stream, year, avatar_url").eq("id", userId).single(),
  ]);

  const postsData = postsRes.data || [];
  const allVotes = allVotesRes.data || [];
  const allPosts = allPostsRes.data || [];

  // Phase 2: Dependent queries — need user IDs from posts
  const userIds = [...new Set(postsData.filter((p: any) => !p.is_anonymous && p.user_id).map((p: any) => p.user_id))];

  // Build leaderboard from already-fetched allVotes + allPosts
  const postOwnerMap: Record<string, string> = {};
  allPosts.forEach((p: any) => { postOwnerMap[p.id] = p.user_id; });
  const userScores: Record<string, number> = {};
  allVotes.forEach((v: any) => {
    const owner = postOwnerMap[v.post_id];
    if (owner && v.vote === 1) userScores[owner] = (userScores[owner] || 0) + 1;
  });
  const topUserIds = Object.entries(userScores).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([uid]) => uid);

  // Combine author IDs + leaderboard IDs for a single batch fetch
  const allNeededUserIds = [...new Set([...userIds, ...topUserIds])];
  let allFetchedUsers: Record<string, any> = {};
  if (allNeededUserIds.length > 0) {
    const { data: users } = await supabase.from("users").select("id, full_name, stream, year, avatar_url").in("id", allNeededUserIds);
    if (users) users.forEach((u: any) => { allFetchedUsers[u.id] = u; });
  }

  // Assemble posts with authors
  const postsObj = postsData.map((p: any) => ({
    ...p,
    author: p.is_anonymous ? null : (p.user_id ? allFetchedUsers[p.user_id] : null),
  }));

  // Build vote map for displayed posts
  const postIds = postsObj.map((p: any) => p.id);
  const voteMap: Record<string, { total: number; userVote: number }> = {};
  postIds.forEach((id: string) => { voteMap[id] = { total: 0, userVote: 0 }; });
  allVotes.forEach((v: any) => {
    if (voteMap[v.post_id] !== undefined) {
      voteMap[v.post_id].total += v.vote;
      if (v.user_id === userId) voteMap[v.post_id].userVote = v.vote;
    }
  });

  // Assemble leaderboard
  const sorted = Object.entries(userScores).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const leaderboard = sorted.map(([uid, score]) => ({ ...allFetchedUsers[uid], score, id: uid })).filter((u: any) => u.full_name);

  // Trending tags
  const freq: Record<string, number> = {};
  (trendingRes.data || []).forEach((p: any) => {
    (p.tags || []).forEach((t: string) => { freq[t] = (freq[t] || 0) + 1; });
  });
  const trendingTags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);

  return { initialPosts: postsObj, initialVotes: voteMap, initialLeaderboard: leaderboard, initialTrending: trendingTags, initialProfile: profileRes.data };
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
export async function getCollabsData(userId?: string) {
  const supabase = await createClient();
  const { data: collabsData } = await supabase
    .from("collabs")
    .select(`*, author:author_id(id, full_name, stream, batch_year, avatar_url)`)
    .order("created_at", { ascending: false })
    .range(0, 11);

  const parallelQueries: PromiseLike<any>[] = [
    supabase.from("collabs").select("id", { count: "exact", head: true }),
    supabase.from("collabs").select("id", { count: "exact", head: true }).eq("is_open_collab", true),
    supabase.from("collabs").select("spots_filled"),
    supabase.from("collabs").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
  ];

  if (userId) {
    parallelQueries.push(
      supabase.from("collab_requests").select("collab_id, status").eq("user_id", userId),
      supabase.from("collab_members").select("collab_id").eq("user_id", userId),
    );
  }

  const results = await Promise.all(parallelQueries);
  const [r1, r2, r3, r4] = results;

  const involved = (r3.data || []).reduce((sum: number, r: any) => sum + (r.spots_filled || 0), 0);
  const stats = {
    total: r1.count || 0,
    open: r2.count || 0,
    involved,
    thisWeek: r4.count || 0,
  };

  let initialRequestStatuses: Record<string, string> = {};
  let initialMembershipIds: string[] = [];

  if (userId) {
    const reqRes = results[4];
    const memRes = results[5];
    if (reqRes.data) {
      reqRes.data.forEach((r: any) => { initialRequestStatuses[r.collab_id] = r.status; });
    }
    initialMembershipIds = (memRes.data || []).map((m: any) => m.collab_id);
  }

  return { initialCollabs: collabsData || [], initialStats: stats, initialRequestStatuses, initialMembershipIds };
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
  const activeId = clubIds.length > 0 ? clubIds[0] : null;

  const [
    { data: clubsData },
    pdWrapper,
    edWrapper,
    mrWrapper
  ] = await Promise.all([
    supabase.from("clubs").select("id, name, initials, accent_color, description, follower_count, pinned_message, category, type, tags").in("id", clubIds),
    activeId ? supabase.from("channel_posts").select("id, club_id, author_id, post_type, title, body, image_url, edited, metadata, created_at").eq("club_id", activeId).order("created_at", { ascending: false }) : Promise.resolve({ data: null }),
    activeId ? supabase.from("channel_posts").select("id, title, metadata, created_at").eq("club_id", activeId).eq("post_type", "event").gte("metadata->>event_date", new Date().toISOString().split("T")[0]).order("created_at", { ascending: false }).limit(2) : Promise.resolve({ data: null }),
    activeId ? supabase.from("club_members").select("user_id, role").eq("club_id", activeId).eq("role", "moderator") : Promise.resolve({ data: null })
  ]);

  if (!clubsData) return { initialClubs: [], initialRoleByClub: {}, initialFollowingByClub: {}, initialActiveId: null, initialPosts: [], initialEmojiCounts: {}, initialUserReactions: {}, initialEvents: [], initialLeads: [], initialAllMembers: [], userRole };

  const rm: Record<string, string> = {};
  for (const r of memberRows) rm[r.club_id] = r.role || "follower";
  
  const mappedClubs: any[] = [];
  const roles: Record<string, string> = {};
  const fs: Record<string, boolean> = {};

  // Sort mappedClubs to ensure activeId matches the first returned club if reordered
  let activeClubPos = -1;
  const rawMapped: any[] = [];
  for (const c of clubsData) {
    const accent = (c.accent_color || "lime");
    const role = rm[c.id] || "follower";
    const mapped = { id: c.id, name: c.name || "", initials: c.initials || getInitials(c.name || ""), accent, description: c.description || "", follower_count: c.follower_count || 0, pinned_message: c.pinned_message || null, category: c.category || "", type: c.type || "", tags: c.tags || [], role };
    rawMapped.push(mapped);
    roles[c.id] = role;
    fs[c.id] = true;
  }
  
  // Bring activeId to front so UI rendering matches expected top-tab
  if (activeId) {
    const actIdx = rawMapped.findIndex(c => c.id === activeId);
    if (actIdx !== -1) {
      mappedClubs.push(rawMapped[actIdx]);
      for (let i = 0; i < rawMapped.length; i++) {
        if (i !== actIdx) mappedClubs.push(rawMapped[i]);
      }
    } else {
      mappedClubs.push(...rawMapped);
    }
  }

  let initialPosts: any[] = [];
  let initialEmojiCounts: Record<string, any> = {};
  let initialUserReactions: Record<string, any> = {};
  let initialEvents: any[] = [];
  let initialLeads: any[] = [];
  let initialAllMembers: any[] = [];

  const pd = pdWrapper?.data;
  const ed = edWrapper?.data;
  const mr = mrWrapper?.data;

  if (activeId) {
    const aids = pd ? [...new Set(pd.map((p: any) => p.author_id).filter(Boolean))] : [];
    const pids = pd ? pd.map((p: any) => p.id) : [];
    const leadUids = (mr && mr.length > 0) ? mr.map((x: any) => x.user_id) : [];

    const dependentPromises: any[] = [];
    const authorsIndex = aids.length > 0 ? dependentPromises.push(supabase.from("users").select("id, full_name, avatar_url").in("id", aids)) - 1 : -1;
    const reactionsIndex = pids.length > 0 ? dependentPromises.push(supabase.from("post_reactions").select("post_id, user_id, emoji").in("post_id", pids)) - 1 : -1;
    const leadsIndex = leadUids.length > 0 ? dependentPromises.push(supabase.from("users").select("id, full_name, avatar_url, stream, year").in("id", leadUids)) - 1 : -1;

    const dependentResults = await Promise.all(dependentPromises);

    if (pd) {
      let am: Record<string, any> = {};
      if (authorsIndex !== -1 && dependentResults[authorsIndex].data) {
        for (const a of dependentResults[authorsIndex].data) am[a.id] = a;
      }
      initialPosts = pd.map((p: any) => { const a = am[p.author_id] || {}; return { id: p.id, club_id: p.club_id, author_id: p.author_id, post_type: p.post_type || "update", title: p.title, body: p.body || "", image_url: p.image_url, edited: p.edited || false, metadata: p.metadata || {}, created_at: p.created_at, author_name: a.full_name || "Unknown", author_avatar: a.avatar_url, author_initials: getInitials(a.full_name || "") }; });
      
      if (reactionsIndex !== -1 && dependentResults[reactionsIndex].data) {
        for (const r of dependentResults[reactionsIndex].data) {
          if (!initialEmojiCounts[r.post_id]) initialEmojiCounts[r.post_id] = {};
          initialEmojiCounts[r.post_id][r.emoji] = (initialEmojiCounts[r.post_id][r.emoji] || 0) + 1;
          if (r.user_id === userId) {
            if (!initialUserReactions[r.post_id]) initialUserReactions[r.post_id] = new Set();
            initialUserReactions[r.post_id].add(r.emoji);
          }
        }
      }
    }

    if (ed) initialEvents = ed.map((e: any) => ({ id: e.id, title: e.title, metadata: e.metadata || {}, created_at: e.created_at }));

    if (leadsIndex !== -1 && dependentResults[leadsIndex].data) {
      initialLeads = dependentResults[leadsIndex].data.map((u: any) => ({ id: u.id, full_name: u.full_name || "Unknown", avatar_url: u.avatar_url, stream: u.stream || "", year: u.year || "", initials: getInitials(u.full_name || "") }));
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

  const p_me = supabase.from("users").select("id, full_name, stream, year, avatar_url, interests, clubs").eq("id", userId).single();
  const p_users = supabase.from("users").select("id, full_name, stream, year, avatar_url, interests, clubs, currently_focused_on, created_at").neq("id", userId).limit(50);
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

  // 1. Fetch all three sources in parallel
  const [convsRes, reqsRes, sentReqsRes] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, user1_id, user2_id, last_message_at, deleted_by_user1, deleted_by_user2, created_at')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false }),
    supabase
      .from('message_requests')
      .select('id, sender_id, receiver_id, initial_message, status, created_at')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('message_requests')
      .select('id, sender_id, receiver_id, initial_message, status, created_at')
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  // 2. Process conversations — batch instead of loop
  let initialConversations: any[] = [];
  const convsData = convsRes.data;
  if (convsData) {
    const validConvs = convsData.filter((c: any) => {
      if (c.user1_id === userId && c.deleted_by_user1) return false;
      if (c.user2_id === userId && c.deleted_by_user2) return false;
      return true;
    });

    if (validConvs.length > 0) {
      // Collect all IDs we need
      const convIds = validConvs.map((c: any) => c.id);
      const otherUserIds = validConvs.map((c: any) => c.user1_id === userId ? c.user2_id : c.user1_id);
      const uniqueOtherIds = [...new Set(otherUserIds)];

      // Batch fetch: users, latest messages, unread counts, presence — all in parallel
      const [usersRes, messagesRes, unreadRes, presenceRes] = await Promise.all([
        supabase.from('users').select('id, full_name, avatar_url, stream, year').in('id', uniqueOtherIds),
        supabase.from('messages').select('id, conversation_id, sender_id, content, created_at, is_read').in('conversation_id', convIds).order('created_at', { ascending: false }),
        supabase.from('messages').select('conversation_id, sender_id, is_read').in('conversation_id', convIds).neq('sender_id', userId).eq('is_read', false),
        supabase.from('user_presence').select('user_id, last_seen, is_online').in('user_id', uniqueOtherIds),
      ]);

      // Build lookup maps
      const userMap: Record<string, any> = {};
      (usersRes.data || []).forEach((u: any) => { userMap[u.id] = u; });

      // Get latest message per conversation
      const lastMsgMap: Record<string, any> = {};
      (messagesRes.data || []).forEach((m: any) => {
        if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
      });

      // Count unread per conversation
      const unreadMap: Record<string, number> = {};
      (unreadRes.data || []).forEach((m: any) => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      });

      // Presence by user
      const presenceMap: Record<string, any> = {};
      (presenceRes.data || []).forEach((p: any) => { presenceMap[p.user_id] = p; });

      // Assemble
      initialConversations = validConvs.map((c: any) => {
        const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
        return {
          ...c,
          otherUser: userMap[otherId] || null,
          lastMessage: lastMsgMap[c.id] || null,
          unreadCount: unreadMap[c.id] || 0,
          presence: presenceMap[otherId] || null,
        };
      });
    }
  }

  // 3. Process requests — batch user lookups
  let initialRequests: any[] = [];
  const reqsData = reqsRes.data;
  if (reqsData && reqsData.length > 0) {
    const senderIds = [...new Set(reqsData.map((r: any) => r.sender_id))];
    const { data: senders } = await supabase.from('users').select('id, full_name, avatar_url').in('id', senderIds);
    const senderMap: Record<string, any> = {};
    (senders || []).forEach((u: any) => { senderMap[u.id] = u; });
    initialRequests = reqsData.map((r: any) => ({ ...r, sender: senderMap[r.sender_id] || null }));
  }

  // 4. Process sent requests — batch user lookups
  let initialSentRequests: any[] = [];
  const sentReqsData = sentReqsRes.data;
  if (sentReqsData && sentReqsData.length > 0) {
    const receiverIds = [...new Set(sentReqsData.map((r: any) => r.receiver_id))];
    const { data: receivers } = await supabase.from('users').select('id, full_name, avatar_url').in('id', receiverIds);
    const receiverMap: Record<string, any> = {};
    (receivers || []).forEach((u: any) => { receiverMap[u.id] = u; });
    initialSentRequests = sentReqsData.map((r: any) => ({ ...r, sender: receiverMap[r.receiver_id] || null }));
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
    supabase.from("users").select("id, full_name, stream, year, batch_year, bio, avatar_url, cover_url, cover_position, interests, clubs, currently_focused_on, looking_for, created_at").eq("id", profileId).single(),
    // 2. Projects
    supabase.from("projects").select("id, title, description, tags, url, github_url, created_at, metadata").eq("user_id", profileId).order("created_at", { ascending: false }),
    // 3. Activity (RPC)
    supabase.rpc("get_user_activity", { p_user_id: profileId }),
    // 4. Collabs
    supabase.from("collabs").select("id, title, description, category, tags, spots_total, spots_filled, status, created_at").eq("author_id", profileId).order("created_at", { ascending: false }),
    // 5. Followers count
    supabase.rpc("get_followers_count", { target_user_id: profileId }),
    // 6. Following count
    supabase.rpc("get_following_count", { target_user_id: profileId }),
    // 7. Social links
    supabase.from("social_links").select("platform, url").eq("user_id", profileId),
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
        .select("follower_id")
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
