"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface Props {
  otherUser: any;
  presence: any;
  iBlockedThem: boolean;
  theyBlockedMe: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
  onProfileClick: () => void;
  onBack?: () => void;
}

export default function ChatHeader({ otherUser, presence, iBlockedThem, theyBlockedMe, onBlock, onUnblock, onDelete, onProfileClick, onBack }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOnline = presence?.is_online;
  const statusText = isOnline ? "Active now" : (presence?.last_seen ? `Last seen ${timeAgo(presence.last_seen)}` : "");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="msg-chat-header">
      {onBack && (
        <button className="msg-chat-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
      )}
      <div className="msg-chat-header-user">
        <div className="msg-chat-header-av-wrap" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
          <div className="msg-chat-header-av" style={{ background: 'rgba(158,240,26,0.15)', color: 'var(--lime)' }}>
            {otherUser?.avatar_url
              ? <Image src={otherUser.avatar_url} alt="" width={44} height={44} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : getInitials(otherUser?.full_name)}
          </div>
        </div>
        <div className="msg-chat-header-info">
          <div className="msg-chat-header-name" onClick={onProfileClick} style={{ cursor: 'pointer' }}>{otherUser?.full_name || 'User'}</div>
          <div className={`msg-chat-header-status ${isOnline ? 'online' : ''}`}>
            {isOnline && <span className="msg-status-dot"></span>}
            {statusText}
          </div>
        </div>
      </div>
      <div className="msg-chat-header-actions">
        <button className="msg-header-btn profile" onClick={onProfileClick} title="View Profile">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
        <div className="msg-header-dropdown-wrap" ref={menuRef}>
          <button className="msg-header-btn more" onClick={() => setMenuOpen(!menuOpen)} title="Options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
          {menuOpen && (
            <div className="msg-header-dropdown">
              {!theyBlockedMe && (
                <button className={`msg-dropdown-item ${iBlockedThem ? 'unblock' : 'block'}`} onClick={() => { iBlockedThem ? onUnblock() : onBlock(); setMenuOpen(false); }}>
                  {iBlockedThem ? 'Unblock user' : 'Block user'}
                </button>
              )}
              <button className="msg-dropdown-item delete" onClick={() => { onDelete(); setMenuOpen(false); }}>
                Delete messages
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
