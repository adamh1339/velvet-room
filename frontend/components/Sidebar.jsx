'use client';
import { useState, useEffect } from 'react';

const MODE_COLORS = {
  p3: '#4a9eff',
  p4: '#f5c842',
  p5: '#e63946',
  rec: '#9b5de5',
};

function timeAgo(str) {
  const s = (Date.now() - new Date(str)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Sidebar({ currentId, onSelect, onNew, accent }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetch('/api/agent/session')
      .then(r => r.json())
      .then(d => setSessions(d.sessions ?? []))
      .catch(() => {});
  }, [currentId]);

  return (
    <aside
      className="hidden md:flex flex-col flex-none h-full"
      style={{
        width: '220px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* New chat button */}
      <div className="flex-none px-3 pt-4 pb-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-medium"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          New conversation
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {sessions.length === 0 ? (
          <p className="px-2 py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            No conversations yet
          </p>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map(s => {
              const active = s.id === currentId;
              const color = MODE_COLORS[s.mode] ?? MODE_COLORS.p5;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full text-left rounded-lg px-3 py-2.5"
                    style={{
                      background: active ? `${color}18` : 'transparent',
                      borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => onSelect(s.id, s.mode)}
                  >
                    <p
                      className="text-[12px] leading-snug truncate"
                      style={{ color: active ? 'var(--text-head)' : 'var(--text)' }}
                    >
                      {s.preview.length > 28 ? s.preview.slice(0, 28) + '…' : s.preview}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(s.created_at)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
