import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get('game') ?? 'p5r';

  if (!['p3r', 'p4g', 'p5r'].includes(game)) {
    return Response.json({ error: 'Invalid game' }, { status: 400 });
  }

  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), 'fusion-data', game, 'persona-data.json'), 'utf8'));
    return Response.json({ names: Object.keys(data).sort() });
  } catch {
    return Response.json({ error: 'Data unavailable' }, { status: 500 });
  }
}
