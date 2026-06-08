'use client';

const MODES = [
  { id: 'p3', label: 'P3', color: '#4a9eff' },
  { id: 'p4', label: 'P4', color: '#f5c842' },
  { id: 'p5', label: 'P5', color: '#e63946' },
  { id: 'rec', label: 'REC', color: '#9b5de5' },
  { id: 'fusion', label: 'FUSION', color: '#2ec4b6' },
];

export default function ModeSelector({ mode, onChange }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-1"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {MODES.map(m => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider select-none"
            style={{
              color: active ? '#fff' : 'rgba(255,255,255,0.32)',
              background: active ? m.color + '20' : 'transparent',
              boxShadow: active ? `inset 0 0 0 1px ${m.color}44, 0 0 10px ${m.color}22` : 'none',
              transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
