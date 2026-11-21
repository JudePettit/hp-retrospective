// Prints leaders and events for sample country-years to sanity-check the built data.
//   node scripts/spotcheck.mjs [<key>:<year> ...]   key: a state's Wikidata key (Q145), or an old Gleditsch and Ward number
import { readFileSync } from 'node:fs';
import { OLD_KEYS } from './countries.mjs';
const d = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
const samples = process.argv.slice(2).length ? process.argv.slice(2) : ['Q145:1940', 'Q41304:1938', 'Q15180:1953', 'Q30:2025', 'Q142:2017', 'Q17:2026', 'Q36:1939', 'Q713750:1990'];
for (const s of samples) {
  const [k, y] = s.split(':');
  const c = d.countries[OLD_KEYS[k] || k];
  const ls = c.leaders.filter(l => l.start <= `${y}-12-31` && (!l.end || l.end >= `${y}-01-01`));
  console.log(`\n${c.name} ${y}: ${ls.map(l => `${l.full || l.name} (${l.start}→${l.end ?? 'now'}${l.url ? ', link' : ''})`).join('; ')}`);
  for (const e of c.events.filter(e => e.date.startsWith(`${y}-`)).slice(0, 6)) console.log(`   ${e.date} ${e.type}: ${e.text}`);
}
