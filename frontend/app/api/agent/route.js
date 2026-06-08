import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase } from '@/lib/supabase';

const TAG_MAP = { p3: '[P3]', p4: '[P4]', p5: '[P5]', rec: '[REC]' };
const GAME_MAP = { p3: 'p3r', p4: 'p4g', p5: 'p5r', rec: 'p5r' };

// ── Recommender interview ─────────────────────────────────────────────────────

const REC_QUESTIONS = [
  "It's late. You can't sleep. You're most likely to be: (a) staring at the ceiling thinking about something you can't fix, (b) texting a friend just to hear from someone, (c) playing something to turn your brain off, or (d) reading, writing, or deep in a rabbit hole. What's your answer — and does it feel accurate?",
  "A stranger asks you to help them with something dangerous. You don't know them. You have nothing to gain. What do you do — and be honest, not heroic.",
  "Pick the word that hits hardest right now: Regret, Injustice, Loneliness, or Deception. Why that one?",
  "Three doors. Behind the first: a crumbling supernatural tower full of monsters, explored with a small group at midnight every full moon. Behind the second: a foggy small town where the news anchor just went missing and everyone's pretending not to notice. Behind the third: a glittering city where Phantom Thieves steal corrupt hearts and post calling cards. Which door?",
  "Your relationship with rules, honestly: (a) rules exist to be broken when they're wrong, (b) rules usually make sense but there are exceptions, (c) rules are for people with less to lose than me, or (d) I follow them but I don't always believe in them.",
  "What kind of villain actually gets under your skin — someone who genuinely believes they're right, someone you once trusted, someone with real power and no accountability, or the part of yourself you refuse to look at?",
  "You're playing an RPG. What's your role: the one who takes every hit so nobody else has to, the strategist who figures out the weakness before the fight starts, the healer who holds everything together, or the wild card nobody planned for?",
  "Pick a vibe: late-night jazz in a velvet-curtained bar, lo-fi hip hop in a foggy small town at 3am, electric guitar and neon lights on a rooftop, or sweeping orchestra the moment everything finally makes sense.",
  "A story made you genuinely emotional — not just sad, but something deeper. What was it, and what did it do to you?",
  "What do you actually want from a Persona game? Be specific. Not 'a good story' — what do you want to feel when you put the controller down?",
  "How do you feel about slow burns? These games take 20-30 hours to really open up. Is that fine, or does that make you nervous?",
  "Last one — and I want you to answer without thinking too hard: which sounds more like you — someone who carries their pain quietly and keeps going, or someone who refuses to accept the world as it is?",
];

const REC_THRESHOLD = REC_QUESTIONS.length; // 12 questions after the greeting

function buildRecommendationPrompt(history, finalMessage) {
  const qa = [];
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role === 'user') {
      const prev = history[i - 1];
      const question = prev?.content ?? 'Introduction';
      qa.push(`Q: ${question}\nA: ${m.content}`);
    }
  }
  qa.push(`Q: ${REC_QUESTIONS[REC_QUESTIONS.length - 1]}\nA: ${finalMessage}`);

  return (
    `Below is an instruction about the Persona game series. Provide a helpful, detailed response.\n\n` +
    `### Instruction:\n` +
    `[REC] Based on this interview, recommend which Persona game this person should play first.\n\n` +
    `Interview:\n${qa.join('\n\n')}\n\n` +
    `Provide:\n` +
    `1. A clear recommendation — Persona 3 Reload, Persona 4 Golden, or Persona 5 Royal\n` +
    `2. Why it fits them specifically — reference their exact answers\n` +
    `3. Brief notes on when they might try the other two later\n\n` +
    `### Response:\n`
  );
}

// ── Normal chat ───────────────────────────────────────────────────────────────

