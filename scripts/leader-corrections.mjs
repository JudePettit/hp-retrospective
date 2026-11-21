// Leader lists that the automatic build leaves short of the present (correction RT-02, 15 November 2026).
//   node scripts/leader-corrections.mjs      patches data/countries.json in place (safe to run again)
// build-data.mjs applies the same corrections before it writes countries.json, so a rebuild keeps them.
//
// Why the lists stop: Archigos 4.1 ends on 31 December 2015, and build-data continues a country with Wikidata only
// when its Archigos record is still open on that day. A leader who left office earlier in 2015 (Guatemala, Moldova,
// Poland) or 2014 (Romania) ends the list; so does a Wikidata office whose later holders are missing or badly dated
// (Israel, Slovakia, Greece, Jamaica), and Switzerland, whose rotating presidency has no Wikidata P35/P6 statements.
// Saudi Arabia's Archigos record copies its predecessor's "Natural Death" exit onto the data's last day.
//
// Each country keeps the office Archigos tracked (README, Known limits). Every entry below was checked on
// 15 November 2026 against two sources: Wikidata "position held" (P39) start and end qualifiers, and the infobox of
// the person's English Wikipedia article (for Switzerland, Wikipedia's "List of presidents of the Swiss
// Confederation"); for Moldova in 2026 also the government's own notice (gov.md) and news reports of the
// 22 July oath. Dates are the day the person took or left office, as both sources give it.
//
// Shape: `from`, the earliest start date the correction rewrites: generated entries starting on or after it are
// replaced by `leaders` (a generated entry starting after the last one given is newer and is kept). `edit` changes
// fields of an earlier entry, found by its start date. `offices`, where given, replaces the state's "Also in office"
// entries (RT-04's states, whose Wikidata head-of-state and head-of-government statements were incomplete or wrong).
//
// RT-04 (16 November 2026): the eleven states Archigos does not cover at all (Montenegro and ten microstates) take
// their whole lists from leader-lists.mjs.
//
// Election dates the Wikidata fetch gets wrong or files under the wrong country are corrected here too, from
// election-corrections.mjs (17 November 2026), so both ways of applying the corrections keep them.
import { LISTS } from './leader-lists.mjs';
import { ELECTIONS, correctElections } from './election-corrections.mjs';
import { byDay } from './retro-shape.mjs';

const W = t => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
const P = (full, start, end, title = full) =>
  ({ name: family(full), full, url: W(title), start, end, entry: null, exit: null, exitHow: null, source: 'Wikidata' });
function family(full) {
  const two = { 'Nicușor Dan': 'Dan', 'Karin Keller-Sutter': 'Keller-Sutter', 'Johann Schneider-Ammann': 'Schneider-Ammann' };
  return two[full] || full.split(' ').at(-1);
}
// Switzerland's President of the Confederation serves one calendar year.
const swiss = (year, full) => P(full, `${year}-01-01`, year === 2026 ? null : `${year}-12-31`);

