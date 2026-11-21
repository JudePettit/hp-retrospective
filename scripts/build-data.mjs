#!/usr/bin/env node
/**
 * Builds the Political Retrospective's data/countries.json (its second shape, scripts/retro-shape.mjs) from:
 *  - Archigos 4.1 (Goemans, Gleditsch and Chiozza; it states no licence, kept until VM's owner decides): effective
 *    leaders to 2015, and how each took and left office. Its country column (ccode) is a Gleditsch and Ward number,
 *    read through OLD_KEYS (countries.mjs) to the state's Wikidata key.
 *  - Wikidata (CC0): heads of state and government after 2015, national elections and referendums, links to Wikipedia,
 *    and each state's statehood (build-statehood.mjs: when it began, ended or was unified, and its statehood events)
 *  - Wikipedia: which "<year> in <country>" pages exist
 *  - data/borders.topo.json, Cliopatria v0.2.1's rows (CC BY 4.0) as scripts/build-borders.mjs writes them: only for
 *    the border events. Run build-borders.mjs first when the borders change.
 *
 * Usage: node scripts/build-data.mjs   (needs raw/Archigos_4.1_stata14.dta and data/borders.topo.json; network)
 * The order of steps; it writes nothing until every step has worked:
 *  1. Archigos's leaders (from 1926), each under its state's key, each state's list in order of its start (Archigos's
 *     rows for Serbia, 340, come after Yugoslavia's, 345, in its file, and until 21 November 2026 stayed there).
 *  2. Wikidata's office holders, each date with its precision (a year-only statement dropped where the same person's
 *     term in the same office is dated to the day), and the leader lists continued past 2015 with them.
 *  3. Wikidata's elections (cached in build/elections-cache.json), Wikipedia's year pages, and Wikidata's statehood
 *     statements (build-statehood.mjs statements() and statehood(), which check every pick in its PICKS table).
 *  4. Leader events, and the hand corrections to the leader lists (leader-corrections.mjs correctCountry).
 *  5. Each state's statehood, its spans (one for each spell of its statehood) and its statehood events
 *     (build-statehood.mjs applyStatehood; until 21 November 2026 the spans came from the leader list), elections kept
 *     only inside the spans; border events from the borders file's rows (retro-shape.mjs borderEvents); the election
 *     corrections (election-corrections.mjs); then writes data/countries.json.
 * Output: data/countries.json (resolve-leaders.mjs, build-parties.mjs and wikidata-leaders.mjs then patch it; npm run
 * build-data runs all four)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readDta } from './read-dta.mjs';
import { COUNTRIES, OLD_KEYS, YEAR_IN, FIRST_YEAR, LAST_YEAR } from './countries.mjs';
import { displayName } from '../names.mjs';
import { correctCountry } from './leader-corrections.mjs';
import { correctElections } from './election-corrections.mjs';
import { borderEvents, document, byDay } from './retro-shape.mjs';
import { statements, statehood, applyStatehood } from './build-statehood.mjs';

const ROOT = new URL('..', import.meta.url);
const path = p => new URL(p, ROOT).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(path('data'), { recursive: true });
mkdirSync(path('build'), { recursive: true });

const START = `${FIRST_YEAR}-01-01`;
const UA = 'JDP-I H&P Retrospective data build (https://jdpi.pages.dev)';
// The borders file's rows (build-borders.mjs): only their properties are read, for the border events.
function borderRows() {
  const topo = JSON.parse(readFileSync(path('data/borders.topo.json'), 'utf8'));
  const rows = topo.objects?.borders?.geometries?.map(g => g.properties) || [];
  if (!rows.length || !rows.every(r => /^cl-/.test(r.id))) throw new Error('data/borders.topo.json is not build-borders.mjs\'s: run it first');
  return rows;
}

/* ------------------------------------------------------------------ leaders */
function dbpediaTitle(uri) {
  // Archigos wraps DBpedia links in a URL-defense redirect: ..._resource_Tony-5FBlair&d=...
  const m = /dbpedia\.org_resource_([^&]+)/.exec(uri || '');
  if (!m) return null;
  let t = m[1].replace(/-5F/g, '_').replace(/-([0-9A-F]{2})/g, '%$1');
  // Some titles are percent-encoded twice (e.g. Ko%25C5%25A1tunica).
  for (let i = 0; i < 3 && /%[0-9A-F]{2}/i.test(t); i++) { try { t = decodeURIComponent(t); } catch { break; } }
  return t;
}