function loadPersonaNames(game) {
  const path = join(process.cwd(), 'fusion-data', GAME_MAP[game] ?? 'p5r', 'persona-data.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return new Set(Object.keys(data).map(n => n.toLowerCase()));
}

function detectFusion(message, personaNames) {
  const lower = message.toLowerCase();
  const hasFusionKeyword = /\bfuse\b|\bfusion\b|\bcombine\b|\bcraft\b/.test(lower);
  const words = lower.split(/\s+/);
  const found = [];
  for (let i = 0; i < words.length && found.length < 2; i++) {
    for (let j = i + 1; j <= Math.min(i + 4, words.length); j++) {
      const candidate = words.slice(i, j).join(' ');
      if (personaNames.has(candidate)) { found.push(candidate); break; }
    }
  }
  return hasFusionKeyword && found.length >= 2 ? found : null;
}

function buildPrompt(history, toolContext, tag, message) {
  const historyBlock = history.length > 0
    ? 'Previous conversation:\n' + history.map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n') + '\n\n'
    : '';
  const toolBlock = toolContext ? `${toolContext}\n\n` : '';
  const rules = [
    'Only answer questions related to the Persona series. Politely redirect off-topic questions.',
    'If you are not confident about a specific detail, say so rather than guessing.',
    'Never fabricate game mechanics, personas, or relationships that do not exist.',
    'Distinguish clearly between different Persona titles — mechanics differ between games.',
    'When a fusion result has been looked up and provided above, use it directly in your answer.',
    'Be conversational and in-character as a Velvet Room attendant guiding a guest.',
  ].map(r => `- ${r}`).join('\n');

  return (
    `Below is an instruction about the Persona game series. Provide a helpful, detailed response.\n\n` +
    `Rules:\n${rules}\n\n` +
    historyBlock + toolBlock +
    `### Instruction:\n${tag} ${message}\n\n### Response:\n`
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request) {
  const { message, mode, session_id } = await request.json();

  // Load history
  let history = [];
  if (session_id) {
    const { data } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true })
      .limit(30);
    history = data ?? [];
  }

  // ── Recommender flow ──────────────────────────────────────────────────────
  if (mode === 'rec') {
    const userCount = history.filter(m => m.role === 'user').length;

    if (userCount < REC_THRESHOLD) {
      // Still interviewing — return next question instantly, no model call
      const next = REC_QUESTIONS[userCount];
      if (session_id) {
        await supabase.from('messages').insert([
          { session_id, role: 'user', content: message },
          { session_id, role: 'assistant', content: next },
        ]);
      }
      return Response.json({ response: next });
    }

    // All questions answered — ask model for recommendation
    const prompt = buildRecommendationPrompt(history, message);
    const modelRes = await fetch(process.env.MODAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_tokens: 800, temperature: 0.2 }),
    });

    if (!modelRes.ok) {
      return Response.json({ error: 'Model unavailable. Please try again.' }, { status: 502 });
    }

    const { response } = await modelRes.json();
    if (session_id) {
      await supabase.from('messages').insert([
        { session_id, role: 'user', content: message },
        { session_id, role: 'assistant', content: response },
      ]);
    }
    return Response.json({ response });
  }

  // ── Normal chat flow ──────────────────────────────────────────────────────
  const tag = TAG_MAP[mode] ?? '[P5]';
  let toolContext = null;
  let toolUsed = null;

  try {
    const personaNames = loadPersonaNames(mode);
    const fusionMatch = detectFusion(message, personaNames);
    if (fusionMatch) {
      const game = GAME_MAP[mode] ?? 'p5r';
      const fusionRes = await fetch(
        new URL('/api/fusion', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game, personas: fusionMatch }),
        }
      );
      if (fusionRes.ok) {
        const fusion = await fusionRes.json();
        toolContext = `Fusion lookup: ${fusionMatch[0]} × ${fusionMatch[1]} = ${fusion.result} (Lv.${fusion.level}, ${fusion.arcana} arcana). Starting skills: ${fusion.skills?.join(', ') || 'none'}.`;
        toolUsed = 'fusion';
      }
    }
  } catch {
    // non-fatal
  }

  const prompt = buildPrompt(history, toolContext, tag, message);
  const modelRes = await fetch(process.env.MODAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, max_tokens: 512, temperature: 0.2 }),
  });

  if (!modelRes.ok) {
    return Response.json({ error: 'Model unavailable. Please try again.' }, { status: 502 });
  }

  const { response } = await modelRes.json();
  if (session_id) {
    await supabase.from('messages').insert([
      { session_id, role: 'user', content: message },
      { session_id, role: 'assistant', content: response, tool_used: toolUsed },
    ]);
  }
  return Response.json({ response, tool_used: toolUsed });
}
