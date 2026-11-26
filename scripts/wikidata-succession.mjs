#!/usr/bin/env node
/**
 * Succession inside a family (25 November 2026, the owner's "Build the top three", rank 2 of VM-VISUALISATION-STUDY.md:
 * heads of state and government as lanes). Between two holders of one office in one state, where Wikidata (CC0) records
 * that the later holder is the son, daughter, brother, sister, spouse or other relative of the earlier one, the lanes
 * label the change ("son of the previous holder"). This writes those links, and only those, to data/succession.json.
 *
 * Usage: node scripts/wikidata-succession.mjs [--report <folder>]   (npm run build-succession; run it after
 *        npm run build-data, as it reads data/countries.json and changes nothing in it)
 * Network: en.wikipedia.org (each person's item, from the English Wikipedia article the data links, where the data
 * holds no item) and query.wikidata.org (the family statements between those people, and, for a holder who stands
 * between two relatives, whether that holder was a regent or an acting holder). At least 2 s between requests, the
 * build's User-Agent (no personal detail); a 429 is waited out once for its Retry-After and a second one stops the run,
 * writing nothing.
 *
 * Who is asked about: only the people data/countries.json holds as a state's leader (`leaders`) or head of state or
 * government (`offices`). The query is limited at both ends to those people, so no wider family tree and no private
 * person is ever read: Wikidata answers only for statements that join two of them.
 *
 * Steps; it writes nothing until every step has worked:
 *  1. The lanes. Each state's holders of the office of head of state ("state") and of head of government
 *     ("government"): every `offices` entry by its own office ('hos', 'hog'), and every leader by the office it held:
 *     (a) the office of an `offices` entry for the same person (item or article) whose dates overlap the leader's;
 *     else (b) the leader's `position` (Wikidata's label of the office: "Prime Minister of …" is government,
 *     "President of …", "King of …" state); else (c) the one office whose holders in the data are other people while
 *     the leader holds power (Monaco's Prince, while the Ministers of State are the only `offices`); else (d) the
 *     office every other leader of the state was given by (a) to (c), if they all share one (Liechtenstein's Alois,
 *     deputy for the Prince since 2004). A leader none of these places is in no lane, and counted in the report.
 *     A leader whose record holds more than one office (`positions`: Ilham Aliyev, Prime Minister of Azerbaijan from
 *     4 August 2003, President from 31 October) is one tenure per office, each in that office's lane, as the page
 *     draws it (lanes.js).
 *  2. Each person's Wikidata item: the item the data gives (`qid`), else the item of the English Wikipedia article
 *     it links (Wikipedia's page properties, after redirects, 50 titles a request).
 *  3. One query to Wikidata's query service (in batches of 200 subjects): every statement of father (P22), mother
 *     (P25), sibling (P3373), spouse (P26), child (P40) or relative (P1038, with its "kinship to subject" qualifier,
 *     P1039) whose subject and value are both among the people of step 2, not deprecated, with each one's sex or
 *     gender (P21) where the link needs it.
 *  4. The successions: in each lane, sorted by start, the holder who follows a tenure is the next other person to
 *     start, on or after the day 31 days before it ends; where everyone who starts then is a regent or an acting holder
 *     (their `position` says so, or a "position held", P39, of theirs is an office whose English label says "regent",
 *     "acting", "interim" or "provisional": one more small query, for those people only), the holder after them is
 *     taken too ("next but one").
 *     A succession is not one where the earlier holder still holds an office term of the same lane more than 31 days
 *     after the later holder starts: the later holder then acted for the earlier one (Liechtenstein: Hans-Adam II as
 *     his father's deputy from 1984, while Franz Joseph II reigned until 1989; Alois for Hans-Adam II since 2004).
 *  5. A link for each succession whose two people Wikidata joins, saying what the later holder is to the earlier one.
 *     A link found both ways (the earlier's "child" and the later's "father") is kept once, marked `bothWays`. Where
 *     two properties give different words, the first of this order stands: father, mother or child; sibling; spouse;
 *     relative; and the report lists the pair.
 *
 * data/succession.json: { generated, source, query, people: { <item>: <English Wikipedia article> }, links: [ {
 *   country, office ('state' | 'government'), from, to (Wikidata items of the earlier and the later holder), relation
 *   (what the later is to the earlier), property (the Wikidata property it was read from), bothWays, fromName, toName,
 *   fromUrl, toUrl (the names and articles as data/countries.json gives them, which the page matches its bars by),
 *   fromStart, toStart (the starts of the two tenures), and `between` (the regent's or acting holder's item) for a
 *   next-but-one link, with its article (`betweenUrl`) and name (`betweenName`) } ] }, sorted by country, office,
 *   toStart.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const UA = 'JDP-I H&P Retrospective data build (https://jdpi.pages.dev)';
const GAP_MS = 2000;
const WINDOW = 31;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const day = d => Date.parse(`${d}T00:00:00Z`) / 864e5;
const id = u => String(u).split('/').pop();

/* ------------------------------------------------------------------ polite requests */
let last = 0;
async function get(url, init = {}) {
  for (let tries = 0; ; tries++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers || {}) } });
    if (res.status === 429) {
      if (tries) throw new Error(`wikidata-succession: a second 429 from ${new URL(url).hostname}: stopped there, nothing written`);
      await sleep(1000 * (Number(res.headers.get('retry-after')) || 60));
      continue;
    }
    if (res.status >= 500 && tries < 2) { await sleep(10000 * (tries + 1)); continue; }
    if (!res.ok) throw new Error(`wikidata-succession: ${res.status} from ${new URL(url).hostname}`);
    return res.json();
  }
}
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
const sparql = query => get('https://query.wikidata.org/sparql', {
  method: 'POST', headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ query })
}).then(r => r.results.bindings);

