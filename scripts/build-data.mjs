#!/usr/bin/env node
/**
 * Builds the H&P Retrospective data files from three open sources:
 *  - CShapes 2.0 (ETH Zürich, CC BY-NC-SA 4.0): dated state borders, 1886–2019
 *  - Archigos 4.1 (Goemans, Gleditsch & Chiozza): effective leaders, 1875–2015
 *  - Wikidata (CC0): heads of state/government after 2015, national elections and
 *    referendums, and links to Wikipedia
 *
 * Usage: node scripts/build-data.mjs   (needs raw/CShapes-2.0.geojson and raw/Archigos_4.1_stata14.dta)
 * Output: data/borders.topo.json, data/countries.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readDta } from './read-dta.mjs';
import { COUNTRIES, YEAR_IN, FIRST_YEAR, LAST_YEAR } from './countries.mjs';
import { displayName } from '../names.mjs';

const ROOT = new URL('..', import.meta.url);
const path = p => new URL(p, ROOT).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(path('data'), { recursive: true });
mkdirSync(path('build'), { recursive: true });

const START = `${FIRST_YEAR}-01-01`;
const OPEN_END = '9999-12-31';
const UA = 'JDP-I H&P Retrospective data build (https://jdpi.pages.dev)';
const pad = n => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ borders */
function buildBorders() {
  const geo = JSON.parse(readFileSync(path('raw/CShapes-2.0.geojson'), 'utf8'));
  const features = geo.features
    .filter(f => f.properties.gweyear >= FIRST_YEAR)
    .map(f => {
      const p = f.properties;
      const start = `${p.gwsyear}-${pad(p.gwsmonth)}-${pad(p.gwsday)}`;
      // CShapes ends in 2019; borders still in place then are treated as current.
      let end = `${p.gweyear}-${pad(p.gwemonth)}-${pad(p.gweday)}`;
      if (end >= '2019-12-30') end = OPEN_END;
      // Archigos keeps Serbia under Yugoslavia's code (345); CShapes gives post-2006 Serbia 340.
      const gw = p.gwcode === 340 ? 345 : p.gwcode;
      return { type: 'Feature', geometry: f.geometry, properties: { gw, name: p.cntry_name, s: start, e: end } };
    });
  writeFileSync(path('build/borders.geojson'), JSON.stringify({ type: 'FeatureCollection', features }));
  // Simplify and convert to TopoJSON with mapshaper (keeps shared borders consistent).
  execFileSync('npx', ['--yes', 'mapshaper@0.7.98', path('build/borders.geojson'),
    '-simplify', 'weighted', '6%', 'keep-shapes',
    '-o', 'format=topojson', 'quantization=100000', 'precision=0.001', path('data/borders.topo.json')],
    { stdio: 'inherit', shell: process.platform === 'win32' });
  console.log(`borders: ${features.length} dated shapes`);
  return features;
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
  const byGw = {};
  for (const r of rows) {
    if (r.ccode === 340) r.ccode = 345; // post-2006 Serbia continues Yugoslavia's record
    if (!COUNTRIES[r.ccode]) continue;
    if (r.enddate < START) continue;
    const title = dbpediaTitle(r.dbpediauri);
    (byGw[r.ccode] ||= []).push({
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
  return byGw;
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

// Heads of state (P35) and government (P6) with dates, for every covered entity.
async function wikidataOffices() {
  const qids = [...new Set(Object.values(COUNTRIES).flatMap(c => c.qids))];
  const rows = await sparql(`
    SELECT ?country ?prop ?person ?personLabel ?start ?end ?article WHERE {
      VALUES ?country { ${qids.map(q => 'wd:' + q).join(' ')} }
      VALUES ?prop { p:P35 p:P6 }
      ?country ?prop ?st .
      ?st ?ps ?person . FILTER(?ps IN (ps:P35, ps:P6))
      OPTIONAL { ?st pq:P580 ?start }
      OPTIONAL { ?st pq:P582 ?end }
      OPTIONAL { ?article schema:about ?person ; schema:isPartOf <https://en.wikipedia.org/> }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
  const qidToGw = {};
  for (const [gw, c] of Object.entries(COUNTRIES)) for (const q of c.qids) (qidToGw[q] ||= []).push(+gw);
  const out = {};
  for (const b of rows) {
    const qid = val(b, 'country').split('/').pop();
    const office = val(b, 'prop').endsWith('P35') ? 'hos' : 'hog';
    const start = day(val(b, 'start'));
    const end = day(val(b, 'end'));
    if (!start || (end && end < START)) continue;
    for (const gw of qidToGw[qid] || []) {
      (out[gw] ||= []).push({
        office, full: val(b, 'personLabel'), url: val(b, 'article'), start, end,
        qid: val(b, 'person').split('/').pop()
      });
    }
  }
  // De-duplicate the same person/office/start reported through several entities.
  for (const gw of Object.keys(out)) {
    const seen = new Set();
    out[gw] = out[gw].filter(x => { const k = `${x.office}|${x.qid}|${x.start}`; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  return out;
}

// After Archigos ends (2015), continue with whichever office Archigos tracked for that country.
function extendLeaders(archigos, offices) {
  const CUTOFF = '2015-12-31';
  for (const gw of Object.keys(COUNTRIES)) {
    const list = archigos[gw] || [];
    const last = list.filter(l => !l.end).at(-1);
    const off = offices[gw] || [];
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
    if (later.length) last.end = later[0].start;
    else if (match?.end && match.end > CUTOFF) last.end = match.end;
    // Archigos often gives surnames only; take full names and links from Wikidata office holders.
    for (const l of list) {
      if (l.full) continue;
      const sn = l.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const hit = off.find(o => o.full && o.full.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(sn)
        && o.start <= (l.end || '9999') && (!o.end || o.end >= l.start));
      if (hit) { l.full = hit.full; l.url = hit.url; }
    }
    for (const [i, o] of later.entries()) {
      list.push({ name: o.full.split(' ').at(-1), full: o.full, url: o.url, start: o.start,
        end: o.end || (later[i + 1]?.start ?? null), entry: null, exit: null, exitHow: null, source: 'Wikidata' });
    }
    archigos[gw] = list;
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
  const qidToGw = {};
  for (const [gw, c] of Object.entries(COUNTRIES)) for (const q of c.qids) (qidToGw[q] ||= []).push(+gw);
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
    for (const gw of qidToGw[qid] || []) {
      const key = `${gw}|${val(b, 'e')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (out[gw] ||= []).push({ date: day(val(b, 'date')), type: /referendum/i.test(label) ? 'referendum' : 'election', text: label, url: val(b, 'article') });
    }
  }
  return out;
}

function borderEvents(features) {
  const out = {};
  const byGw = {};
  for (const f of features) (byGw[f.properties.gw] ||= []).push(f.properties);
  for (const [gw, shapes] of Object.entries(byGw)) {
    if (!COUNTRIES[gw]) continue;
    shapes.sort((a, b) => a.s.localeCompare(b.s));
    shapes.forEach((s, i) => {
      if (s.s >= START) {
        const prev = shapes[i - 1];
        const isNew = !prev || prev.e < s.s.replace(/-\d\d$/, '') + '-00';
        const name = displayName(+gw, s.name, s.s);
        (out[gw] ||= []).push({
          date: s.s, type: isNew && !prev ? 'statehood' : 'border',
          text: !prev ? `${name} becomes an independent state` : `${name}'s borders change`
        });
      }
      if (s.e !== OPEN_END && !shapes[i + 1]) {
        (out[gw] ||= []).push({ date: s.e, type: 'statehood', text: `${displayName(+gw, s.name, s.e)} ceases to exist as an independent state` });
      }
    });
  }
  return out;
}

function leaderEvents(leaders) {
  const out = {};
  for (const [gw, list] of Object.entries(leaders)) {
    for (const l of list) {
      if (l.start < START) continue;
      const who = l.full || l.name;
      const how = l.entry === 'Irregular' ? ' (irregular seizure of power)' : l.entry === 'Foreign Imposition' ? ' (imposed by a foreign power)' : '';
      (out[gw] ||= []).push({ date: l.start, type: l.entry === 'Irregular' ? 'coup' : 'leader', text: `${who} takes power${how}`, url: l.url });
    }
  }
  return out;
}

/* ------------------------------------------------------- "Year in" pages */
async function yearPages() {
  const titles = [];
  for (const [gw, c] of Object.entries(COUNTRIES)) {
    const place = YEAR_IN[gw] || c.name;
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) titles.push({ gw, y, title: `${y} in ${place}` });
  }
  const exists = new Set();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=' +
      encodeURIComponent(batch.map(t => t.title).join('|'));
    const res = await fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.json());
    const ok = new Set(Object.values(res.query.pages).filter(p => !('missing' in p)).map(p => p.title));
    for (const r of res.query.redirects || []) if (ok.has(r.to)) ok.add(r.from);
    for (const t of batch) if (ok.has(t.title)) exists.add(`${t.gw}|${t.y}`);
  }
  const out = {};
  for (const t of titles) if (exists.has(`${t.gw}|${t.y}`)) (out[t.gw] ||= []).push(t.y);
  return out;
}

/* ------------------------------------------------------------------ main */
const features = buildBorders();
const archigos = archigosLeaders();
console.log('querying Wikidata offices…');
const offices = await wikidataOffices();
const leaders = extendLeaders(archigos, offices);
console.log('querying Wikidata elections…');
const elec = await elections();
console.log('checking Wikipedia year pages…');
const years = await yearPages();
const bEvents = borderEvents(features);
const lEvents = leaderEvents(leaders);

// Years each state existed, so elections shared between predecessor and successor items
// (e.g. Weimar vs. modern Germany) land on the right state.
const span = {};
for (const f of features) {
  const s = span[f.properties.gw] ||= { from: f.properties.s, to: f.properties.e };
  if (f.properties.s < s.from) s.from = f.properties.s;
  if (f.properties.e > s.to) s.to = f.properties.e;
}
const within = (gw, d) => !span[gw] || (d >= span[gw].from && d <= span[gw].to);

const countries = {};
for (const [gw, c] of Object.entries(COUNTRIES)) {
  const events = [...(bEvents[gw] || []), ...(lEvents[gw] || []), ...(elec[gw] || []).filter(e => within(gw, e.date))]
    .filter(e => e.date >= START).sort((a, b) => a.date.localeCompare(b.date));
  countries[gw] = {
    name: c.name, iso3: c.iso3,
    yearPage: YEAR_IN[gw] || c.name, yearPages: years[gw] || [],
    leaders: leaders[gw] || [],
    offices: (offices[gw] || []).map(({ qid, ...o }) => o),
    events
  };
}
writeFileSync(path('data/countries.json'), JSON.stringify({
  built: new Date().toISOString().slice(0, 10), firstYear: FIRST_YEAR, lastYear: LAST_YEAR,
  sources: ['CShapes 2.0 (ETH Zürich), CC BY-NC-SA 4.0', 'Archigos 4.1 (Goemans, Gleditsch & Chiozza)', 'Wikidata (CC0)', 'Wikipedia'],
  countries
}));
const n = Object.values(countries);
console.log(`countries: ${n.length}; leaders: ${n.reduce((s, c) => s + c.leaders.length, 0)}; events: ${n.reduce((s, c) => s + c.events.length, 0)}`);
