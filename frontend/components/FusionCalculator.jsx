'use client';
import { useState, useEffect, useRef } from 'react';

const GAMES = [
  { id: 'p3r', label: 'P3 Reload', color: '#4a9eff' },
  { id: 'p4g', label: 'P4 Golden', color: '#f5c842' },
  { id: 'p5r', label: 'P5 Royal', color: '#2ec4b6' },
];

function PersonaInput({ value, onChange, personas, placeholder, accent }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const filtered = query.length >= 2
    ? personas.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChange('');
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${value ? accent + '55' : 'rgba(255,255,255,0.09)'}`,
          color: 'rgba(255,255,255,0.9)',
          caretColor: accent,
          transition: 'border-color 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      />

      {open && filtered.length > 0 && (
        <ul
          className="absolute top-full mt-1.5 left-0 right-0 rounded-xl overflow-hidden z-50"
          style={{
            background: '#0a0a0e',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
          }}
        >
          {filtered.map(name => (
            <li key={name}>
              <button
                className="w-full text-left px-4 py-2.5 text-sm"
                style={{ color: 'rgba(255,255,255,0.75)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onMouseDown={() => {
                  setQuery(name);
                  onChange(name);
                  setOpen(false);
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FusionCalculator() {
  const [game, setGame] = useState('p5r');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [personas, setPersonas] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const accent = GAMES.find(g => g.id === game)?.color ?? '#2ec4b6';

  useEffect(() => {
    setP1('');
    setP2('');
    setResult(null);
    setError('');
    fetch(`/api/personas?game=${game}`)
      .then(r => r.json())
      .then(d => setPersonas(d.names ?? []))
      .catch(() => {});
  }, [game]);

  const handleFuse = async () => {
    if (!p1 || !p2) { setError('Select both personas first.'); return; }
    if (p1 === p2) { setError('A persona cannot fuse with itself.'); return; }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, personas: [p1, p2] }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'No fusion result found.');
      else setResult(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="mx-auto max-w-lg space-y-5">

        {/* Heading */}
        <div className="text-center space-y-2 pb-1">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium"
            style={{ background: accent + '18', color: accent }}
          >
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: accent, boxShadow: `0 0 4px ${accent}` }}
            />
            Velvet Room
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Fusion Calculator
          </h1>
        </div>

        {/* Game selector */}
        <div
          className="flex items-center gap-1 rounded-2xl p-1.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {GAMES.map(g => (
            <button
              key={g.id}
              onClick={() => setGame(g.id)}
              className="flex-1 rounded-xl py-2 text-sm font-medium"
              style={{
                background: game === g.id ? g.color + '20' : 'transparent',
                color: game === g.id ? g.color : 'rgba(255,255,255,0.38)',
                boxShadow: game === g.id ? `inset 0 0 0 1px ${g.color}40` : 'none',
                transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Persona inputs */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.22)' }}>
            Select Personas
          </p>
          <div className="flex gap-3 items-start">
            <PersonaInput value={p1} onChange={setP1} personas={personas} placeholder="First persona…" accent={accent} />
            <span className="flex-none mt-3 text-base font-light select-none" style={{ color: 'rgba(255,255,255,0.18)' }}>×</span>
            <PersonaInput value={p2} onChange={setP2} personas={personas} placeholder="Second persona…" accent={accent} />
          </div>
        </div>

        {/* Fuse button */}
        <button
          onClick={handleFuse}
          disabled={loading || !p1 || !p2}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold tracking-wide"
          style={{
            background: canFuse(p1, p2, loading)
              ? `linear-gradient(135deg, ${accent}28, ${accent}12)`
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${canFuse(p1, p2, loading) ? accent + '50' : 'rgba(255,255,255,0.07)'}`,
            color: canFuse(p1, p2, loading) ? accent : 'rgba(255,255,255,0.22)',
            boxShadow: canFuse(p1, p2, loading) ? `0 0 24px ${accent}1a` : 'none',
            transition: 'all 0.35s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          {loading ? 'Calculating…' : 'Fuse Personas'}
        </button>

        {/* Error */}
        {error && (
          <p className="text-center text-sm" style={{ color: '#e63946' }}>{error}</p>
        )}

        {/* Result card */}
        {result && (
          <div
            className="rounded-2xl p-5 space-y-4 msg-in"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${accent}44`,
              boxShadow: `0 0 32px ${accent}14`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {result.special ? 'Special Fusion' : 'Result'}
                </p>
                <h2 className="text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>
                  {result.result}
                </h2>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-none">
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: accent + '20', color: accent }}
                >
                  {result.arcana}
                </span>
                <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Lv. {result.level}
                </span>
              </div>
            </div>

            {result.skills?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] mb-2.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  Starting Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.skills.map(skill => (
                    <span
                      key={skill}
                      className="rounded-full px-3 py-1 text-xs"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function canFuse(p1, p2, loading) {
  return !!p1 && !!p2 && !loading;
}
