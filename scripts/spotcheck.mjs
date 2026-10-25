// Prints leaders and events for sample country-years to sanity-check the built data.
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
const samples = process.argv.slice(2).length ? process.argv.slice(2) : ['200:1940', '255:1938', '365:1953', '2:2025', '220:2017', '740:2026', '290:1939', '260:1990'];
for (const s of samples) {
  const [gw, y] = s.split(':');
  const c = d.countries[gw];
  const ls = c.leaders.filter(l => l.start <= `${y}-12-31` && (!l.end || l.end >= `${y}-01-01`));
  console.log(`\n${c.name} ${y}: ${ls.map(l => `${l.full || l.name} (${l.start}→${l.end ?? 'now'}${l.url ? ', link' : ''})`).join('; ')}`);
  for (const e of c.events.filter(e => e.date.startsWith(`${y}-`)).slice(0, 6)) console.log(`   ${e.date} ${e.type}: ${e.text}`);
}
