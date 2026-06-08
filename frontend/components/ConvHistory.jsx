'use client';
import { useState, useEffect, useRef } from 'react';

function timeAgo(str) {
  const s = (Date.now() - new Date(str)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ConvHistory({ currentId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch('/api/agent/session');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (id) => {
    setOpen(false);
    setSwitching(id);
    await onSelect(id);
    setSwitching(null);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="flex items-center justify-center w-7 h-7 rounded-lg"
        style={{
          background: open ? 'var(--surface-2)' : 'var(--surface)',
          border: '1px solid var(--border)',
          color: open ? 'var(--text)' : 'var(--text-muted)',
        }}
        title="Past conversations"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-64 rounded-xl z-50"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
          }}
        >
          {loading ? (
            <p className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>No past conversations</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {sessions.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 cursor-pointer"
                    style={{
                      background: s.id === currentId ? 'var(--surface-2)' : 'transparent',
                      opacity: switching === s.id ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = s.id === currentId ? 'var(--surface-2)' : 'transparent'; }}
                    onClick={() => handleClick(s.id)}
                  >
                    <p className="text-[12px] truncate" style={{ color: 'var(--text)' }}>
                      {s.preview.length > 44 ? s.preview.slice(0, 44) + '…' : s.preview}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(s.created_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
