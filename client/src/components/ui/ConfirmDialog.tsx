import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // Focus Cancel on open (safe default for a destructive action) and restore
  // focus to whatever was focused before the dialog opened when it closes.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  // Escape cancels. Enter/Space are left to native button activation, so they
  // only trigger whichever button actually has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Trap Tab / Shift+Tab within the dialog.
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current;
    if (e.key !== 'Tab' || !dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dialog.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'oklch(0.1 0.02 264 / 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          padding: '28px 32px',
          maxWidth: 380,
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <p id={titleId} style={{ fontSize: 15, fontWeight: 500, marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button ref={cancelRef} className="btn" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: 'var(--bad)', borderColor: 'var(--bad)', color: '#fff' }}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
