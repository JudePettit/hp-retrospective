#!/usr/bin/env node
/**
 * Each covered state's statehood, from Wikidata (CC0) alone: when it began (none if it existed throughout 1926), when
 * it ended, the years it was not a state between (the Baltic states 1940–1990/91, Austria 1938–1955), and the dated
 * statehood events from 1926 to today (independence, unification, dissolution, and the end of a state). Nothing here
 * comes from CShapes, Archigos or memory: every date is a Wikidata statement, named with its item, property, rank and
 * precision, and every choice that is not an item's single preferred-rank value is in PICKS below, with the statement
 * it follows and a one-line reason.
 *
 * Usage: node scripts/build-statehood.mjs   (patches data/countries.json; network: query.wikidata.org)
 * build-data.mjs runs the same steps (statehood() and applyStatehood()) before it writes the file, so a full rebuild
 * (npm run build-data) keeps them.
 *
 * Inputs: countries.mjs (each state's Wikidata items, qids), names.mjs (the name a state had on a date), PICKS below,
 * and one Wikidata query (POST, the build's User-Agent).
 * Steps; it writes nothing until every step has worked:
 *  1. Ask Wikidata, for every item of every state's chain and every item PICKS names, for its inception (P571) and
 *     dissolution (P576) statements (rank, time, precision, and the end cause, P1534), and the start time (P580) of
 *     its "instance of: sovereign state" (P31 Q3624078) statements.
 *  2. For each state, its spells of statehood. A state with one item and no entry in PICKS takes its item's single
 *     preferred-rank P571 as its start and its single preferred-rank P576 (if any) as its end; any other state needs
 *     its entry. A start before 1926 is no start (the state existed throughout 1926). Each statement PICKS names must
 *     still be on Wikidata, with the date the table gives, or the build stops and says which.
 *  3. Spells in order, each start before its end; a change of constitution is never an end (PICKS says where an
 *     item's preferred inception is one: Italy 1946, Japan 1947, Ireland 1937, Iceland 1944, Trinidad and Tobago 1976).
 *  4. The statehood events: each spell's start and end from 1926, and the events PICKS adds (Germany's unification,
 *     the end of the Soviet Union, of Yugoslavia and of Serbia and Montenegro, Saudi Arabia's union of 1932).
 *  5. (Run on its own) writes statehood, spans (from the spells: retro-shape.mjs spansOf) and the statehood events into
 *     data/countries.json, every other field as it was.
 */
import { COUNTRIES, FIRST_YEAR } from './countries.mjs';
import { displayName } from '../names.mjs';
import { byDay } from './retro-shape.mjs';

const UA = 'JDP-I H&P Retrospective data build (https://jdpi.pages.dev)';
const START = `${FIRST_YEAR}-01-01`;
const wd = q => `https://www.wikidata.org/wiki/${q}`;

/* ------------------------------------------------------------------ the table of picks */
// S(item, property, date, why): the Wikidata statement a date follows, its date as Wikidata gives it (YYYY-MM-DD, or
// YYYY for a value given only to the year). property P580 is the start time on the item's "instance of: sovereign
// state" statement. ONLY(…) is the same for an item's only (normal-rank) value of the property. NONE(why): no end.
const S = (item, property, date, why, more = {}) => ({ item, property, date, why, ...more });
const ONLY = (item, property, date, more = {}) => S(item, property, date, `the item's only ${property} value (normal rank)`, more);
const NONE = why => ({ none: true, why });
const STILL = NONE('no P576 on the item: the state exists today');
// One spell from `start` to `end`.
const one = (start, end = STILL) => ({ spells: [[start, end]] });
// A change of constitution, a dynasty or a republic is not the state's start: the earlier value says it existed in 1926.
const before = (item, date, why, property = 'P571') => S(item, property, date, why);

