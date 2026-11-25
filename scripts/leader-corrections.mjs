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
    // Archigos's "Vacariou" (review retrospective-1, 25 November 2026) is Nicolae Văcăroiu (Q126671): Prime Minister
    // from 4 November 1992 (Archigos; Wikidata P39 Q15304810 from 4 November 1992; his English Wikipedia infobox gives
    // 18 November 1992) to 12 December 1996, and acting President from 20 April to 23 May 2007 (his article's infobox).
    edit: {
      '1992-11-04': { name: 'Văcăroiu', full: 'Nicolae Văcăroiu', url: W('Nicolae Văcăroiu') },
      '2007-04-20': { name: 'Văcăroiu', full: 'Nicolae Văcăroiu', url: W('Nicolae Văcăroiu') }
    },
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
      '1968-01-01': { name: 'Spühler', full: 'Willy Spühler', url: W('Willy Spühler') },
      // Archigos's "Petipierre" (review retrospective-1, 25 November 2026): Max Petitpierre (Q664453), President of the
      // Swiss Confederation in 1950, 1955 and 1960 (Wikidata P39; his English Wikipedia article).
      '1950-01-01': { name: 'Petitpierre', full: 'Max Petitpierre', url: W('Max Petitpierre') },
      '1955-01-01': { name: 'Petitpierre', full: 'Max Petitpierre', url: W('Max Petitpierre') },
      '1960-01-01': { name: 'Petitpierre', full: 'Max Petitpierre', url: W('Max Petitpierre') }
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
      '2009-10-06': { name: 'Papandreou', full: 'George Papandreou', url: W('George Papandreou') },
      // Archigos's "Ionannides" (review retrospective-1, 25 November 2026): Dimitrios Ioannidis (Q460912), whose English
      // Wikipedia article calls him the junta's de facto leader for its last ten months, holding no formal office.
      '1973-11-25': { name: 'Ioannidis', full: 'Dimitrios Ioannidis', url: W('Dimitrios Ioannidis') }
    },
    leaders: [
      P('Kyriakos Mitsotakis', '2019-07-08', '2023-05-25'),
      P('Ioannis Sarmas', '2023-05-25', '2023-06-26'),
      P('Kyriakos Mitsotakis', '2023-06-26', null)
    ]
  },
  // Links that led to a disambiguation page (MI-10, 15 November 2026): the person's own article, checked that day.
  // Archigos's "Berreras" of 7 May to 30 August 1965 is Antonio Imbert Barrera (Q602500; Wikidata P39 President of the
  // Dominican Republic for those days; his article), added 25 November 2026 with the misspellings below.
  Q786: { edit: { '1963-02-27': { url: W('Juan Bosch (politician)') }, '1965-05-07': { name: 'Imbert Barrera', full: 'Antonio Imbert Barrera', url: W('Antonio Imbert Barrera') } } },
  // Archigos's "Juresevskis" is Pēteris Juraševskis (Q1390299; Wikidata P39 Prime Minister of Latvia, 1928; his article).
  Q211: { edit: { '2000-05-05': { url: W('Andris Bērziņš (prime minister)') }, '1928-01-21': { name: 'Juraševskis', full: 'Pēteris Juraševskis', url: W('Pēteris Juraševskis') } } },
  Q20: { edit: { '1926-03-03': { url: W('Ivar Lykke (politician)') } } },
  Q189: { edit: { '1963-11-14': { url: W('Bjarni Benediktsson (born 1908)') } } },
  // Czechia's first Prime Minister, Archigos's "Klaus" of 1 January 1993, had been linked to Josef Klaus, Austria's
  // Chancellor of 1964-70 (fixer, R2, 21 November 2026): he is Václav Klaus (Q57434), whom Q213's head of government
  // (P6) statement, the build's own Wikidata office holders, gives from 1 January 1993 to 2 January 1998.
  Q213: { edit: { '1993-01-01': { full: 'Václav Klaus', url: W('Václav Klaus') } } },
  // Czechoslovakia's first President, Archigos's "Masaryk" of 28 October 1918 to 14 December 1935, had been linked to
  // Jan Masaryk, another person (found by the build of 21 November 2026): he is Tomáš Masaryk (Q78492), whom Wikidata
  // describes as the first Czechoslovak president and whose "position held" (P39) statement runs from 14 November
  // 1918 to 14 December 1935; his English Wikipedia article is "Tomáš Masaryk". Archigos's own start date is kept.
  Q33946: { edit: { '1918-10-28': { full: 'Tomáš Masaryk', url: W('Tomáš Masaryk') } } },
  // Archigos's short names that are misspelt (review retrospective-1, 25 November 2026). These leaders had no article
  // and no Wikidata match, so the page showed Archigos's spelling. Each is named here by the person's English Wikipedia
  // article, read on 25 November 2026 with the item it links to and that item's "position held" (P39) dates, which
  // agree with Archigos's leader for the state and the dates. Archigos's dates are kept. Of the 152 leaders shown by
  // Archigos's short name, the others were read too: they are spelt right, or in another common romanisation
  // (Kondilis, Tsokhatzopulos, Sarkisyan, Burdzhanadze, Tuan Chi-jui), or as Wikidata labels the person ("Reyna
  // Andrade"), and keep it.
  // Belgium: Henri Jaspar (Q14994), Prime Minister from 20 May 1926 (Wikidata P39).
  Q31: { edit: { '1926-05-20': { name: 'Jaspar', full: 'Henri Jaspar', url: W('Henri Jaspar') } } },
  // Panama: Rodolfo Chiari (Q721719, President 1924-28); Juan Demóstenes Arosemena (Q708308; his article: President from
  // 1 October 1936 to 16 December 1939); Domingo Díaz Arosemena (Q338952, President to 28 July 1949); Alcibíades
  // Arosemena (Q887733; his article: President of Panama); Florencio Flores Aguilar (Q5460853; his article: the
  // Panamanian army officer, who commanded the National Guard after Torrijos's death).
  Q804: {
    edit: {
      '1924-10-01': { name: 'Chiari', full: 'Rodolfo Chiari', url: W('Rodolfo Chiari') },
      '1936-10-01': { name: 'Arosemena', full: 'Juan Demóstenes Arosemena', url: W('Juan Demóstenes Arosemena') },
      '1948-10-01': { name: 'Díaz Arosemena', full: 'Domingo Díaz Arosemena', url: W('Domingo Díaz Arosemena') },
      '1951-05-10': { name: 'Arosemena', full: 'Alcibíades Arosemena', url: W('Alcibíades Arosemena') },
      '1981-07-31': { name: 'Flores Aguilar', full: 'Florencio Flores Aguilar', url: W('Florencio Flores Aguilar') }
    }
  },
  // Switzerland's Max Petitpierre is in Q39's entry above.
  // Costa Rica: Luis Alberto Monge (Q879195, President 8 May 1982 to 8 May 1986); Otilio Ulate Blanco (Q145952,
  // President from 1949).
  Q800: {
    edit: {
      '1982-05-08': { name: 'Monge', full: 'Luis Alberto Monge', url: W('Luis Alberto Monge') },
      '1949-11-08': { name: 'Ulate', full: 'Otilio Ulate Blanco', url: W('Otilio Ulate Blanco') }
    }
  },
  // Yugoslavia: Mika Špiljak (Q718148). Archigos ends Petar Stambolić and starts "Spiljac" on 13 May 1983; Wikidata's
  // "position held" (P39, President of the Presidency of Yugoslavia) ends Stambolić's term and starts Špiljak's on
  // 15 May 1983, and Špiljak's English Wikipedia infobox gives 15 May 1983 to 15 May 1984 (review retrospective-3).
  // Špiljak takes Wikidata's name and dates, with Archigos's kept in `archigos`, as wikidata-leaders.mjs records a
  // match. Raif Dizdarević (Q1282352, President of the Presidency from 15 May 1988, Wikidata P39) is Archigos's
  // "Dizarevic".
  Q191077: {
    edit: {
      '1982-05-16': { end: '1983-05-15' },
      '1983-05-13': {
        name: 'Špiljak', full: 'Mika Špiljak', url: W('Mika Špiljak'), start: '1983-05-15', end: '1984-05-15',
        startPrecision: 'day', endPrecision: 'day', position: 'President of the Presidency of Yugoslavia', positionItem: 'Q16761225',
        qid: 'Q718148', source: 'Wikidata', archigos: { start: '1983-05-13', end: '1984-05-15', full: null }
      },
      '1988-05-15': { name: 'Dizdarević', full: 'Raif Dizdarević', url: W('Raif Dizdarević') }
    }
  },
  // El Salvador: Pío Romero Bosque (Q887275, President 1927-31), Arturo Araujo (Q715109, President 1 March to
  // 2 December 1931), Álvaro Magaña (Q250808, President 1982-84), each from Wikidata P39.
  Q792: {
    edit: {
      '1927-03-01': { name: 'Romero Bosque', full: 'Pío Romero Bosque', url: W('Pío Romero Bosque') },
      '1931-03-01': { name: 'Araujo', full: 'Arturo Araujo', url: W('Arturo Araujo') },
      '1982-05-02': { name: 'Magaña', full: 'Álvaro Magaña', url: W('Álvaro Magaña') }
    }
  },
  // Spain: Juan Bautista Aznar-Cabañas (Q673586), Manuel Azaña (Q203708; his article: Manuel Azaña Díaz, not "Diez"),
  // Diego Martínez Barrio (Q518982) and José Giral (Q518956; his article: José Giral y Pereira), each President of the
  // Council of Ministers on the dates Archigos gives (Wikidata P39). Martínez Barrio and Giral both start on
  // 19 July 1936, so Giral's key names Archigos's spelling.
  Q29: {
    edit: {
      '1931-02-18': { name: 'Aznar-Cabañas', full: 'Juan Bautista Aznar-Cabañas', url: W('Juan Bautista Aznar-Cabañas') },
      '1931-10-14': { name: 'Azaña', full: 'Manuel Azaña', url: W('Manuel Azaña') },
      '1933-10-09': { name: 'Martínez Barrio', full: 'Diego Martínez Barrio', url: W('Diego Martínez Barrio') },
      // Archigos's "Ibanez" of 28 April 1934 had been linked to Carlos Ibáñez del Campo, President of Chile (found on
      // 25 November 2026 while checking these names): he is Ricardo Samper Ibáñez (Q728514), President of the Council of
      // Ministers from 28 April to 4 October 1934 (Wikidata P39); his English Wikipedia article is "Ricardo Samper".
      '1934-04-28': { name: 'Samper', full: 'Ricardo Samper', url: W('Ricardo Samper') },
      '1936-02-19': { name: 'Azaña', full: 'Manuel Azaña', url: W('Manuel Azaña') },
      '1936-07-19|Martinez Barro': { name: 'Martínez Barrio', full: 'Diego Martínez Barrio', url: W('Diego Martínez Barrio') },
      '1936-07-19|Giral y Pereyra': { name: 'Giral', full: 'José Giral', url: W('José Giral') }
    }
  },
  // Nicaragua: René Schick (Q182848, President 1963-66). Honduras: Miguel Paz Barahona (Q881094, President 1925-29).
  // Bulgaria: Simeon Sakskoburggotski (Q1060355), Prime Minister 2001-05 (Wikidata P39). His English Wikipedia article
  // is "Simeon II", and its lead says he "served as prime minister of the Republic of Bulgaria as Simeon
  // Sakskoburggotski (2001–2005)", so the page names him so and links the article. wikidata-leaders.mjs keeps this
  // `full` when it gives him Wikidata's dates (until the second reading of 25 November 2026 it put back "Simeon II").
  Q811: { edit: { '1963-05-01': { name: 'Schick', full: 'René Schick', url: W('René Schick') } } },
  Q783: { edit: { '1925-02-01': { name: 'Paz Barahona', full: 'Miguel Paz Barahona', url: W('Miguel Paz Barahona') } } },
  Q219: { edit: { '2001-07-24': { name: 'Sakskoburggotski', full: 'Simeon Sakskoburggotski', url: W('Simeon II') } } },
  // RT-04: whole lists, each starting with its first entry.
  ...Object.fromEntries(Object.entries(LISTS).map(([key, l]) => [key, { from: l.leaders[0].start, leaders: l.leaders, offices: l.offices }]))
};

