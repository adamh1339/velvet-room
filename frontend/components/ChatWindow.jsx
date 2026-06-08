'use client';
import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatWindow({ messages, loading, accent }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="relative z-10 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-180 px-5 md:px-8 py-6 space-y-2">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} accent={accent} />
        ))}

        {loading && (
          <div className="flex items-start msg-in">
            <div
              className="rounded-xl rounded-tl-sm px-4 py-3.5"
              style={{
                background: 'var(--surface)',
                borderTop: '1px solid var(--border-sub)',
                borderRight: '1px solid var(--border-sub)',
                borderBottom: '1px solid var(--border-sub)',
                borderLeft: `1px solid ${accent}99`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="dot w-1 h-1 rounded-full" style={{ background: accent }} />
                <span className="dot w-1 h-1 rounded-full" style={{ background: accent }} />
                <span className="dot w-1 h-1 rounded-full" style={{ background: accent }} />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} className="h-2" />
      </div>
    </div>
  );
}
