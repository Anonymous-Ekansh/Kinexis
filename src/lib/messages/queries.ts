/* ═══════════════════════════════════
   MESSAGES — Supabase Query Helpers
   ═══════════════════════════════════ */

import { supabase } from '@/lib/supabase';

/* ── Conversations ── */
export async function fetchConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id, last_message_at, deleted_by_user1, deleted_by_user2, created_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  if (error) throw error;

  // Filter out soft-deleted
  return (data || []).filter(c => {
    if (c.user1_id === userId && c.deleted_by_user1) return false;
    if (c.user2_id === userId && c.deleted_by_user2) return false;
    return true;
  });
}

export async function getOrCreateConversation(userId: string, otherUserId: string) {
  const [user1, user2] = [userId, otherUserId].sort();

  // Check existing
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id, deleted_by_user1, deleted_by_user2')
    .eq('user1_id', user1)
    .eq('user2_id', user2)
    .single();

  if (existing) {
    // Un-delete if soft-deleted
    const updates: any = {};
    if (existing.user1_id === userId && existing.deleted_by_user1) updates.deleted_by_user1 = false;
    if (existing.user2_id === userId && existing.deleted_by_user2) updates.deleted_by_user2 = false;
    if (Object.keys(updates).length > 0) {
      await supabase.from('conversations').update(updates).eq('id', existing.id);
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user1_id: user1, user2_id: user2, last_message_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ── Messages ── */
export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, is_read')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;

  // Update last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function markMessagesRead(conversationId: string, userId: string) {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);
}

export async function getUnreadCount(conversationId: string, userId: string): Promise<number> {
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);
  return count || 0;
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  // Get all conversations for user
  const convs = await fetchConversations(userId);
  let total = 0;
  for (const c of convs) {
    total += await getUnreadCount(c.id, userId);
  }
  return total;
}

/* ── Message Requests ── */
export async function fetchRequests(userId: string) {
  const { data, error } = await supabase
    .from('message_requests')
    .select('id, sender_id, receiver_id, initial_message, status, created_at')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchSentRequests(userId: string) {
  const { data, error } = await supabase
    .from('message_requests')
    .select('id, sender_id, receiver_id, initial_message, status, created_at')
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function acceptRequest(requestId: string) {
  const { data, error } = await supabase
    .from('message_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function declineRequest(requestId: string) {
  await supabase
    .from('message_requests')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', requestId);
}

export async function deleteRequest(requestId: string) {
  await supabase
    .from('message_requests')
    .delete()
    .eq('id', requestId);
}

export async function createRequest(senderId: string, receiverId: string, initialMessage: string) {
  const { data, error } = await supabase
    .from('message_requests')
    .insert({ sender_id: senderId, receiver_id: receiverId, initial_message: initialMessage, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ── Blocking ── */
export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
}

export async function checkBlocked(userId: string, otherUserId: string): Promise<{ iBlockedThem: boolean; theyBlockedMe: boolean }> {
  const { data: d1 } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', userId)
    .eq('blocked_id', otherUserId)
    .maybeSingle();

  const { data: d2 } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', otherUserId)
    .eq('blocked_id', userId)
    .maybeSingle();

  return { iBlockedThem: !!d1, theyBlockedMe: !!d2 };
}

/* ── Presence ── */
export async function setPresence(userId: string, isOnline: boolean) {
  try {
    await supabase.from('user_presence').upsert({
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    });
  } catch { /* fail silently */ }
}

export async function getPresence(userId: string) {
  const { data } = await supabase
    .from('user_presence')
    .select('user_id, last_seen, is_online')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

/* ── Users ── */
export async function searchUsers(query: string, excludeId: string) {
  const { data } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, stream, year')
    .ilike('full_name', `%${query}%`)
    .neq('id', excludeId)
    .limit(10);
  return data || [];
}

export async function getUser(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, stream, year, bio, interests')
    .eq('id', userId)
    .single();
  return data;
}

export async function getLastMessage(conversationId: string) {
  const { data } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, is_read')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function deleteConversationForUser(convId: string, userId: string) {
  try {
    await supabase.rpc('delete_conversation_for_user', { conv_id: convId, user_id: userId });
  } catch {
    // Fallback: manually set the flag
    const { data: conv } = await supabase.from('conversations').select('id, user1_id, user2_id').eq('id', convId).single();
    if (conv) {
      if (conv.user1_id === userId) await supabase.from('conversations').update({ deleted_by_user1: true }).eq('id', convId);
      else await supabase.from('conversations').update({ deleted_by_user2: true }).eq('id', convId);
    }
  }
}
