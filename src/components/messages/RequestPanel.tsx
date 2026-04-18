"use client";
import Image from "next/image";


import { useState } from "react";
import { createRequest, acceptRequest, declineRequest, deleteRequest, getOrCreateConversation } from "@/lib/messages/queries";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

interface Props {
  userId: string;
  request: any | null; 
  draftUser: any | null; 
  onResolved: (conversation: any | null) => void;
  onBack?: () => void;
}

export default function RequestPanel({ userId, request, draftUser, onResolved, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");

  const isIncoming = request && request.sender_id !== userId;
  const isSent = request && request.sender_id === userId;
  
  const targetUser = request ? request.sender : draftUser;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptRequest(request.id);
      const conv = await getOrCreateConversation(userId, targetUser.id);
      onResolved(conv);
    } catch { setLoading(false); }
  };

  const handleDecline = async () => {
    setLoading(true);
    await declineRequest(request.id);
    onResolved(null);
  };

  const handleWithdraw = async () => {
    setLoading(true);
    await deleteRequest(request.id);
    onResolved(null);
  };

  const handleSendDraft = async () => {
    if (!draftMsg.trim()) return;
    setLoading(true);
    try {
      await createRequest(userId, targetUser.id, draftMsg.trim());
      onResolved(null);
    } catch { setLoading(false); }
  };

  if (isSent) {
    return (
      <div className="msg-req-panel sent-state">
        {onBack && (
          <button className="msg-req-back" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
        )}
        <div className="msg-req-sent-box">
          <div className="msg-req-anim-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#64748b">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v.5l8 5 8-5V6H4zm16 12V8.5l-8 5-8-5V18h16z"/>
            </svg>
            <div className="msg-req-anim-ring">
              <div className="msg-req-anim-dot"></div>
            </div>
          </div>
          <div className="msg-req-sent-title">Request sent!</div>
          <div className="msg-req-sent-desc">
            You sent a message request to {targetUser?.full_name?.split(' ')[0] || 'them'}. You'll be able to chat once they accept — we'll ping you right away.
          </div>
          <div className="msg-req-waiting">
            <span className="msg-req-waiting-dot"></span>
            Waiting for response...
          </div>
          <button className="msg-req-withdraw" onClick={handleWithdraw} disabled={loading}>
            {loading ? 'Withdrawing...' : 'Withdraw request'}
          </button>
        </div>
      </div>
    );
  }

  const tags = targetUser?.interests ? targetUser.interests.slice(0, 3) : [];
  if (tags.length === 0 && targetUser?.stream) tags.push(targetUser.stream);

  return (
    <div className="msg-req-panel">
      {onBack && (
        <button className="msg-req-back top-left" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
      )}

      <div className="msg-req-card">
        <div className="msg-req-profile">
          <div className="msg-req-huge-av">
            {targetUser?.avatar_url
              ? <Image src={targetUser.avatar_url} alt="" width={64} height={64} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
              : getInitials(targetUser?.full_name)}
            <div className="msg-req-huge-dot" />
          </div>
          
          <div className="msg-req-huge-name">{targetUser?.full_name || 'User'}</div>
          <div className="msg-req-huge-meta">
            {targetUser?.stream ? `${targetUser.stream} · ` : ''}
            {targetUser?.year ? `${targetUser.year} · ` : ''}
            Active now
          </div>

          {tags.length > 0 && (
            <div className="msg-req-tags">
              {tags.map((t: string, i: number) => (
                <span key={i} className="msg-req-tag">✨ {t}</span>
              ))}
            </div>
          )}
        </div>

        {isIncoming && (
          <div className="msg-req-inbox">
            <div className="msg-req-inbox-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> 
              THEIR MESSAGE
            </div>
            <div className="msg-req-inbox-text">
              {request.initial_message}
            </div>
          </div>
        )}

        {draftUser && !request && (
          <div className="msg-req-draftbox">
            <textarea
              className="msg-req-textarea"
              placeholder="Write an intro message to connect..."
              value={draftMsg}
              onChange={e => setDraftMsg(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
        )}

        <div className="msg-req-actions">
          {isIncoming ? (
            <>
              <button className="msg-req-btn accept" onClick={handleAccept} disabled={loading}>
                {loading ? '...' : 'Accept ✔'}
              </button>
              <button className="msg-req-btn decline" onClick={handleDecline} disabled={loading}>
                {loading ? '...' : 'Decline'}
              </button>
            </>
          ) : (
            <button className="msg-req-btn accept" onClick={handleSendDraft} disabled={loading || !draftMsg.trim()} style={{ flex: 1 }}>
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
