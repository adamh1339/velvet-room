'use client';

const GAMES = [
  { id: 'p3', label: 'Persona 3 Reload', sub: 'Tartarus, Social Links, party builds', color: 'oklch(62% 0.18 245)' },
  { id: 'p4', label: 'Persona 4 Golden', sub: 'TV World, Midnight Channel, Adachi', color: 'oklch(80% 0.16 85)' },
  { id: 'p5', label: 'Persona 5 Royal', sub: 'Palaces, Confidants, fusions', color: 'oklch(55% 0.22 22)' },
  { id: 'rec', label: 'Not sure where to start', sub: 'Get a recommendation based on your taste', color: 'oklch(58% 0.20 295)' },
];

export default function NewChatModal({ onSelect, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'oklch(0% 0 0 / 72%)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          animation: 'modal-in 220ms cubic-bezier(0.16,1,0.3,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            Velvet Room
          </p>
          <h2 className="mt-1 text-[17px] font-semibold" style={{ color: 'var(--text-head)' }}>
            Which game?
          </h2>
        </div>

        <div className="px-3 pb-4 space-y-1">
          {GAMES.map(g => (
            <button
              key={g.id}
              onClick={() => onSelect(g.id)}
              className="w-full text-left rounded-xl px-4 py-3 group"
              style={{ transition: 'background 180ms cubic-bezier(0.16,1,0.3,1)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-none"
                  style={{ background: g.color }}
                />
                <div>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-head)' }}>{g.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{g.sub}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes modal-in { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </div>
  );
}
