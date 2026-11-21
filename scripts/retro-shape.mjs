// The shape of data/countries.json from 20 November 2026 ('retro-countries/2'), shared by build-borders.mjs (which
// rewrites the border parts of the file) and build-data.mjs (which writes the whole file), so both write the same.
//
// - countries is keyed by each state's first Wikidata item (countries.mjs), and each record carries qid and qids.
// - oldKeys maps the Gleditsch and Ward numbers this site used until then (#c=2) to those keys, for old addresses only.
// - statehood (since 21 November 2026): the state's spells of statehood from Wikidata, [{ start, end }], each start
//   and end null (before 1926, or still a state) or { date, precision, item, property, rank } (build-statehood.mjs).
// - spans: the stretches of time a state is covered, one for each spell of its statehood (spansOf, build-statehood.mjs),
//   from its first day (or 1 January 1926) to its last (or null). Until 21 November they came from the leader list.
// - border events come from Cliopatria's rows, by the year (precision: 'year'); statehood events from Wikidata
//   (type 'statehood', precision 'day', 'month' or 'year', kind, src 'wikidata', item, property).
// - built is the day the leaders and events were last built (build-data.mjs); bordersBuilt the day the borders were
//   (build-borders.mjs); bordersTo the last year the borders file holds (2025 and 2026 are drawn on it).
import { COUNTRIES, OLD_KEYS } from './countries.mjs';

export const FORMAT = 'retro-countries/2';
// The order of a state's events: by day, and on one day a statehood event, then the leader who takes power, then the
// vote, then Cliopatria's border (equal ones keep their order). Every script that sorts the events uses it, so that
// leader-corrections.mjs, run again on its own, leaves the file as the build wrote it (until 21 November 2026 a
// leader and an election on one day, Dominica's 21 July 1980, could change places).
const EVENT_RANK = { statehood: 0, leader: 1, coup: 1, election: 2, referendum: 2, border: 3 };
export const byDay = (a, b) => a.date.localeCompare(b.date) || (EVENT_RANK[a.type] ?? 4) - (EVENT_RANK[b.type] ?? 4);
// Each source line names the source, its terms and where they are written (read on 20 November 2026; Archigos's page
// read again on 21 November 2026). The numbered lines keep their numbers and meaning for the main site's readers;
// statehood and leaders (21 November 2026) say which source gives which part.
export const SOURCES = {
  0: 'Cliopatria v0.2.1 (Seshat Global History Databank), CC BY 4.0: https://github.com/Seshat-Global-History-Databank/cliopatria/blob/v0.2.1/LICENSE.md',
  1: 'Archigos 4.1 (Goemans, Gleditsch and Chiozza), whose page states no licence and asks users to “cite this article as their reference for the data” (Journal of Peace Research 46(2), 2009); kept until VM’s owner decides, for which leader is counted and how each took and left office, which no free source records: https://www.rochester.edu/college/faculty/hgoemans/data.htm',
  2: 'Wikidata (CC0)',
  3: 'Wikipedia',
  statehood: 'Wikidata (CC0): each state’s inception (P571), dissolution (P576) and “instance of sovereign state” (P31, P580) statements, and those of the items it replaced and that replaced it (P1365, P1366); the picks that are not the single preferred value are listed in scripts/build-statehood.mjs',
  leaders: 'Names and dates: Wikidata (CC0), the person’s “position held” (P39) statement, where its dates agree with Archigos 4.1 within 31 days (source "Wikidata", with the item, named by the title of the English Wikipedia article the item links to, and Archigos’s own dates and earlier name kept in archigos); otherwise Archigos 4.1 (source "Archigos"). Which leader is counted, and entry, exit and exitHow: Archigos 4.1, to 2015. After 2015: Wikidata (CC0). The eleven hand-built lists (source "leader-lists"): scripts/leader-lists.mjs, which names its sources'
};

// Until 21 November 2026 a state was covered from its first leader to its last (coverSpans, with gaps of up to two
// years not a break), so a state was "covered" before it existed (Ukraine from Archigos's first leader, July 1990).
// Its spans are now its statehood's (build-statehood.mjs), and where it exists but VM holds no leader the page says so.
const covered = (spans, y) => spans.some(([s, e]) => s <= `${y}-12-31` && (!e || e >= `${y}-01-01`));

// A border change is a year whose rows for the state hold an area that differs from the year before by more than
// CHANGE (Cliopatria's own Area field, km²). Smaller differences between two rows are left out: Cliopatria redraws a
// state's coast or a neighbour's edge by a few km² from one row to the next where nothing changed. Some larger ones
// are redrawings too (Luxembourg's rows differ by 2–6% in 1930, 1932, 1936 and 1958), so the event says what the data
// shows, that Cliopatria's border differs from the year before's, not that the border was moved.
export const CHANGE = 0.01;
/** Border events from the borders file's rows ({ c, cf, ct, f, t, a }), by state key, for 1926 to `last`. */
/** A name's possessive: "Germany’s", but "United States’" for a name ending in s (MP-11 fixer, 20 November 2026). */
export const possessive = n => (/s$/.test(n) ? `${n}’` : `${n}’s`);

export function borderEvents(rows, countries, name, first, last) {
  const out = {};
  const area = (k, y) => rows.filter(r => keyIn(r, y) === k).reduce((s, r) => s + r.a, 0);
  for (const [k, c] of Object.entries(countries)) {
    for (let y = first + 1; y <= last; y++) {
      if (!covered(c.spans || [], y)) continue;
      const before = area(k, y - 1), now = area(k, y);
      if (!before || !now || Math.abs(now - before) / before <= CHANGE) continue;
      (out[k] ||= []).push({ date: `${y}-01-01`, precision: 'year', type: 'border', text: `${possessive(name(k, `${y}-01-01`))} border in Cliopatria differs from ${y - 1}’s`, src: 'cliopatria' });
    }
  }
  return out;
}
/** The state a row stands for in a year, or null: its `c`, in the years `cf` to `ct` where they are given. */
export const keyIn = (r, y) => (r.f <= y && y <= r.t && r.c && (r.cf == null || y >= r.cf) && (r.ct == null || y <= r.ct) ? r.c : null);

/** A record of the old shape (keyed by Gleditsch and Ward number) under its Wikidata key; other keys stay as they are. */
export function rekey(countries) {
  const out = {};
  for (const [k, c] of Object.entries(countries)) {
    const key = OLD_KEYS[k] || k;
    if (!COUNTRIES[key]) throw new Error(`retro-shape: ${k} is not a covered state`);
    out[key] = c;
  }
  return out;
}

/** The whole file, in the order its fields have been written. */
export function document({ built, bordersBuilt, firstYear, lastYear, bordersTo, parties, countries }) {
  const sources = { ...SOURCES, ...(parties ? { parties } : {}) };
  const ordered = {};
  for (const key of Object.keys(COUNTRIES)) {
    const c = countries[key];
    if (!c) throw new Error(`retro-shape: ${key} is missing`);
    const { name, iso3, yearPage, yearPages, spans, leaders, offices, events, ...rest } = c;
    delete rest.qid; delete rest.qids;
    ordered[key] = { name, iso3, qid: key, qids: COUNTRIES[key].qids, yearPage, yearPages, spans, leaders, offices, events, ...rest };
  }
  return { format: FORMAT, built, bordersBuilt, firstYear, lastYear, bordersTo, sources, oldKeys: { ...OLD_KEYS }, countries: ordered };
}
