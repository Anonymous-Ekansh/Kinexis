"use client";

interface Props {
  name: string;
  variant: 'i_blocked' | 'they_blocked';
}

export default function BlockedBanner({ name, variant }: Props) {
  return (
    <div className="msg-blocked-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
      <span>
        {variant === 'i_blocked'
          ? `You have blocked ${name}. They cannot send you messages.`
          : `You cannot send messages to ${name}.`}
      </span>
    </div>
  );
}
