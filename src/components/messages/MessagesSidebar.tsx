"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchConversations, fetchRequests, acceptRequest, declineRequest, getOrCreateConversation, getLastMessage, getUnreadCount, getPresence, searchUsers, markMessagesRead } from "@/lib/messages/queries";
import { subscribeToConversations, subscribeToRequests, subscribeToAllMessages, subscribeToSentRequests, unsubscribe } from "@/lib/messages/realtime";
import RequestCard from "./RequestCard";
import ConversationRow from "./ConversationRow";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

import { supabase } from "@/lib/supabase";

interface Props {
  userId: string;
  activeConvId: string | null;
  onSelectConversation: (conv: any) => void;
  onSelectRequest: (req: any) => void;
  onDraftRequest: (user: any) => void;
  refreshKey: number;
}

export default function MessagesSidebar({ userId, activeConvId, onSelectConversation, onSelectRequest, onDraftRequest, refreshKey }: Props) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats'|'requests'>('chats');

  /* ── Load conversations ── */
  const loadConversations = useCallback(async () => {
    try {
      const convs = await fetchConversations(userId);
      const enriched = await Promise.all(convs.map(async (c: any) => {
        const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
        const { data: user } = await supabase.from('users').select('id, full_name, avatar_url, stream, year').eq('id', otherId).single();
        const lastMessage = await getLastMessage(c.id);
        const unreadCount = await getUnreadCount(c.id, userId);
        const presence = await getPresence(otherId);
        return { ...c, otherUser: user, lastMessage, unreadCount, presence };
      }));
      setConversations(enriched);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [userId]);

  /* ── Load requests ── */
  const loadRequests = useCallback(async () => {
    try {
      const reqs = await fetchRequests(userId);
      const enrichedReqs = await Promise.all(reqs.map(async (r: any) => {
        const { data: sender } = await supabase.from('users').select('id, full_name, avatar_url').eq('id', r.sender_id).single();
        return { ...r, sender };
      }));
      setRequests(enrichedReqs);
    } catch (e) { console.error(e); }
  }, [userId]);

  const loadSentRequests = useCallback(async () => {
    try {
      const { fetchSentRequests } = await import("@/lib/messages/queries");
      const sent = await fetchSentRequests(userId);
      const enrichedSent = await Promise.all(sent.map(async (r: any) => {
        const { data: receiver } = await supabase.from('users').select('id, full_name, avatar_url').eq('id', r.receiver_id).single();
        return { ...r, sender: receiver };
      }));
      setSentRequests(enrichedSent);
    } catch (e) { console.error(e); }
  }, [userId]);

  useEffect(() => { loadConversations(); loadRequests(); loadSentRequests(); }, [loadConversations, loadRequests, loadSentRequests, refreshKey]);

  /* ── Realtime ── */
  useEffect(() => {
    const ch1 = subscribeToConversations(() => loadConversations());
    const ch2 = subscribeToRequests(userId, () => loadRequests());
    const ch3 = subscribeToAllMessages(() => loadConversations());
    const ch4 = subscribeToSentRequests(userId, () => loadSentRequests());
    return () => { unsubscribe(ch1); unsubscribe(ch2); unsubscribe(ch3); unsubscribe(ch4); };
  }, [userId, loadConversations, loadRequests, loadSentRequests]);

  /* ── User search for new message ── */
  useEffect(() => {
    if (!searchQuery.trim()) { setUserResults([]); return; }
    const timer = setTimeout(async () => {
      const results = await searchUsers(searchQuery, userId);
      setUserResults(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, userId]);

  /* ── Handlers ── */
  const handleSelectUser = (user: any) => {
    setSearchQuery("");
    const existingConv = conversations.find(c => c.user1_id === user.id || c.user2_id === user.id);
    if (existingConv) {
      handleSelectConv(existingConv);
    } else {
      onDraftRequest(user);
    }
  };

  const handleSelectConv = async (conv: any) => {
    await markMessagesRead(conv.id, userId);
    onSelectConversation(conv);
    loadConversations();
  };

  /* ── Derived Data ── */
  const totalUnread = useMemo(() => conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0), [conversations]);

  return (
    <div className="msg-sidebar">
      {/* Header */}
      <div className="msg-sidebar-header">
        <div className="msg-sidebar-title">Messages</div>
      </div>

      {/* Search */}
      <div className="msg-sidebar-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input placeholder="Search users or messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {/* Toggles */}
      <div className="msg-sidebar-toggles">
        <button className={`msg-toggle-btn ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
          Chats {totalUnread > 0 && <span className="msg-toggle-badge">{totalUnread}</span>}
        </button>
        <button className={`msg-toggle-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          Requests {requests.length > 0 && <span className="msg-toggle-badge">{requests.length}</span>}
        </button>
      </div>

      {/* When searching, show global users results */}
      {searchQuery.trim() ? (
        <div className="msg-conv-list">
          <div className="msg-section-label">PEOPLE</div>
          {userResults.length === 0 ? (
            <div className="msg-sidebar-empty">No users found</div>
          ) : (
            userResults.map(u => (
              <div key={u.id} className="msg-conv-row" onClick={() => handleSelectUser(u)}>
                <div className="msg-conv-av-wrap">
                  <div className="msg-conv-av" style={{ background: 'rgba(158,240,26,0.15)', color: 'var(--lime)' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(u.full_name)}
                  </div>
                </div>
                <div className="msg-conv-info">
                  <div className="msg-conv-name">{u.full_name}</div>
                  <div className="msg-conv-preview" style={{ color: 'var(--lime)' }}>Tap to message</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'chats' ? (
        <div className="msg-conv-list">
          <div className="msg-section-label">ACTIVE</div>
          {loading ? (
            <div className="msg-sidebar-empty">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="msg-sidebar-empty">No active chats</div>
          ) : (
            conversations.map(c => (
              <ConversationRow
                key={c.id}
                conversation={c}
                isActive={activeConvId === c.id}
                onClick={() => handleSelectConv(c)}
              />
            ))
          )}

          {sentRequests.length > 0 && (
            <>
              <div className="msg-section-label" style={{ marginTop: 16 }}>EARLIER</div>
              {sentRequests.map(r => (
                <RequestCard key={r.id} request={r} onClick={() => onSelectRequest(r)} isSent />
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="msg-conv-list">
          <div className="msg-section-label" style={{ marginBottom: 4 }}>INCOMING {requests.length > 0 && <span style={{ color: 'var(--coral)', marginLeft: 4 }}>{requests.length}</span>}</div>
          {requests.length > 0 ? (
            <div className="msg-requests-section" style={{ borderBottom: 'none', padding: '0' }}>
              {requests.map(r => <RequestCard key={r.id} request={r} onClick={() => onSelectRequest(r)} />)}
            </div>
          ) : (
            <div className="msg-sidebar-empty">No pending requests</div>
          )}
        </div>
      )}
    </div>
  );
}