export const PICKS = {
  // North America and the Caribbean
  Q16: one(ONLY('Q16', 'P571', '1867-07-01')),
  Q778: one(ONLY('Q778', 'P571', '1973-07-10')),
  Q241: one(ONLY('Q241', 'P571', '1898-12-10')),
  Q790: one(ONLY('Q790', 'P571', '1804-01-01')),
  Q786: one(ONLY('Q786', 'P571', '1844')),
  Q766: one(S('Q2526023', 'P576', '1962-08-06', 'Q766’s own P571 is the year only (1962); the Colony of Jamaica (Q2526023), which Wikidata says Jamaica replaced (P1366), ends on 1962-08-06')),
  Q754: one(S('Q754', 'P571', '1962-08-31', 'the preferred P571, 1976-08-01, is the republic (a change of constitution); 1962-08-31, normal rank, is independence')),
  Q244: one(S('Q244', 'P580', '1966-11-30', 'Q244’s only P571 is 1623 (the colony, year only); its "sovereign state" statement starts on 1966-11-30')),
  Q784: one(ONLY('Q784', 'P571', '1978')),
  Q769: one(ONLY('Q769', 'P571', '1974')),
  Q760: one(S('Q760', 'P571', '1979-02-22', 'of two normal-rank values, 1967-03-01 is qualified "associated state" (autonomy) and 1979-02-22 independence')),
  Q757: one(ONLY('Q757', 'P571', '1979')),
  Q781: one(ONLY('Q781', 'P571', '1981-11-01')),
  Q763: one(S('Q1637975', 'P576', '1983-09-19', 'Q763’s only P571 is 1967-02-27, the associated state; Saint Christopher-Nevis-Anguilla (Q1637975), the dependent territory of 1958–1983, ends on 1983-09-19 (no P1366 links the two items)')),
  Q242: one(ONLY('Q242', 'P571', '1981-09-21')),
  Q774: one(ONLY('Q774', 'P571', '1821')),
  Q783: one(ONLY('Q783', 'P571', '1821')),
  Q792: one(ONLY('Q792', 'P571', '1841-02-02')),
  Q811: one(ONLY('Q811', 'P571', '1821')),
  Q800: one(ONLY('Q800', 'P571', '1821')),
  Q804: one(ONLY('Q804', 'P571', '1903')),
  // Europe
  Q27: one(S('Q31747', 'P571', '1922-12-06', 'Q27’s preferred P571, 1937-12-29, is the constitution: the state is the Irish Free State (Q31747) of 1922-12-06'),
    NONE('Q31747’s P576 (1937-12-29) is the constitution, and Q27 has no P576')),
  Q55: one(S('Q29999', 'P571', '1815-03-16', 'Q55 has two normal-rank values (1795, the Batavian Republic; 1954, the Charter); the Kingdom of the Netherlands (Q29999), preferred, 1815-03-16'),
    NONE('neither Q55 nor Q29999 has a P576')),
  Q31: one(ONLY('Q31', 'P571', '1830-10-04')),
  Q32: one(ONLY('Q32', 'P571', '1815')),
  Q235: one(ONLY('Q235', 'P571', '1297-01-15')),
  Q347: one(ONLY('Q347', 'P571', '1806-07-12')),
  Q29: one(before('Q29', '1516-03-24', 'five normal-rank values: 1931-12-09 (with end 1939) and 1978-12-29 are constitutions; 1516-03-24 says Spain existed in 1926')),
  Q228: one(before('Q228', '1278', 'three normal-rank values: 1993 is the constitution; 1278 (the Paréage) says Andorra existed in 1926')),
  Q45: one(before('Q45', '1179-05-30', 'three preferred values, all before 1926; 1179-05-30 is recognition')),
  Q41304: one(S('Q41304', 'P571', '1918-11-09', 'Weimar Germany’s only P571; Nazi Germany (Q7318) continues the state (Weimar to Nazi is a change of regime)'),
    S('Q7318', 'P576', '1945-05-23', 'Nazi Germany’s only P576, qualified "sovereign state" (P518); Q183, the third item of the chain, is there for elections only')),
  Q713750: { ...one(ONLY('Q713750', 'P571', '1949-05-23'), NONE('Q183 has no P576; Q713750’s P576 (1990-10-03) is the unification, an event below')),
    events: [S('Q713750', 'P576', '1990-10-03', 'West Germany’s only P576: Germany (Q183) replaces East and West Germany on that day (Q183 P1365, P585 1990-10-03)', { kind: 'unification', text: 'East Germany and West Germany are unified as Germany' })] },
  Q16957: one(ONLY('Q16957', 'P571', '1949-10-07'), S('Q16957', 'P576', '1990-10-03', 'two normal-rank values: 1989 (year, qualified de facto) and 1990-10-03 (de jure, end cause German reunification)')),
  Q40: { spells: [
    [before('Q40', '1918-11-12', 'the preferred P571'), S('Q176495', 'P576', '1938-03-13', 'the Federal State of Austria (Q176495) ends with the Anschluss (P1534), replaced by the German Reich')],
    [S('Q596239', 'P576', '1955', 'Allied-occupied Austria (Q596239, an occupied territory from 1945) is replaced by Austria (P1366, through the State Treaty) in 1955, year only'), STILL]] },
  Q28: one(ONLY('Q28', 'P571', '1000')),
  Q33946: one(ONLY('Q33946', 'P571', '1918-10-28'), ONLY('Q33946', 'P576', '1992-12-31', { kind: 'dissolution', text: 'Czechoslovakia is dissolved' })),
  Q38: one(before('Q38', '1861-03-17', 'the preferred P571, 1946-06-18, is the republic (a change of constitution); 1861-03-17, normal rank, is the kingdom')),
  Q238: one(ONLY('Q238', 'P571', '0301-09-04')),
  Q233: one(ONLY('Q233', 'P571', '1964-09-21')),
  Q222: one(ONLY('Q222', 'P571', '1912-11-28')),
  Q236: one(ONLY('Q236', 'P571', '2006-06-03')),
  Q221: one(S('Q221', 'P580', '1991-09-08', 'Q221’s only P571 is 1991, year only; its "sovereign state" statement starts on 1991-09-08, the day the Socialist Republic of Macedonia ends (Q240592 P576)')),
  Q224: one(ONLY('Q224', 'P571', '1991-06-25')),
  Q191077: { ...one(S('Q15102440', 'P571', '1918-12-01', 'the Kingdom of Yugoslavia’s only P571, 1929-10-03, is the renaming of the Kingdom of Serbs, Croats and Slovenes (Q15102440), founded 1918-12-01'),
    NONE('Serbia (Q403), the last item of the chain, has no P576; the items before it end in the one that follows (Yugoslavia, the Federal Republic, Serbia and Montenegro, Serbia)')),
    events: [
      ONLY('Q83286', 'P576', '1992-04-26', { kind: 'dissolution', text: 'The Socialist Federal Republic of Yugoslavia is dissolved' }),
      ONLY('Q37024', 'P576', '2006-06-04', { kind: 'dissolution', text: 'Serbia and Montenegro is dissolved' })] },
  Q225: one(ONLY('Q225', 'P571', '1992-03-06')),
  Q1246: one(ONLY('Q1246', 'P571', '2008-02-17')),
  Q41: one(ONLY('Q41', 'P571', '1821-04-06')),
  Q229: one(ONLY('Q229', 'P571', '1960-08-16')),
  Q219: one(ONLY('Q219', 'P571', '1878-07-13')),
  Q217: one(ONLY('Q217', 'P571', '1991-08-27')),
  Q218: one(ONLY('Q218', 'P571', '1330')),
  Q15180: { ...one(ONLY('Q15180', 'P571', '1922-12-30'), NONE('Russia (Q159), the chain’s second item, has no P576; the Soviet Union’s P576 is an event below')),
    events: [ONLY('Q15180', 'P576', '1991-12-26', { kind: 'dissolution', text: 'The Soviet Union is dissolved' })] },
  Q191: { spells: [
    [ONLY('Q191', 'P571', '1918-02-24'), S('Q130280', 'P571', '1940-07-21', 'Wikidata has no item for interwar Estonia; the Estonian SSR (Q130280), which Estonia replaced (P1366), begins on 1940-07-21')],
    [S('Q130280', 'P576', '1991-08-20', 'the Estonian SSR ends on 1991-08-20, replaced by Estonia'), STILL]] },
  Q211: { spells: [
    [ONLY('Q211', 'P571', '1918-11-18'), S('Q2369784', 'P576', '1940-06-17', 'Interwar Latvia (Q2369784) ends on 1940-06-17, replaced by the Soviet Union')],
    [S('Q192180', 'P576', '1990-05-04', 'the Latvian SSR (Q192180), replaced by Latvia (P1366), ends on 1990-05-04'), STILL]] },
  Q37: { spells: [
    [before('Q37', '1918-02-16', 'normal rank, the Act of Independence'), S('Q8272919', 'P576', '1940-07-21', 'the Republic of Lithuania of 1918–1940 (Q8272919) ends on 1940-07-21')],
    [S('Q37', 'P571', '1990-03-11', 'the preferred P571, the Act of Re-Establishment'), STILL]] },
  Q399: one(ONLY('Q399', 'P571', '1991-09-23')),
  Q227: one(S('Q227', 'P580', '1991-08-30', 'Q227’s only P571 is 1991, year only; its preferred-rank "sovereign state" statement starts on 1991-08-30')),
  Q33: one(ONLY('Q33', 'P571', '1917-12-06')),
  Q34: one(ONLY('Q34', 'P571', '0900')),
  Q20: one(before('Q20', '1905-06-07', 'four normal-rank values, all before 1926; 1905-06-07 ends the union with Sweden')),
  Q35: one(ONLY('Q35', 'P571', '0800')),
  Q189: one(before('Q189', '1918-12-01', 'the preferred P571, 1944-06-17, is the republic (a change of constitution); 1918-12-01, normal rank, is the Kingdom of Iceland')),
  // Asia
  Q43: one(ONLY('Q43', 'P571', '1923-10-29')),
  Q801: one(ONLY('Q801', 'P571', '1948-05-14')),
  Q851: { events: [S('Q1756546', 'P576', '1932-09-23', 'the Kingdom of Nejd and Hejaz (Q1756546) ends on 1932-09-23, replaced by Saudi Arabia (P1366)', { kind: 'unification', text: 'The Kingdom of Nejd and Hejaz becomes the Kingdom of Saudi Arabia' })] },
  Q13426199: one(ONLY('Q13426199', 'P571', '1912-01-01'), NONE('the People’s Republic of China (Q148), the chain’s second item, has no P576 (the Republic of China’s P576, 1949-12-07, is qualified "mainland China": a change of regime)')),
  Q17: one(before('Q17', '1890-11-29', 'the preferred P571, 1947-05-03, is the present constitution; 1890-11-29, normal rank, is the Meiji constitution'))
};

