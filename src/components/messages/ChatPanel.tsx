"use client";
import Image from "next/image";


import { useState, useEffect, useRef, useCallback } from "react";
import { fetchMessages, sendMessage, markMessagesRead, checkBlocked, blockUser, unblockUser, deleteConversationForUser } from "@/lib/messages/queries";
import { encryptMessage, decryptMessage } from "@/lib/messages/crypto";
import { subscribeToMessages, subscribeToPresence, unsubscribe } from "@/lib/messages/realtime";
import { getPresence } from "@/lib/messages/queries";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import BlockedBanner from "./BlockedBanner";
import ConfirmModal from "./ConfirmModal";
import ProfileCard from "./ProfileCard";

interface Props {
  userId: string;
  conversation: any | null;
  onConversationDeleted: () => void;
  onBack?: () => void;
}

export default function ChatPanel({ userId, conversation, onConversationDeleted, onBack }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [presence, setPresence] = useState<any>(null);
  const [blockState, setBlockState] = useState({ iBlockedThem: false, theyBlockedMe: false });
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = conversation?.otherUser;
  const otherId = conversation ? (conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Load messages ── */
  const loadMessages = useCallback(async () => {
    if (!conversation) return;
    setLoading(true);
    try {
      const msgs = await fetchMessages(conversation.id);
      setMessages(msgs);
      // Decrypt
      const decMap: Record<string, string> = {};
      for (const m of msgs) {
        decMap[m.id] = await decryptMessage(m.content, conversation.user1_id, conversation.user2_id);
      }
      setDecrypted(decMap);
      // Mark as read
      await markMessagesRead(conversation.id, userId);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [conversation, userId]);

  /* ── Check blocked ── */
  const loadBlockState = useCallback(async () => {
    if (!otherId) return;
    const state = await checkBlocked(userId, otherId);
    setBlockState(state);
  }, [userId, otherId]);

  /* ── Load presence ── */
  const loadPresence = useCallback(async () => {
    if (!otherId) return;
    const p = await getPresence(otherId);
    setPresence(p);
  }, [otherId]);

  useEffect(() => {
    loadMessages();
    loadBlockState();
    loadPresence();
  }, [loadMessages, loadBlockState, loadPresence]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  /* ── Realtime ── */
  useEffect(() => {
    if (!conversation) return;
    const ch = subscribeToMessages(conversation.id, async (payload: any) => {
      const msg = payload.new;
      const dec = await decryptMessage(msg.content, conversation.user1_id, conversation.user2_id);
      setMessages(prev => [...prev, msg]);
      setDecrypted(prev => ({ ...prev, [msg.id]: dec }));
      if (msg.sender_id !== userId) {
        markMessagesRead(conversation.id, userId);
      }
    });
    return () => unsubscribe(ch);
  }, [conversation, userId]);

  useEffect(() => {
    if (!otherId) return;
    const ch = subscribeToPresence(otherId, (payload: any) => {
      setPresence(payload.new);
    });
    return () => unsubscribe(ch);
  }, [otherId]);

  /* ── Send ── */
  const handleSend = async (text: string) => {
    if (!conversation) return;
    const encrypted = await encryptMessage(text, conversation.user1_id, conversation.user2_id);
    await sendMessage(conversation.id, userId, encrypted);
  };

  /* ── Block / Unblock ── */
  const handleBlock = async () => {
    if (!otherId) return;
    await blockUser(userId, otherId);
    setBlockState(prev => ({ ...prev, iBlockedThem: true }));
    setShowBlockConfirm(false);
  };

  const handleUnblock = async () => {
    if (!otherId) return;
    await unblockUser(userId, otherId);
    setBlockState(prev => ({ ...prev, iBlockedThem: false }));
    setShowUnblockConfirm(false);
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!conversation) return;
    await deleteConversationForUser(conversation.id, userId);
    setShowDeleteConfirm(false);
    onConversationDeleted();
  };

  /* ── Date groups ── */
  function getDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = today.getTime() - msgDate.getTime();
    if (diff === 0) return "Today";
    if (diff === 86400000) return "Yesterday";
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  const isBlocked = blockState.iBlockedThem || blockState.theyBlockedMe;

  /* ── Empty state ── */
  if (!conversation) {
    return (
      <div className="msg-chat-panel msg-chat-empty">
        <div className="msg-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </div>
        <div className="msg-empty-title">Select a conversation</div>
        <div className="msg-empty-sub">Choose someone from the sidebar to start chatting</div>
      </div>
    );
  }

  return (
    <div className="msg-chat-panel">
      <ChatHeader
        otherUser={otherUser}
        presence={presence}
        iBlockedThem={blockState.iBlockedThem}
        theyBlockedMe={blockState.theyBlockedMe}
        onBlock={() => setShowBlockConfirm(true)}
        onUnblock={() => setShowUnblockConfirm(true)}
        onDelete={() => setShowDeleteConfirm(true)}
        onProfileClick={() => setShowProfile(true)}
        onBack={onBack}
      />

      {blockState.iBlockedThem && <BlockedBanner name={otherUser?.full_name || 'this user'} variant="i_blocked" />}
      {blockState.theyBlockedMe && !blockState.iBlockedThem && <BlockedBanner name={otherUser?.full_name || 'this user'} variant="they_blocked" />}

      <div className="msg-messages-area">
        {loading ? (
          <div className="msg-messages-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="msg-messages-empty">
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div>Send a message to start the conversation</div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === userId;
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              const showDate = !prevMsg || getDateLabel(msg.created_at) !== getDateLabel(prevMsg.created_at);

              return (
                <div key={msg.id}>
                  {showDate && <div className="msg-date-separator"><span>{getDateLabel(msg.created_at)}</span></div>}
                  <MessageBubble
                    message={msg}
                    isMine={isMine}
                    showAvatar={showAvatar}
                    otherUser={otherUser}
                    decryptedContent={decrypted[msg.id] || msg.content}
                    isRead={msg.is_read}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {!isBlocked && <MessageInput disabled={false} onSend={handleSend} />}
      {isBlocked && <MessageInput disabled={true} onSend={() => {}} />}

      {/* Modals */}
      {showBlockConfirm && (
        <ConfirmModal
          title={`Block ${otherUser?.full_name || 'user'}?`}
          message="They won't be able to send you messages."
          confirmLabel="Block"
          onConfirm={handleBlock}
          onCancel={() => setShowBlockConfirm(false)}
        />
      )}
      {showUnblockConfirm && (
        <ConfirmModal
          title={`Unblock ${otherUser?.full_name || 'user'}?`}
          message="They will be able to message you again."
          confirmLabel="Unblock"
          confirmColor="var(--lime)"
          onConfirm={handleUnblock}
          onCancel={() => setShowUnblockConfirm(false)}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete this conversation?"
          message="This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showProfile && otherId && <ProfileCard userId={otherId} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