/* ------------------------------------------------------------------ step 1: the lanes */
export const titleOf = url => (/en\.wikipedia\.org\/wiki\//.test(url || '') ? decodeURIComponent(url.split('/wiki/')[1].split('#')[0]).replace(/_/g, ' ') : null);
const overlaps = (a, b) => a.start <= (b.end || '9999') && (a.end || '9999') >= b.start;
const same = (a, b) => (a.qid && b.qid ? a.qid === b.qid : !!a.url && a.url === b.url);
const GOVERNMENT = /prime minister|premier|chancellor|head of government|taoiseach|minister of state|syndic|president of the (council|government)|chairman of the council of ministers/i;
const STATE = /president|king|queen|emperor|empress|monarch|prince|princess|sultan|emir|grand duke|grand duchess|regent|captain|head of state|chairman of the (presidium|presidency|state council)/i;
const OFFICE = { hos: 'state', hog: 'government' };
export const ACTING = /\b(regent|regency|acting|interim|provisional)\b/i;
// A state whose leaders none of the rules places: San Marino, whose list (leader-lists.mjs) holds only its Captains
// Regent and no `offices`; Wikidata names "Captain Regent of San Marino" (Q258045) as its office of head of state
// (P1906, read on 25 November 2026).
const FIXED = { Q238: 'state' };

/** Each leader's lane or lanes (step 1), as a list of 'state' / 'government' (empty: none found). */
export function leaderOffices(c) {
  const offices = c.offices || [];
  const by = c.leaders.map(l => {
    const a = [...new Set(offices.filter(o => same(o, l) && overlaps(o, l)).map(o => OFFICE[o.office]))];
    if (a.length) return a;
    if (l.position) { if (GOVERNMENT.test(l.position)) return ['government']; if (STATE.test(l.position)) return ['state']; }
    const others = ['state', 'government'].filter(lane => offices.some(o => OFFICE[o.office] === lane && !same(o, l) && overlaps(o, l)));
    if (others.length === 1) return [others[0] === 'state' ? 'government' : 'state'];
    return null;
  });
  // (a') A leader none of (a) to (c) places takes the office of another record of the same person in the state's
  // list that they do place (Somoza García's second term in Archigos, 1947, beside his first, matched to Wikidata).
  by.forEach((x, i) => {
    if (x) return;
    const twin = c.leaders.map((l, j) => ({ l, j })).filter(({ l, j }) => by[j] && same(l, c.leaders[i]))
      .sort((p, q) => Math.abs(day(p.l.start) - day(c.leaders[i].start)) - Math.abs(day(q.l.start) - day(c.leaders[i].start)))[0];
    if (twin) by[i] = [...by[twin.j]];
  });
  const known = new Set(by.filter(Boolean).map(x => [...x].sort().join('+')));
  const shared = known.size === 1 ? [...known][0].split('+') : FIXED[c.qid] ? [FIXED[c.qid]] : [];
  return by.map(x => x || shared);
}

/** The two lanes of a state: { state: [tenure], government: [tenure] }, each tenure { full, url, qid, start, end, position }. */
export function lanesOf(c) {
  const lanes = { state: [], government: [] };
  const add = (lane, x, kind) => lanes[lane].push({ full: x.full || x.name, url: x.url || null, qid: x.qid || null, start: x.start, end: x.end || null, position: x.position || null, kind, source: kind === 'office' ? 'offices' : x.source });
  for (const o of c.offices || []) if (OFFICE[o.office] && o.start) add(OFFICE[o.office], o, 'office');
  leaderOffices(c).forEach((lanesOfLeader, i) => {
    const l = c.leaders[i];
    if (!l.start) return;
    // One tenure per office where the record holds more than one (lanes.js draws them so): each in its office's lane.
    if (l.positions?.length > 1) {
      for (const p of l.positions) {
        const lane = GOVERNMENT.test(p.label || '') ? 'government' : STATE.test(p.label || '') ? 'state' : lanesOfLeader[0];
        if (lane && p.start) add(lane, { ...l, start: p.start, end: p.end || null, position: p.label || null }, 'leader');
      }
      return;
    }
    for (const lane of lanesOfLeader) add(lane, l, 'leader');
  });
  for (const list of Object.values(lanes)) list.sort((a, b) => a.start.localeCompare(b.start) || (a.full || '').localeCompare(b.full || ''));
  return lanes;
}

/* ------------------------------------------------------------------ step 4: who follows whom */
/** The holders who follow tenure i in a lane: the next other person(s) to start, on or after 31 days before i ends. */
export function nextOf(lane, i, key = t => t.qid || t.url || t.full) {
  const a = lane[i];
  if (!a.end) return [];
  // A record whose start and end are each within 31 days of this one's is the same term under another name, not a
  // succession (Norway, 1998: the list's "Erik Lahnstein" beside Anne Enger's term as acting Prime Minister).
  const twin = b => b.end && day(b.start) < day(a.end) - 1 && Math.abs(day(b.start) - day(a.start)) <= WINDOW && Math.abs(day(b.end) - day(a.end)) <= WINDOW;
  const later = lane.filter(b => key(b) !== key(a) && b.start > a.start && day(b.start) >= day(a.end) - WINDOW && !twin(b));
  if (!later.length) return [];
  const first = later.reduce((m, b) => (b.start < m ? b.start : m), later[0].start);
  return later.filter(b => b.start === first);
}

/** The successions of a lane: [{ from, to, between }], from and to tenures; `between` the regent or acting holder. */
export function successions(lane, isActing, key = t => t.qid || t.url || t.full) {
  const out = [];
  lane.forEach((a, i) => {
    const next = nextOf(lane, i, key);
    for (const b of next) out.push({ from: a, to: b, between: null });
    if (next.length && next.every(b => isActing(b))) {
      for (const r of next) {
        const after = nextOf(lane, lane.indexOf(r), key).filter(b => key(b) !== key(a));
        for (const b of after) out.push({ from: a, to: b, between: r });
      }
    }
  });
  return out;
}

/** Whether the earlier holder still holds an office term of the lane more than 31 days after the later one starts. */
export function stillHolds(lane, from, to, key = t => t.qid || t.url || t.full) {
  return lane.some(o => o.kind === 'office' && key(o) === key(from) && o.start <= to.start && (!o.end || day(o.end) > day(to.start) + WINDOW));
}

/* ------------------------------------------------------------------ step 5: the words */
export const RELATIONS = ['son', 'daughter', 'brother', 'sister', 'father', 'mother', 'spouse', 'grandson', 'granddaughter', 'nephew', 'niece', 'other relative'];
const MALE = new Set(['Q6581097', 'Q2449503', 'Q44148']), FEMALE = new Set(['Q6581072', 'Q1052281', 'Q43445']);
const bySex = (sex, m, f) => (MALE.has(sex) ? m : FEMALE.has(sex) ? f : 'other relative');
const RANK = { P22: 0, P25: 0, P40: 0, P3373: 1, P26: 2, P1038: 3 };
/**
 * What the later holder (`to`) is to the earlier (`from`), from one statement: subject `a`, property `prop`, value `b`,
 * `kin` the English label of its "kinship to subject" (what b is to a), `toSex` the later holder's P21 item.
 */
export function relationOf({ a, prop, b, kin }, from, to, toSex) {
  const toIsSubject = a === to && b === from;
  if (!toIsSubject && !(a === from && b === to)) return null;
  const child = () => bySex(toSex, 'son', 'daughter');
  if (prop === 'P22' || prop === 'P25') return toIsSubject ? child() : prop === 'P22' ? 'father' : 'mother';
  if (prop === 'P40') return toIsSubject ? bySex(toSex, 'father', 'mother') : child();
  if (prop === 'P3373') return bySex(toSex, 'brother', 'sister');
  if (prop === 'P26') return 'spouse';
  if (prop !== 'P1038') return null;
  const k = String(kin || '').trim().toLowerCase().replace(/^(paternal|maternal) /, '');
  if (!toIsSubject) {
    // The statement is the earlier holder's: kin says what the later one is to them.
    if (/^grand(son|daughter)$/.test(k)) return k;
    if (k === 'grandchild') return bySex(toSex, 'grandson', 'granddaughter');
    if (/^(nephew|niece|son|daughter|brother|sister|father|mother)$/.test(k)) return k;
    if (/^(husband|wife|spouse)$/.test(k)) return 'spouse';
    return 'other relative';
  }
  // The statement is the later holder's: kin says what the earlier one is to them, so it is turned round.
  if (/^grand(father|mother|parent)$/.test(k)) return bySex(toSex, 'grandson', 'granddaughter');
  if (/^(uncle|aunt)$/.test(k)) return bySex(toSex, 'nephew', 'niece');
  if (/^(father|mother|parent)$/.test(k)) return bySex(toSex, 'son', 'daughter');
  if (/^(son|daughter|child)$/.test(k)) return bySex(toSex, 'father', 'mother');
  if (/^(brother|sister|sibling)$/.test(k)) return bySex(toSex, 'brother', 'sister');
  if (/^(husband|wife|spouse)$/.test(k)) return 'spouse';
  return 'other relative';
}
// The inverse statement that confirms one the other way round.
const INVERSE = { P22: ['P40'], P25: ['P40'], P40: ['P22', 'P25'], P3373: ['P3373'], P26: ['P26'], P1038: ['P1038'] };

/** The links of one succession, from the statements joining its two people; null where there are none. */
export function linkOf(statements, from, to, toSex) {
  const found = statements.filter(s => (s.a === from && s.b === to) || (s.a === to && s.b === from))
    .map(s => ({ s, relation: relationOf(s, from, to, toSex) })).filter(x => x.relation)
    .sort((x, y) => RANK[x.s.prop] - RANK[y.s.prop] || (x.s.a === to ? -1 : 1) - (y.s.a === to ? -1 : 1) || x.s.prop.localeCompare(y.s.prop));
  if (!found.length) return null;
  const [best] = found;
  const bothWays = found.some(x => x !== best && x.s.a !== best.s.a && INVERSE[best.s.prop].includes(x.s.prop));
  const conflict = [...new Set(found.map(x => x.relation))].length > 1 ? found.map(x => `${x.s.prop}${x.s.kin ? ` (${x.s.kin})` : ''} on ${x.s.a}: ${x.relation}`) : null;
  return { relation: best.relation, property: best.s.prop, bothWays, conflict };
}

/* ------------------------------------------------------------------ steps 2, 3 and 4 (network) */
async function itemsOf(titles) {
  const out = new Map();
  for (const batch of chunks([...new Set(titles)], 50)) {
    const r = await get('https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', redirects: '1', prop: 'pageprops', ppprop: 'wikibase_item', titles: batch.join('|') }));
    const q = r.query || {};
    const step = (list, t) => (list || []).find(x => x.from === t)?.to || t;
    const pages = new Map(Object.values(q.pages || {}).map(p => [p.title, p]));
    for (const t of batch) {
      const page = pages.get(step(q.redirects, step(q.normalized, t)));
      if (page?.pageprops?.wikibase_item) out.set(t, page.pageprops.wikibase_item);
    }
  }
  return out;
}