export const CORRECTIONS = {
  // Guatemala: President. Pérez Molina resigned on 2 September 2015 (Archigos); Maldonado was sworn in the next day.
  // Arévalo's swearing-in ran past midnight into 15 January 2024 (Wikidata; Wikipedia's infobox notes it).
  Q774: {
    from: '2015-09-03',
    leaders: [
      P('Alejandro Maldonado', '2015-09-03', '2016-01-14'),
      P('Jimmy Morales', '2016-01-14', '2020-01-14'),
      P('Alejandro Giammattei', '2020-01-14', '2024-01-15'),
      P('Bernardo Arévalo', '2024-01-15', null)
    ]
  },
  // Poland: President, as Archigos tracked from 1995. Archigos's surname "Kaczynski" (2005–2010) had been matched to
  // Jarosław; the president was his twin brother Lech, who died in office on 10 April 2010.
  Q36: {
    from: '2015-08-06',
    edit: { '2005-12-23': { full: 'Lech Kaczyński', url: W('Lech Kaczyński') } },
    leaders: [
      P('Andrzej Duda', '2015-08-06', '2025-08-06'),
      P('Karol Nawrocki', '2025-08-06', null)
    ]
  },
  // Slovakia: Prime Minister.
  Q214: {
    from: '2023-10-25',
    leaders: [P('Robert Fico', '2023-10-25', null)]
  },
  // Moldova: Prime Minister, acting ones included as Archigos includes them.
  Q217: {
    from: '2015-10-30',
    leaders: [
      P('Gheorghe Brega', '2015-10-30', '2016-01-20'),
      P('Pavel Filip', '2016-01-20', '2019-06-08'),
      P('Maia Sandu', '2019-06-08', '2019-11-14'),
      P('Ion Chicu', '2019-11-14', '2020-12-31'),
      P('Aureliu Ciocoi', '2020-12-31', '2021-08-06'),
      P('Natalia Gavrilița', '2021-08-06', '2023-02-16'),
      P('Dorin Recean', '2023-02-16', '2025-11-01'),
      // Munteanu announced his resignation on 3 July 2026 and stayed in office until Osmochescu took over as acting
      // Prime Minister on 8 July (presidential decree of 7 July); Tofan's government took the oath on 22 July.
      P('Alexandru Munteanu', '2025-11-01', '2026-07-08'),
      P('Eugen Osmochescu', '2026-07-08', '2026-07-22'),
      P('Vasile Tofan', '2026-07-22', null)
    ]
  },
  // Romania: President, as Archigos tracked from 2004 (acting presidents included, as in 2007 and 2012).
  Q218: {
    from: '2014-12-21',
    leaders: [
      P('Klaus Iohannis', '2014-12-21', '2025-02-12'),
      P('Ilie Bolojan', '2025-02-12', '2025-05-26'),
      P('Nicușor Dan', '2025-05-26', null)
    ]
  },
  // Israel: Prime Minister (a caretaker since 27 October 2026, still in office).
  Q801: {
    from: '2022-12-29',
    leaders: [P('Benjamin Netanyahu', '2022-12-29', null)]
  },
  // Saudi Arabia: King. Salman is still on the throne; Archigos's last day (31 December 2015) is not an exit.
  Q851: {
    edit: { '2015-01-23': { full: 'Salman of Saudi Arabia', url: W('Salman of Saudi Arabia'), end: null, exit: null, exitHow: null } }
  },
  // Jamaica: Prime Minister.
  Q766: {
    from: '2016-03-03',
    edit: { '2012-01-05': { end: '2016-03-03' } },
    leaders: [P('Andrew Holness', '2016-03-03', null)]
  },
  // Switzerland: President of the Swiss Confederation (Wikidata P39; Wikipedia's list).
  Q39: {
    from: '2016-01-01',
    edit: {
      '2015-01-01': { full: 'Simonetta Sommaruga', url: W('Simonetta Sommaruga'), end: '2015-12-31' },
      // Willy Spühler (1902-1990), President in 1963 and 1968, not the businessman Peter Spuhler (MI-10, 15 Nov).
      '1963-01-01': { name: 'Spühler', full: 'Willy Spühler', url: W('Willy Spühler') },
      '1968-01-01': { name: 'Spühler', full: 'Willy Spühler', url: W('Willy Spühler') }
    },
    leaders: [
      swiss(2016, 'Johann Schneider-Ammann'), swiss(2017, 'Doris Leuthard'), swiss(2018, 'Alain Berset'),
      swiss(2019, 'Ueli Maurer'), swiss(2020, 'Simonetta Sommaruga'), swiss(2021, 'Guy Parmelin'),
      swiss(2022, 'Ignazio Cassis'), swiss(2023, 'Alain Berset'), swiss(2024, 'Viola Amherd'),
      swiss(2025, 'Karin Keller-Sutter'), swiss(2026, 'Guy Parmelin')
    ]
  },
  // Greece: Prime Minister. Wikidata's statement on Greece dates Mitsotakis from 8 June 2019 (he took office on
  // 8 July) and its label for him had become a number; Sarmas led the caretaker government in 2023.
  // The links to the wrong man of the name (MI-10's sweep, 15 November 2026; each title checked that day against
  // Wikipedia's article and its description): Kostas Karamanlis, not his uncle Konstantinos (1907-1998); George
  // Papandreou (born 1952), not his grandfather Georgios (1888-1968); Ioannis Grivas, the judge who led the 1989
  // caretaker government, not Theodoros Grivas (1797-1862).
  Q41: {
    from: '2019-06-08',
    edit: {
      '2015-01-26': { end: '2019-07-08' },
      '1989-10-11': { name: 'Grivas', full: 'Ioannis Grivas', url: W('Ioannis Grivas') },
      '2004-03-10': { name: 'Karamanlis', full: 'Kostas Karamanlis', url: W('Kostas Karamanlis') },
      '2009-10-06': { name: 'Papandreou', full: 'George Papandreou', url: W('George Papandreou') }
    },
    leaders: [
      P('Kyriakos Mitsotakis', '2019-07-08', '2023-05-25'),
      P('Ioannis Sarmas', '2023-05-25', '2023-06-26'),
      P('Kyriakos Mitsotakis', '2023-06-26', null)
    ]
  },
  // Links that led to a disambiguation page (MI-10, 15 November 2026): the person's own article, checked that day.
  Q786: { edit: { '1963-02-27': { url: W('Juan Bosch (politician)') } } },
  Q211: { edit: { '2000-05-05': { url: W('Andris Bērziņš (prime minister)') } } },
  Q20: { edit: { '1926-03-03': { url: W('Ivar Lykke (politician)') } } },
  Q189: { edit: { '1963-11-14': { url: W('Bjarni Benediktsson (born 1908)') } } },
  // Czechia's first Prime Minister, Archigos's "Klaus" of 1 January 1993, had been linked to Josef Klaus, Austria's
  // Chancellor of 1964-70 (fixer, R2, 21 November 2026): he is Václav Klaus (Q57434), whom Q213's head of government
  // (P6) statement, the build's own Wikidata office holders, gives from 1 January 1993 to 2 January 1998.
  Q213: { edit: { '1993-01-01': { full: 'Václav Klaus', url: W('Václav Klaus') } } },
  // RT-04: whole lists, each starting with its first entry.
  ...Object.fromEntries(Object.entries(LISTS).map(([key, l]) => [key, { from: l.leaders[0].start, leaders: l.leaders, offices: l.offices }]))
};

