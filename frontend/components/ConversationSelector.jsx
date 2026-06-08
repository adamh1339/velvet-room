'use client';
import { useState, useEffect, useRef } from 'react';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ConversationSelector({ sessionId, onSelect, onNew }) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async () => {
    const res = await fetch('/api/agent/session');
    const data = await res.json();
    setSessions(data.sessions ?? []);
  };

  const handleOpen = () => {
    if (!open) load();
    setOpen(v => !v);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-200"
        style={{
          background: open ? 'rgba(255,255,255,0.07)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 3h10M2 7h6M2 11h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span className="text-[11px] font-medium">Chats</span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-64 rounded-2xl overflow-hidden z-50"
          style={{
            background: '#0a0a0e',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
          }}
        >
          <button
            onClick={() => { onNew(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New conversation
          </button>

          <div className="max-h-64 overflow-y-auto">
            {sessions.length === 0 && (
              <p className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No conversations yet</p>
            )}
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => { onSelect(s.id); setOpen(false); }}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  background: s.id === sessionId ? 'rgba(255,255,255,0.06)' : 'transparent',
                  borderLeft: s.id === sessionId ? '2px solid rgba(255,255,255,0.2)' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (s.id !== sessionId) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (s.id !== sessionId) e.currentTarget.style.background = 'transparent'; }}
              >
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {s.preview.length > 45 ? s.preview.slice(0, 45) + '…' : s.preview}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {timeAgo(s.created_at)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
