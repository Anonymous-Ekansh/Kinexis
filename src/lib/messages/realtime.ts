/* ═══════════════════════════════════
   MESSAGES — Realtime Subscriptions
   ═══════════════════════════════════ */

import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToMessages(conversationId: string, handler: (payload: any) => void): RealtimeChannel {
  return supabase.channel(`messages-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, handler)
    .subscribe();
}

export function subscribeToConversations(handler: (payload: any) => void): RealtimeChannel {
  return supabase.channel('conversations-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversations',
    }, handler)
    .subscribe();
}

export function subscribeToRequests(userId: string, handler: (payload: any) => void): RealtimeChannel {
  return supabase.channel(`requests-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_requests',
      filter: `receiver_id=eq.${userId}`,
    }, handler)
    .subscribe();
}

export function subscribeToSentRequests(userId: string, handler: (payload: any) => void): RealtimeChannel {
  return supabase.channel(`sent-requests-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_requests',
      filter: `sender_id=eq.${userId}`,
    }, handler)
    .subscribe();
}

export function subscribeToPresence(otherUserId: string, handler: (payload: any) => void): RealtimeChannel {
  return supabase.channel(`presence-${otherUserId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_presence',
      filter: `user_id=eq.${otherUserId}`,
    }, handler)
    .subscribe();
}

export function subscribeToAllMessages(handler: (payload: any) => void): RealtimeChannel {
  return supabase.channel('all-messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
    }, handler)
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
