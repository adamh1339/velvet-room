import { supabase } from '@/lib/supabase';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode ?? 'p5';

  const { data, error } = await supabase
    .from('sessions')
    .insert({ mode })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session_id: data.id });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');

  if (!session_id) {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, mode, created_at, messages(content, role, created_at)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const sessions = (data ?? []).map(s => {
      const msgs = (s.messages ?? []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const firstUser = msgs.find(m => m.role === 'user');
      return {
        id: s.id,
        mode: s.mode ?? 'p5',
        created_at: s.created_at,
        preview: firstUser?.content ?? 'New conversation',
      };
    });

    return Response.json({ sessions });
  }

  const { data, error } = await supabase
    .from('messages')
    .select('role, content, tool_used')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data ?? [] });
}