const hasLetters = s => /\p{L}/u.test(s || '');
const titleOf = url => decodeURIComponent((url || '').split('/wiki/')[1] || '').replace(/_/g, ' ').replace(/ \(.*\)$/, '');
// The same wording build-data.mjs (leaderEvents) gives a leader's arrival; like it, none before 1926 (the first year).
const how = l => (l.entry === 'Irregular' ? ' (irregular seizure of power)' : l.entry === 'Foreign Imposition' ? ' (imposed by a foreign power)' : '');
const arrival = l => ({ date: l.start, type: l.entry === 'Irregular' ? 'coup' : 'leader', text: `${l.full || l.name} takes power${how(l)}`, url: l.url });

// Renames the arrival event of a leader whose name or article changed: the old day, and the old article or old name.
// An edit that changes the start moves the event to the new day (review retrospective-3, 25 November 2026: until then
// "Spiljac takes power" stayed on 13 May 1983 when the start moved).
function renameArrival(c, l, old) {
  for (const e of c.events || []) {
    if (!['leader', 'coup'].includes(e.type) || e.date !== (old.start || l.start)) continue;
    // By the old link where there was one, else by the old name: two leaders without a link took office on 19 July
    // 1936 in Spain, and matching a missing link to a missing link renamed both arrivals (25 November 2026).
    if (!(old.url && e.url === old.url) && !e.text.startsWith(`${old.full || old.name} takes power`)) continue;
    e.text = `${l.full || l.name} takes power` + e.text.replace(/^.* takes power/, '');
    e.url = l.url;
    e.date = l.start;
  }
}

// The leader an `edit` names: by Archigos's start (its key), or by the start the edit gives it once a run has moved it,
// or by Archigos's start kept in `archigos` where wikidata-leaders.mjs has since given the leader Wikidata's dates; so a
// second run finds the same leader (until 25 November 2026 an edit of `start` threw on the second run). A key may add
// Archigos's short name after a bar ("1936-07-19|Giral y Pereyra") where two leaders took office on one day; the name
// the edit gives is accepted too.
function edited(leaders, key, fields) {
  const [start, name] = key.split('|');
  return leaders.find(x => (x.start === start || x.archigos?.start === start || (fields.start && x.start === fields.start))
    && (!name || x.name === name || x.name === fields.name));
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
    const l = edited(leaders, start, fields);
    if (!l) throw new Error(`leader-corrections: ${key} has no leader starting ${start}`);
    const old = { full: l.full, name: l.name, url: l.url, start: l.start };
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
