#!/usr/bin/env node
/**
 * Leaders' names and dates from Wikidata (CC0), for the leaders Archigos 4.1 gives (21 November 2026, at VM's
 * owner's word of 17 November: "use only free data if possible"). Archigos stays the source of which leader is a
 * state's effective leader and of how each took and left office (entry, exit, exitHow), which no free source records.
 * For each Archigos leader with an English Wikipedia article, this takes the person's Wikidata item, English label,
 * and the dates of the person's "position held" (P39) in an office Wikidata names as that state's head of state or
 * head of government. If both ends agree with Archigos's within 31 days, the leader takes Wikidata's name and dates
 * (source "Wikidata", with the item; Archigos's own dates are kept beside them in `archigos`, its end empty where
 * Archigos's record was still open on its last day, 31 December 2015: there only the start is Archigos's to compare,
 * and the end is checked against the one build-data.mjs took from Wikidata's office holders). Otherwise the leader
 * keeps Archigos's, and is a gap: the reason is printed, and written to the report with --report.
 *
 * Usage: node scripts/wikidata-leaders.mjs [--report <folder>]   (or LEADERS_REPORT=<folder>, for npm run build-data;
 *        the report is leaders-compare.tsv, every Archigos leader with its verdict) (patches data/countries.json; network:
 *        en.wikipedia.org and www.wikidata.org and query.wikidata.org, at least 2 s between requests, the build's
 *        User-Agent; a 429 is waited out once for its Retry-After, and a second one stops the build, writing nothing)
 * npm run build-data runs it last, after resolve-leaders.mjs (which finds more leaders' articles) and build-parties.mjs.
 *
 * Inputs: data/countries.json; countries.mjs (each state's Wikidata items); leader-lists.mjs (the eleven hand-built
 * lists, left as they are) and leader-corrections.mjs (the leaders its `edit` finds by their start date, left as they
 * are, except that one whose edit gives only the person may take Wikidata's dates when its start stays the same; so
 * `node scripts/leader-corrections.mjs` still applies to the file this writes).
 * Steps; it writes nothing until every step has worked:
 *  1. The Archigos leaders (source "Archigos") of every state but the eleven, and each one's Wikipedia title (its url).
 *  2. Wikipedia: each title's Wikidata item (pageprops, after redirects), 50 titles a request.
 *  3. Wikidata: each state's offices of head of state (P1906) and head of government (P1313), for every item of its
 *     chain, and the offices that are a direct subclass (P279) of one of them, with their English labels (one query).
 *     An office's label is kept only if it reads as an office: it holds a title (President, Prime Minister, Chancellor,
 *     King, Chairman…) or the state's name. Otherwise (fixer, 21 November 2026: President of Cyprus, Q841760, had
 *     the English label "Padre y esposo Coughlan") the office's English Wikipedia title, or else its label for all
 *     languages ("mul"), is used if that reads as an office (one more request, for those offices only), or none.
 *  4. Wikidata: each person's English label and label for all languages ("mul") and P39 statements, 50 people a
 *     request.
 *  5. For each leader, the person's P39 statements in the state's offices (not deprecated, with a start), joined where
 *     one begins within a day of the last one's end (a re-elected president's terms), across the offices or within one
 *     office; the run nearest Archigos's dates, and of two as near, the one in fewer offices (fixer, D5: Ulmanis's
 *     premiership alone ends 2 days from Archigos's, joined with his presidency 29). It is taken when its start and its
 *     end are each within 31 days of Archigos's (both open, or both closed), each given to the day, the start is on the
 *     same side of 1926 (the page shows no event before it), the list stays in order, no gap or overlap over a day with
 *     the leader before or after opens that was not there (a break already over 31 days long, such as Latvia's from
 *     1940 to 1990, may change by a few days), and no leader takes power before the one before leaves
 *     where Archigos's dates had no overlap (fixer, R4: Egon Krenz on 17 October 1989, the day before Honecker left).
 *     Each pair of neighbours is checked with the dates both would have; where a pair fails, the proposal further from
 *     Archigos's dates is dropped first.
 *  6. Each leader taken: qid, position and positionItem (the office it held at the run's end; positions [{ item, label,
 *     start, end }] where the run joins terms in more than one office), source "Wikidata", start and end (precision
 *     "day"), archigos { start, end, full } (Archigos's own dates; full is the name the page gave before, the title of
 *     the English Wikipedia article the leader links to, as Archigos itself gives only the short name kept in `name`).
 *     The full name shown is the title of that article, brackets dropped, which is also the item's English Wikipedia
 *     link: the English label is compared with it, accents, brackets and case set aside, and where the two differ
 *     (fixer, D1: Q336034's label "Adolph Bowler" for Ādolfs Bļodnieks, Q184351's "Isaac Shamir", Q296718's "Lázaro
 *     Cárdenas segundo") the title stands and the label is reported as doubtful. Where they differ only in accents the
 *     title's spelling stands, so a person keeps one spelling in a list. The arrival event moves to the new start.
 *     Another term of the same person in the list (same article), not itself taken, takes the same name and short
 *     name, and so does its arrival (Bulgaria's "Boyko Borissov" after 2015 becomes "Boyko Borisov").
 *     Then writes data/countries.json, every other field as it was.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { COUNTRIES } from './countries.mjs';
import { LISTS } from './leader-lists.mjs';
import { CORRECTIONS } from './leader-corrections.mjs';
import { byDay } from './retro-shape.mjs';

const UA = 'JDP-I H&P Retrospective data build (https://jdpi.pages.dev)';
const WINDOW = 31;
const FIRST = '1926-01-01';
// Archigos 4.1's last day. A leader in office on it has no end in Archigos: the end the list holds by now is the one
// build-data.mjs (extendLeaders) took from Wikidata's office holders, so it is not kept as Archigos's (second review, X1).
const ARCHIGOS_LAST = '2015-12-31';
const GAP_MS = 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const day = d => Date.parse(`${d}T00:00:00Z`) / 864e5;

/* ------------------------------------------------------------------ polite requests */
let last = 0;
async function get(url, init = {}) {
  for (let tries = 0; ; tries++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers || {}) } });
    if (res.status === 429) {
      if (tries) throw new Error(`wikidata-leaders: a second 429 from ${new URL(url).hostname}: stopped there, nothing written`);
      await sleep(1000 * (Number(res.headers.get('retry-after')) || 60));
      continue;
    }
    if (res.status >= 500 && tries < 2) { await sleep(10000 * (tries + 1)); continue; }
    if (!res.ok) throw new Error(`wikidata-leaders: ${res.status} from ${new URL(url).hostname}`);
    return res.json();
  }
}
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

