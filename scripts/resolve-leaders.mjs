// Finds the English Wikipedia article for Archigos leaders recorded only by surname.
//   node scripts/resolve-leaders.mjs
// Searches "<surname> <country> leader", then accepts the top result only if its title contains the surname
// and its Wikidata description reads like a political leader. Unresolved leaders keep the search-link fallback.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../data/countries.json', import.meta.url);
const data = JSON.parse(readFileSync(FILE, 'utf8'));
const UA = { 'User-Agent': 'JDP-I H&P Retrospective (https://hp-retrospective.pages.dev)' };
const LEADERISH = /(president|prime minister|premier|chancellor|king|queen|emperor|monarch|sultan|emir|shah|dictator|politician|statesman|military officer|general|head of state|leader|taoiseach|regent|chairman|ruler|prince|grand duke|governor|marshal|admiral|minister)/i;
const BAD_TITLE = /^(premiership|presidency|government|list|cabinet|ministry|administration|reign|regency|era|history|assassination|death|funeral)\b|election|referendum|family|dynasty/i;
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function api(params) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res.json();
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  return {};
}

async function resolve(surname, country, year) {
  for (const q of [`${surname} ${country} ${year}`, `${surname} ${country} head of government`]) {
    const r = await resolveQuery(q, surname);
    if (r) return r;
  }
  return null;
}
async function resolveQuery(q, surname) {
  const s = await api({ action: 'query', list: 'search', srsearch: q, srlimit: '5', srnamespace: '0' });
  for (const hit of s.query?.search || []) {
    // "Premiership of Gordon Brown" points to the person's own article.
    const title = hit.title.replace(/^(Premiership|Presidency|Chancellorship|Prime ministership) of /, '');
    if (!norm(title).includes(norm(surname)) || BAD_TITLE.test(title)) continue;
    const p = await api({ action: 'query', prop: 'description|pageprops', titles: title, redirects: '1' });
    const page = Object.values(p.query?.pages || {})[0];
    if (page?.pageprops?.disambiguation !== undefined) continue;
    if (LEADERISH.test(page?.description || '')) return { full: page.title.replace(/ \(.*\)$/, ''), url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` };
  }
  return null;
}

// Undo earlier matches that landed on an article about a term of office rather than the person.
for (const c of Object.values(data.countries)) for (const l of c.leaders) if (l.url && BAD_TITLE.test(decodeURIComponent(l.url.split('/wiki/')[1] || '').replace(/_/g, ' '))) { l.url = null; l.full = null; }
const todo = [];
for (const c of Object.values(data.countries)) for (const l of c.leaders) if (!l.url && l.name) todo.push([c, l]);
console.log(`${todo.length} leaders without an article`);
const memo = new Map();
let found = 0;
const queue = [...todo];
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let item; (item = queue.shift());) {
    const [c, l] = item;
    const key = `${c.name}|${l.name}`;
    if (!memo.has(key)) memo.set(key, resolve(l.name, c.name, l.start.slice(0, 4)));
    const r = await memo.get(key);
    if (r) {
      Object.assign(l, r);
      // Retitle this leader's "takes power" events with the full name.
      for (const e of c.events) if (e.type === 'leader' || e.type === 'coup') if (e.date === l.start && e.text.startsWith(l.name + ' ')) { e.text = r.full + e.text.slice(l.name.length); e.url ||= r.url; }
      found++;
    }
  }
}));
writeFileSync(FILE, JSON.stringify(data));
console.log(`resolved ${found} of ${todo.length}`);
