"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
}

export default function MessageInput({ disabled, onSend, placeholder }: Props) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const emojis = ['👍', '🔥', '😂', '❤️', '🙌', '💯', '😊', '🚀', '👀', '🎉', '💪', '🙏', '✨', '🤔', '😎'];

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
    setShowEmoji(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className={`msg-input-bar ${disabled ? 'disabled' : ''}`}>
      <div className="msg-input-wrap">
        <button 
          className="msg-emoji-btn" 
          onClick={() => setShowEmoji(!showEmoji)} 
          disabled={disabled}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
        </button>
        {showEmoji && (
          <div className="msg-emoji-picker" ref={emojiRef}>
            {emojis.map(e => (
              <button key={e} className="msg-emoji-item" onClick={() => insertEmoji(e)}>{e}</button>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          className="msg-input-field"
          placeholder={disabled ? (placeholder || "You cannot send messages") : "Send a message..."}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
      </div>
      <button
        className="msg-input-send"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  );
}
