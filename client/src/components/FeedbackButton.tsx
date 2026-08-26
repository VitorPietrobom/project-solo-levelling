import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { apiClient, errorMessage } from '../lib/apiClient';
import { useToast } from '../contexts/ToastContext';

// Global floating button, mounted once in Dashboard so it's on every
// authenticated page during the alpha — the lowest-friction way for a
// tester to flag something without leaving what they're doing.
export default function FeedbackButton() {
  const { showToast } = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/api/feedback', { body: { message: message.trim(), page: location.pathname } });
      setMessage('');
      setOpen(false);
      showToast('Thanks — feedback sent!');
    } catch (err) {
      showToast(errorMessage(err, 'Failed to send feedback'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close feedback form' : 'Send feedback'}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 30,
          width: 48, height: 48, borderRadius: 999,
          background: 'var(--accent)', color: 'var(--bg-0)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          style={{
            position: 'fixed', bottom: 82, right: 24, zIndex: 30, width: 300, maxWidth: 'calc(100vw - 48px)',
            background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)',
            padding: 14, boxShadow: 'var(--shadow-lg)', display: 'grid', gap: 8,
          }}
        >
          <span className="eyebrow">Alpha feedback</span>
          <textarea
            value={message} onChange={(e) => setMessage(e.target.value)} autoFocus
            rows={4} placeholder="Found a bug? Something confusing? Tell me here."
            aria-label="Feedback message"
            style={{ background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <button
            type="submit" disabled={submitting || !message.trim()}
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
          >{submitting ? 'Sending…' : 'Send'}</button>
        </form>
      )}
    </>
  );
}
