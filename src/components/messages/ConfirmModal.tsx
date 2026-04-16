"use client";

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }: Props) {
  return (
    <div className="msg-modal-overlay" onClick={onCancel}>
      <div className="msg-confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="msg-confirm-title">{title}</div>
        <div className="msg-confirm-message">{message}</div>
        <div className="msg-confirm-actions">
          <button
            className="msg-confirm-btn"
            style={{ background: confirmColor || 'var(--coral)', color: '#fff' }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button className="msg-confirm-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
