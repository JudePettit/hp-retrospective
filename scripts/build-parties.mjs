// Adds party affiliation to every leader and office-holder in data/countries.json.
//   node scripts/build-parties.mjs
// Each person's English Wikipedia article is resolved to Wikidata; "member of political party" (P102)
// memberships that overlap their time in office become `parties: [{ name, url }]`.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../data/countries.json', import.meta.url);
const data = JSON.parse(readFileSync(FILE, 'utf8'));
const UA = { 'User-Agent': 'JDP-I H&P Retrospective (https://hp-retrospective.pages.dev)' };
const titleOf = url => url && url.includes('/wiki/') ? decodeURIComponent(url.split('/wiki/')[1]).replace(/_/g, ' ') : null;
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function wb(params) {
  const url = 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', format: 'json', ...params });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return (await res.json()).entities || {};
    if (attempt > 3) throw new Error(`Wikidata HTTP ${res.status}`);
    await sleep(2000 * (attempt + 1));
  }
}
const time = q => q?.[0]?.datavalue?.value?.time?.replace(/^\+/, '').slice(0, 10).replace(/-00/g, '-01') || null;

const people = [];
for (const c of Object.values(data.countries)) for (const p of [...c.leaders, ...(c.offices || [])]) if (titleOf(p.url)) people.push(p);
const titles = [...new Set(people.map(p => titleOf(p.url)))];
console.log(`${people.length} people, ${titles.length} articles`);

// Article title → party memberships.
const memberships = new Map();
for (const batch of chunks(titles, 50)) {
  const ents = await wb({ sites: 'enwiki', titles: batch.join('|'), props: 'claims|sitelinks', sitefilter: 'enwiki' });
  for (const e of Object.values(ents)) {
    const t = e.sitelinks?.enwiki?.title;
    if (!t) continue;
    const ms = (e.claims?.P102 || []).filter(c => c.rank !== 'deprecated' && c.mainsnak.datavalue)
      .map(c => ({ qid: c.mainsnak.datavalue.value.id, start: time(c.qualifiers?.P580), end: time(c.qualifiers?.P582), preferred: c.rank === 'preferred' }));
    memberships.set(t, ms);
  }
  await sleep(300);
}

// Party labels and articles.
const partyIds = [...new Set([...memberships.values()].flat().map(m => m.qid))];
const parties = new Map();
for (const batch of chunks(partyIds, 50)) {
  const ents = await wb({ ids: batch.join('|'), props: 'labels|sitelinks', languages: 'en', sitefilter: 'enwiki' });
  for (const [id, e] of Object.entries(ents)) {
    const title = e.sitelinks?.enwiki?.title;
    parties.set(id, { name: e.labels?.en?.value || title || id, url: title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` : `https://www.wikidata.org/wiki/${id}` });
  }
  await sleep(300);
}
console.log(`${partyIds.length} parties`);

// Memberships overlapping the tenure; undated memberships count only when nothing dated overlaps.
let tagged = 0;
for (const p of people) {
  const t = titleOf(p.url);
  const ms = memberships.get(t) || memberships.get(t.charAt(0).toUpperCase() + t.slice(1)) || [];
  const s = p.start || '0000', e = p.end || '9999';
  const dated = ms.filter(m => (m.start || m.end) && (!m.start || m.start <= e) && (!m.end || m.end >= s));
  const pick = (dated.length ? dated : ms.filter(m => !m.start && !m.end)).sort((a, b) => b.preferred - a.preferred).slice(0, 4);
  delete p.parties;
  // s/e let the page show the membership that applies in the selected year.
  if (pick.length) { p.parties = pick.filter(m => parties.has(m.qid)).map(m => ({ ...parties.get(m.qid), s: m.start, e: m.end })); tagged++; }
}
data.sources = { ...data.sources, parties: 'Wikidata "member of political party" (P102), matched to time in office' };
writeFileSync(FILE, JSON.stringify(data));
console.log(`${tagged} of ${people.length} people tagged with a party`);
