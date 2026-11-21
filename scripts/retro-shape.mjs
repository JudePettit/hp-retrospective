// The shape of data/countries.json from 20 November 2026 ('retro-countries/2'), shared by build-borders.mjs (which
// rewrites the border parts of the file) and build-data.mjs (which writes the whole file), so both write the same.
//
// - countries is keyed by each state's first Wikidata item (countries.mjs), and each record carries qid and qids.
// - oldKeys maps the Gleditsch and Ward numbers this site used until then (#c=2) to those keys, for old addresses only.
// - spans: the stretches of time a state is covered, from its own leader list (VM's rule, below).
// - border events come from Cliopatria's rows, by the year (precision: 'year'); there are no statehood events.
// - built is the day the leaders and events were last built (build-data.mjs); bordersBuilt the day the borders were
//   (build-borders.mjs); bordersTo the last year the borders file holds (2025 and 2026 are drawn on it).
import { COUNTRIES, OLD_KEYS } from './countries.mjs';

export const FORMAT = 'retro-countries/2';
// Each source line names the source, its terms and where they are written (read on 20 November 2026).
export const SOURCES = {
  0: 'Cliopatria v0.2.1 (Seshat Global History Databank), CC BY 4.0: https://github.com/Seshat-Global-History-Databank/cliopatria/blob/v0.2.1/LICENSE.md',
  1: 'Archigos 4.1 (Goemans, Gleditsch and Chiozza), which states no licence; kept until VM’s owner decides: https://www.rochester.edu/college/faculty/hgoemans/data.htm',
  2: 'Wikidata (CC0)',
  3: 'Wikipedia'
};

const day = d => Date.parse(`${d}T00:00:00Z`) / 864e5;
const iso = n => new Date(n * 864e5).toISOString().slice(0, 10);
// VM's rule: a state is covered from its first leader's first day to its last leader's last (or today), and a gap
// between two leaders of up to two years (GAP_DAYS) is not a break. The longer gaps in these lists are the years a
// state was occupied or annexed and its leader sources record nobody (the Netherlands 1940–45, the Baltic states
// 1940–90); the shorter ones are where a list has nobody for a while (China between August 1945 and December 1946,
// Bulgaria's caretaker months of 2021), and the state was still there.
export const GAP_DAYS = 730;
/** The stretches a state is covered: [[start, end or null], …], from its leader list. */
export function coverSpans(leaders, gap = GAP_DAYS) {
  const s = (leaders || []).filter(l => l.start).map(l => [day(l.start), l.end ? day(l.end) : Infinity]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [a, b] of s) { const l = out.at(-1); if (l && a <= l[1] + gap) l[1] = Math.max(l[1], b); else out.push([a, b]); }
  return out.map(([a, b]) => [iso(a), b === Infinity ? null : iso(b)]);
}
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