export const BATCH = 200;
const FAMILY = ['P22', 'P25', 'P3373', 'P26', 'P40', 'P1038'];
export const FAMILY_QUERY = `SELECT ?a ?prop ?b ?kin WHERE {
  hint:Query hint:optimizer "None" .
  VALUES ?a { <${BATCH} of the people a query> }
  ${FAMILY.map(p => `{ ?a p:${p} ?st . ?st ps:${p} ?b . BIND("${p}" AS ?prop) }`).join(' UNION\n  ')}
  VALUES ?b { <all the people> }
  ?st wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
  OPTIONAL { ?st pq:P1039 ?kin . }
}`;
async function family(people) {
  const all = people.map(q => `wd:${q}`).join(' ');
  const rows = [];
  for (const batch of chunks(people, BATCH)) {
    rows.push(...await sparql(FAMILY_QUERY.replace(`<${BATCH} of the people a query>`, batch.map(q => `wd:${q}`).join(' ')).replace('<all the people>', all)));
  }
  const statements = [], seen = new Set();
  for (const r of rows) {
    const s = { a: id(r.a.value), prop: r.prop.value, b: id(r.b.value), kin: r.kin ? id(r.kin.value) : null };
    const k = `${s.a}|${s.prop}|${s.b}|${s.kin}`;
    if (!seen.has(k)) { seen.add(k); statements.push(s); }
  }
  // The English labels of the kinships (P1039) and the sex or gender (P21) of the people those statements join.
  const joinedPeople = [...new Set(statements.flatMap(s => [s.a, s.b]))].sort();
  const kins = [...new Set(statements.map(s => s.kin).filter(Boolean))].sort();
  const sex = new Map(), kinLabel = new Map();
  for (const batch of chunks(joinedPeople, BATCH)) {
    for (const r of await sparql(`SELECT ?p ?sex WHERE { VALUES ?p { ${batch.map(q => `wd:${q}`).join(' ')} } ?p wdt:P21 ?sex . }`)) sex.set(id(r.p.value), id(r.sex.value));
  }
  if (kins.length) {
    for (const r of await sparql(`SELECT ?k ?label WHERE { VALUES ?k { ${kins.map(q => `wd:${q}`).join(' ')} } ?k rdfs:label ?label . FILTER(LANG(?label) = "en") }`)) kinLabel.set(id(r.k.value), r.label.value);
  }
  for (const s of statements) if (s.kin) { s.kinItem = s.kin; s.kin = kinLabel.get(s.kin) || null; }
  return { statements, sex };
}
// Whether each of these people held, by Wikidata's "position held" (P39), an office whose English label says regent,
// acting, interim or provisional (step 4); asked only for those who stand between two relatives.
async function actingOffices(people) {
  if (!people.length) return new Map();
  const rows = await sparql(`SELECT ?p ?officeLabel WHERE {
    VALUES ?p { ${people.map(q => `wd:${q}`).join(' ')} }
    ?p p:P39 ?st . ?st ps:P39 ?office ; wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`);
  const out = new Map();
  for (const r of rows) if (ACTING.test(r.officeLabel?.value || '')) (out.get(id(r.p.value)) || out.set(id(r.p.value), []).get(id(r.p.value))).push(r.officeLabel.value);
  return out;
}

