'use client';
import { useState, useEffect } from 'react';
import ChatWindow from '@/components/ChatWindow';
import InputBar from '@/components/InputBar';
import NewChatModal from '@/components/NewChatModal';
import Sidebar from '@/components/Sidebar';

export const MODE_COLORS = {
  p3: '#4a9eff',
  p4: '#f5c842',
  p5: '#e63946',
  rec: '#9b5de5',
  fusion: '#2ec4b6',
};

const GREETINGS = {
  p3: 'Welcome to the Velvet Room. You have awakened to the power of your heart. Ask me anything about Persona 3 Reload — Tartarus, Shadows, Social Links, or party strategy.',
  p4: 'The power of bonds holds the truth. Ask me about Persona 4 Golden — dungeons, the Midnight Channel, Social Links, or team compositions.',
  p5: 'You have shown your rehabilitation. Ask me about Persona 5 Royal — Palaces, Confidants, fusion, or boss strategies.',
  rec: "Welcome to the Velvet Room.\n\nEvery guest who enters carries a unique soul. I will ask you some questions — not about what you know, but about who you are. Answer honestly. There are no wrong answers.\n\nFirst: Have you played any Persona games before? If yes, which ones — and what did you think?",
};

async function getOrCreateSession() {
  const stored = localStorage.getItem('velvet_session_id');
  // Guard against a stored "undefined" string from an earlier bug
  if (stored && stored !== 'undefined' && stored !== 'null') return stored;
  localStorage.removeItem('velvet_session_id');
  const res = await fetch('/api/agent/session', { method: 'POST' });
  const { session_id } = await res.json();
  if (session_id) localStorage.setItem('velvet_session_id', session_id);
  return session_id;
}

export default function Home() {
  const [mode, setMode] = useState('p5');
  const [messages, setMessages] = useState([{ role: 'assistant', text: GREETINGS.p5 }]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    getOrCreateSession().then(async (id) => {
      setSessionId(id);
      const res = await fetch(`/api/agent/session?session_id=${id}`);
      const { messages: history } = await res.json();
      if (history?.length > 0) {
        setMessages(history.map(m => ({ role: m.role, text: m.content })));
      }
    });
  }, []);

  const handleSelectConv = (id, sessionMode) => {
    if (sessionMode) setMode(sessionMode);
    setMessages([{ role: 'assistant', text: '…' }]);
    setSessionId(id);
    localStorage.setItem('velvet_session_id', id);
    fetch(`/api/agent/session?session_id=${id}`)
      .then(r => r.json())
      .then(data => {
        const history = Array.isArray(data.messages) ? data.messages : [];
        setMessages(
          history.length > 0
            ? history.map(m => ({ role: m.role, text: m.content }))
            : [{ role: 'assistant', text: GREETINGS[mode] ?? GREETINGS.p5 }]
        );
      })
      .catch(() => setMessages([{ role: 'assistant', text: 'Could not load.' }]));
  };

  const handleNewChatSelect = async (selectedMode) => {
    setShowNewChat(false);
    try {
      const res = await fetch('/api/agent/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selectedMode }),
      });
      const data = await res.json();
      const id = data.session_id;
      if (!id) return;
      localStorage.setItem('velvet_session_id', id);
      setSessionId(id);
      setMode(selectedMode);
      setMessages([{ role: 'assistant', text: GREETINGS[selectedMode] ?? GREETINGS.p5 }]);
    } catch (e) {
      console.error('Failed to create new chat:', e);
    }
  };

  const handleSend = async (text) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode, session_id: sessionId }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: data.response || data.error || 'Something went wrong.', tool_used: data.tool_used },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const accent = MODE_COLORS[mode];

  return (
    <div className="flex" style={{ height: '100dvh' }}>
      <Sidebar
        currentId={sessionId}
        onSelect={handleSelectConv}
        onNew={() => setShowNewChat(true)}
        accent={accent}
      />

      <div className="relative flex flex-col flex-1 min-w-0">
        {/* Ambient glow */}
        <div
          className="fixed inset-x-0 top-0 h-64 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${accent}14, transparent 70%)`,
            transition: 'background 600ms cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        <ChatWindow messages={messages} loading={loading} accent={accent} />
        <InputBar onSend={handleSend} loading={loading} accent={accent} />
      </div>

      {showNewChat && (
        <NewChatModal
          onSelect={handleNewChatSelect}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  );
}