/* ------------------------------------------------------------------ step 2: Wikipedia titles to items */
export const titleOf = url => (/en\.wikipedia\.org\/wiki\//.test(url || '') ? decodeURIComponent(url.split('/wiki/')[1].split('#')[0]).replace(/_/g, ' ') : null);
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

/* ------------------------------------------------------------------ step 3: each state's offices */
async function stateOffices() {
  const qids = [...new Set(Object.values(COUNTRIES).flatMap(c => c.qids))];
  const query = `SELECT ?state ?office ?officeLabel ?sub ?subLabel WHERE {
    VALUES ?state { ${qids.map(q => `wd:${q}`).join(' ')} }
    ?state wdt:P1906|wdt:P1313 ?office .
    OPTIONAL { ?sub wdt:P279 ?office . }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
  }`;
  const r = await get('https://query.wikidata.org/sparql', {
    method: 'POST', headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query })
  });
  const id = u => u.split('/').pop();
  const byItem = new Map(), label = new Map();
  for (const b of r.results.bindings) {
    const s = id(b.state.value), set = byItem.get(s) || new Set();
    set.add(id(b.office.value)); label.set(id(b.office.value), b.officeLabel?.value);
    if (b.sub) { set.add(id(b.sub.value)); label.set(id(b.sub.value), b.subLabel?.value); }
    byItem.set(s, set);
  }
  const offices = {};
  for (const [key, c] of Object.entries(COUNTRIES)) offices[key] = new Set(c.qids.flatMap(q => [...(byItem.get(q) || [])]));
  // Each office's label, checked (step 3): the states whose offices it is, for the state's name.
  const states = new Map();
  for (const [key, set] of Object.entries(offices)) for (const o of set) states.set(o, [...(states.get(o) || []), COUNTRIES[key].name]);
  const odd = [...label.keys()].filter(o => !readsAsOffice(label.get(o), states.get(o)));
  const other = new Map();
  for (const batch of chunks(odd, 50)) {
    const r = await get('https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', format: 'json', ids: batch.join('|'), props: 'labels|sitelinks', languages: 'en|mul', sitefilter: 'enwiki' }));
    for (const e of Object.values(r.entities || {})) other.set(e.id, { title: e.sitelinks?.enwiki?.title || null, mul: e.labels?.mul?.value || null });
  }
  const checked = new Map(), doubtful = [];
  for (const [o, en] of label) {
    if (!odd.includes(o)) { checked.set(o, en); continue; }
    const { title = null, mul = null } = other.get(o) || {};
    const use = [title, mul].find(x => readsAsOffice(x, states.get(o))) || null;
    checked.set(o, use);
    doubtful.push({ office: o, en, use, why: `the English label “${en}” does not read as an office of ${andList(states.get(o) || [])}; ${use ? `its ${use === title ? 'English Wikipedia title' : 'label for all languages'} “${use}” is used` : 'no other name of it reads as one, so none is stored'}` });
  }
  return { offices, label: checked, doubtful };
}
// Whether an office's name reads as one: a title of head of state or government, or the name of a state it serves.
const TITLE = /\b(president|prime minister|premier|chancellor|taoiseach|king|queen|monarch|emperor|chairman|chairperson|chair|head of|leader|minister|regent|prince|princess|captain|governor|secretary|sultan|emir|shah|ruler|syndic)\b/i;
const andList = l => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} and ${l.at(-1)}`);
export const readsAsOffice = (name, states = []) => !!name && (TITLE.test(name) || states.some(s => s.split(' / ').some(n => name.includes(n))));

/* ------------------------------------------------------------------ step 4: people */
const timeOf = q => {
  const v = q?.[0]?.datavalue?.value;
  if (!v) return null;
  const m = /^\+(\d{4})-(\d\d)-(\d\d)/.exec(v.time);
  return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, precision: { 11: 'day', 10: 'month', 9: 'year' }[v.precision] || 'coarser' } : null;
};
async function people(ids) {
  const out = new Map();
  for (const batch of chunks([...new Set(ids)], 50)) {
    const r = await get('https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', format: 'json', ids: batch.join('|'), props: 'labels|claims', languages: 'en|mul' }));
    for (const [asked, e] of Object.entries(r.entities || {})) {
      if (e.missing !== undefined) continue;
      const p = {
        // The English label, else the default label for all languages ("mul"), which Wikidata gives many people in
        // place of an English one (Jacques Chirac, Gordon Brown).
        id: e.id, label: e.labels?.en?.value || e.labels?.mul?.value || null, en: e.labels?.en?.value || null, mul: e.labels?.mul?.value || null,
        held: (e.claims?.P39 || []).filter(s => s.rank !== 'deprecated' && s.mainsnak?.datavalue).map(s => ({
          office: s.mainsnak.datavalue.value.id, start: timeOf(s.qualifiers?.P580), end: timeOf(s.qualifiers?.P582)
        }))
      };
      out.set(asked, p); out.set(e.id, p);
      if (e.redirects?.from) out.set(e.redirects.from, p);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ step 5: the match */
// A person's terms in the given offices, joined where one begins within a day of the last one's end; an open term
// takes in any later one.
function runsOf(person, allowed) {
  const terms = person.held.filter(h => allowed.has(h.office) && h.start).sort((a, b) => a.start.date.localeCompare(b.start.date));
  const runs = [];
  for (const t of terms) {
    const r = runs.at(-1);
    if (r && (!r.end || day(t.start.date) <= day(r.end.date) + 1)) { if (r.end && (!t.end || t.end.date > r.end.date)) r.end = t.end; r.terms.push(t); }
    else runs.push({ start: t.start, end: t.end, terms: [t] });
  }
  for (const r of runs) { r.offices = new Set(r.terms.map(t => t.office)); r.first = r.terms[0].office; r.last = r.terms.at(-1).office; }
  return runs;
}
// The runs across all the state's offices and, where the person held more than one of them, within each one alone, so
// that a term in another office is joined only when that brings the run nearer Archigos's dates (fixer, D5).
function candidates(person, allowed) {
  const held = [...new Set(person.held.map(h => h.office))].filter(o => allowed.has(o));
  return [...runsOf(person, allowed), ...(held.length > 1 ? held.flatMap(o => runsOf(person, new Set([o]))) : [])];
}
const diff = (a, b) => (a && b ? day(a) - day(b) : a || b ? Infinity : 0);
const cost = (run, l) => Math.abs(diff(run.start.date, l.start)) + Math.abs(diff(run.end?.date || null, l.end));
const nearest = l => (x, y) => { const a = cost(x, l), b = cost(y, l); return (a === b ? 0 : a < b ? -1 : 1) || x.offices.size - y.offices.size
  // Two runs equally near and of as many offices: the earlier start, then the office whose item has the lower number
  // (as a rule the office itself and not a later variant of it), so the pick never rests on the order of the person's
  // statements (second review, 21 November 2026). On that day it decided the office named for five leaders whose two
  // offices carry the same dates: Saud, Faisal and Khalid of Saudi Arabia (King, not Prime Minister), Svetozar Marović
  // (President of Serbia and Montenegro) and Masayoshi Ito (Prime Minister of Japan; Wikidata also has him as Acting
  // Prime Minister for the same days).
  || x.start.date.localeCompare(y.start.date) || Number(String(x.first).slice(1)) - Number(String(y.first).slice(1)); };
// A name compared with another, with accents, brackets, punctuation and case set aside.
const plain = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();

/** The proposals and gaps, from the countries and what was fetched; changes nothing. */
export function match(countries, { items, persons, offices, label }) {
  const rows = [], taken = [], gaps = [];
  for (const [key, c] of Object.entries(countries)) {
    if (LISTS[key]) continue;
    // A leader hand-corrected in leader-corrections.mjs is found there by Archigos's start. One whose correction gives
    // only the person (name, full, url) may take Wikidata's dates if its start stays the same (R2: Václav Klaus); any
    // other is left as it is.
    // An edit's key is Archigos's start, or the start and Archigos's name after a bar ("1936-07-19|Giral y Pereyra").
    // A person-only edit that gives `full` keeps that name after the match, so the page names the leader as the edit
    // does and not by the article's title (second reading, 25 November 2026: Bulgaria's Prime Minister of 2001-05 is
    // "Simeon Sakskoburggotski", the name he served under, though his article is "Simeon II").
    const edits = CORRECTIONS[key]?.edit || {};
    const startOf = k => k.split('|')[0];
    const edited = new Set(Object.keys(edits).filter(s => Object.keys(edits[s]).some(f => !['name', 'full', 'url'].includes(f))).map(startOf));
    const personOnly = new Set(Object.keys(edits).map(startOf).filter(s => !edited.has(s)));
    const editFull = l => Object.entries(edits).find(([k, f]) => startOf(k) === l.start && (!k.includes('|') || f.name === l.name))?.[1].full;
    const allowed = offices[key] || new Set();
    const list = c.leaders || [];
    const orig = list.map(l => ({ start: l.start, end: l.end }));
    const proposed = new Map();
    list.forEach((l, i) => {
      if (l.source !== 'Archigos') return;
      const row = { key, state: c.name, i, leader: l.full || l.name, start: l.start, end: l.end };
      const gap = why => { gaps.push({ ...row, why }); rows.push({ ...row, verdict: 'gap', why }); };
      if (edited.has(l.start)) return gap('hand-corrected in leader-corrections.mjs (its edit finds the leader by Archigos’s start), left as it is');
      const title = titleOf(l.url);
      if (!title) return gap('no English Wikipedia article linked, so no Wikidata item');
      const item = items.get(title);
      if (!item) return gap(`the Wikipedia article “${title}” has no Wikidata item`);
      const p = persons.get(item);
      if (!p) return gap(`${item} was not returned by Wikidata`);
      // The name shown: the article's title (brackets dropped); the label is checked against it (step 6, D1).
      const shown = title.replace(/ \(.*\)$/, '');
      const nameWhy = plain(p.label) === plain(shown) ? '' : `the English label “${p.en || '(none)'}”${p.mul && p.mul !== p.en ? ` (for all languages “${p.mul}”)` : ''} differs from the English Wikipedia title “${shown}”, which is shown`;
      Object.assign(row, { item, label: p.label, labelMul: p.mul, shown, nameWhy });
      if (!allowed.size) return gap(`Wikidata names no office of head of state or government (P1906, P1313) for ${c.name}’s items`);
      const runs = candidates(p, allowed);
      if (!runs.length) return gap(`${item} has no position held (P39) with a start date in an office Wikidata names as ${c.name}’s head of state or government`);
      const run = runs.sort(nearest(l))[0];
      const ds = diff(run.start.date, l.start), de = diff(run.end?.date || null, l.end);
      const officeLabel = o => label.get(o) ?? null;
      const positions = run.offices.size > 1 ? run.terms.map(t => ({ item: t.office, label: officeLabel(t.office), start: t.start.date, end: t.end?.date || null })) : null;
      Object.assign(row, { wStart: run.start.date, wEnd: run.end?.date || null, wStartPrecision: run.start.precision, wEndPrecision: run.end?.precision || null, ds, de, office: run.last, officeLabel: officeLabel(run.last) || run.last,
        offices: positions ? positions.map(x => `${x.label || x.item} ${x.start}..${x.end || 'open'}`).join('; ') : '' });
      // Precision first: a date held only to the year or month ("1934-00-00") gives no count of days to compare.
      if (run.start.precision !== 'day' || (run.end && run.end.precision !== 'day')) return gap(`Wikidata gives the ${run.start.precision !== 'day' ? 'start' : 'end'} only to the ${run.start.precision !== 'day' ? run.start.precision : run.end.precision}`);
      if (Math.abs(ds) > WINDOW) return gap(`Wikidata’s start (${run.start.date}) is ${Math.abs(ds)} days from Archigos’s`);
      if (personOnly.has(l.start) && ds !== 0) return gap(`hand-corrected in leader-corrections.mjs (its edit finds the leader by Archigos’s start), and Wikidata’s start (${run.start.date}) differs from it`);
      if (!Number.isFinite(de)) return gap(run.end ? `Archigos has the leader still in office, Wikidata ends the term on ${run.end.date}` : 'Wikidata gives no end for the term');
      if (Math.abs(de) > WINDOW) return gap(`Wikidata’s end (${run.end.date}) is ${Math.abs(de)} days from Archigos’s`);
      if ((l.start < FIRST) !== (run.start.date < FIRST)) return gap('the start would move across 1 January 1926');
      if (!p.label || !/\p{L}/u.test(p.label)) return gap(`${item} has no English label`);
      proposed.set(i, { row, take: { key, l, old: { start: l.start, end: l.end, full: l.full }, now: { start: run.start.date, end: run.end?.date || null }, item, label: (personOnly.has(l.start) && editFull(l)) || shown, office: run.last, officeLabel: officeLabel(run.last), positions }, m: Math.max(Math.abs(ds), Math.abs(de)) });
    });
    // The list stays in order, and no gap or overlap over a day opens between neighbours that was not there: each pair
    // of neighbours is checked with the dates each would have, and where a pair fails, the proposal whose dropping
    // mends it is dropped (the one further from Archigos first), or both; until every pair passes.
    const at = k => (proposed.has(k) ? proposed.get(k).take.now : orig[k]);
    const between = (a, b) => (a.end ? day(b.start) - day(a.end) : null);
    const fault = (a, b, k) => {
      if (a.start > b.start) return 'the list would fall out of order';
      const g1 = between(a, b), g0 = between(orig[k], orig[k + 1]);
      if (g1 == null || g0 == null) return null;
      // A leader who would take power before the one before leaves, where Archigos's dates do not overlap (R4).
      if (g1 < 0 && g0 >= 0) return `an overlap of ${-g1} day${g1 < -1 ? 's' : ''} would open (a leader taking power before the one before leaves) with`;
      // A break already longer than the 31 days a match may move a date (Latvia's fifty years between Ulmanis, 1940,
      // and Godmanis, 1990) is not one that opens: a few days more or less in it are no fault (fixer, D5).
      if (g0 > 31 && g1 > 31) return null;
      return Math.abs(g1) > 1 && Math.abs(g1) > Math.abs(g0) ? `a${g1 > 0 ? ' gap' : 'n overlap'} of ${Math.abs(g1)} days would open with` : null;
    };
    for (let again = true; again;) {
      again = false;
      for (let k = 0; k + 1 < list.length; k++) {
        if (!proposed.has(k) && !proposed.has(k + 1)) continue;
        const why = fault(at(k), at(k + 1), k);
        if (!why) continue;
        const both = [k, k + 1].filter(x => proposed.has(x)).sort((x, y) => proposed.get(y).m - proposed.get(x).m);
        const one = both.find(x => !fault(x === k ? orig[k] : at(k), x === k + 1 ? orig[k + 1] : at(k + 1), k));
        for (const x of one != null ? [one] : both) {
          const other = list[x === k ? k + 1 : k];
          const { row } = proposed.get(x);
          proposed.delete(x);
          const text = / with$/.test(why) ?`${why} ${other.full || other.name}` : why;
          gaps.push({ ...row, why: text }); rows.push({ ...row, verdict: 'gap', why: text });
        }
        again = true;
      }
    }
    for (const { row, take } of [...proposed.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)) {
      // Taken, by the rule; a date that differs by exactly a month to the day is said in the report, as it may be a
      // slip of the month in one of the two sources (Brundtland's start: Archigos 4 February 1981, Wikidata 4 January).
      const slip = (a, b) => a && b && a !== b && a.slice(8) === b.slice(8) && Math.abs(day(a) - day(b)) >= 28;
      const why = slip(take.old.start, take.now.start) || slip(take.old.end, take.now.end) ? 'taken; check: a date differs by exactly a month to the day, which may be a slip of the month in one of the two sources' : '';
      taken.push(take); rows.push({ ...row, verdict: 'Wikidata', why });
    }
  }
  return { rows, taken, gaps };
}

/** Makes the changes match() proposed, with each leader's arrival event. */
export function apply(countries, taken) {
  for (const t of taken) {
    const c = countries[t.key], l = t.l;
    const how = l.entry === 'Irregular' ? ' (irregular seizure of power)' : l.entry === 'Foreign Imposition' ? ' (imposed by a foreign power)' : '';
    for (const e of c.events) {
      if (!['leader', 'coup'].includes(e.type) || e.date !== t.old.start) continue;
      if (e.url !== l.url && !e.text.startsWith(`${t.old.full || l.name} takes power`)) continue;
      e.date = t.now.start; e.text = `${t.label} takes power${how}`;
    }
    Object.assign(l, {
      full: t.label, start: t.now.start, end: t.now.end, startPrecision: 'day', endPrecision: t.now.end ? 'day' : null,
      position: t.officeLabel, positionItem: t.office, ...(t.positions ? { positions: t.positions } : {}), qid: t.item, source: 'Wikidata',
      archigos: { start: t.old.start, end: t.old.end && t.old.end > ARCHIGOS_LAST ? null : t.old.end, full: t.old.full ?? null }
    });
  }
  // One spelling for each person in a list (review D1, fixer): a later term of a person taken here, which the build
  // named by Wikidata's English label (Bulgaria's "Boyko Borissov" after 2015), takes the same name, the article's
  // title, and so does its arrival.
  for (const t of taken) {
    const c = countries[t.key], l = t.l;
    for (const o of c.leaders) {
      if (o === l || o.archigos || !o.url || o.url !== l.url || o.full === t.label) continue;
      for (const e of c.events) if (['leader', 'coup'].includes(e.type) && e.date === o.start && e.text.startsWith(`${o.full || o.name} takes power`)) e.text = `${t.label}${e.text.slice((o.full || o.name).length)}`;
      Object.assign(o, { full: t.label, name: l.name });
    }
  }
  for (const c of Object.values(countries)) c.events.sort(byDay);
  return countries;
}

/** Steps 1 to 4: what match() needs, from the network. */
export async function fetchAll(countries) {
  const archigos = Object.entries(countries).filter(([key]) => !LISTS[key]).flatMap(([, c]) => c.leaders.filter(l => l.source === 'Archigos'));
  const items = await itemsOf(archigos.map(l => titleOf(l.url)).filter(Boolean));
  const { offices, label, doubtful } = await stateOffices();
  const persons = await people([...items.values()]);
  return { items, persons, offices, label, doubtful, count: archigos.length };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const FILE = new URL('../data/countries.json', import.meta.url);
  const data = JSON.parse(readFileSync(FILE, 'utf8'));
  const fetched = await fetchAll(data.countries);
  const { rows, taken, gaps } = match(data.countries, fetched);
  apply(data.countries, taken);
  const at = process.argv.indexOf('--report');
  const dir = at > 0 ? process.argv[at + 1] : process.env.LEADERS_REPORT;
  if (dir) {
    mkdirSync(dir, { recursive: true });
    const cols = ['key', 'state', 'leader', 'label', 'labelMul', 'shown', 'nameWhy', 'item', 'start', 'end', 'wStart', 'wEnd', 'wStartPrecision', 'wEndPrecision', 'ds', 'de', 'officeLabel', 'office', 'offices', 'verdict', 'why'];
    const cell = v => (v == null || v === Infinity ? '' : String(v).replace(/[\t\r\n]/g, ' '));
    writeFileSync(`${dir}/leaders-compare.tsv`, [cols.join('\t'), ...rows.map(r => cols.map(k => cell(r[k])).join('\t'))].join('\n') + '\n');
    // The office labels that did not read as an office (step 3), for the gaps draft.
    writeFileSync(`${dir}/offices-doubtful.tsv`, ['office\tlabel\tused\twhy', ...fetched.doubtful.map(d => [d.office, d.en, d.use, d.why].map(cell).join('\t'))].join('\n') + '\n');
  }
  writeFileSync(FILE, JSON.stringify(data));
  const named = rows.filter(r => r.verdict === 'Wikidata' && r.nameWhy).length;
  console.log(`wikidata-leaders: ${fetched.count} Archigos leaders; ${taken.length} take Wikidata's dates and item (${named} of them with an English label that differs from the article's title, which is shown); ${gaps.length} keep Archigos's (gaps); ${fetched.doubtful.length} office label(s) that do not read as an office`);
}
