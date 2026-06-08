'use client';
import { useState, useRef } from 'react';

export default function InputBar({ onSend, loading, accent }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);

  const submit = () => {
    const text = value.trim();
    if (!text || loading) return;
    setValue('');
    if (ref.current) ref.current.style.height = 'auto';
    onSend(text);
  };

  const canSend = value.trim().length > 0 && !loading;

  return (
    <div className="relative z-10 flex-none px-5 md:px-8 pb-6 pt-2">
      <div className="mx-auto max-w-180">
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2.5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            transition: 'border-color 300ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onFocusCapture={e => e.currentTarget.style.borderColor = `${accent}55`}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
            }}
            placeholder="Ask about Persona…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] leading-relaxed outline-none"
            style={{
              color: 'var(--text)',
              caretColor: accent,
              maxHeight: '140px',
              overflowY: 'auto',
            }}
          />

          <button
            onClick={submit}
            disabled={!canSend}
            className="flex-none flex items-center justify-center rounded-xl w-9 h-9 transition-all"
            style={{
              background: canSend ? accent : 'var(--surface-2)',
              color: canSend ? 'var(--bg)' : 'var(--text-muted)',
              opacity: loading ? 0.4 : 1,
              transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
