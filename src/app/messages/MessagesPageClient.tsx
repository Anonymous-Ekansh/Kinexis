"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { setPresence } from "@/lib/messages/queries";
import MessagesSidebar from "@/components/messages/MessagesSidebar";
import ChatPanel from "@/components/messages/ChatPanel";
import RequestPanel from "@/components/messages/RequestPanel";
import "./messages.css";

export default function MessagesPageClient({ userId, initialData }: { userId: string, initialData: any }) {
  const [activeConv, setActiveConv] = useState<any>(null);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [draftUser, setDraftUser] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Presence ── */
  useEffect(() => {
    try {
      setPresence(userId, true);
    } catch (e) {
      console.warn("Presence update failed:", e);
    }

    const handleUnload = () => {
      // Send with keepalive
      const body = JSON.stringify({
        user_id: userId,
        is_online: false,
        last_seen: new Date().toISOString(),
      });
      navigator.sendBeacon?.(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${userId}`, '');
      // Fallback
      setPresence(userId, false);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      try {
        setPresence(userId, false);
      } catch (e) {
        console.warn("Presence teardown failed:", e);
      }
    };
  }, [userId]);

  const handleSelectConversation = (conv: any) => {
    setActiveConv(conv);
    setActiveRequest(null);
    setDraftUser(null);
    setChatOpen(true);
  };

  const handleSelectRequest = (req: any) => {
    setActiveRequest(req);
    setActiveConv(null);
    setDraftUser(null);
    setChatOpen(true);
  };

  const handleDraftRequest = (user: any) => {
    setDraftUser(user);
    setActiveConv(null);
    setActiveRequest(null);
    setChatOpen(true);
  };

  const handleBack = () => {
    setChatOpen(false);
    setActiveConv(null);
    setActiveRequest(null);
    setDraftUser(null);
  };

  const handleConversationDeleted = () => {
    setActiveConv(null);
    setChatOpen(false);
    setRefreshKey(prev => prev + 1);
  };
  
  const handleRequestResolved = (conv: any | null) => {
    setActiveRequest(null);
    setDraftUser(null);
    if (conv) {
      setActiveConv(conv);
    } else {
      setChatOpen(false);
    }
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className={`msg-page ${chatOpen ? 'chat-open' : ''}`}>
      <MessagesSidebar
        userId={userId}
        activeConvId={activeConv?.id || null}
        onSelectConversation={handleSelectConversation}
        onSelectRequest={handleSelectRequest}
        onDraftRequest={handleDraftRequest}
        refreshKey={refreshKey}
        initialData={initialData}
      />
      {activeConv ? (
        <ChatPanel
          userId={userId}
          conversation={activeConv}
          onConversationDeleted={handleConversationDeleted}
          onBack={handleBack}
        />
      ) : (activeRequest || draftUser) ? (
        <RequestPanel 
          userId={userId}
          request={activeRequest}
          draftUser={draftUser}
          onResolved={handleRequestResolved}
          onBack={handleBack}
        />
      ) : (
        <div className="msg-chat-panel msg-chat-empty">
          <svg className="msg-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <div className="msg-empty-title">Your Messages</div>
          <div className="msg-empty-sub">Select a conversation or start a new one</div>
        </div>
      )}
    </div>
  );
}