function archigosLeaders() {
  const { rows } = readDta(path('raw/Archigos_4.1_stata14.dta'));
  const byKey = {};
  for (const r of rows) {
    // Archigos's ccode is a Gleditsch and Ward number; post-2006 Serbia (340) continues Yugoslavia's record (345).
    const key = OLD_KEYS[r.ccode === 340 ? 345 : r.ccode];
    if (!key) continue;
    if (r.enddate < START) continue;
    const title = dbpediaTitle(r.dbpediauri);
    (byKey[key] ||= []).push({
      name: r.leader,
      full: title ? title.replace(/_/g, ' ').replace(/ \(.*\)$/, '') : null,
      url: title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}` : null,
      start: r.startdate,
      end: r.exit === 'Still in Office' ? null : r.enddate,
      entry: r.entry,
      exit: r.exit === 'Still in Office' ? null : r.exit,
      exitHow: r.exitcode && r.exitcode !== r.exit ? r.exitcode : null,
      source: 'Archigos'
    });
  }
  // Each list in order of its start (a stable sort, so leaders who took office together keep Archigos's order).
  for (const list of Object.values(byKey)) list.sort((a, b) => a.start.localeCompare(b.start));
  return byKey;
}

async function sparql(query) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query })
    });
    if (res.ok) return (await res.json()).results.bindings;
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 5000 * (attempt + 1))); continue; }
    throw new Error(`Wikidata ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error('Wikidata query failed after retries');
}

const val = (b, k) => b[k]?.value ?? null;
const day = v => v ? v.slice(0, 10) : null;

// Heads of state (P35) and government (P6) with dates, for every covered entity. Each date keeps its precision
// (fixer, D7, 21 November 2026): a start or end Wikidata gives only to the year or month carries startPrecision or
// endPrecision ('year', 'month'), which the page shows as the year or the month, never as 1 January; a day has none.
const PREC = { 11: 'day', 10: 'month', 9: 'year' };
async function wikidataOffices() {
  const qids = [...new Set(Object.values(COUNTRIES).flatMap(c => c.qids))];
  const rows = await sparql(`
    SELECT ?country ?prop ?person ?personLabel ?start ?startPrec ?end ?endPrec ?article WHERE {
      VALUES ?country { ${qids.map(q => 'wd:' + q).join(' ')} }
      VALUES ?prop { p:P35 p:P6 }
      ?country ?prop ?st .
      ?st ?ps ?person . FILTER(?ps IN (ps:P35, ps:P6))
      OPTIONAL { ?st pqv:P580 [ wikibase:timeValue ?start ; wikibase:timePrecision ?startPrec ] }
      OPTIONAL { ?st pqv:P582 [ wikibase:timeValue ?end ; wikibase:timePrecision ?endPrec ] }
      OPTIONAL { ?article schema:about ?person ; schema:isPartOf <https://en.wikipedia.org/> }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
  const qidToKey = {};
  for (const [key, c] of Object.entries(COUNTRIES)) for (const q of c.qids) (qidToKey[q] ||= []).push(key);
  const out = {};
  const coarse = p => (p && PREC[p] !== 'day' ? PREC[p] || 'year' : null);
  for (const b of rows) {
    const qid = val(b, 'country').split('/').pop();
    const office = val(b, 'prop').endsWith('P35') ? 'hos' : 'hog';
    const start = day(val(b, 'start'));
    const end = day(val(b, 'end'));
    if (!start || (end && end < START)) continue;
    const sp = coarse(val(b, 'startPrec')), ep = end ? coarse(val(b, 'endPrec')) : null;
    for (const key of qidToKey[qid] || []) {
      (out[key] ||= []).push({
        office, full: val(b, 'personLabel'), url: val(b, 'article'), start, end,
        ...(sp ? { startPrecision: sp } : {}), ...(ep ? { endPrecision: ep } : {}),
        qid: val(b, 'person').split('/').pop()
      });
    }
  }
  // De-duplicate the same person/office/start reported through several entities; and where the same person holds the
  // same office from a date given to the day, a statement of theirs that starts in that year but is given only to the
  // year is the same term less precisely dated, and is dropped (D7: Dick Schoof, 2024 on Q29999 and 2 July 2024 on Q55).
  for (const key of Object.keys(out)) {
    const seen = new Set();
    const list = out[key].filter(x => { const k = `${x.office}|${x.qid}|${x.start}`; if (seen.has(k)) return false; seen.add(k); return true; });
    out[key] = list.filter(x => !(x.startPrecision && list.some(y => y !== x && y.office === x.office && y.qid === x.qid && !y.startPrecision && y.start.slice(0, 4) === x.start.slice(0, 4))))
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  return out;
}
// A leader's end taken from the next office holder's start keeps that start's precision.
const endFrom = (l, o) => { l.end = o.start; if (o.startPrecision) l.endPrecision = o.startPrecision; else delete l.endPrecision; };

// After Archigos ends (2015), continue with whichever office Archigos tracked for that country.
function extendLeaders(archigos, offices) {
  const CUTOFF = '2015-12-31';
  for (const key of Object.keys(COUNTRIES)) {
    const list = archigos[key] || [];
    const last = list.filter(l => !l.end).at(-1);
    const off = offices[key] || [];
    if (!last) continue;
    // Which office did Archigos use? Match the 2015 leader's surname against both offices.
    const surname = last.name.toLowerCase().split(/[\s-]+/).at(-1);
    const holder = o => o.start <= CUTOFF && (!o.end || o.end >= CUTOFF);
    const match = off.find(o => holder(o) && o.full?.toLowerCase().includes(surname));
    const office = match?.office || 'hog';
    if (!last.full && match) { last.full = match.full; last.url = match.url; }
    last.end = null;
    const later = off.filter(o => o.office === office && o.start > CUTOFF && o.full)
      .filter(o => !(match && o.qid === match.qid));
    if (later.length) endFrom(last, later[0]);
    else if (match?.end && match.end > CUTOFF) { last.end = match.end; if (match.endPrecision) last.endPrecision = match.endPrecision; }
    // Archigos often gives surnames only; take full names and links from Wikidata office holders.
    for (const l of list) {
      if (l.full) continue;
      const sn = l.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const hit = off.find(o => o.full && o.full.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(sn)
        && o.start <= (l.end || '9999') && (!o.end || o.end >= l.start));
      if (hit) { l.full = hit.full; l.url = hit.url; }
    }
    for (const [i, o] of later.entries()) {
      const next = later[i + 1];
      list.push({ name: o.full.split(' ').at(-1), full: o.full, url: o.url, start: o.start,
        end: o.end || (next?.start ?? null), entry: null, exit: null, exitHow: null, source: 'Wikidata',
        ...(o.startPrecision ? { startPrecision: o.startPrecision } : {}),
        ...(o.end ? (o.endPrecision ? { endPrecision: o.endPrecision } : {}) : next?.startPrecision ? { endPrecision: next.startPrecision } : {}) });
    }
    archigos[key] = list;
  }
  return archigos;
}

/* ------------------------------------------------------------------ events */
async function elections() {
  const qids = [...new Set(Object.values(COUNTRIES).flatMap(c => c.qids))];
  const rows = [];
  // One country per query, starting from a short list of national election types (and their
  // direct subclasses, e.g. "United Kingdom general election") so the planner never scans
  // everything a country is linked to. Results are cached so reruns don't hit Wikidata again.
  const TYPES = 'wd:Q2618461 wd:Q1076105 wd:Q858439 wd:Q1333366 wd:Q43109';
  const cacheFile = path('build/elections-cache.json');
  let cache = {};
  try { cache = JSON.parse(readFileSync(cacheFile, 'utf8')); } catch { /* first run */ }
  const pending = qids.filter(q => !cache[q]);
  await Promise.all([0, 1, 2].map(async worker => {
    for (let i = worker; i < pending.length; i += 3) {
      const qid = pending[i];
      try {
        // Countries with very many elections (US, China) time out with the subclass hop,
        // so they use direct types only, plus the US presidential-election class.
        const heavy = ['Q30', 'Q148'].includes(qid);
        cache[qid] = await sparql(`
          SELECT ?e ?date ?article ?title WHERE {
            VALUES ?${heavy ? 'c' : 't'} { ${TYPES}${heavy ? ' wd:Q47566' : ''} }
            ${heavy ? '' : '?c wdt:P279? ?t .'}
            ?e wdt:P31 ?c ; wdt:P17 wd:${qid} ; wdt:P585 ?date .
            FILTER(?date >= "${FIRST_YEAR}-01-01T00:00:00Z"^^xsd:dateTime)
            ?article schema:about ?e ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
          }`);
        writeFileSync(cacheFile, JSON.stringify(cache));
        console.log(`elections ${qid}: ${cache[qid].length}`);
      } catch (err) { console.warn(`elections ${qid}: ${err.message}`); }
    }
  }));
  for (const qid of qids) for (const b of cache[qid] || []) rows.push({ ...b, country: { value: qid }, eLabel: b.title });
  const qidToKey = {};
  for (const [key, c] of Object.entries(COUNTRIES)) for (const q of c.qids) (qidToKey[q] ||= []).push(key);
  const out = {};
  const seen = new Set();
  for (const b of rows) {
    const label = val(b, 'eLabel');
    // Drop sub-national contests that slipped through (state, regional, municipal, primaries...).
    if (/\b(municipal|local|regional|state|provincial|county|city|mayoral|primary|primaries|by-election|caucus|council|European Parliament|Senate election in|gubernatorial|cantonal|Landtag|Northern Ireland|Scottish|Welsh|Senedd|Police and Crime|London Assembly|Assembly of|leadership)\b/i.test(label)) continue;
    // Overseas territories, dependencies and "election in <place>" sub-contests.
    if (/\b(election|referendum) in\b|Montserrat|Wallis|Futuna|Gibraltar|Bermud|Cayman|Falkland|Jersey|Guernsey|Isle of Man|Manx|Polynesia|Caledonia|Faroe|Greenland|Puerto Ric|Guam|Virgin Islands|Saint Pierre|Mayotte|R[ée]union|Aruba|Cura[cç]ao|Sint Maarten|[ÅA]land|Azores|Madeira|Canary|Northern Mariana|American Samoa|Turks and Caicos|Anguilla|Saint Helena|Martinique|Guadeloupe|French Guiana|Saint Barth|Saint Martin|Bonaire|Svalbard|Hong Kong|Macau|Tibet|Xinjiang|Crimea|Abkhaz|South Osseti|Transnistria|Nagorno|Artsakh|Northern Cyprus|Kurdist|Catalan|Basque|Galician|Andalusian|Bavarian|Saxon|Corsica|Sardinia|Sicil|South Tyrol|Aosta|Friuli|Trentino|Flemish|Walloon|Brussels|Quebec|Ontario|Alberta|British Columbia|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland|Prince Edward|Yukon|Nunavut|Northwest Territories/i.test(label)) continue;
    const qid = val(b, 'country').split('/').pop();
    // US state contests (ballot measures, state legislatures) carry the US as country too.
    if (qid === 'Q30' && !/United States|presidential/i.test(label)) continue;
    for (const key of qidToKey[qid] || []) {
      const id = `${key}|${val(b, 'e')}`;
      if (seen.has(id)) continue;
      seen.add(id);
      (out[key] ||= []).push({ date: day(val(b, 'date')), type: /referendum/i.test(label) ? 'referendum' : 'election', text: label, url: val(b, 'article') });
    }
  }
  return out;
}

function leaderEvents(leaders) {
  const out = {};
  for (const [key, list] of Object.entries(leaders)) {
    for (const l of list) {
      if (l.start < START) continue;
      const who = l.full || l.name;
      const how = l.entry === 'Irregular' ? ' (irregular seizure of power)' : l.entry === 'Foreign Imposition' ? ' (imposed by a foreign power)' : '';
      // A start Wikidata gives only to the year (Robert Abela, 2020) is an event of that year, shown as the year (D7).
      (out[key] ||= []).push({ date: l.start, type: l.entry === 'Irregular' ? 'coup' : 'leader', text: `${who} takes power${how}`, url: l.url, ...(l.startPrecision && l.startPrecision !== 'day' ? { precision: l.startPrecision } : {}) });
    }
  }
  return out;
}

/* ------------------------------------------------------- "Year in" pages */
async function yearPages() {
  const titles = [];
  for (const [key, c] of Object.entries(COUNTRIES)) {
    const place = YEAR_IN[key] || c.name;
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) titles.push({ key, y, title: `${y} in ${place}` });
  }
  const exists = new Set();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=' +
      encodeURIComponent(batch.map(t => t.title).join('|'));
    const res = await fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.json());
    const ok = new Set(Object.values(res.query.pages).filter(p => !('missing' in p)).map(p => p.title));
    for (const r of res.query.redirects || []) if (ok.has(r.to)) ok.add(r.from);
    for (const t of batch) if (ok.has(t.title)) exists.add(`${t.key}|${t.y}`);
  }
  const out = {};
  for (const t of titles) if (exists.has(`${t.key}|${t.y}`)) (out[t.key] ||= []).push(t.y);
  return out;
}

/* ------------------------------------------------------------------ main */
const rows = borderRows();
const archigos = archigosLeaders();
console.log('querying Wikidata offices…');
const offices = await wikidataOffices();
const leaders = extendLeaders(archigos, offices);
// An Archigos leader with no article of its own keeps the one the file being replaced gave it (the same state, start
// and Archigos name; its `archigos` start and name where wikidata-leaders.mjs has since given it Wikidata's), so
// resolve-leaders.mjs searches only for the leaders never found. Its search results change from run to run: on
// 21 November 2026 a rebuild without this turned Siim Kallas (2002) into Kaja Kallas and Petar Stambolić (1982) into
// Ivan Stambolić; the file it replaced named the Prime Minister and the President of the Presidency of those dates.
let before = {};
try { before = JSON.parse(readFileSync(path('data/countries.json'), 'utf8')); } catch { /* first run */ }
for (const [key, list] of Object.entries(leaders)) {
  const prev = before.countries?.[key]?.leaders || [];
  for (const l of list) {
    if (l.url || l.source !== 'Archigos') continue;
    const p = prev.find(x => x.url && x.name === l.name && (x.archigos?.start || x.start) === l.start);
    if (p) { l.url = p.url; l.full = (p.archigos ? p.archigos.full : p.full) || p.full; }
  }
}
console.log('querying Wikidata elections…');
const elec = await elections();
console.log('checking Wikipedia year pages…');
const years = await yearPages();
console.log('querying Wikidata statehood…');
const states = statehood(await statements());
const lEvents = leaderEvents(leaders);

// Lists the sources above leave short of the present, completed by hand (leader-corrections.mjs); then each state's
// statehood and spans (from Wikidata, not from the leader list), and its elections only inside its spans, so elections
// shared between predecessor and successor items (Weimar and modern Germany) land on the right state.
const countries = {};
for (const [key, c] of Object.entries(COUNTRIES)) {
  countries[key] = {
    name: c.name, iso3: c.iso3,
    yearPage: YEAR_IN[key] || c.name, yearPages: years[key] || [],
    leaders: leaders[key] || [],
    offices: (offices[key] || []).map(({ qid, ...o }) => o),
    events: (lEvents[key] || []).filter(e => e.date >= START)
  };
}
for (const [key, c] of Object.entries(countries)) correctCountry(key, c);
applyStatehood(countries, states);
for (const [key, c] of Object.entries(countries)) {
  const within = d => c.spans.some(([s, e]) => d >= s && (!e || d <= e));
  c.events = [...c.events, ...(elec[key] || []).filter(e => e.date >= START && within(e.date))];
}
const bordersTo = Math.max(...rows.map(r => r.t));
const bEvents = borderEvents(rows, countries, (k, d) => displayName(k, countries[k].name, d), FIRST_YEAR, bordersTo);
for (const [key, c] of Object.entries(countries)) c.events = [...c.events, ...(bEvents[key] || [])].sort(byDay);
// The election corrections last, once every election is in (applyCorrections does both steps the same way).
correctElections(countries);
writeFileSync(path('data/countries.json'), JSON.stringify(document({
  built: new Date().toISOString().slice(0, 10), bordersBuilt: before.bordersBuilt || null, firstYear: FIRST_YEAR, lastYear: LAST_YEAR, bordersTo, countries
})));
const n = Object.values(countries);
console.log(`countries: ${n.length}; leaders: ${n.reduce((s, c) => s + c.leaders.length, 0)}; events: ${n.reduce((s, c) => s + c.events.length, 0)}`);
