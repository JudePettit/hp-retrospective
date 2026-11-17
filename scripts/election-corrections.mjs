// Election dates that the Wikidata election fetch in build-data.mjs gets wrong or files under the wrong country
// (small corrections, 17 November 2026; found after RT-04 added the microstates on 16-17 November).
// leader-corrections.mjs applies these with the leader corrections, so both `npm run build-data` and
// `node scripts/leader-corrections.mjs` (which patches data/countries.json on its own) keep them. Safe to run again.
//
// Each entry is one election, found by its English Wikipedia article (the link the page shows). It is moved to the
// country `gw` if it was filed elsewhere, its date is set to `date`, and it is added to `gw` if the fetch missed it.
// `wd` is the election's Wikidata item, and `sources` say where the date was read (checked on 17 November 2026).
export const ELECTIONS = [
  {
    gw: 57, wd: 'Q103768254', title: '2025 Vincentian general election', date: '2025-11-27',
    // Wikidata's point in time (P585) is 30 November 2025, referenced to an IPU Parline page retrieved on 3 December
    // 2020, five years before the vote: a forecast of the due date that was never updated. The election was called
    // for and held on Thursday 27 November 2025.
    sources: ['English Wikipedia\'s article (infobox and lead: 27 November 2025, citing the Electoral Office)',
      'St Vincent Times, "St Vincent to hold General Elections on 27th November, 2025" (28 October 2025)']
  },
  {
    gw: 55, wd: 'Q115632342', title: '2026 Grenadian general election', date: '2026-11-05',
    // The election cache in build/ holds Wikidata's earlier date, 30 June 2027 (the latest day the vote was due);
    // Wikidata's point in time (P585) is now 5 November 2026, the day it was held.
    sources: ['Wikidata Q115632342, point in time (P585): 5 November 2026 (no reference given)',
      'English Wikipedia\'s article (infobox and lead: held on 5 November 2026)',
      'Caribbean National Weekly, "Grenada sets Nov. 5 date for general elections" (5 October 2026)',
      'WIC News\'s report of the results ("the November 5 general election")']
  },
  {
    gw: 55, wd: 'Q5607417', title: '1967 Grenadian general election', date: '1967-08-24',
    // Wikidata gives its country (P17) as Spain (Q29), though it applies to Grenada (P1001 Q769), so the fetch filed it
    // under Spain and Grenada's list skipped from 1962 to 1972.
    sources: ['Wikidata Q5607417, point in time (P585): 24 August 1967',
      'English Wikipedia\'s article (24 August 1967, citing Nohlen, Elections in the Americas, 2005, p. 307)']
  },
  {
    gw: 55, wd: 'Q3537542', title: '2003 Grenadian general election', date: '2003-11-27',
    // Wikidata gives two countries (P17), Grenada and Spain, so the fetch showed it under Spain as well.
    sources: ['Wikidata Q3537542, point in time (P585): 27 November 2003 (imported from English Wikipedia)',
      'English Wikipedia\'s article (27 November 2003)']
  }
];

const W = t => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
const isVote = e => e.type === 'election' || e.type === 'referendum';

// Applies the election corrections to { gw: { events } } in place.
export function correctElections(countries) {
  for (const fix of ELECTIONS) {
    const url = W(fix.title);
    const home = countries[fix.gw];
    if (!home) throw new Error(`election-corrections: no country ${fix.gw}`);
    for (const [gw, c] of Object.entries(countries)) {
      if (+gw === fix.gw || !c.events) continue;
      c.events = c.events.filter(e => !(isVote(e) && e.url === url));
    }
    const events = home.events ||= [];
    const found = events.filter(e => isVote(e) && e.url === url);
    if (found.length) for (const e of found) e.date = fix.date;
    else events.push({ date: fix.date, type: /referendum/i.test(fix.title) ? 'referendum' : 'election', text: fix.title, url });
    home.events = events.sort((a, b) => a.date.localeCompare(b.date));
  }
  return countries;
}
