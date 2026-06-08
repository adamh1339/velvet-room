import { readFileSync } from 'fs';
import { join } from 'path';

function load(game, file) {
  return JSON.parse(readFileSync(join(process.cwd(), 'fusion-data', game, file), 'utf8'));
}

function lookupResultArcana(chart, arcana1, arcana2) {
  const { races, table } = chart;
  const i = races.indexOf(arcana1);
  const j = races.indexOf(arcana2);
  if (i === -1 || j === -1) return null;
  const row = Math.max(i, j);
  const col = Math.min(i, j);
  const result = table[row]?.[col];
  return !result || result === '-' ? null : result;
}

function findResultPersona(personaData, resultArcana, targetLevel) {
  const inArcana = Object.entries(personaData).filter(([, p]) => p.race === resultArcana);
  const above = inArcana.filter(([, p]) => p.lvl >= targetLevel).sort(([, a], [, b]) => a.lvl - b.lvl);
  if (above.length > 0) return above[0];
  // Fallback: highest level in arcana if nothing >= target
  return inArcana.sort(([, a], [, b]) => b.lvl - a.lvl)[0] ?? null;
}

export async function POST(request) {
  const { game, personas: [name1, name2] } = await request.json();

  if (!['p3r', 'p4g', 'p5r'].includes(game)) {
    return Response.json({ error: 'Invalid game' }, { status: 400 });
  }

  try {
    const personaData = load(game, 'persona-data.json');
    const chart = load(game, 'fusion-chart.json');
    const special = load(game, 'special-recipes.json');

    const p1 = personaData[name1];
    const p2 = personaData[name2];
    if (!p1) return Response.json({ error: `"${name1}" not found in ${game}.` }, { status: 404 });
    if (!p2) return Response.json({ error: `"${name2}" not found in ${game}.` }, { status: 404 });

    // Check 2-ingredient special recipes
    for (const [resultName, ingredients] of Object.entries(special)) {
      if (ingredients.length === 2) {
        const [a, b] = ingredients;
        if ((a === name1 && b === name2) || (a === name2 && b === name1)) {
          const rp = personaData[resultName];
          if (rp) {
            const startSkills = Object.entries(rp.skills)
              .filter(([, v]) => v < 1)
              .map(([k]) => k)
              .slice(0, 4);
            return Response.json({ result: resultName, level: rp.lvl, arcana: rp.race, skills: startSkills, special: true });
          }
        }
      }
    }

    // Normal fusion via arcana chart
    const resultArcana = lookupResultArcana(chart, p1.race, p2.race);
    if (!resultArcana) {
      return Response.json({ error: 'These two personas cannot be fused together.' }, { status: 404 });
    }

    const targetLevel = Math.floor((p1.lvl + p2.lvl) / 2) + 1;
    const candidate = findResultPersona(personaData, resultArcana, targetLevel);
    if (!candidate) {
      return Response.json({ error: `No persona found in the ${resultArcana} arcana.` }, { status: 404 });
    }

    const [resultName, rp] = candidate;
    const startSkills = Object.entries(rp.skills)
      .filter(([, v]) => v < 1)
      .map(([k]) => k)
      .slice(0, 4);

    return Response.json({ result: resultName, level: rp.lvl, arcana: rp.race, skills: startSkills });
  } catch (e) {
    console.error('Fusion error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
