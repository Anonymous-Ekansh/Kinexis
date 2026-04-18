"use client";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

interface Props {
  conversation: any;
  isActive: boolean;
  onClick: () => void;
}

export default function ConversationRow({ conversation, isActive, onClick }: Props) {
  const user = conversation.otherUser;
  const lastMsg = conversation.lastMessage;
  const unread = conversation.unreadCount || 0;
  const presence = conversation.presence;

  return (
    <div className={`msg-conv-row ${isActive ? 'active' : ''} ${unread > 0 ? 'unread' : ''}`} onClick={onClick}>
      <div className="msg-conv-av-wrap">
        <div className="msg-conv-av" style={{ background: 'rgba(158,240,26,0.15)', color: 'var(--lime)' }}>
          {user?.avatar_url
            ? <Image src={user.avatar_url} alt="" width={44} height={44} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : getInitials(user?.full_name)}
        </div>
        {presence?.is_online && <div className="msg-conv-online-dot" />}
      </div>
      <div className="msg-conv-info">
        <div className="msg-conv-name">{user?.full_name || 'User'}</div>
        <div className="msg-conv-preview">{lastMsg?.content ? '...' : 'No messages yet'}</div>
      </div>
      <div className="msg-conv-right">
        <div className="msg-conv-time">{lastMsg?.created_at ? timeAgo(lastMsg.created_at) : ''}</div>
        {unread > 0 && <div className="msg-conv-badge">{unread > 9 ? '9+' : unread}</div>}
      </div>
    </div>
  );
}
