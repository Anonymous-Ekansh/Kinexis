/* ═══════════════════════════════════
   MESSAGES — TypeScript Types
   ═══════════════════════════════════ */

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  last_message_at: string;
  deleted_by_user1: boolean;
  deleted_by_user2: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface MessageRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  initial_message: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
}

export interface ConversationWithUser extends Conversation {
  otherUser: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    stream: string | null;
    year: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
  presence: UserPresence | null;
}

export interface MessageRequestWithUser extends MessageRequest {
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}