const hasLetters = s => /\p{L}/u.test(s || '');
const titleOf = url => decodeURIComponent((url || '').split('/wiki/')[1] || '').replace(/_/g, ' ').replace(/ \(.*\)$/, '');
// The same wording build-data.mjs (leaderEvents) gives a leader's arrival; like it, none before 1926 (the first year).
const how = l => (l.entry === 'Irregular' ? ' (irregular seizure of power)' : l.entry === 'Foreign Imposition' ? ' (imposed by a foreign power)' : '');
const arrival = l => ({ date: l.start, type: l.entry === 'Irregular' ? 'coup' : 'leader', text: `${l.full || l.name} takes power${how(l)}`, url: l.url });

// Renames the arrival event of a leader whose name or article changed: same day, and the old article or old name.
function renameArrival(c, l, old) {
  for (const e of c.events || []) {
    if (!['leader', 'coup'].includes(e.type) || e.date !== l.start) continue;
    if (e.url !== old.url && !e.text.startsWith(`${old.full || old.name} takes power`)) continue;
    e.text = `${l.full || l.name} takes power` + e.text.replace(/^.* takes power/, '');
    e.url = l.url;
  }
}

// Applies the corrections to one country record { leaders, events, offices } in place; `key` is its Wikidata item
// (countries.mjs), as CORRECTIONS is keyed.
export function correctCountry(key, c) {
  // A label with no letters is no name (Greece's "9811205000"): the article's title stands in, here and in offices.
  for (const p of [...(c.leaders || []), ...(c.offices || [])]) {
    if (hasLetters(p.full) || !hasLetters(titleOf(p.url))) continue;
    const old = { full: p.full, name: p.name, url: p.url };
    p.full = titleOf(p.url);
    if ('name' in p) { if (!hasLetters(p.name)) p.name = family(p.full); renameArrival(c, p, old); }
  }
  const fix = CORRECTIONS[key];
  if (!fix) return c;
  const leaders = c.leaders || [];
  for (const [start, fields] of Object.entries(fix.edit || {})) {
    const l = leaders.find(x => x.start === start);
    if (!l) throw new Error(`leader-corrections: ${key} has no leader starting ${start}`);
    const old = { full: l.full, name: l.name, url: l.url };
    Object.assign(l, fields);
    renameArrival(c, l, old);
  }
  if (fix.leaders?.length) {
    const lastStart = fix.leaders.at(-1).start;
    const kept = leaders.filter(l => l.start < fix.from);
    const newer = leaders.filter(l => l.start > lastStart && l.source !== 'Archigos');
    const tail = fix.leaders.map(l => {
      // Keep the party tags build-parties.mjs gave an entry already in the list.
      const old = leaders.find(x => x.start === l.start && x.full === l.full);
      return { ...l, ...(old?.parties ? { parties: old.parties } : {}) };
    });
    if (newer.length && !tail.at(-1).end) tail.at(-1).end = newer[0].start;
    c.leaders = [...kept, ...tail, ...newer];
    // Leader events from `from` on follow the corrected list.
    const events = (c.events || []).filter(e => !(['leader', 'coup'].includes(e.type) && e.date >= fix.from));
    for (const l of c.leaders) if (l.start >= fix.from && l.start >= '1926-01-01') events.push(arrival(l));
    c.events = events.sort(byDay);
  }
  if (fix.offices) {
    // Keep the party tags build-parties.mjs gave an office-holder already in the list.
    c.offices = fix.offices.map(o => {
      const old = (c.offices || []).find(x => x.office === o.office && x.start === o.start && x.full === o.full);
      return { ...o, ...(old?.parties && !o.noParties ? { parties: old.parties } : {}) };
    });
  }
  return c;
}

export function applyCorrections(countries) {
  for (const [key, c] of Object.entries(countries)) correctCountry(key, c);
  correctElections(countries);
  return countries;
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const FILE = new URL('../data/countries.json', import.meta.url);
  const data = JSON.parse(readFileSync(FILE, 'utf8'));
  applyCorrections(data.countries);
  writeFileSync(FILE, JSON.stringify(data));
  const ends = Object.entries(CORRECTIONS).map(([key]) => { const l = data.countries[key].leaders.at(-1); return `${data.countries[key].name}: ${l.full} since ${l.start}`; });
  console.log(`leader corrections applied to ${ends.length} countries\n  ${ends.join('\n  ')}`);
  console.log(`election corrections applied: ${ELECTIONS.map(e => `${e.title} (${data.countries[e.key].name}, ${e.date})`).join('; ')}`);
}