/** The whole build, from the countries; returns { doc, report }. */
export async function build(countries) {
  // Step 1.
  const lanes = {}, unplaced = [];
  for (const [key, c] of Object.entries(countries)) {
    lanes[key] = lanesOf(c);
    leaderOffices(c).forEach((x, i) => { if (!x.length) unplaced.push(`${c.name}: ${c.leaders[i].full || c.leaders[i].name} (${c.leaders[i].start})`); });
  }
  // Step 2.
  const tenures = Object.values(lanes).flatMap(l => [...l.state, ...l.government]);
  const titles = tenures.filter(t => !t.qid).map(t => titleOf(t.url)).filter(Boolean);
  const items = await itemsOf(titles);
  for (const t of tenures) if (!t.qid) t.qid = items.get(titleOf(t.url)) || null;
  const people = [...new Set(tenures.map(t => t.qid).filter(Boolean))].sort();
  // Step 3.
  const { statements, sex } = await family(people);
  const joined = new Set(statements.flatMap(s => [`${s.a}|${s.b}`, `${s.b}|${s.a}`]));
  // Step 4: the next-but-one successions need to know who was a regent or acting holder, asked only for those
  // standing between two people Wikidata joins.
  const key = t => t.qid || t.url || t.full;
  const between = new Set();
  for (const l of Object.values(lanes)) for (const lane of [l.state, l.government]) {
    lane.forEach((a, i) => { for (const r of nextOf(lane, i, key)) for (const b of nextOf(lane, lane.indexOf(r), key)) if (a.qid && b.qid && r.qid && joined.has(`${a.qid}|${b.qid}`)) between.add(r.qid); });
  }
  const acting = await actingOffices([...between].sort());
  const isActing = t => ACTING.test(t.position || '') || (t.qid && acting.has(t.qid));
  // Step 5.
  const links = new Map(), conflicts = [];
  const people_ = {};
  for (const [key_, l] of Object.entries(lanes)) for (const office of ['state', 'government']) {
    for (const s of successions(l[office], isActing, key)) {
      const { from, to } = s;
      if (!from.qid || !to.qid || from.qid === to.qid || !joined.has(`${from.qid}|${to.qid}`)) continue;
      if (stillHolds(l[office], from, to, key)) continue;
      const k = `${key_}|${office}|${from.qid}|${to.qid}`;
      // One link a pair: a direct succession before a next-but-one, then the records the lanes draw (not Archigos's).
      const archigos = x => [x.fromSource, x.toSource].filter(v => v === 'Archigos').length;
      const old = links.get(k);
      if (old && ((!old.between && s.between) || (!old.between === !s.between && archigos(old) <= archigos({ fromSource: from.source, toSource: to.source })))) continue;
      const found = linkOf(statements, from.qid, to.qid, sex.get(to.qid));
      if (!found) continue;
      if (found.conflict) conflicts.push(`${countries[key_].name}, ${office}: ${from.full} (${from.qid}) to ${to.full} (${to.qid}): ${found.conflict.join('; ')}`);
      people_[from.qid] = from.url; people_[to.qid] = to.url;
      links.set(k, {
        country: key_, office, from: from.qid, to: to.qid, relation: found.relation, property: found.property, bothWays: found.bothWays,
        fromName: from.full, toName: to.full, fromUrl: from.url, toUrl: to.url, fromStart: from.start, toStart: to.start, fromSource: from.source, toSource: to.source,
        ...(s.between ? { between: s.between.qid, betweenUrl: s.between.url, betweenName: s.between.full } : {})
      });
    }
  }
  const list = [...links.values()].sort((x, y) => x.country.localeCompare(y.country) || x.office.localeCompare(y.office) || x.toStart.localeCompare(y.toStart) || x.from.localeCompare(y.from));
  const doc = {
    generated: new Date().toISOString().slice(0, 10),
    source: 'Wikidata (CC0)',
    query: 'For the people data/countries.json holds as a state\'s leader or head of state or government (their Wikidata items, '
      + `from the data or from the English Wikipedia articles it links), one query to Wikidata's query service, in batches of ${BATCH} `
      + 'subjects: every statement of father (P22), mother (P25), sibling (P3373), spouse (P26), child (P40) or relative (P1038, with '
      + 'its "kinship to subject" qualifier P1039) whose subject and value are both among those people, not deprecated, with their sex '
      + 'or gender (P21); and, for a holder who stands between two relatives in a lane, their "position held" (P39) offices, to see '
      + 'whether they were a regent or an acting holder. A link is kept where the later holder followed the earlier one in the '
      + 'same office of the same state (the next holder, or the next but one past a regent or an acting holder). SPARQL: '
      + FAMILY_QUERY.replace(/\s+/g, ' '),
    people: Object.fromEntries(Object.entries(people_).sort()),
    links: list
  };
  return { doc, report: { people: people.length, statements: statements.length, unplaced, conflicts, acting: Object.fromEntries(acting), unresolved: tenures.filter(t => !t.qid).length } };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const { doc, report } = await build(data.countries);
  writeFileSync(new URL('../data/succession.json', import.meta.url), JSON.stringify(doc, null, 1) + '\n');
  const at = process.argv.indexOf('--report');
  const dir = at > 0 ? process.argv[at + 1] : null;
  if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/succession-report.json`, JSON.stringify(report, null, 1)); }
  const count = f => Object.entries(doc.links.reduce((m, l) => ((m[f(l)] = (m[f(l)] || 0) + 1), m), {})).map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`wikidata-succession: ${report.people} people, ${report.statements} family statements between them; ${doc.links.length} links (${count(l => l.relation)}); ${report.unplaced.length} leader(s) in no lane; ${report.unresolved} tenure(s) with no Wikidata item; ${report.conflicts.length} pair(s) whose properties give different words`);
}
