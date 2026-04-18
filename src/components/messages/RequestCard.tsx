"use client";

import { useState } from "react";
import Image from "next/image";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

interface Props {
  request: any;
  onClick: (req: any) => void;
  isSent?: boolean;
}

export default function RequestCard({ request, onClick, isSent }: Props) {
  const user = request.sender;

  return (
    <div className="msg-conv-row" onClick={() => onClick(request)}>
      <div className="msg-conv-av-wrap">
        <div className="msg-conv-av" style={{ background: isSent ? 'rgba(255,255,255,0.05)' : 'rgba(167,139,250,0.15)', color: isSent ? '#ccc' : 'var(--purple)' }}>
          {user?.avatar_url
            ? <Image src={user.avatar_url} alt="" width={44} height={44} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : getInitials(user?.full_name)}
        </div>
      </div>
      <div className="msg-conv-info">
        <div className="msg-conv-name">{user?.full_name || 'User'}</div>
        <div className="msg-conv-preview">
          {isSent ? 'Sent a message request' : 'Wants to connect with you'}
        </div>
      </div>
      {!isSent && (
        <div className="msg-conv-right">
          <div style={{ background: 'rgba(251,113,133,0.15)', border: '1px solid rgba(251,113,133,0.3)', color: 'var(--coral)', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, letterSpacing: '0.05em' }}>
            NEW
          </div>
        </div>
      )}
    </div>
  );
}
