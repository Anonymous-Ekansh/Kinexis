"use client";
import Image from "next/image";


interface Props {
  message: any;
  isMine: boolean;
  showAvatar: boolean;
  otherUser: any;
  decryptedContent: string;
  isRead: boolean;
}

export default function MessageBubble({ message, isMine, showAvatar, otherUser, decryptedContent, isRead }: Props) {
  function getInitials(name: string | null): string {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }

  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`msg-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && showAvatar && (
        <div className="msg-bubble-av" style={{ background: 'rgba(167,139,250,0.15)', color: 'var(--purple)' }}>
          {otherUser?.avatar_url
            ? <Image src={otherUser.avatar_url} alt="" width={24} height={24} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : getInitials(otherUser?.full_name)}
        </div>
      )}
      {!isMine && !showAvatar && <div className="msg-bubble-av-spacer" />}
      <div className={`msg-bubble ${isMine ? 'sent' : 'received'}`}>
        <div className="msg-bubble-content">{decryptedContent}</div>
        <div className="msg-bubble-meta">
          <span className="msg-bubble-time">{time}</span>
          {isMine && (
            <span className={`msg-bubble-ticks ${isRead ? 'read' : ''}`}>
              ✓✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