/* ------------------------------------------------------------------ step 1: Wikidata */
async function sparql(query) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query })
    });
    if (res.ok) return (await res.json()).results.bindings;
    // A 429 is waited out once, for as long as it asks; a second one stops the build. A timeout (5xx) is tried twice more.
    if (res.status === 429 && !attempt) { await new Promise(r => setTimeout(r, (+res.headers.get('retry-after') || 60) * 1000)); continue; }
    if (res.status >= 500 && attempt < 2) { await new Promise(r => setTimeout(r, 10000 * (attempt + 1))); continue; }
    throw new Error(`build-statehood: Wikidata ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
const PRECISION = { 11: 'day', 10: 'month', 9: 'year' };
const RANK = { PreferredRank: 'preferred', NormalRank: 'normal', DeprecatedRank: 'deprecated' };
const id = u => u.split('/').pop();
const refs = () => Object.values(PICKS).flatMap(p => [...(p.spells || []).flat(), ...(p.events || [])]).filter(r => r && !r.none);

/** Every P571, P576 and sovereign-state P580 statement of the items: { item: { P571: [{ date, precision, rank, cause }] } }. */
export async function statements() {
  const items = [...new Set([...Object.values(COUNTRIES).flatMap(c => c.qids), ...refs().map(r => r.item)])];
  const values = `VALUES ?item { ${items.map(q => 'wd:' + q).join(' ')} }`;
  const rows = [...await sparql(`
    SELECT ?item ?prop ?st ?rank ?time ?prec ?cause ?causeLabel WHERE {
      ${values}
      VALUES (?prop ?p ?psv) { ("P571" p:P571 psv:P571) ("P576" p:P576 psv:P576) }
      ?item ?p ?st . ?st ?psv ?node ; wikibase:rank ?rank . ?node wikibase:timeValue ?time ; wikibase:timePrecision ?prec .
      OPTIONAL { ?st pq:P1534 ?cause . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`), ...await sparql(`
    SELECT ?item ?prop ?st ?rank ?time ?prec WHERE {
      ${values}
      BIND("P580" AS ?prop)
      ?item p:P31 ?st . ?st ps:P31 wd:Q3624078 ; pqv:P580 ?node ; wikibase:rank ?rank . ?node wikibase:timeValue ?time ; wikibase:timePrecision ?prec .
    }`)];
  const out = {}, seen = new Map();
  for (const b of rows) {
    const item = id(b.item.value), prop = b.prop.value, st = b.st.value;
    const cause = b.causeLabel?.value || null;
    // One record per statement. A statement with two end causes comes back as two rows in no set order, and an event's
    // text names the cause: the first by its label is kept, whichever row arrives first (second review, 21 November 2026).
    if (seen.has(st)) { const kept = seen.get(st); if (cause && (!kept.cause || cause < kept.cause)) kept.cause = cause; continue; }
    const t = b.time.value;
    const record = {
      date: t.startsWith('-') ? '0000-01-01' : t.slice(0, 10), precision: PRECISION[b.prec.value] || 'coarser',
      rank: RANK[id(b.rank.value).replace(/^.*#/, '')] || 'normal', cause
    };
    seen.set(st, record);
    ((out[item] ||= {})[prop] ||= []).push(record);
  }
  return out;
}

/* ------------------------------------------------------------------ steps 2 to 4 */
const matches = (s, date) => (date.length === 4 ? s.date.slice(0, 4) === date.padStart(4, '0') && s.precision !== 'day' && s.precision !== 'month' : s.date === date);
function find(st, r, key) {
  const hit = (st[r.item]?.[r.property] || []).filter(s => s.rank !== 'deprecated' && matches(s, r.date));
  if (hit.length !== 1) throw new Error(`build-statehood: ${key}: PICKS names ${r.item} ${r.property} ${r.date}, which Wikidata ${hit.length ? 'gives more than once' : 'no longer gives'}`);
  if (/only/.test(r.why) && (st[r.item][r.property] || []).filter(s => s.rank !== 'deprecated').length !== 1) throw new Error(`build-statehood: ${key}: ${r.item} ${r.property} is no longer the only value`);
  return hit[0];
}
// The single preferred-rank value, or null when the item has none of the property; anything else needs a pick.
function preferred(st, item, property, key) {
  const all = (st[item]?.[property] || []).filter(s => s.rank !== 'deprecated');
  if (!all.length) return null;
  const pref = all.filter(s => s.rank === 'preferred');
  if (pref.length === 1) return { item, property, date: pref[0].date, why: 'the single preferred-rank value' };
  throw new Error(`build-statehood: ${key} (${COUNTRIES[key].name}): ${item} ${property} has ${all.length} values and ${pref.length} preferred; give its pick in PICKS`);
}
const point = (s, r) => ({ date: s.date, precision: s.precision, item: r.item, property: r.property, rank: s.rank });

/** Each state's { statehood: [{ start, end }], events: [statehood events] }, from the statements (statements()). */
export function statehood(st) {
  const out = {};
  for (const [key, c] of Object.entries(COUNTRIES)) {
    const pick = PICKS[key] || {};
    if (!pick.spells && c.qids.length > 1) throw new Error(`build-statehood: ${key} (${c.name}) has a chain of items; give its spells in PICKS`);
    const spells = pick.spells || [[preferred(st, key, 'P571', key) || (() => { throw new Error(`build-statehood: ${key} has no P571`); })(),
      preferred(st, key, 'P576', key) || STILL]];
    const name = date => displayName(key, c.name, date);
    const list = [], events = [];
    spells.forEach(([s, e], i) => {
      const a = find(st, s, key), b = e.none ? null : find(st, e, key);
      const start = a.date < START ? null : point(a, s), end = b ? point(b, e) : null;
      if (start && end && end.date <= start.date) throw new Error(`build-statehood: ${key}: a spell ends (${end.date}) before it starts (${start.date})`);
      if (list.length && (!start || !list.at(-1).end || start.date <= list.at(-1).end.date)) throw new Error(`build-statehood: ${key}: its spells overlap or are out of order`);
      if (b && b.date < START) throw new Error(`build-statehood: ${key}: a spell ends before ${FIRST_YEAR}`);
      list.push({ start, end });
      if (start) events.push({ ...start, kind: 'independence', text: `${name(start.date)} becomes an independent state${i ? ' again' : ''}` });
      if (end) events.push({ ...end, kind: e.kind || 'end', text: e.text || `${name(end.date)} ceases to be an independent state${b.cause ? ` (${b.cause})` : ''}` });
    });
    for (const r of pick.events || []) {
      const s = find(st, r, key);
      if (s.date >= START) events.push({ ...point(s, r), kind: r.kind, text: r.text });
    }
    out[key] = {
      statehood: list,
      events: events.map(({ date, precision, kind, text, item, property }) => ({ date, type: 'statehood', precision, kind, text, url: wd(item), src: 'wikidata', item, property }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }
  return out;
}

/** The spans a state is covered (retro-shape.mjs's shape): one for each spell, from its start (or 1926) to its end. */
export const spansOf = list => list.map(s => [s.start ? s.start.date : START, s.end ? s.end.date : null]);

/** Writes the statehood into the countries (in place): statehood, spans, and the statehood events among the rest. */
export function applyStatehood(countries, built) {
  for (const [key, c] of Object.entries(countries)) {
    const s = built[key];
    if (!s) throw new Error(`build-statehood: no statehood for ${key}`);
    c.statehood = s.statehood;
    c.spans = spansOf(s.statehood);
    // On its day a statehood event comes before the leader who takes power (retro-shape.mjs byDay).
    c.events = [...s.events, ...(c.events || []).filter(e => e.type !== 'statehood')].sort(byDay);
  }
  return countries;
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const { document } = await import('./retro-shape.mjs');
  const FILE = new URL('../data/countries.json', import.meta.url);
  const data = JSON.parse(readFileSync(FILE, 'utf8'));
  const built = statehood(await statements());
  applyStatehood(data.countries, built);
  writeFileSync(FILE, JSON.stringify(document({ ...data, parties: data.sources?.parties })));
  const n = Object.values(built);
  console.log(`statehood: ${n.length} states, ${n.reduce((s, x) => s + x.statehood.filter(p => p.start).length, 0)} starts from ${FIRST_YEAR}, ${n.reduce((s, x) => s + x.statehood.filter(p => p.end).length, 0)} ends, ${n.reduce((s, x) => s + x.events.length, 0)} events`);
}
