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
  // A Spanish double surname is the father's name and the mother's: Andrés Manuel López Obrador is "López Obrador",
  // never "Obrador" (small corrections, 26 November 2026).
  const two = { 'Nicușor Dan': 'Dan', 'Karin Keller-Sutter': 'Keller-Sutter', 'Johann Schneider-Ammann': 'Schneider-Ammann', 'Andrés Manuel López Obrador': 'López Obrador' };
  return two[full] || full.split(' ').at(-1);
}
// Switzerland's President of the Confederation serves one calendar year.
const swiss = (year, full) => P(full, `${year}-01-01`, year === 2026 ? null : `${year}-12-31`);
// An office holder of VM's own reading (`replaceOffices`), with the source its term's detail on the page names
// (app.js termSource reads `sourceNote`).
const H = (full, start, end, title, sourceNote) => ({ office: 'hog', full, url: W(title), start, end, source: 'corrections', sourceNote });
const SAUDI_PM = 'VM’s list (scripts/leader-corrections.mjs): English Wikipedia’s list “Prime Minister of Saudi Arabia”, checked against the infoboxes of Saud’s and Faisal’s articles and, from 2015, Wikidata’s “position held” (P39)';

export const CORRECTIONS = {
  // Guatemala: President. Pérez Molina resigned on 2 September 2015 (Archigos); Maldonado was sworn in the next day.
  // Arévalo's swearing-in ran past midnight into 15 January 2024 (Wikidata; Wikipedia's infobox notes it).
  // Fixer, 26 November 2026, each from the lead of the person's English Wikipedia article, read that day: Archigos's
  // "Ydigoras Fuente" (1958-63) is José Miguel Ramón Ydígoras Fuentes and "Arzu Yrigoyen" (1996-2000) Álvaro Enrique Arzú
  // Irigoyen, whom the records already link (the data names him "Álvaro Arzú", by his article, so his short name is
  // "Arzú"); "Alfonso Portillo Cabrera" (2000-04), "Berger Perdomo" (2004-08) and "Colom Caballeros" (2008-12) are
  // Alfonso Portillo Cabrera, Óscar Berger Perdomo and Álvaro Colom Caballeros, whom the data's Wikidata head of
  // government (P6) holds for those years.
  Q774: {
    from: '2015-09-03',
    edit: {
      '1958-03-02': { name: 'Ydígoras Fuentes' },
      '1996-01-14': { name: 'Arzú' },
      '2000-01-15': { name: 'Portillo Cabrera', full: 'Alfonso Portillo', url: W('Alfonso Portillo') },
      '2004-01-14': { full: 'Óscar Berger', url: W('Óscar Berger') },
      '2008-01-14': { full: 'Álvaro Colom', url: W('Álvaro Colom') }
    },
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
    // Archigos's "Smigly-Rydz" (1935-39) is Edward Śmigły-Rydz (Q295688), Marshal of Poland: his English Wikipedia
    // article, read on 26 November 2026 (small corrections, D6); Archigos's dates are kept.
    edit: { '2005-12-23': { full: 'Lech Kaczyński', url: W('Lech Kaczyński') }, '1935-05-12': { name: 'Śmigły-Rydz', full: 'Edward Śmigły-Rydz', url: W('Edward Śmigły-Rydz') } },
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
      '2007-04-20': { name: 'Văcăroiu', full: 'Nicolae Văcăroiu', url: W('Nicolae Văcăroiu') },
      // Archigos's "A. Nastase" (2000-04) is Adrian Năstase (his English Wikipedia article, read on 26 November 2026),
      // whom the data's Wikidata head of government (P6) holds for those years (fixer).
      '2000-12-28': { name: 'Năstase', full: 'Adrian Năstase', url: W('Adrian Năstase') }
    },
    leaders: [
      P('Klaus Iohannis', '2014-12-21', '2025-02-12'),
      P('Ilie Bolojan', '2025-02-12', '2025-05-26'),
      P('Nicușor Dan', '2025-05-26', null)
    ]
  },
  // Mexico: President (small corrections, 26 November 2026). The build of 25 November ran Archigos's last President,
  // Peña Nieto, on to 30 September 2024 and went straight to Claudia Sheinbaum, dated from 30 September 2024: Wikidata's
  // label service gave the Presidents' items no English label that day, so the 2015 leader's surname matched no head
  // of state and the build followed Wikidata's head of government (P6) of Mexico, which holds only Sheinbaum, from
  // 30 September. Read on 26 November 2026 from Wikidata's "position held: President of Mexico" (P39, Q628004) and each
  // person's English Wikipedia infobox:
  //   Enrique Peña Nieto (Q296741): 1 December 2012 to 30 November 2018 (infobox; Wikidata ends it on 1 December 2018);
  //   Andrés Manuel López Obrador (Q318508): 1 December 2018 to 30 September 2024 (both);
  //   Claudia Sheinbaum (Q5771800): from 1 October 2024 (both; Wikidata's P6 statement on Mexico, from 30 September, is
  //   the day before her term, when she was still President-elect, P39 Q1921011 to 30 September 2024).
  // Archigos's "Echeverria Alvarez" (1970-76) and "Vicente Fox Quesada" (2000-06) are Luis Echeverría Álvarez and
  // Vicente Fox Quesada (the leads of their English Wikipedia articles, "Luis Echeverría" and "Vicente Fox", read on
  // 26 November 2026), whom the data's own Wikidata head of state (P35) of Mexico holds for those years; they are named
  // and linked so (fixer, 26 November 2026). Archigos's dates are kept, but for Echeverría's end (below).
  // Mexico's President takes office on 1 December, so a term ends on 30 November, as the data's other Presidents' do
  // (Builder 2, 27 November 2026, from the names group's two readers, read that day):
  // - Echeverría to 30 November 1976, not Archigos's 1 December: his "position held: President of Mexico" (P39) in
  //   Wikidata (Q317681), the infobox of his English Wikipedia article (rev 1387416949) and of his Spanish one
  //   (rev 176454613).
  // - Calderón to 30 November 2012, not 1 December (Wikidata's P39, which gives his successor's first day): the infoboxes
  //   of his English (rev 1387879464, "November 30, 2012") and Spanish (rev 176338817, "30 de noviembre de 2012")
  //   articles. An edit of the end makes wikidata-leaders.mjs leave his record as it is in a rebuild (as Peña Nieto's),
  //   that is Archigos's, which is not drawn; so his head-of-state term, which Wikidata's head of state (P35) of Mexico
  //   leaves out, is added below (HOS_GAPS) and keeps him in the lane.
  // - Echeverría's and Fox's terms as head of state, which Wikidata's P35 of Mexico gives only to the year (1970 to
  //   1976, 2000 to 2006), and which the lane draws because their leader records are Archigos's: 1 December 1970 to
  //   30 November 1976 (his P39, Q317681, as above) and 1 December 2000 to 30 November 2006 (Fox's P39, Q190572, and his
  //   English article, rev 1387767325), read on 27 November 2026 (the fixer, from the readers of that day).
  Q96: {
    from: '2018-12-01',
    edit: {
      '2012-12-01': { end: '2018-11-30' },
      '2006-12-01': { end: '2012-11-30' },
      '1970-12-01': { name: 'Echeverría Álvarez', full: 'Luis Echeverría', url: W('Luis Echeverría'), end: '1976-11-30' },
      '2000-12-01': { name: 'Fox Quesada', full: 'Vicente Fox', url: W('Vicente Fox') }
    },
    leaders: [
      P('Andrés Manuel López Obrador', '2018-12-01', '2024-09-30'),
      P('Claudia Sheinbaum', '2024-10-01', null)
    ],
    // Her term as head of government is Wikidata's P6 statement with its start put right, so its source says so.
    officeEdits: [{ office: 'hog', full: 'Claudia Sheinbaum', start: '2024-09-30', set: { start: '2024-10-01', source: 'corrections',
      sourceNote: 'Wikidata (CC0): the state’s head of government (P6), whose start, 30 September 2024, VM puts right to 1 October 2024 from her “position held” (P39) and her English Wikipedia article (scripts/leader-corrections.mjs)' } },
    { office: 'hos', full: 'Luis Echeverría', start: '1970-01-01', set: { start: '1970-12-01', end: '1976-11-30', startPrecision: 'day', endPrecision: 'day', source: 'corrections',
      sourceNote: 'Wikidata (CC0): the state’s head of state (P35), which gives only the years; VM gives the days, 1 December 1970 to 30 November 1976, from his “position held: President of Mexico” (P39) and his English and Spanish Wikipedia articles (scripts/leader-corrections.mjs)' } },
    { office: 'hos', full: 'Vicente Fox', start: '2000-01-01', set: { start: '2000-12-01', end: '2006-11-30', startPrecision: 'day', endPrecision: 'day', source: 'corrections',
      sourceNote: 'Wikidata (CC0): the state’s head of state (P35), which gives only the years; VM gives the days, 1 December 2000 to 30 November 2006, from his “position held: President of Mexico” (P39) and his English Wikipedia article (scripts/leader-corrections.mjs)' } }]
  },
  // Israel: Prime Minister (a caretaker since 27 October 2026, still in office).
  // Archigos's "Ben Gurion" (1948-53 and 1955-63) is David Ben-Gurion, whom the data's Wikidata head of government (P6)
  // holds for both terms (his English Wikipedia article, read on 26 November 2026; fixer).
  Q801: {
    from: '2022-12-29',
    edit: {
      '1948-05-14': { name: 'Ben-Gurion', full: 'David Ben-Gurion', url: W('David Ben-Gurion') },
      '1955-11-03': { name: 'Ben-Gurion', full: 'David Ben-Gurion', url: W('David Ben-Gurion') }
    },
    leaders: [P('Benjamin Netanyahu', '2022-12-29', null)]
  },
  // Saudi Arabia: King. Salman is still on the throne; Archigos's last day (31 December 2015) is not an exit.
  // Archigos's "Aziz" of 20 May 1927 to 9 November 1953 is Abdulaziz Al Saud, Ibn Saud (Q151509): his English Wikipedia
  // article (King of Saudi Arabia to his death on 9 November 1953) and Wikidata's "position held: King of Saudi Arabia"
  // (P39, to 9 November 1953), read on 26 November 2026 (small corrections, D6). Archigos's dates are kept.
  //
  // Its heads of government (fixer, 26 November 2026). Wikidata's head of government (P6) of Saudi Arabia, and the
  // "position held: Prime Minister of Saudi Arabia" (P39, Q1153839) of the kings, gave each king as Prime Minister for
  // his whole reign, Ibn Saud's from 1932 and King Salman's to the present, so the page drew one lane for both offices.
  // English Wikipedia's "Prime Minister of Saudi Arabia" (read on 26 November 2026) gives the office as established on
  // 9 October 1953 and its holders: Saud from 9 October 1953 to 16 August 1954, Faisal to 21 December 1960, Saud to
  // 31 October 1962, Faisal to 25 March 1975 (both as the infoboxes of Saud's and Faisal's articles give them), then
  // each king, and Mohammed bin Salman since 27 September 2022 under King Salman (as Wikidata's P39 of both men gives
  // it: Salman to 27 September 2022, Mohammed bin Salman, Q6892571, from that day). So `hog` is VM's list, and Ibn Saud
  // is no head of government.
  //
  // Names (Builder 2, 27 November 2026, from the names group's two readers, read that day). Each king is named by the
  // title of his English Wikipedia article, as the list of leaders names Saud, Faisal, Khalid and Fahd: until then the
  // head-of-state terms of Faisal, Fahd and Salman took Wikidata's English labels ("King Faisal bin Abdulaziz Al Saud",
  // "Fahd bin Abdulaziz Al Saud", "Salman bin Abdulaziz Al Saud"), and the heads of government copied them. Salman's
  // short name was Archigos's long form. The articles: "Faisal of Saudi Arabia" (Q217167), "Fahd of Saudi Arabia"
  // (Q183187, rev 1371397744), "Salman of Saudi Arabia" (Q367825, rev 1385812673).
  // Archigos's "Abdullah ibn Abdilaziz" of 1 January 1996 to 23 January 2015 (no article until then) is King Abdullah,
  // "Abdullah of Saudi Arabia" (Q57298, rev 1387982713). Archigos's start is kept: it records the effective ruler, and
  // the infobox of his article makes him regent for King Fahd from 1 January 1996, King from 1 August 2005. The day is not
  // certain. Fahd's article (rev 1371397744) says Fahd handed the running of the kingdom to him on 2 January 1996 (citing
  // the New York Times of that day) and took up his duties again on 21 February 1996, its infobox gives Abdullah as
  // regent for 1996-2005 and its lead calls him regent in fact. Wikidata (Q57298) gives no regency.
  Q851: {
    edit: {
      '2015-01-23': { name: 'Salman', full: 'Salman of Saudi Arabia', url: W('Salman of Saudi Arabia'), end: null, exit: null, exitHow: null },
      '1996-01-01': { name: 'Abdullah', full: 'Abdullah of Saudi Arabia', url: W('Abdullah of Saudi Arabia') },
      '1927-05-20': { name: 'Ibn Saud', full: 'Ibn Saud', url: W('Ibn Saud') }
    },
    replaceOffices: {
      hog: [
        H('Saud of Saudi Arabia', '1953-10-09', '1954-08-16', 'Saud of Saudi Arabia', SAUDI_PM),
        H('Faisal of Saudi Arabia', '1954-08-16', '1960-12-21', 'Faisal of Saudi Arabia', SAUDI_PM),
        H('Saud of Saudi Arabia', '1960-12-21', '1962-10-31', 'Saud of Saudi Arabia', SAUDI_PM),
        H('Faisal of Saudi Arabia', '1962-10-31', '1975-03-25', 'Faisal of Saudi Arabia', SAUDI_PM),
        H('Khalid of Saudi Arabia', '1975-03-25', '1982-06-13', 'Khalid of Saudi Arabia', SAUDI_PM),
        H('Fahd of Saudi Arabia', '1982-06-13', '2005-08-01', 'Fahd of Saudi Arabia', SAUDI_PM),
        H('Abdullah of Saudi Arabia', '2005-08-01', '2015-01-23', 'Abdullah of Saudi Arabia', SAUDI_PM),
        H('Salman of Saudi Arabia', '2015-01-23', '2022-09-27', 'Salman of Saudi Arabia', SAUDI_PM),
        H('Mohammed bin Salman', '2022-09-27', null, 'Mohammed bin Salman', SAUDI_PM)
      ]
    },
    // The head-of-state terms keep Wikidata's head of state (P35) as their source; only the name is VM's.
    officeEdits: [
      { office: 'hos', full: 'King Faisal bin Abdulaziz Al Saud', start: '1964-11-02', set: { full: 'Faisal of Saudi Arabia' } },
      { office: 'hos', full: 'Fahd bin Abdulaziz Al Saud', start: '1982-06-13', set: { full: 'Fahd of Saudi Arabia' } },
      { office: 'hos', full: 'Salman bin Abdulaziz Al Saud', start: '2015-01-23', set: { full: 'Salman of Saudi Arabia' } }
    ]
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
  // Fixer, 26 November 2026, each read that day in the lead of the person's English Wikipedia article: Archigos's
  // "Blanco" of 1982-86 is the short name of José Salvador Omar Jorge Blanco, whose family names are Jorge Blanco, so
  // the lanes showed his mother's name alone; Archigos's "Fernandez Reyna" (1996-2000, 2004-12) is Leonel Antonio
  // Fernández Reyna, whom the data's Wikidata head of state (P35) holds for both terms. The office holder of
  // 3 September 1965 to 1 July 1966, named "Jorge Luis Felipe" by the build though the record links Héctor
  // García-Godoy's article, is Héctor García-Godoy (the article: President "from 1965 to 1966"; Archigos's "Godoy" of
  // the same days).
  Q786: {
    edit: {
      '1963-02-27': { url: W('Juan Bosch (politician)') },
      '1965-05-07': { name: 'Imbert Barrera', full: 'Antonio Imbert Barrera', url: W('Antonio Imbert Barrera') },
      '1982-08-16': { name: 'Jorge Blanco' },
      '1996-08-16': { name: 'Fernández Reyna', full: 'Leonel Fernández', url: W('Leonel Fernández') },
      '2004-08-16': { name: 'Fernández Reyna', full: 'Leonel Fernández', url: W('Leonel Fernández') }
    },
    officeEdits: [
      { office: 'hos', full: 'Jorge Luis Felipe', start: '1965-09-03', set: { full: 'Héctor García-Godoy' } },
      { office: 'hog', full: 'Jorge Luis Felipe', start: '1965-09-03', set: { full: 'Héctor García-Godoy' } }
    ]
  },
  // Archigos's "Juresevskis" is Pēteris Juraševskis (Q1390299; Wikidata P39 Prime Minister of Latvia, 1928; his article).
  Q211: { edit: { '2000-05-05': { url: W('Andris Bērziņš (prime minister)') }, '1928-01-21': { name: 'Juraševskis', full: 'Pēteris Juraševskis', url: W('Pēteris Juraševskis') } } },
  // Norway's acting Prime Minister of 30 August to 23 September 1998, Archigos's "Lahnstein", had been linked to Erik
  // Lahnstein (born 1972, a Centre Youth member then): she is Anne Enger, then Anne Enger Lahnstein (Q463758), acting
  // Prime Minister "for three weeks in 1998, during Kjell Magne Bondevik's sick leave" (her English Wikipedia article;
  // Bondevik's article: "from 30 August to 23 September"; Norwegian Wikipedia: "fungerende statsminister i 1998"), read
  // on 26 November 2026 (small corrections, D6). She is named as she then was; the link is her article, "Anne Enger".
  Q20: { edit: { '1926-03-03': { url: W('Ivar Lykke (politician)') }, '1998-08-30': { name: 'Enger Lahnstein', full: 'Anne Enger Lahnstein', url: W('Anne Enger') } } },
  // Archigos's "Sigurdardottir" (2009-13) is Jóhanna Sigurðardóttir (Q57772; Wikidata P39 Prime Minister of Iceland,
  // 1 February 2009 to 23 May 2013; her English Wikipedia article), read on 26 November 2026 (small corrections, D6).
  Q189: { edit: { '1963-11-14': { url: W('Bjarni Benediktsson (born 1908)') }, '2009-02-01': { name: 'Sigurðardóttir', full: 'Jóhanna Sigurðardóttir', url: W('Jóhanna Sigurðardóttir') } } },
  // Archigos's "Jorgensen" (1972-73 and 1975-82) is Anker Jørgensen (Q312881; Wikidata P39 Prime Minister of Denmark,
  // 5 October 1972 to 19 December 1973 and 13 February 1975 to 10 September 1982; his English Wikipedia article), read
  // on 26 November 2026 (small corrections, D6).
  Q35: {
    edit: {
      '1972-10-05': { name: 'Jørgensen', full: 'Anker Jørgensen', url: W('Anker Jørgensen') },
      '1975-02-13': { name: 'Jørgensen', full: 'Anker Jørgensen', url: W('Anker Jørgensen') }
    }
  },
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
  // Fixer, 26 November 2026 (the leads of the articles, read that day): Archigos's "Chaniz Pinzon" of 1949 is Daniel
  // Chanis Pinzón, whom the record already links; "Varela Rodriguez" (2014-19) is Juan Carlos Varela Rodríguez, whom the
  // data's Wikidata head of government (P6) holds for those years.
  Q804: {
    edit: {
      '1949-07-28': { name: 'Chanis Pinzón' },
      '2014-07-01': { name: 'Varela Rodríguez', full: 'Juan Carlos Varela', url: W('Juan Carlos Varela') },
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
  // Fixer, 26 November 2026 (the leads of the articles, read that day): Archigos's "Quiros, Daniel" of 1974-78 is Daniel
  // Oduber Quirós, whose family names are Oduber Quirós, so the lanes showed his mother's name alone; "Rodriguez
  // Echeverria" (1998-2002) is Miguel Ángel Rodríguez Echeverría, whom the data names by his article, "Miguel Ángel
  // Rodríguez" (his first family name is the short name); "Laura Chinchilla Miranda" (2010-14) and "Solis Rivera"
  // (2014-18) are Laura Chinchilla Miranda and Luis Guillermo Solís Rivera, whom the data's Wikidata head of
  // government (P6) holds for those years.
  Q800: {
    edit: {
      '1974-05-08': { name: 'Oduber Quirós' },
      '1998-05-08': { name: 'Rodríguez' },
      '2010-05-08': { name: 'Chinchilla Miranda', full: 'Laura Chinchilla', url: W('Laura Chinchilla') },
      '2014-05-08': { name: 'Solís Rivera', full: 'Luis Guillermo Solís', url: W('Luis Guillermo Solís') },
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
      '1988-05-15': { name: 'Dizdarević', full: 'Raif Dizdarević', url: W('Raif Dizdarević') },
      // Archigos's "Djuranovic" is Veselin Đuranović (Q641395; Wikidata P39 President of the Presidency of Yugoslavia,
      // 15 May 1984 to 15 May 1985; his English Wikipedia article), read on 26 November 2026 (small corrections, D6).
      '1984-05-15': { name: 'Đuranović', full: 'Veselin Đuranović', url: W('Veselin Đuranović') }
    }
  },
  // El Salvador: Pío Romero Bosque (Q887275, President 1927-31), Arturo Araujo (Q715109, President 1 March to
  // 2 December 1931), Álvaro Magaña (Q250808, President 1982-84), each from Wikidata P39.
  Q792: {
    edit: {
      '1927-03-01': { name: 'Romero Bosque', full: 'Pío Romero Bosque', url: W('Pío Romero Bosque') },
      '1931-03-01': { name: 'Araujo', full: 'Arturo Araujo', url: W('Arturo Araujo') },
      '1982-05-02': { name: 'Magaña', full: 'Álvaro Magaña', url: W('Álvaro Magaña') },
      // Archigos's "Saca González" (2004-09) is Elías Antonio Saca González (his English Wikipedia article, "Antonio
      // Saca", read on 26 November 2026), whom the data's Wikidata head of government (P6) holds for those years (fixer).
      '2004-06-01': { full: 'Antonio Saca', url: W('Antonio Saca') }
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
      '1936-07-19|Giral y Pereyra': { name: 'Giral', full: 'José Giral', url: W('José Giral') },
      // Archigos's "Suarez Gonzalez" (1976-81) is Adolfo Suárez González (Q214367; Wikidata P39 Prime Minister of
      // Spain, 5 July 1976 to 26 February 1981; his English Wikipedia article, "Adolfo Suárez"), read on 26 November
      // 2026 (small corrections, D6). Archigos's dates are kept.
      '1976-07-01': { name: 'Suárez González', full: 'Adolfo Suárez', url: W('Adolfo Suárez') },
      // Archigos's "Gonzalez Marquez" (1982-96) and "Rajoy Brey" (2011-18) are Felipe González Márquez and Mariano
      // Rajoy Brey (the leads of their English Wikipedia articles, read on 26 November 2026), whom the data's Wikidata
      // head of government (P6) holds for those years (fixer).
      '1982-12-02': { name: 'González Márquez', full: 'Felipe González', url: W('Felipe González') },
      '2011-12-20': { full: 'Mariano Rajoy', url: W('Mariano Rajoy') }
    }
  },
  // Nicaragua: René Schick (Q182848, President 1963-66). Honduras: Miguel Paz Barahona (Q881094, President 1925-29).
  // Bulgaria: Simeon Sakskoburggotski (Q1060355), Prime Minister 2001-05 (Wikidata P39). His English Wikipedia article
  // is "Simeon II", and its lead says he "served as prime minister of the Republic of Bulgaria as Simeon
  // Sakskoburggotski (2001–2005)", so the page names him so and links the article. wikidata-leaders.mjs keeps this
  // `full` when it gives him Wikidata's dates (until the second reading of 25 November 2026 it put back "Simeon II").
  Q811: { edit: { '1963-05-01': { name: 'Schick', full: 'René Schick', url: W('René Schick') } } },
  // Honduras, fixer, 26 November 2026 (the leads of the articles the records link, read that day): Archigos's "Castro" of
  // 1975-78 is the short name of Juan Alberto Melgar Castro, so the lanes showed his mother's family name alone; "Azcona
  // Hoyo" of 1986-90 is José Simón Azcona del Hoyo.
  Q783: {
    edit: {
      '1925-02-01': { name: 'Paz Barahona', full: 'Miguel Paz Barahona', url: W('Miguel Paz Barahona') },
      '1975-04-22': { name: 'Melgar Castro' },
      '1986-01-27': { name: 'Azcona del Hoyo' }
    }
  },
  // Fixer, 26 November 2026, each from the lead of the person's English Wikipedia article, read that day: Cuba's
  // "Prio Socarres" of 1948-52 is Carlos Prío Socarrás, whom the record already links; the United States' "G.H.W. Bush"
  // (1989-93) is George H. W. Bush and Belize's "D.Barrow" (2008-20) is Dean Barrow, each held by the data's Wikidata
  // head of government (P6) for those years.
  Q241: { edit: { '1948-10-10': { name: 'Prío Socarrás' } } },
  Q30: { edit: { '1989-01-20': { name: 'Bush', full: 'George H. W. Bush', url: W('George H. W. Bush') } } },
  Q242: { edit: { '2008-02-08': { name: 'Barrow', full: 'Dean Barrow', url: W('Dean Barrow') } } },
  Q219: { edit: { '2001-07-24': { name: 'Sakskoburggotski', full: 'Simeon Sakskoburggotski', url: W('Simeon II') } } },
  // Ireland: Leo Varadkar's first term as Taoiseach, 14 June 2017 to 27 June 2020, from his "position held: Taoiseach"
  // (P39, Q191827, in Wikidata Q1728820) and his English Wikipedia article (rev 1386801508), read on 27 November 2026;
  // Kenny's end is put right with his name (NAME_FIXES below). His party is Fine Gael, the tag build-parties.mjs gave
  // his term of 2022 (Wikidata's "member of political party", P102, undated) (the fixer, 27 November 2026).
  Q27: {
    from: '2017-06-14',
    leaders: [{ ...P('Leo Varadkar', '2017-06-14', '2020-06-27'), parties: [{ name: 'Fine Gael', url: W('Fine Gael'), s: null, e: null }] }]
  },
  // RT-04: whole lists, each starting with its first entry.
  ...Object.fromEntries(Object.entries(LISTS).map(([key, l]) => [key, { from: l.leaders[0].start, leaders: l.leaders, offices: l.offices }]))
};

// With the heads of state of 27 November 2026 (HOS_GAPS, below), the names of the Archigos records of the same people,
// and four office terms put right, each from the sources HOS_GAPS names for the state, read on 26 and 27 November 2026:
// - Armenia, Azerbaijan, Belarus, China and Costa Rica: Archigos's "Sarkisyan" (2008), "Gambarov" and "Mamedov" (1992),
//   Kuznetsov's dead link "Vyacheslau_Kuznyetsov" (1994), "Tuan Chi-jui" and "Chang Tso-lin" (1924, 1926), "Figueres
//   Olsen" (1994) and "de la Espriella" (2002) are Serzh Sargsyan, Isa Gambar, Yagub Mammadov, Vyacheslav Kuznetsov,
//   Duan Qirui, Zhang Zuolin, José María Figueres and Abel Pacheco (their English Wikipedia articles).
// - Honduras: Archigos's "Flores Facusse" (1998-2002) is Carlos Roberto Flores, and Wikidata's label of the same man as
//   head of government, "Carlos Roberto Flor", is cut short (the article the record links).
// - Switzerland: the Presidents of 2003, 2007, 2008, 2010, 2011, 2013 and 2014 named as the list and their Wikidata
//   items name them.
// - Lithuania: Brazauskas's presidency starts on 25 February 1993, his oath (his P39, his English article); Wikidata's
//   head of state (P35) starts it on 14 February, the day he was elected, which would overlap his acting term.
// - Moldova: Voronin's term, given by P35 only to the year, ends on 11 September 2009 (his P39; English Wikipedia's
//   "President of Moldova"), when Ghimpu began to act.
// - Kosovo: Albulena Haxhiu acted to 7 October 2026, when Justina Shiroka Pula took office (HOS_GAPS below).
// - Albania: Ilir Meta's term ends on 24 July 2022 (his P39, President of Albania; the en list's table).
// - Hungary: Tamás Sulyok's term ends on 20 July 2026, and Ágnes Forsthoffer's acting term starts that day (below).
const GAP_FIXES = {
  Q399: { edit: { '2008-04-09': { name: 'Sargsyan', full: 'Serzh Sargsyan', url: W('Serzh Sargsyan') } } },
  Q227: {
    edit: {
      '1992-05-19': { name: 'Gambar', full: 'Isa Gambar', url: W('Isa Gambar') },
      '1992-03-06': { name: 'Mammadov', full: 'Yagub Mammadov', url: W('Yagub Mammadov (politician)') }
    }
  },
  Q184: { edit: { '1994-01-26': { url: W('Vyacheslav Kuznetsov (politician)') } } },
  Q13426199: {
    edit: {
      '1924-11-24': { name: 'Duan Qirui', full: 'Duan Qirui', url: W('Duan Qirui') },
      '1926-04-21': { name: 'Zhang Zuolin', full: 'Zhang Zuolin', url: W('Zhang Zuolin') }
    }
  },
  Q800: {
    edit: {
      '1994-05-08': { full: 'José María Figueres', url: W('José María Figueres') },
      '2002-05-09': { name: 'Pacheco', full: 'Abel Pacheco', url: W('Abel Pacheco') }
    }
  },
  Q783: {
    edit: { '1998-01-27': { full: 'Carlos Roberto Flores', url: W('Carlos Roberto Flores') } },
    officeEdits: [{ office: 'hog', full: 'Carlos Roberto Flor', start: '1998-01-27', set: { full: 'Carlos Roberto Flores' } }]
  },
  Q39: {
    edit: {
      '2003-01-01': { name: 'Couchepin', full: 'Pascal Couchepin', url: W('Pascal Couchepin') },
      '2008-01-01': { name: 'Couchepin', full: 'Pascal Couchepin', url: W('Pascal Couchepin') },
      '2007-01-01': { full: 'Micheline Calmy-Rey', url: W('Micheline Calmy-Rey') },
      '2011-01-01': { full: 'Micheline Calmy-Rey', url: W('Micheline Calmy-Rey') },
      '2010-01-01': { name: 'Leuthard', full: 'Doris Leuthard', url: W('Doris Leuthard') },
      '2013-01-01': { name: 'Maurer', full: 'Ueli Maurer', url: W('Ueli Maurer') },
      '2014-01-01': { name: 'Burkhalter', full: 'Didier Burkhalter', url: W('Didier Burkhalter') }
    }
  },
  Q37: {
    officeEdits: [{
      office: 'hos', full: 'Algirdas Brazauskas', start: '1993-02-14',
      set: { start: '1993-02-25', sourceNote: 'Wikidata’s head of state (P35) of Lithuania, with the start, 25 February 1993, from his “position held” (P39) in Wikidata (CC0) and his English Wikipedia article (P35 gives 14 February, the day he was elected)' }
    }]
  },
  Q217: { officeEdits: [{ office: 'hos', full: 'Vladimir Voronin', start: '2001-01-01', set: { end: '2009-09-11', endPrecision: 'day' } }] },
  // Kosovo's sources (Builder 2, 27 November 2026, from the votes group's two readers, read that day): Wikidata's head
  // of state (P35) of Kosovo still names her with no end. The Office of the President's post 194879 (president-ksgov.net,
  // 7 October 2026, 18:19) says the inauguration took place that day, after which Justina Shiroka Pula took office from
  // the Acting President, Albulena Haxhiu; her English Wikipedia article (rev 1386434454) ends her acting term on
  // 7 October 2026. So her term's source says so.
  Q1246: { officeEdits: [{ office: 'hos', full: 'Albulena Haxhiu', start: '2026-04-04', set: { end: '2026-10-07', source: 'corrections',
    sourceNote: 'Wikidata (CC0): the state’s head of state (P35), which gives no end; VM ends her acting term on 7 October 2026, when the Office of the President of Kosovo says Justina Shiroka Pula took office from her (its post of that day), as her English Wikipedia article does (scripts/leader-corrections.mjs)' } }] },
  Q222: { officeEdits: [{ office: 'hos', full: 'Ilir Meta', start: '2017-07-24', set: { end: '2022-07-24' } }] },
  // Hungary, 2026 (the fixer, 27 November 2026, read that day): Wikidata's head of state (P35) of Hungary gives Tamás
  // Sulyok no end and starts Ágnes Forsthoffer's acting term on 20 June 2026, so the two overlapped. The seventeenth
  // amendment to the Fundamental Law ended his mandate: his English Wikipedia article (rev 1388199317) ends his term on
  // 20 July 2026, as hers (rev 1387178950) and her "position held: President of Hungary" (P39, acting, Q136408471)
  // start her acting term; his own P39 (Q28599854) ends on 19 July.
  Q28: { officeEdits: [
    { office: 'hos', full: 'Tamás Sulyok', start: '2024-03-05', set: { end: '2026-07-20', source: 'corrections',
      sourceNote: 'Wikidata (CC0): the state’s head of state (P35), which gives no end; VM ends his term on 20 July 2026, when the seventeenth amendment to the Fundamental Law removed him, from his and Ágnes Forsthoffer’s English Wikipedia articles and her “position held” (P39) (his own P39 gives 19 July; scripts/leader-corrections.mjs)' } },
    { office: 'hos', full: 'Ágnes Forsthoffer', start: '2026-06-20', set: { start: '2026-07-20', source: 'corrections',
      sourceNote: 'Wikidata (CC0): the state’s head of state (P35), whose start, 20 June 2026, VM puts right to 20 July 2026 from her “position held: President of Hungary” (P39, acting) and her English Wikipedia article (scripts/leader-corrections.mjs)' } }
  ] }
};
for (const [key, fix] of Object.entries(GAP_FIXES)) {
  const to = (CORRECTIONS[key] ||= {});
  if (fix.edit) to.edit = { ...(to.edit || {}), ...fix.edit };
  if (fix.officeEdits) to.officeEdits = [...(to.officeEdits || []), ...fix.officeEdits];
}

// Archigos leaders shown only by Archigos's short name (Builder 2, 27 November 2026, from the names group's two readers,
// both read that day). Each takes the title of the person's English Wikipedia article (its bracket dropped) as `full`,
// that article as `url`, and Archigos's short name with the accents of the article's lead as `name`; the article's
// revision read is given on each line. A person with no English article takes the name the lead of their Spanish
// article gives (its revision given), and no link, so the page links a search. Archigos's choice of person and its
// dates are kept: only the person is named. An edit gives only the person, so a later match may give the leader
// Wikidata's dates where the start agrees (wikidata-leaders.mjs). Where the reader used Archigos's birth year to tell
// who is meant (Bolaños, Castillo, Duque, Jaén Guardia, Caraccioli, Reina Andrade, Orellana Contreras, Arias Espinosa),
// it matched the article's.
const A = (name, title, full = title.replace(/ \(.*\)$/, '')) => ({ name, full, url: W(title) });
const NO_ARTICLE = (name, full) => ({ name, full, url: null });
const NAME_FIXES = {
  Q31: { edit: {
    '1932-10-22': A('de Broqueville', 'Charles de Broqueville'), // rev 1375376251 (Archigos's "baron"; the lead's "Comte")
    '1949-08-10': A('Eyskens', 'Gaston Eyskens'), // rev 1386303827, and the next two
    '1958-06-25': A('Eyskens', 'Gaston Eyskens'),
    '1968-06-17': A('Eyskens', 'Gaston Eyskens')
  } },
  Q219: { edit: {
    '1943-08-29': A('Kiril', 'Kiril, Prince of Preslav'), // Archigos's "Cyril", the regent of 1943-44; rev 1384085856
    '1991-11-08': A('Dimitrov', 'Philip Dimitrov') // rev 1384923804
  } },
  Q241: { edit: {
    '1925-05-20': A('Machado Morales', 'Gerardo Machado'), // rev 1384182817
    '1933-09-10': A('Grau San Martín', 'Ramón Grau'), // rev 1383632994, and 1944
    '1936-05-20': A('Gómez y Arias', 'Miguel Mariano Gómez'), // rev 1360723972
    '1944-10-10': A('Grau San Martín', 'Ramón Grau')
  } },
  Q229: { edit: { '2003-02-28': A('Papadopoulos', 'Tassos Papadopoulos') } }, // rev 1386464360
  Q786: { edit: {
    // General Pedro Rafael Rodríguez Echavarría has no article of his own: "Rebellion of the Pilots" (rev 1388189975)
    // names him, and no Wikidata item for him was found.
    '1962-01-17': NO_ARTICLE('Rodríguez Echavarría', 'Pedro Rafael Rodríguez Echavarría'),
    '1963-09-26': A('de los Santos', 'Emilio de los Santos') // rev 1376707611
  } },
  Q792: { edit: {
    '1934-08-29': A('Menéndez', 'Andrés Ignacio Menéndez'), // rev 1350866134, and 1944
    '1944-05-09': A('Menéndez', 'Andrés Ignacio Menéndez'),
    '1944-10-21': A('Aguirre y Salinas', 'Osmín Aguirre y Salinas'), // rev 1350834583
    '1949-10-22': NO_ARTICLE('Bolaños', 'Óscar Adán Bolaños'), // Spanish article, rev 175179086 (Q115692800)
    '1960-10-26': NO_ARTICLE('Castillo', 'Miguel Ángel Castillo Maldonado'), // Spanish article, rev 164993471 (Q1774776)
    '1961-01-25': A('Portillo', 'Aníbal Portillo'), // rev 1310833144
    '1977-07-01': A('Romero Mena', 'Carlos Humberto Romero'), // rev 1384716241
    '1979-10-15': A('Majano Ramos', 'Adolfo Arnoldo Majano') // rev 1383670945
  } },
  // Archigos's "Einbund" of 1932 is Kaarel Eenpalu, who was Karl August Einbund until he took the Estonian name: his
  // English article (rev 1378139346) says "until 1935 Karl August Einbund", and its infobox makes him State Elder from
  // 19 July 1932. He is named as he was then, linked to the article under his later name (as Simeon Sakskoburggotski).
  Q191: { edit: { '1932-07-19': { name: 'Einbund', full: 'Karl August Einbund', url: W('Kaarel Eenpalu') } } },
  Q142: { edit: { '1954-06-18': A('Mendès France', 'Pierre Mendès France') } }, // rev 1379913789
  Q230: { edit: { '2007-11-25': A('Burjanadze', 'Nino Burjanadze') } }, // rev 1373166903
  Q41: { edit: {
    '1926-08-23': A('Kondylis', 'Georgios Kondylis'), // rev 1379931362, and 1935
    '1935-10-10': A('Kondylis', 'Georgios Kondylis'),
    '1941-01-29': A('Koryzis', 'Alexandros Koryzis'), // rev 1362778513
    '1944-10-18': A('Papandreou', 'Georgios Papandreou'), // the elder (1888-1968); rev 1386032741, and 1963 and 1964
    '1945-11-22': A('Sofoulis', 'Themistoklis Sofoulis'), // rev 1379066152, and 1947
    '1946-04-04': A('Poulitsas', 'Panagiotis Poulitsas'), // rev 1350706365
    '1946-04-18': A('Tsaldaris', 'Konstantinos Tsaldaris'), // rev 1380361753, and 1947
    '1947-08-29': A('Tsaldaris', 'Konstantinos Tsaldaris'),
    '1947-09-08': A('Sofoulis', 'Themistoklis Sofoulis'),
    '1950-03-23': A('Venizelos', 'Sofoklis Venizelos'), // rev 1383937682, and August 1950
    '1950-08-21': A('Venizelos', 'Sofoklis Venizelos'),
    '1963-11-08': A('Papandreou', 'Georgios Papandreou'),
    '1964-02-18': A('Papandreou', 'Georgios Papandreou'),
    '1995-11-20': A('Tsochatzopoulos', 'Akis Tsochatzopoulos'), // rev 1372010324
    '2011-11-11': A('Papademos', 'Lucas Papademos'), // rev 1373288755
    '2012-05-16': A('Pikrammenos', 'Panayiotis Pikrammenos'), // rev 1378207875
    '2012-06-20': A('Samaras', 'Antonis Samaras') // rev 1382407008
  } },
  Q774: { edit: {
    '1921-12-07': A('Orellana', 'José María Orellana'), // rev 1388128264
    '1930-12-17': A('Orellana Contreras', 'Manuel María Orellana Contreras'), // rev 1346996454
    '1931-01-01': A('Reina Andrade', 'José María Reina Andrade'), // Archigos's "Reyna"; rev 1378220670
    '1931-02-15': A('Ubico Castañeda', 'Jorge Ubico'), // rev 1385812924
    '1944-10-21': A('Árbenz Guzmán', 'Jacobo Árbenz'), // the junta of 1944-45 that Archigos gives to him; rev 1378933620
    '1951-03-01': A('Árbenz Guzmán', 'Jacobo Árbenz')
  } },
  Q790: { edit: {
    // A body, not a person: Archigos's "Executive council" of 1957 (rev 1336951549; Wikidata Q10492934, the council).
    '1957-04-06': A('Executive Government Council', 'Executive Government Council (Haiti)'),
    '1988-09-17': A('Avril', 'Prosper Avril') // rev 1371055196
  } },
  // Héctor Caraccioli Moncada has no article in English or Spanish. English Wikipedia's "Honduran military junta of
  // 1956–1957" (rev 1345366453) names him; his Wikidata item, Q1490067 (1922-1975, as Archigos), links only a German
  // article, "Héctor Caraccioli" (rev 268348864), which makes him a member of the junta from 21 October 1956 to
  // 21 December 1957, Archigos's days. So no link.
  Q783: { edit: { '1956-10-21': NO_ARTICLE('Caraccioli', 'Héctor Caraccioli Moncada') } },
  Q189: { edit: {
    '1944-05-17': A('Þórðarson', 'Björn Þórðarson'), // Archigos's "Thordarson"; rev 1345781719
    '2006-06-15': A('Haarde', 'Geir Haarde'), // Archigos's "Hilmar Haarde", his middle name; rev 1387498203
    // A Wikidata leader that kept Archigos's "Groendal": Benedikt Gröndal, whose article is "Benedikt Gröndal (born
    // 1924)" (rev 1378244208, Q712686; its lead names him Benedikt Sigurðsson Gröndal); the link was a redirect to it.
    // As every leader drawn, he takes the article's title as his name.
    '1979-10-15': { name: 'Gröndal', full: 'Benedikt Gröndal', url: W('Benedikt Gröndal (born 1924)') }
  } },
  // Ireland. Enda Kenny's term ran on in Archigos's record to 27 June 2020, and Leo Varadkar's first term was missing.
  // Kenny ends on 14 June 2017 (his English article, rev 1379892783; Varadkar's "position held: Taoiseach", P39 Q191827,
  // whose predecessor is Kenny), and Varadkar's term of 14 June 2017 to 27 June 2020 is added in CORRECTIONS above (the
  // fixer, 27 November 2026, read that day).
  Q27: { edit: {
    '1973-03-14': A('Cosgrave', 'Liam Cosgrave'), // rev 1382976554
    '2008-05-07': A('Cowen', 'Brian Cowen'), // rev 1387835988
    '2011-03-09': { ...A('Kenny', 'Enda Kenny'), end: '2017-06-14' } // rev 1379892783
  } },
  // Japan. Archigos counts the Supreme Commander for the Allied Powers as Japan's effective ruler during the occupation
  // (Douglas MacArthur, then Matthew Ridgway), and linked "Service summary of Douglas MacArthur", a list of his ranks.
  // His article (rev 1387634679) has him as Supreme Commander from 14 August 1945 to 11 April 1951; Archigos's dates
  // (2 September 1945, the surrender, to 11 April 1951) are kept.
  Q17: { edit: {
    '1945-04-07': A('Suzuki', 'Kantarō Suzuki'), // rev 1386976378
    '1945-09-02': { full: 'Douglas MacArthur', url: W('Douglas MacArthur') },
    '2009-09-16': A('Hatoyama', 'Yukio Hatoyama') // rev 1386467103
  } },
  Q811: { edit: {
    '1936-06-06': A('Brenes Jarquín', 'Carlos Alberto Brenes'), // Archigos's "Jarquin"; rev 1350646818
    '1966-08-04': A('Guerrero Gutiérrez', 'Lorenzo Guerrero') // rev 1375029243
  } },
  Q804: { edit: {
    '1928-09-08': NO_ARTICLE('Duque', 'Tomás Gabriel Duque'), // Spanish article, rev 143349216 (Q3530966)
    '1931-01-03': A('Arias Madrid', 'Harmodio Arias Madrid'), // rev 1371703496, and 1932
    '1932-10-01': A('Arias Madrid', 'Harmodio Arias Madrid'),
    '1940-10-01': A('Arias', 'Arnulfo Arias'), // rev 1361387723, and 1949 and 1968
    '1941-10-09|Ernesto Jaen Guardia': NO_ARTICLE('Jaén Guardia', 'Ernesto Jaén Guardia'), // Spanish article, rev 170635851 (Q5836895)
    '1941-10-09|Guardia, R.': A('de la Guardia', 'Ricardo Adolfo de la Guardia'), // rev 1322051103
    '1949-11-20': A('Chiari Remón', 'Roberto Francisco Chiari Remón'), // rev 1350635068, and 1960
    '1949-11-25': A('Arias', 'Arnulfo Arias'),
    '1952-10-01': A('Remón Cantera', 'José Antonio Remón Cantera'), // Archigos's "Cantero"; rev 1347347655
    '1955-01-15': A('Arias Espinosa', 'Ricardo Arias (politician)'), // rev 1347268872
    '1956-10-01': A('de la Guardia', 'Ernesto de la Guardia'), // Archigos's "Guardia Jr., E."; rev 1350645871
    '1960-10-01': A('Chiari Remón', 'Roberto Francisco Chiari Remón'),
    '1968-10-01': A('Arias', 'Arnulfo Arias'),
    '1968-10-12': A('Torrijos Herrera', 'Omar Torrijos'), // rev 1383276608
    '1982-03-03': A('Paredes', 'Rubén Darío Paredes') // rev 1371704456
  } },
  Q45: { edit: { '1925-12-16': A('Machado Guimarães', 'Bernardino Machado') } }, // rev 1378218998
  Q29: { edit: {
    '1931-04-14': A('Alcalá-Zamora', 'Niceto Alcalá-Zamora'), // rev 1386458022
    '1936-05-13': A('Casares Quiroga', 'Santiago Casares Quiroga') // rev 1386457625
  } }
};
for (const [key, fix] of Object.entries(NAME_FIXES)) {
  const to = (CORRECTIONS[key] ||= {});
  for (const k of Object.keys(fix.edit)) if (to.edit?.[k]) throw new Error(`leader-corrections: ${key} has two edits for ${k}`);
  to.edit = { ...(to.edit || {}), ...fix.edit };
}

// Monarchs missing from the head-of-state lane (small corrections, D7, 26 November 2026). Wikidata's head of state
// (P35) of these states gives the reign without a start (George V on the United Kingdom) or not at all (Hirohito on
// Japan), so the build left a hole. Each reign's dates are the person's own "position held" (P39) in Wikidata, checked
// against the reign in the infobox of their English Wikipedia article, both read on 26 November 2026; where the two
// differ, the comment says so and which is used. `full` is the article's title, as `url` is the article.
// Each record carries `source: 'reigns'` and the words its term's detail on the page gives as its source
// (`sourceNote`, app.js termSource): until the fixer's pass of 26 November 2026 the page credited these reigns to
// Wikidata's head of state (P35), the statement that leaves them out. Where Wikidata gives no day, the day is from
// the English Wikipedia article the note names.
// Ireland (fixer, 26 November 2026): its head of state's lane was empty from 1926 to 2025, as Wikidata's P35 of
// Ireland holds only Catherine Connolly; its kings and presidents are added here too.
const VM_HOS = 'VM’s list of heads of state that Wikidata’s head of state (P35) leaves out (scripts/leader-corrections.mjs)';
const P39_NOTE = `${VM_HOS}: the person’s “position held” (P39) in Wikidata (CC0), checked against their English Wikipedia article`;
const WP_NOTE = (article, why) => `${VM_HOS}: the English Wikipedia article “${article}” (${why})`;
const O = (full, start, end, title = full, sourceNote = P39_NOTE) => ({ office: 'hos', full, url: W(title), start, end, source: 'reigns', sourceNote });
const IRISH_KING = WP_NOTE('Irish head of state from 1922 to 1949', 'Wikidata gives no Irish office for him');
const IRISH_PRESIDENT = `${VM_HOS}: the person’s “position held: President of Ireland” (P39) in Wikidata (CC0), checked against English Wikipedia’s list “President of Ireland”`;
// The heads of state of 27 November 2026 (below, HOS_GAPS) word their notes with these.
const NOTE = text => `${VM_HOS}: ${text}`;
const LIST_NOTE = list => NOTE(`the person’s “position held” (P39) in Wikidata (CC0), checked against English Wikipedia’s list “${list}”`);
const WP_LIST = (list, why) => NOTE(`English Wikipedia’s list “${list}” and the person’s article (${why})`);
// A head of state with no English article of its own (a junta, or officers who held the powers together): no link.
const N = (full, start, end, sourceNote) => ({ office: 'hos', full, url: null, start, end, source: 'reigns', sourceNote });
export const REIGNS = {
  // George V: P39 monarch of the United Kingdom of Great Britain and Ireland from 6 May 1910, then Monarch of the
  // United Kingdom from 12 April 1927, to 20 January 1936; the infobox: 6 May 1910 to 20 January 1936.
  Q145: [O('George V', '1910-05-06', '1936-01-20')],
  // Emperor Taishō: P39 Emperor of Japan 30 July 1912 to 25 December 1926 (the infobox: 29 July 1912 to 25 December
  // 1926; only the end falls in the years shown). Hirohito: P39 Emperor of Japan 25 December 1926 to 7 January 1989,
  // as the infobox.
  Q17: [O('Emperor Taishō', '1912-07-30', '1926-12-25'), O('Hirohito', '1926-12-25', '1989-01-07')],
  // Victor Emmanuel III: P39 King of Italy 29 July 1900 to 9 May 1946, as the infobox. Umberto II: King of Italy from 9
  // May 1946; the infobox ends the reign on 12 June 1946, Wikidata on 18 June. The infobox's day is used, as Wikidata's
  // would overlap Alcide De Gasperi's acting term from 13 June.
  Q38: [O('Victor Emmanuel III', '1900-07-29', '1946-05-09'), O('Umberto II', '1946-05-09', '1946-06-12', 'Umberto II of Italy',
    `${VM_HOS}: the person’s “position held” (P39) in Wikidata (CC0) for the start; the end, 12 June 1946, from the English Wikipedia article “Umberto II of Italy” (Wikidata gives 18 June)`)],
  // Alfonso XIII: P39 King of Spain 17 May 1886 to 14 April 1931, as the infobox.
  Q29: [O('Alfonso XIII', '1886-05-17', '1931-04-14')],
  // Charlotte: P39 Grand Duke of Luxembourg 14 January 1919 to 12 November 1964; Jean: 12 November 1964 to 7 October
  // 2000; both as the infoboxes.
  Q32: [O('Charlotte, Grand Duchess of Luxembourg', '1919-01-14', '1964-11-12'), O('Jean, Grand Duke of Luxembourg', '1964-11-12', '2000-10-07')],
  // Zog I: P39 King of the Albanians 1 September 1928 to 7 April 1939 (the infobox ends it on 9 April; Wikidata's day
  // is used). Victor Emmanuel III: P39 King of Albania 16 April 1939 to 8 September 1943.
  Q222: [O('Zog I', '1928-09-01', '1939-04-07'), O('Victor Emmanuel III', '1939-04-16', '1943-09-08')],
  // Alexander I: P39 King of Yugoslavia 16 August 1921 to 9 October 1934; Peter II: 9 October 1934 to 29 November 1945;
  // both as the infoboxes.
  Q191077: [O('Alexander I of Yugoslavia', '1921-08-16', '1934-10-09'), O('Peter II of Yugoslavia', '1934-10-09', '1945-11-29')],
  // George II: P39 King of the Hellenes from 3 November 1935 (the infobox dates his restored reign from 25 November
  // 1935; Wikidata's day is used) to 1 April 1947. Paul: 1 April 1947 to 6 March 1964;
  // Constantine II: 6 March 1964 to 1 June 1973; both as the infoboxes.
  Q41: [O('George II of Greece', '1935-11-03', '1947-04-01'), O('Paul of Greece', '1947-04-01', '1964-03-06'), O('Constantine II of Greece', '1964-03-06', '1973-06-01')],
  // Boris III: P39 Tsar of Bulgaria 3 October 1918 to 28 August 1943; Simeon II: 28 August 1943 to 15 September 1946;
  // both as the infoboxes.
  Q219: [O('Boris III of Bulgaria', '1918-10-03', '1943-08-28'), O('Simeon II', '1943-08-28', '1946-09-15')],
  // Christian X: P39 King of Iceland 1 December 1918 to 17 June 1944, as the infobox.
  Q189: [O('Christian X', '1918-12-01', '1944-06-17')],
  // Ibn Saud before the Kingdom of Saudi Arabia: the infobox gives his reign over Nejd from 15 January 1902 (Emir, then
  // Sultan, then King) and as King of Hejaz from 8 January 1926, to 23 September 1932 (the article "Third Saudi
  // state" agrees). Wikidata has no P39 for it. It starts on 8 January 1926, when he became King of Hejaz and the
  // Kingdom of Hejaz and Nejd that the page names began (until the fixer's pass of 26 November 2026 it started in
  // 1902, when he took Riyadh, long before this state), and ends on 22 September 1932, the day his term as King of
  // Saudi Arabia (Wikidata P35, already listed) begins.
  Q851: [O('Ibn Saud', '1926-01-08', '1932-09-22', 'Ibn Saud', WP_NOTE('Ibn Saud', 'Wikidata gives no “position held” for this reign'))],
  // Elizabeth II as Queen of Malta, 21 September 1964 to 13 December 1974 (the English Wikipedia article "Monarchy of
  // Malta"; Wikidata gives the years); of Trinidad and Tobago, 31 August 1962 to 1 August 1976 ("Queen of Trinidad and
  // Tobago"; Wikidata gives the years); of the Bahamas, 10 July 1973 to 8 September 2022 (Wikidata P39 to the day; the
  // article "Monarchy of the Bahamas").
  Q233: [O('Elizabeth II', '1964-09-21', '1974-12-13', 'Elizabeth II', WP_NOTE('Monarchy of Malta', 'Wikidata gives only the years'))],
  Q754: [O('Elizabeth II', '1962-08-31', '1976-08-01', 'Elizabeth II', WP_NOTE('Queen of Trinidad and Tobago', 'Wikidata gives only the years'))],
  Q778: [O('Elizabeth II', '1973-07-10', '2022-09-08')],
  // Ireland. The kings, from English Wikipedia's "Irish head of state from 1922 to 1949" (its table, read on 26 November
  // 2026): George V from the Irish Free State's first day, 6 December 1922 (also the article "Irish Free State"), to his
  // death on 20 January 1936 (as his Wikidata P39 as Monarch of the United Kingdom ends); Edward VIII to 12 December
  // 1936, the day the Free State recognised his abdication in the External Relations Act (the table's note; the article
  // "Executive Authority (External Relations) Act 1936": signed into law on 12 December 1936); George VI from that day
  // to 18 April 1949, when the Republic of Ireland Act came into force (the same article). Wikidata gives none of them
  // an Irish office. The table gives George VI's years after the Constitution of 29 December 1937 in italics, and
  // "Monarchy of Ireland" lists him as "arguably" king to 1949, so from 25 June 1938 to 1949 the lane draws him and the
  // President in two rows, as both were named head of state. The presidents, from each one's "position held:
  // President of Ireland" (P39, Q213702) in Wikidata, each the same as English Wikipedia's list "President of Ireland",
  // both read on 26 November 2026; Catherine Connolly, from 11 November 2025, is Wikidata's P35 already.
  Q27: [
    O('George V', '1922-12-06', '1936-01-20', 'George V', IRISH_KING),
    O('Edward VIII', '1936-01-20', '1936-12-12', 'Edward VIII', IRISH_KING),
    O('George VI', '1936-12-12', '1949-04-18', 'George VI', IRISH_KING),
    // Hyde stood for no party: English Wikipedia’s “President of Ireland” calls him an interparty nominee and his
    // infobox gives Independent, while Wikidata's undated Sinn Féin (P102) would tag the whole term.
    { ...O('Douglas Hyde', '1938-06-25', '1945-06-24', 'Douglas Hyde', IRISH_PRESIDENT), noParties: true },
    O('Seán T. O\'Kelly', '1945-06-25', '1959-06-24', 'Seán T. O\'Kelly', IRISH_PRESIDENT),
    O('Éamon de Valera', '1959-06-25', '1973-06-24', 'Éamon de Valera', IRISH_PRESIDENT),
    O('Erskine Hamilton Childers', '1973-06-25', '1974-11-17', 'Erskine Hamilton Childers', IRISH_PRESIDENT),
    O('Cearbhall Ó Dálaigh', '1974-12-19', '1976-10-22', 'Cearbhall Ó Dálaigh', IRISH_PRESIDENT),
    O('Patrick Hillery', '1976-12-03', '1990-12-02', 'Patrick Hillery', IRISH_PRESIDENT),
    O('Mary Robinson', '1990-12-03', '1997-09-12', 'Mary Robinson', IRISH_PRESIDENT),
    O('Mary McAleese', '1997-11-11', '2011-11-10', 'Mary McAleese', IRISH_PRESIDENT),
    O('Michael D. Higgins', '2011-11-11', '2025-11-10', 'Michael D. Higgins', IRISH_PRESIDENT)
  ]
};

// The head of state's lane had 73 stretches of over a year with no term drawn, in 36 states, on 27 November 2026
// (retro-free/hos-gaps.mjs). Wikidata's head of state (P35) on those states starts late or leaves holders out, and the
// leaders who fill the years come from Archigos, which the lanes do not draw. Five first readers listed the missing
// holders and five second readers reopened every proposal, on 26 and 27 November 2026; each entry below is what stood
// after that, with its sources named. Where the sources disagree on a day the comment says so and which is followed.
// A rule that takes every head of state from Wikidata's "position held" (P39) would fill most of these at once, but it
// needs the network and the second readers found it brings in wrong dates (Elchibey, Calderón Guardia, Ulate, Furgler,
// Kyprianou, Sartzetakis and others), and many P39 dates are only copies of English Wikipedia; so these are by hand,
// and the rule waits (build notes, 27 November 2026). An English Wikipedia list that cites nothing and links rulers.org
// or worldstatesmen.org is not counted as a source (VM does not use either site).
const SWISS = 'List of presidents of the Swiss Confederation';
const swissHos = (y, full, note = LIST_NOTE(SWISS)) => O(full, `${y}-01-01`, `${y}-12-31`, full, note);
const BG_NOTE = NOTE('the person’s “position held” (P39) in Wikidata (CC0), checked against Bulgarian Wikipedia’s list “Списък на държавните глави на България (от 1946 г.)”');
const HU_NOTE = NOTE('the person’s “position held” (P39) in Wikidata (CC0), checked against Hungarian Wikipedia’s list “Magyarország államfőinek listája” and the person’s English article');
const MT_NOTE = NOTE('the person’s “position held: President of Malta” (P39) in Wikidata (CC0)');
const TT_NOTE = NOTE('the person’s “position held” (P39) in Wikidata (CC0), checked against their English Wikipedia article and the Office of the President of Trinidad and Tobago’s “History of the Presidency”');
const YU = 'List of heads of state of Yugoslavia';
const HOS_GAPS = {
  // Albania. English Wikipedia's "List of heads of state of Albania" (rev 1377315825), German Wikipedia's "Liste der
  // Staatsoberhäupter Albaniens" (rev 265147543), Albanian Wikipedia's "Krerët e Shtetit Shqiptar" (rev 3019464), the
  // persons' English articles and Wikidata P39 (President of Albania, Q1625960), read on 26 and 27 November 2026.
  // Zog as President, 1 February 1925 to 1 September 1928 (Wikidata; the three lists end it on 1 September). Ibrahim
  // Biçakçiu, chairman under the German occupation, from 14 September 1943 (en and sq): his end is contested, 20 October
  // (en list), 24 October (his en article) or 4 November 1943 (sq article), and the de and sq lists do not count him as
  // head of state; he ends on 20 October, the day the three lists start Mehdi Frashëri's regency. Frashëri's end is
  // contested too: 25 October 1944 (en list and article) or 28 November 1944 (de and sq lists). Omer Nishani from 26 May
  // 1944, the day the en, de and sq lists give (the sq list splits it at 12 January 1946, chairman of the Anti-Fascist
  // Council, then of the Constituent Assembly), beside Frashëri for 1944 as a rival authority, so two rows. Ramiz Alia
  // as Chairman of the Presidium to 30 April 1991 (his article, de and sq lists; the en list gives 29 April). Skënder
  // Gjinushi, acting for one day on 24 July 1997, is left out.
  Q222: [
    O('Zog I', '1925-02-01', '1928-09-01', 'Zog I', LIST_NOTE('List of heads of state of Albania')),
    O('Ibrahim Biçakçiu', '1943-09-14', '1943-10-20', 'Ibrahim Biçakçiu', WP_LIST('List of heads of state of Albania', 'his article ends his term on 24 October 1943; Wikidata gives no “position held”')),
    O('Mehdi Frashëri', '1943-10-20', '1944-10-25', 'Mehdi Frashëri', NOTE('English, German and Albanian Wikipedia’s lists of heads of state of Albania for the start; English Wikipedia’s list and his article for the end (the German and Albanian lists give 28 November 1944)')),
    O('Omer Nishani', '1944-05-26', '1946-03-16', 'Omer Nishani', NOTE('English, German and Albanian Wikipedia’s lists of heads of state of Albania (chairman of the Anti-Fascist National Liberation Council, then of the Constituent Assembly)')),
    O('Omer Nishani', '1946-03-16', '1953-08-01', 'Omer Nishani', LIST_NOTE('List of heads of state of Albania')),
    O('Haxhi Lleshi', '1953-08-01', '1982-11-22', 'Haxhi Lleshi', LIST_NOTE('List of heads of state of Albania')),
    O('Ramiz Alia', '1982-11-22', '1991-04-30', 'Ramiz Alia', NOTE('his English Wikipedia article and German and Albanian Wikipedia’s lists of heads of state of Albania (Wikidata gives no “position held” for this office)')),
    O('Ramiz Alia', '1991-04-30', '1992-04-03', 'Ramiz Alia', LIST_NOTE('List of heads of state of Albania')),
    O('Kastriot Islami', '1992-04-03', '1992-04-06', 'Kastriot Islami', LIST_NOTE('List of heads of state of Albania')),
    O('Pjetër Arbnori', '1992-04-06', '1992-04-09', 'Pjetër Arbnori', LIST_NOTE('List of heads of state of Albania')),
    O('Rexhep Meidani', '1997-07-24', '2002-07-24', 'Rexhep Meidani', LIST_NOTE('List of heads of state of Albania')),
    O('Alfred Moisiu', '2002-07-24', '2007-07-24', 'Alfred Moisiu', LIST_NOTE('List of heads of state of Albania')),
    O('Bamir Topi', '2007-07-24', '2012-07-24', 'Bamir Topi', LIST_NOTE('List of heads of state of Albania')),
    O('Bujar Nishani', '2012-07-24', '2017-07-24', 'Bujar Nishani', LIST_NOTE('List of heads of state of Albania'))
  ],
  // Armenia. Robert Kocharyan acted from Levon Ter-Petrosyan's resignation: 3 February 1998 in the table of English
  // Wikipedia's "President of Armenia" (rev 1387894110) and Russian Wikipedia's list, 4 February in his English article and the English
  // page's timeline. The day is contested (two to two); 3 February, which meets Ter-Petrosyan's end in Wikidata, is used.
  // He was President from 9 April 1998 (Wikidata P39; his article) to 9 April 2008. Serzh Sargsyan, 9 April 2008 to
  // 9 April 2018 (Wikidata P39 Q4283840; his article; the en and ru lists). Read on 26 and 27 November 2026.
  Q399: [
    O('Robert Kocharyan', '1998-02-03', '2008-04-09', 'Robert Kocharyan', NOTE('the table of English Wikipedia’s “President of Armenia” and Russian Wikipedia’s list for the start, as acting President (his article gives 4 February 1998); his “position held” (P39) in Wikidata (CC0) and his article for the rest')),
    O('Serzh Sargsyan', '2008-04-09', '2018-04-09', 'Serzh Sargsyan', LIST_NOTE('President of Armenia'))
  ],
  // Azerbaijan. English Wikipedia's "President of Azerbaijan" (rev 1379561455), Azerbaijani "Azərbaycan Prezidenti"
  // (rev 9208893) and Russian "Президент Азербайджана" (rev 154023536), the persons' articles and Wikidata, read on 26 and
  // 27 November 2026. Abulfaz Elchibey, 17 June 1992 to 24 June 1993 (the three lists, his en and az articles; Wikidata
  // gives 16 June 1992 to 1 September 1993). Heydar Aliyev to 31 October 2003, when Ilham Aliyev became President (the
  // three lists, his article; Wikidata ends it on 12 December 2003, the day he died). The urls of Mutallibov and Elchibey
  // are the ones the data's own records use.
  Q227: [
    O('Ayaz Mutallibov', '1991-02-05', '1992-03-06', 'Ayaz Mütallibov', LIST_NOTE('President of Azerbaijan')),
    O('Yagub Mammadov', '1992-03-06', '1992-05-14', 'Yagub Mammadov (politician)', LIST_NOTE('President of Azerbaijan')),
    O('Isa Gambar', '1992-05-18', '1992-06-17', 'Isa Gambar', LIST_NOTE('President of Azerbaijan')),
    O('Abulfaz Elchibey', '1992-06-17', '1993-06-24', 'Abülfaz Elçibay', NOTE('English, Azerbaijani and Russian Wikipedia’s lists of Presidents of Azerbaijan and his English article (Wikidata gives 16 June 1992 to 1 September 1993)')),
    O('Heydar Aliyev', '1993-06-24', '2003-10-31', 'Heydar Aliyev', NOTE('English, Azerbaijani and Russian Wikipedia’s lists of Presidents of Azerbaijan and his English article (acting to 10 October 1993; Wikidata ends it on 12 December 2003, the day he died)'))
  ],
  // Belarus: the Chairman of the Supreme Council was head of state from 1991 to 1994 (English Wikipedia's "Supreme
  // Council of Belarus", rev 1381229458). Stanislav Shushkevich, acting from 25 August 1991 (Wikidata P39 Q100707485; his
  // article; Russian Wikipedia's list); Vyacheslav Kuznetsov, acting, 26 to 28 January 1994 (his article, which cites
  // the Council's resolutions; the en and ru lists); Myechyslaw Hryb from 28 January 1994, head of state until
  // Lukashenko's presidency began on 20 July 1994 (his article's note), though he stayed chairman to 1996. Read on 26 and
  // 27 November 2026.
  Q184: [
    O('Stanislav Shushkevich', '1991-08-25', '1994-01-26', 'Stanislav Shushkevich', NOTE('his “position held” (P39) in Wikidata (CC0), his English Wikipedia article and Russian Wikipedia’s list of chairmen of the Supreme Council')),
    O('Vyacheslav Kuznetsov', '1994-01-26', '1994-01-28', 'Vyacheslav Kuznetsov (politician)', WP_NOTE('Vyacheslav Kuznetsov (politician)', 'acting; also the lists of chairmen in English Wikipedia’s “Supreme Council of Belarus” and in Russian Wikipedia')),
    O('Myechyslaw Hryb', '1994-01-28', '1994-07-20', 'Myechyslaw Hryb', WP_NOTE('Myechyslaw Hryb', 'head of state until 20 July 1994; he stayed chairman of the Supreme Council to 1996'))
  ],
  // Bosnia and Herzegovina: Alija Izetbegović, President of the Presidency, 20 December 1990 to 5 October 1996 (Wikidata
  // P39 Q848335; his article, rev 1388172300). The other members of the wartime Presidency are not drawn yet: Bosnian
  // Wikipedia's "Predsjedništvo Republike Bosne i Hercegovine" (rev 3939940) dates them, but it is one source.
  Q225: [O('Alija Izetbegović', '1990-12-20', '1996-10-05')],
  // Bulgaria: Wikidata P39 "Chairman (President) of Bulgaria" (Q15893498) and Bulgarian Wikipedia's list (rev 13086121),
  // read on 26 and 27 November 2026. English Wikipedia's list is not counted: it cites nothing and links rulers.org. The
  // hand-over from Traykov to Zhivkov in July 1971 is given to the month, day not confirmed (the fixer, 27 November
  // 2026, read that day): Traykov to 6 July in the Bulgarian list and his Bulgarian article (rev 13063699, citing the
  // State Archives' guide), to 7 July in Wikidata (no reference); Zhivkov from 7 July in Wikidata, 8 July in the
  // Bulgarian list and 9 July in his Bulgarian article (rev 13095871). The State Gazette's act was not read. Until
  // then 7 July (Wikidata) was used. Petar Mladenov, Chairman of the State Council from 17 November 1989
  // (his English article and the Bulgarian list); his presidency from 3 April 1990 is Wikidata's P35. The acting heads of
  // 27 to 30 November 1958 and 20 to 23 April 1964 are left out, three days each.
  Q219: [
    O('Vasil Kolarov', '1946-09-15', '1947-12-09', 'Vasil Kolarov', BG_NOTE),
    O('Mincho Neychev', '1947-12-09', '1950-05-27', 'Mincho Neychev', BG_NOTE),
    O('Georgi Damyanov', '1950-05-27', '1958-11-27', 'Georgi Damyanov', BG_NOTE),
    O('Dimitar Ganev', '1958-11-30', '1964-04-20', 'Dimitar Ganev', BG_NOTE),
    { ...O('Georgi Traykov', '1964-04-23', '1971-07-01', 'Georgi Traykov', NOTE('his “position held” (P39) in Wikidata (CC0), checked against Bulgarian Wikipedia’s list and his Bulgarian article: his end is July 1971, day not confirmed (6 July in the list and his article, 7 July in Wikidata)')), endPrecision: 'month' },
    { ...O('Todor Zhivkov', '1971-07-01', '1989-11-17', 'Todor Zhivkov', NOTE('his “position held” (P39) in Wikidata (CC0), checked against Bulgarian Wikipedia’s list and his Bulgarian article: his start is July 1971, day not confirmed (7 July in Wikidata, 8 July in the list, 9 July in his article)')), startPrecision: 'month' },
    O('Petar Mladenov', '1989-11-17', '1990-04-03', 'Petar Mladenov', NOTE('his English Wikipedia article and Bulgarian Wikipedia’s list of heads of state (Wikidata gives no “position held” for this office)'))
  ],
  // The Republic of China, 1926-49: the persons' English articles, the timeline in English Wikipedia's "President of the
  // Republic of China" (rev 1386797813), German Wikipedia's "Staatspräsident der Republik China" (rev 272412011) and
  // Chinese Wikipedia's "國民政府主席" (rev 95226020), read on 26 and 27 November 2026. Zhang Zuolin's end is contested:
  // 4 June 1928 (his article, and Wikidata, copied from it) or 2 June (the timeline and the de list). Tan Yankai chaired
  // the Nanjing government from 7 February 1928 (his en and zh articles, the zh list), so 1928 has two rows until
  // Zhang's fall. Koo's end, 17 June 1927, is the timeline's and his article's; the German list gives 18 June and
// Wikidata (Q317462, P39 Q702650) 16 June (the fixer, 27 November 2026). Chiang Kai-shek acted by law from 1 June 1943 while Lin Sen was ill (the zh list) and was chosen
  // acting chairman on 1 August, when Lin Sen died (his article, the de list, the timeline). Li Zongren, acting from
  // 21 January 1949, is not drawn: his end in this state is 20 November 1949 or 1 March 1950, two sources each.
  Q13426199: [
    O('Duan Qirui', '1924-11-24', '1926-04-20', 'Duan Qirui', WP_NOTE('Duan Qirui', 'Provisional Chief Executive; the German list and the timeline in “President of the Republic of China” agree')),
    O('Hu Weide', '1926-04-20', '1926-05-13', 'Hu Weide', WP_NOTE('Hu Weide', 'acting; the German list and the timeline agree')),
    O('Yan Huiqing', '1926-05-13', '1926-06-22', 'Yan Huiqing', WP_NOTE('Yan Huiqing', 'acting; the German list and the timeline agree')),
    O('Du Xigui', '1926-06-22', '1926-10-01', 'Du Xigui', WP_NOTE('Du Xigui', 'acting; the German list and the timeline agree')),
    O('Wellington Koo', '1926-10-01', '1927-06-17', 'Wellington Koo', WP_NOTE('Wellington Koo', 'acting; the timeline agrees, the German list gives 18 June 1927 and Wikidata 16 June')),
    O('Zhang Zuolin', '1927-06-18', '1928-06-04', 'Zhang Zuolin', WP_NOTE('Zhang Zuolin', 'his end is contested: the German list and the timeline give 2 June 1928')),
    O('Tan Yankai', '1928-02-07', '1928-10-10', 'Tan Yankai', NOTE('his English and Chinese Wikipedia articles and Chinese Wikipedia’s list of chairmen of the National Government')),
    O('Chiang Kai-shek', '1928-10-10', '1931-12-15', 'Chiang Kai-shek', NOTE('his “position held” (P39) in Wikidata (CC0), his English Wikipedia article and the German and Chinese lists')),
    O('Lin Sen', '1931-12-15', '1943-08-01', 'Lin Sen', NOTE('his English Wikipedia article and the German and Chinese lists (he died in office)')),
    O('Chiang Kai-shek', '1943-08-01', '1948-05-20', 'Chiang Kai-shek', NOTE('his English Wikipedia article and the German and Chinese lists (acting by law from 1 June 1943 while Lin Sen was ill)')),
    O('Chiang Kai-shek', '1948-05-20', '1949-01-21', 'Chiang Kai-shek', NOTE('his “position held” (P39) in Wikidata (CC0), his English Wikipedia article and the German and Chinese lists'))
  ],
  // Costa Rica: English Wikipedia's "List of presidents of Costa Rica" (rev 1369015682), Spanish Wikipedia's "Anexo:
  // Presidentes de Costa Rica" (rev 174001444) and the persons' articles, read on 26 and 27 November 2026. Wikidata dates
  // Calderón Guardia 1840 to 1844, a slip of the century, and ends Ulate on 8 May 1953.
  Q800: [
    O('Rafael Ángel Calderón Guardia', '1940-05-08', '1944-05-08', 'Rafael Ángel Calderón Guardia', WP_LIST('List of presidents of Costa Rica', 'also the Spanish list; Wikidata gives 1840 to 1844')),
    O('Otilio Ulate Blanco', '1949-11-08', '1953-11-08', 'Otilio Ulate Blanco', WP_LIST('List of presidents of Costa Rica', 'also the Spanish list; Wikidata ends it on 8 May 1953')),
    O('José María Figueres', '1994-05-08', '1998-05-08', 'José María Figueres', LIST_NOTE('List of presidents of Costa Rica')),
    O('Abel Pacheco', '2002-05-08', '2006-05-08', 'Abel Pacheco', LIST_NOTE('List of presidents of Costa Rica')),
    O('Laura Chinchilla', '2010-05-08', '2014-05-08', 'Laura Chinchilla', LIST_NOTE('List of presidents of Costa Rica')),
    O('Luis Guillermo Solís', '2014-05-08', '2018-05-08', 'Luis Guillermo Solís', LIST_NOTE('List of presidents of Costa Rica'))
  ],
  // Cuba: the persons' English and Spanish Wikipedia articles, each with references of its own, which do not cite
  // rulers.org or worldstatesmen.org (read again by the fixer on 27 November 2026), with Wikidata where it has dates. English
  // Wikipedia's "List of heads of state of Cuba" (rev 1384584744) and Spanish Wikipedia's "Anexo:Presidentes de Cuba"
  // (rev 175307076) agree on every day, but cite nothing for these rows and link worldstatesmen.org, so they are not
  // counted (until the fixer's pass the notes named the English list). The infoboxes read: the Pentarchy, 5 to
  // 10 September 1933 ("Pentarchy of 1933", rev 1351530798; its item, Q7165047, the same); Grau, 10 September 1933 to
  // 15 January 1934 and 10 October 1944 to 10 October 1948 (en rev 1383632994, es "Ramón Grau San Martín" rev
  // 176155857); Hevia, 15 to 18 January 1934 (en rev 1347282223; the es article, rev 175946649, cites nothing);
  // Mendieta, 18 January 1934 to 11 December 1935 (en rev 1373869616, es rev 176365267); Barnet, 11 December 1935 to
  // 20 May 1936 (en rev 1347611736; he has no Spanish article); Laredo Brú, 24 December 1936 to 10 October 1940 (en rev
  // 1347062534, es rev 176365365); Batista, 10 October 1940 to 10 October 1944 (en rev 1387965170; es rev 176473968);
  // Urrutia from 2 January 1959 (en rev 1374695517, es rev 175335514; Wikidata 3 January) to 18 July 1959 (en; the es
  // article ends it on 17 July).
  Q241: [
    O('Gerardo Machado', '1925-05-20', '1933-08-12'),
    O('Pentarchy of 1933', '1933-09-05', '1933-09-10', 'Pentarchy of 1933', WP_NOTE('Pentarchy of 1933', 'a collective head of state of five; its Wikidata item gives the same days')),
    O('Ramón Grau', '1933-09-10', '1934-01-15', 'Ramón Grau', NOTE('his English and Spanish Wikipedia articles (Wikidata holds no dates for this term)')),
    O('Carlos Hevia', '1934-01-15', '1934-01-18', 'Carlos Hevia', WP_NOTE('Carlos Hevia', 'provisional; his Spanish article agrees')),
    O('Carlos Mendieta', '1934-01-18', '1935-12-11', 'Carlos Mendieta', NOTE('his English and Spanish Wikipedia articles (Wikidata holds no dates)')),
    O('José Agripino Barnet', '1935-12-11', '1936-05-20', 'José Agripino Barnet', WP_NOTE('José Agripino Barnet', 'Wikidata holds no dates')),
    O('Miguel Mariano Gómez', '1936-05-20', '1936-12-24'),
    O('Federico Laredo Brú', '1936-12-24', '1940-10-10', 'Federico Laredo Brú', NOTE('his English and Spanish Wikipedia articles (Wikidata holds no dates)')),
    O('Fulgencio Batista', '1940-10-10', '1944-10-10', 'Fulgencio Batista', NOTE('his English and Spanish Wikipedia articles (Wikidata holds no “position held” for his elected term)')),
    O('Ramón Grau', '1944-10-10', '1948-10-10', 'Ramón Grau', NOTE('his English and Spanish Wikipedia articles (Wikidata holds no dates for this term)')),
    O('Manuel Urrutia Lleó', '1959-01-02', '1959-07-18', 'Manuel Urrutia Lleó', NOTE('his English and Spanish Wikipedia articles for the start (Wikidata gives 3 January); his English article for the end (the Spanish one gives 17 July)')),
    O('Osvaldo Dorticós Torrado', '1959-07-18', '1976-12-02')
  ],
  // Cyprus: English Wikipedia's "President of Cyprus" (rev 1388070204) and the persons' articles, read on 26 and
  // 27 November 2026. The
  // Greek list runs Makarios from 1960 to 1977 without the coup of 1974; the data draws Sampson, so the English split is
  // the one that fits. Papadopoulos, 28 February 2003 to 28 February 2008: the en list, his article and the el list
  // (Wikidata and the el article give 1 March 2003 to 27 February 2008).
  Q229: [
    O('Makarios III', '1960-08-16', '1974-07-15', 'Makarios III', WP_NOTE('President of Cyprus', 'Wikidata runs his terms through the coup')),
    O('Glafcos Clerides', '1974-07-23', '1974-12-07', 'Glafcos Clerides', WP_NOTE('President of Cyprus', 'acting')),
    O('Makarios III', '1974-12-07', '1977-08-03', 'Makarios III', WP_NOTE('President of Cyprus', 'to his death; Wikidata gives 31 August')),
    O('Spyros Kyprianou', '1977-08-03', '1988-02-28', 'Spyros Kyprianou', WP_NOTE('President of Cyprus', 'acting until his election on 3 September 1977; Wikidata starts him on 1 September')),
    O('Tassos Papadopoulos', '2003-02-28', '2008-02-28', 'Tassos Papadopoulos', WP_NOTE('President of Cyprus', 'also his article and the Greek list; Wikidata gives 1 March 2003 to 27 February 2008'))
  ],
  // Dominican Republic: English Wikipedia's "List of presidents of the Dominican Republic" (rev 1382313624, read again by
  // the fixer on 27 November 2026; it links neither rulers.org nor worldstatesmen.org), Spanish Wikipedia's "Anexo:
  // Presidentes de la República Dominicana" (rev 176283164), the persons' and bodies' articles, and Wikidata, read on 26
  // and 27 November 2026. Horacio Vásquez's start is contested, 12 July 1924 (the en list and the es table) or 24 July
  // (Wikidata and his article), so it is given as July 1924, day not confirmed. Peynado to 7 March 1940 (the en list
  // and the es table; his article gives 24 February). The Triumvirate of 1963 ran to 27 June 1964 and the Second
  // Triumvirate from that day (their own articles); Emilio de los Santos presided to 22 December 1963 and Donald Reid
  // Cabral from 28 December 1963 (his article; the es table). Molina Ureña, of the Constitutionalist side, is drawn
  // because no rival held office from 25 April to 1 May 1965 (the en list); Caamaño, from 4 May 1965, is not drawn yet.
  // Benoit, president of the military junta, 1 to 7 May 1965: the en and es lists, his Spanish article (rev 175366201)
  // and Wikidata (Q2342344, P39 Q607982); his English article (rev 1347130058) cites nothing, links only rulers.org and
  // gives 5 May, so it is not counted (the fixer, 27 November 2026).
  Q786: [
    { ...O('Horacio Vásquez', '1924-07-01', '1930-03-03', 'Horacio Vásquez', NOTE('English Wikipedia’s list “List of presidents of the Dominican Republic”, the Spanish list, his article and Wikidata (CC0); the start is 12 July 1924 in the lists and 24 July in Wikidata and his article, so only the month is given')), startPrecision: 'month' },
    O('Rafael Estrella Ureña', '1930-03-03', '1930-04-22', 'Rafael Estrella Ureña', WP_NOTE('List of presidents of the Dominican Republic', 'Wikidata holds no dates')),
    O('Jacinto Peynado', '1930-04-22', '1930-05-21', 'Jacinto Peynado', WP_NOTE('List of presidents of the Dominican Republic', 'acting')),
    O('Rafael Estrella Ureña', '1930-05-21', '1930-08-16', 'Rafael Estrella Ureña', WP_NOTE('List of presidents of the Dominican Republic', 'Wikidata holds no dates')),
    O('Rafael Trujillo', '1930-08-16', '1938-08-16'),
    O('Jacinto Peynado', '1938-08-16', '1940-03-07', 'Jacinto Peynado', WP_NOTE('List of presidents of the Dominican Republic', 'also the Spanish list; his article ends it on 24 February 1940')),
    O('Manuel Troncoso de la Concha', '1940-03-07', '1942-05-18', 'Manuel Troncoso de la Concha', WP_NOTE('List of presidents of the Dominican Republic', 'Wikidata holds no dates')),
    O('Rafael Trujillo', '1942-05-18', '1952-08-16'),
    O('Héctor Trujillo', '1952-08-16', '1960-08-03', 'Héctor Trujillo', WP_NOTE('List of presidents of the Dominican Republic', 'his acting term of 1951 overlaps his brother and is left out')),
    O('Joaquín Balaguer', '1960-08-03', '1962-01-16', 'Joaquín Balaguer', WP_NOTE('List of presidents of the Dominican Republic', 'President of the Council of State from 1 January 1962')),
    O('Rafael Filiberto Bonnelly', '1962-01-18', '1963-02-27', 'Rafael Filiberto Bonnelly', WP_NOTE('List of presidents of the Dominican Republic', 'President of the Council of State')),
    O('Triumvirate of 1963', '1963-09-26', '1964-06-27', 'Triumvirate of 1963', WP_NOTE('Triumvirate of 1963', 'a collective head of state, presided by Emilio de los Santos to 22 December 1963, then by Donald Reid Cabral')),
    O('Second Triumvirate', '1964-06-27', '1965-04-25', 'Second Triumvirate (Dominican Republic)', WP_NOTE('Second Triumvirate (Dominican Republic)', 'a collective head of state, presided by Donald Reid Cabral; the end from the English and Spanish lists')),
    O('José Rafael Molina Ureña', '1965-04-25', '1965-04-27', 'José Rafael Molina Ureña', WP_NOTE('List of presidents of the Dominican Republic', 'provisional')),
    O('Pedro Bartolomé Benoit', '1965-05-01', '1965-05-07', 'Pedro Bartolomé Benoit', NOTE('his “position held” (P39) in Wikidata (CC0), checked against English and Spanish Wikipedia’s lists of presidents of the Dominican Republic and his Spanish article (president of the military junta; his English article, which cites nothing, gives 5 May)'))
  ],
  // El Salvador: English Wikipedia's "List of heads of state of El Salvador" (rev 1386494835, read again by the fixer
  // on 27 November 2026) and Spanish Wikipedia's "Anexo:Presidentes
  // de El Salvador" (rev 175717935), which agree on every day, with the persons' articles and Wikidata, read on 26 and
  // 27 November 2026. The hand-over of 1934 is 28 August in five free pages (both lists, Hernández Martínez's en and es
  // articles, Menéndez's es article) and 29 August in two (Wikidata, Menéndez's en article).
  Q792: [
    O('Civic Directory', '1931-12-02', '1931-12-04', 'Civic Directory', WP_NOTE('List of heads of state of El Salvador', 'a collective head of state')),
    O('Maximiliano Hernández Martínez', '1931-12-04', '1934-08-28', 'Maximiliano Hernández Martínez', WP_NOTE('List of heads of state of El Salvador', 'provisional; also the Spanish list and his English and Spanish articles; Wikidata gives 29 August')),
    O('Andrés Ignacio Menéndez', '1934-08-28', '1935-03-01', 'Andrés Ignacio Menéndez', WP_NOTE('List of heads of state of El Salvador', 'provisional; also the Spanish list; Wikidata gives 29 August')),
    O('Maximiliano Hernández Martínez', '1935-03-01', '1944-05-09', 'Maximiliano Hernández Martínez', WP_NOTE('List of heads of state of El Salvador', 'Wikidata holds a wrong end')),
    O('Andrés Ignacio Menéndez', '1944-05-09', '1944-10-21'),
    O('Osmín Aguirre y Salinas', '1944-10-21', '1945-03-01', 'Osmín Aguirre y Salinas', WP_NOTE('List of heads of state of El Salvador', 'provisional')),
    O('Salvador Castaneda Castro', '1945-03-01', '1948-12-14', 'Salvador Castaneda Castro', WP_NOTE('List of heads of state of El Salvador', 'Wikidata holds no dates')),
    O('Revolutionary Council of Government', '1948-12-14', '1950-09-14', 'Revolutionary Council of Government (El Salvador)', WP_NOTE('List of heads of state of El Salvador', 'a collective head of state')),
    O('Óscar Osorio', '1950-09-14', '1956-09-14', 'Óscar Osorio', WP_NOTE('List of heads of state of El Salvador', 'Wikidata holds no dates')),
    O('José María Lemus', '1956-09-14', '1960-10-26', 'José María Lemus', WP_NOTE('List of heads of state of El Salvador', 'Wikidata holds no dates')),
    O('Junta of Government', '1960-10-26', '1961-01-25', 'Junta of Government (El Salvador)', WP_NOTE('List of heads of state of El Salvador', 'a collective head of state')),
    O('Civic-Military Directory', '1961-01-25', '1962-01-25', 'Civic-Military Directory', WP_NOTE('List of heads of state of El Salvador', 'a collective head of state')),
    O('Eusebio Rodolfo Cordón Cea', '1962-01-25', '1962-07-01', 'Eusebio Rodolfo Cordón Cea', WP_NOTE('List of heads of state of El Salvador', 'provisional')),
    O('Julio Adalberto Rivera Carballo', '1962-07-01', '1967-07-01', 'Julio Adalberto Rivera Carballo', WP_NOTE('List of heads of state of El Salvador', 'Wikidata holds no dates')),
    O('Fidel Sánchez Hernández', '1967-07-01', '1972-07-01', 'Fidel Sánchez Hernández', WP_NOTE('List of heads of state of El Salvador', 'Wikidata holds a wrong end')),
    O('Carlos Humberto Romero', '1977-07-01', '1979-10-15', 'Carlos Humberto Romero', WP_NOTE('List of heads of state of El Salvador', 'Wikidata holds no dates')),
    O('Revolutionary Government Junta', '1979-10-15', '1982-05-02', 'Revolutionary Government Junta of El Salvador', WP_NOTE('List of heads of state of El Salvador', 'a collective head of state; three juntas in turn')),
    O('Francisco Flores Pérez', '1999-06-01', '2004-06-01', 'Francisco Flores Pérez', WP_NOTE('List of heads of state of El Salvador', 'Wikidata’s head of government (P6) agrees; its “position held” ends wrongly')),
    O('Antonio Saca', '2004-06-01', '2009-06-01')
  ],
  // Estonia: the State Elders, who were also heads of government. Wikidata P39, English Wikipedia's "State Elder of
  // Estonia" and Estonian Wikipedia's "Riigivanem" list (rev 7052660, which cites Riigi Teataja) agree on every day, read
  // on 26 and 27 November 2026. Päts as President-Regent to 24 April 1938, the day the office ended (its Wikidata item,
  // Q7241200, P576) and he became President (the en list's note); the 9 May 1938 of his P39 is the end of his caretaker
  // cabinet. Arnold Rüütel, chairman of the Supreme Council in 1990-92, is not drawn yet.
  Q191: [
    O('Jaan Teemant', '1925-12-15', '1927-12-09'),
    O('Jaan Tõnisson', '1927-12-09', '1928-12-04'),
    O('August Rei', '1928-12-04', '1929-07-09'),
    O('Otto Strandman', '1929-07-09', '1931-02-12'),
    O('Konstantin Päts', '1931-02-12', '1932-02-19'),
    O('Jaan Teemant', '1932-02-19', '1932-07-19'),
    O('Kaarel Eenpalu', '1932-07-19', '1932-11-01'),
    O('Konstantin Päts', '1932-11-01', '1933-05-18'),
    O('Jaan Tõnisson', '1933-05-18', '1933-10-21'),
    O('Konstantin Päts', '1933-10-21', '1934-01-24'),
    O('Konstantin Päts', '1934-01-24', '1937-09-03', 'Konstantin Päts', WP_NOTE('State Elder of Estonia', 'Prime Minister in duties of the State Elder; Wikidata and Estonian Wikipedia agree')),
    O('Konstantin Päts', '1937-09-03', '1938-04-24', 'Konstantin Päts', WP_NOTE('State Elder of Estonia', 'President-Regent, to the day the office ended (Wikidata’s item for it); his “position held” gives 9 May 1938, the end of his caretaker cabinet'))
  ],
  // France: Wikidata P39, English Wikipedia's "List of presidents of France" (rev 1381038946) and French Wikipedia's
  // "Liste des chefs d'État français" (rev 241242427), read on 26 and 27 November 2026. Pétain to 20 August 1944 (Wikidata and fr; en 19
  // August). De Gaulle from 20 August 1944, when Pétain's rule ended; Wikidata and the en list start his provisional
  // government on 3 June 1944, which would put him in a second row beside Pétain, and that is not drawn yet. Gouin, 26
  // January to 24 June 1946 (Wikidata and en; fr gives 23 January to 12 June). Bidault to 16 December 1946 (Wikidata
  // Q23004974 and fr; en 28 November). Blum, chairman of the Provisional Government, from 16 December 1946 to
  // Auriol's term on 16 January 1947 (Wikidata P39 Q23004974, from 16 December; the en and fr lists), as Andorra's
  // French Co-Prince is dated in leader-lists.mjs, where the contrary reading of French Wikipedia's list of presidents
  // (Auriol acting from late 1946, no day) is named (the fixer, 27 November 2026: until then Blum was not drawn here).
  Q142: [
    O('Gaston Doumergue', '1924-06-13', '1931-06-13'),
    O('Paul Doumer', '1931-06-13', '1932-05-07'),
    O('Albert Lebrun', '1932-05-10', '1940-07-11'),
    O('Philippe Pétain', '1940-07-11', '1944-08-20', 'Philippe Pétain', NOTE('his “position held: Head of the French State” (P39) in Wikidata (CC0), checked against French Wikipedia’s list of French heads of state (English Wikipedia’s list gives 19 August)')),
    O('Charles de Gaulle', '1944-08-20', '1946-01-20', 'Charles de Gaulle', NOTE('his “position held” (P39) in Wikidata (CC0) for the end, checked against English and French Wikipedia’s lists; from 20 August 1944, when Pétain’s rule ended (Wikidata and the English list date his provisional government from 3 June 1944)')),
    O('Félix Gouin', '1946-01-26', '1946-06-24'),
    O('Georges Bidault', '1946-06-24', '1946-12-16', 'Georges Bidault', NOTE('his “position held” (P39) in Wikidata (CC0), checked against French Wikipedia’s list (English Wikipedia’s list ends it on 28 November)')),
    O('Léon Blum', '1946-12-16', '1947-01-16', 'Léon Blum', NOTE('his “position held: chairman of the Provisional Government” (P39) in Wikidata (CC0) for the start, checked against English and French Wikipedia’s lists, which end it on 16 January 1947, when Vincent Auriol became President (French Wikipedia’s list of presidents has Auriol act as head of state from late 1946, with no day)'))
  ],
  // Greece: English Wikipedia's "List of heads of state of Greece" (rev 1386602942), the persons' en and el articles, and Wikidata, read
  // on 26 and 27 November 2026 (the en list cites three sources and links rulers.org, so it is not counted on its own,
  // only with the articles). Sartzetakis was elected on 29 March 1985 (Wikidata, his en and el infoboxes) and sworn in on 30 March (the
  // en list, his en article's text, the el succession box, Alevras's en infobox), so 30 March, the oath, is used.
  // Papoulias from 12 March 2005 (the en list, his en and el infoboxes; Wikidata 21 March). The data starts Karamanlis's
  // term of 1980 on 15 May, where his P39 and the en list give 10 May: noted, not mended here.
  Q41: [
    O('Ioannis Alevras', '1985-03-10', '1985-03-30', 'Ioannis Alevras', WP_NOTE('Ioannis Alevras', 'acting')),
    O('Christos Sartzetakis', '1985-03-30', '1990-05-05', 'Christos Sartzetakis', WP_NOTE('Christos Sartzetakis', 'sworn in on 30 March 1985, as its text and the Greek article give; Wikidata gives his election on 29 March')),
    O('Konstantinos Karamanlis', '1990-05-05', '1995-03-10'),
    O('Konstantinos Stephanopoulos', '1995-03-10', '2005-03-12'),
    O('Karolos Papoulias', '2005-03-12', '2015-03-13', 'Karolos Papoulias', WP_NOTE('Karolos Papoulias', 'also the Greek article; Wikidata gives 21 March'))
  ],
  // Guatemala: Wikidata P39 (president of Guatemala, Q6085537), English Wikipedia's "President of Guatemala" (rev
  // 1380619023), German and Spanish Wikipedia and the persons' articles, read on 26 and 27 November 2026. Chacón to
  // 13 December 1930, the day the drawn Baudilio Palma starts (es article, de list; en 12 December). Castillo Armas from
  // 8 July 1954 (the en and de lists), meeting Monzón's end; Wikidata and his en article give 7 July. González López from
  // 27 July 1957 (the en and de lists and his es article; Wikidata and his en article 26 July). The Revolutionary
  // Government Junta of 1944-45 was Jorge Toriello, Francisco Javier Arana and Jacobo Árbenz (the en list; Wikidata P39
  // of Toriello and Arana, same days); it has no article of its own.
  Q774: [
    O('José María Orellana', '1921-12-10', '1926-09-26', 'José María Orellana', LIST_NOTE('President of Guatemala')),
    O('Lázaro Chacón González', '1926-09-26', '1930-12-13', 'Lázaro Chacón González', NOTE('his Spanish Wikipedia article and German Wikipedia’s list of presidents of Guatemala (English Wikipedia gives 12 December 1930; Wikidata 2 January 1931)')),
    O('Manuel María Orellana Contreras', '1930-12-17', '1931-01-02', 'Manuel María Orellana Contreras', LIST_NOTE('President of Guatemala')),
    O('José María Reina Andrade', '1931-01-02', '1931-02-14', 'José María Reina Andrade', LIST_NOTE('President of Guatemala')),
    O('Jorge Ubico', '1931-02-14', '1944-07-01', 'Jorge Ubico', LIST_NOTE('President of Guatemala')),
    O('Juan Federico Ponce Vaides', '1944-07-04', '1944-10-20', 'Juan Federico Ponce Vaides', LIST_NOTE('President of Guatemala')),
    N('Revolutionary Government Junta', '1944-10-20', '1945-03-15', NOTE('English Wikipedia’s “President of Guatemala” and the “position held” (P39) in Wikidata (CC0) of Jorge Toriello and Francisco Javier Arana; a collective head of state of Jorge Toriello, Francisco Javier Arana and Jacobo Árbenz, with no article of its own')),
    O('Juan José Arévalo', '1945-03-15', '1951-03-15', 'Juan José Arévalo', LIST_NOTE('President of Guatemala')),
    O('Jacobo Árbenz', '1951-03-15', '1954-06-27', 'Jacobo Árbenz', LIST_NOTE('President of Guatemala')),
    O('Carlos Castillo Armas', '1954-07-08', '1957-07-26', 'Carlos Castillo Armas', NOTE('English Wikipedia’s “President of Guatemala” and German Wikipedia’s list for the start (Wikidata and his article give 7 July 1954); Wikidata (CC0) and his article for his death on 26 July 1957')),
    O('Luis Arturo González López', '1957-07-27', '1957-10-24', 'Luis Arturo González López', NOTE('English Wikipedia’s “President of Guatemala”, German Wikipedia’s list and his Spanish article (Wikidata and his English article give 26 July 1957)')),
    O('Kjell Eugenio Laugerud García', '1974-07-01', '1978-07-01', 'Kjell Eugenio Laugerud García', WP_LIST('President of Guatemala', 'Wikidata gives no “position held” in the office')),
    O('Fernando Romeo Lucas García', '1978-07-01', '1982-03-23', 'Fernando Romeo Lucas García', WP_LIST('President of Guatemala', 'Wikidata’s “position held” has no dates')),
    O('Alfonso Portillo', '2000-01-14', '2004-01-14', 'Alfonso Portillo', LIST_NOTE('President of Guatemala')),
    O('Óscar Berger', '2004-01-14', '2008-01-14', 'Óscar Berger', LIST_NOTE('President of Guatemala')),
    O('Álvaro Colom', '2008-01-14', '2012-01-14', 'Álvaro Colom', LIST_NOTE('President of Guatemala'))
  ],
  // Haiti: Wikidata P39 (President of Haiti, Q3290543), English Wikipedia's "List of heads of state of Haiti" (rev
  // 1380500438), French Wikipedia and the persons' articles, read on 26 and 27 November 2026. Namphy, President of the
  // National Council of Government, from 7 February 1986, the day Duvalier left (the en list, his en article; Wikidata,
  // the fr list and its prose give 6 February). From the coup of 1991 the lane follows the holders in Haiti, then from
  // 15 June 1993 to 12 May 1994 Aristide, recognised in Haiti though in exile (the en list), then Jonassaint, provisional
  // President under the junta, then Aristide again.
  Q790: [
    O('Louis Borno', '1922-05-15', '1930-05-15', 'Louis Borno', LIST_NOTE('List of heads of state of Haiti')),
    O('Louis Eugène Roy', '1930-05-15', '1930-11-18', 'Louis Eugène Roy', LIST_NOTE('List of heads of state of Haiti')),
    O('Sténio Vincent', '1930-11-18', '1941-05-15', 'Sténio Vincent', LIST_NOTE('List of heads of state of Haiti')),
    O('Franck Lavaud', '1950-05-10', '1950-12-06', 'Franck Lavaud', LIST_NOTE('List of heads of state of Haiti')),
    O('Paul Magloire', '1950-12-06', '1956-12-12', 'Paul Magloire', LIST_NOTE('List of heads of state of Haiti')),
    O('Henri Namphy', '1986-02-07', '1988-02-07', 'Henri Namphy', WP_LIST('List of heads of state of Haiti', 'President of the National Council of Government; Wikidata and French Wikipedia give 6 February 1986')),
    O('Prosper Avril', '1988-09-17', '1990-03-10', 'Prosper Avril', WP_LIST('List of heads of state of Haiti', 'Wikidata gives only the month and year')),
    O('Raoul Cédras', '1991-09-29', '1991-10-08', 'Raoul Cédras', WP_LIST('List of heads of state of Haiti', 'commander-in-chief after the coup')),
    O('Joseph Nérette', '1991-10-08', '1992-06-19', 'Joseph Nérette', WP_LIST('List of heads of state of Haiti', 'provisional; Wikidata’s “position held” has no dates')),
    O('Marc Bazin', '1992-06-19', '1993-06-15', 'Marc Bazin', LIST_NOTE('List of heads of state of Haiti')),
    O('Jean-Bertrand Aristide', '1993-06-15', '1994-05-12', 'Jean-Bertrand Aristide', WP_NOTE('List of heads of state of Haiti', 'in exile, but recognised in Haiti; Wikidata gives only the years')),
    O('Émile Jonassaint', '1994-05-12', '1994-10-12', 'Émile Jonassaint', LIST_NOTE('List of heads of state of Haiti')),
    O('Jean-Bertrand Aristide', '1994-10-12', '1996-02-07', 'Jean-Bertrand Aristide', LIST_NOTE('List of heads of state of Haiti'))
  ],
  // Honduras: Wikidata P39 (President of Honduras, Q13341442), English Wikipedia's "List of presidents of Honduras" (rev
  // 1369015001) and the persons' en and es articles, read on 26 and 27 November 2026. Lozano Díaz held presidential
  // authority from 16 November 1954 while Gálvez was abroad (his en article, the es list), and took office on 5 December.
  Q783: [
    O('Juan Manuel Gálvez', '1949-01-01', '1954-12-05', 'Juan Manuel Gálvez', LIST_NOTE('List of presidents of Honduras')),
    O('Julio Lozano Díaz', '1954-12-05', '1956-10-21', 'Julio Lozano Díaz', LIST_NOTE('List of presidents of Honduras')),
    O('Honduran military junta of 1956–1957', '1956-10-21', '1957-12-21', 'Honduran military junta of 1956–1957', LIST_NOTE('List of presidents of Honduras')),
    O('Carlos Roberto Flores', '1998-01-27', '2002-01-27', 'Carlos Roberto Flores', LIST_NOTE('List of presidents of Honduras'))
  ],
  // Hungary: Wikidata P39 (Regent, Leader of the Nation, President of the Republic, President of the Presidential
  // Council), Hungarian Wikipedia's "Magyarország államfőinek listája" (rev 29503449) and the persons' articles, read on
  // 26 and 27 November 2026. English Wikipedia's "List of heads of state of Hungary" links rulers.org and is not counted.
  // Horthy to 16 October 1944 (his en and hu articles, the hu list; Wikidata 15 October). Szálasi from his oath on
  // 4 November 1944 (his en and hu articles; Wikidata 2 November) to 28 March 1945 (Wikidata, the hu list, the article
  // "High National Council"; his articles give 7 May). His term and the High National Council's overlap on purpose,
  // from 26 January to 28 March 1945: two rival authorities held office at once, so the lane draws two rows then, as
  // China's does in 1928 (the fixer, 27 November 2026). Béla Miklós is named head of state only in lists,
  // and is not drawn. Szakasits from 3 August 1948 (his article, the hu list; Wikidata's 3 February is a slip) and as chairman of
  // the Presidential Council to 8 May 1950, Rónai's start (Wikidata, his article, the hu list).
  Q28: [
    O('Miklós Horthy', '1920-03-01', '1944-10-16', 'Miklós Horthy', NOTE('his “position held: Regent of Hungary” (P39) in Wikidata (CC0) for the start; his English and Hungarian articles and Hungarian Wikipedia’s list for the end (Wikidata gives 15 October)')),
    O('Ferenc Szálasi', '1944-11-04', '1945-03-28', 'Ferenc Szálasi', NOTE('his English and Hungarian Wikipedia articles for the start (Wikidata gives 2 November); Wikidata (CC0), Hungarian Wikipedia’s list and the article “High National Council” for the end (his articles give 7 May 1945)')),
    O('High National Council', '1945-01-26', '1946-02-01', 'High National Council', NOTE('its English and Hungarian Wikipedia articles; a collective head of state of three')),
    O('Zoltán Tildy', '1946-02-01', '1948-08-03', 'Zoltán Tildy', HU_NOTE),
    O('Árpád Szakasits', '1948-08-03', '1949-08-23', 'Árpád Szakasits', NOTE('his English Wikipedia article and Hungarian Wikipedia’s list (Wikidata gives 3 February 1948, a slip)')),
    O('Árpád Szakasits', '1949-08-23', '1950-05-08', 'Árpád Szakasits', NOTE('his English Wikipedia article and Hungarian Wikipedia’s list (chairman of the Presidential Council)')),
    O('Sándor Rónai', '1950-05-08', '1952-08-14', 'Sándor Rónai', HU_NOTE),
    O('István Dobi', '1952-08-14', '1967-04-14', 'István Dobi', HU_NOTE),
    O('Pál Losonczi', '1967-04-14', '1987-06-25', 'Pál Losonczi', HU_NOTE),
    O('Károly Németh', '1987-06-25', '1988-06-29', 'Károly Németh (politician)', HU_NOTE),
    O('Brunó Ferenc Straub', '1988-06-29', '1989-10-23', 'Brunó Ferenc Straub', HU_NOTE)
  ],
  // Iceland: Wikidata P39 (President of Iceland, Q19188924) and English Wikipedia's "President of Iceland" (rev
  // 1377204771), read on 26 and 27 November 2026. Sveinn Björnsson died in office on 25 January 1952 (the article's table,
  // his article; Wikidata gives the end of his term, 31 July). Until 1 August 1952 the Prime Minister, the President of
  // the Althing and the President of the Supreme Court held the President's powers jointly (the article's note):
  // Steingrímur Steinþórsson, Jón Pálmason and Jón Ásbjörnsson.
  Q189: [
    O('Sveinn Björnsson', '1944-06-17', '1952-01-25', 'Sveinn Björnsson', WP_NOTE('President of Iceland', 'he died in office; Wikidata gives the end of his term, 31 July 1952')),
    N('The holders of the President’s powers (the Prime Minister, the President of the Althing and the President of the Supreme Court)', '1952-01-25', '1952-08-01', WP_NOTE('President of Iceland', 'its note: the powers were held jointly by the three')),
    O('Ásgeir Ásgeirsson', '1952-08-01', '1968-07-31', 'Ásgeir Ásgeirsson', LIST_NOTE('President of Iceland')),
    O('Kristján Eldjárn', '1968-08-01', '1980-07-31', 'Kristján Eldjárn', LIST_NOTE('President of Iceland')),
    O('Vigdís Finnbogadóttir', '1980-08-01', '1996-07-31', 'Vigdís Finnbogadóttir', LIST_NOTE('President of Iceland'))
  ],
  // Latvia: Wikidata P39 (President of Latvia, Q218014), English Wikipedia's "President of Latvia" (rev 1386224720) and
  // the Chancery of the President's "Latvijas Valsts prezidenta institūcijas vēsture" (president.lv, an official page),
  // read on 26 and 27 November 2026. Each term runs from the oath, as president.lv gives it: Zemgals to 11 April 1930
  // and Kviesis from that day (elected on 9 April, as Wikidata and Latvian Wikipedia give it); Guntis Ulmanis from his
  // oath on 8 July 1993 (elected on 7 July). Gorbunovs, Chairman of the Supreme Council, did the head of state's work
  // "in the transition period" that began with the declaration of 4 May 1990 (president.lv; the en article's prose), with
  // no day for it: May 1990, day not confirmed. The en table and German Wikipedia's list date him from 21 August 1991.
  Q211: [
    O('Jānis Čakste', '1922-11-14', '1927-03-14', 'Jānis Čakste', LIST_NOTE('President of Latvia')),
    O('Pauls Kalniņš', '1927-03-14', '1927-04-08', 'Pauls Kalniņš', LIST_NOTE('President of Latvia')),
    O('Gustavs Zemgals', '1927-04-08', '1930-04-11', 'Gustavs Zemgals', NOTE('the Chancery of the President of Latvia’s history of the office (president.lv) and English Wikipedia’s “President of Latvia”: from oath to oath (Wikidata ends it wrongly, on 4 September 1930)')),
    O('Alberts Kviesis', '1930-04-11', '1936-04-11', 'Alberts Kviesis', NOTE('the Chancery of the President of Latvia’s history of the office (president.lv): from his oath (Wikidata gives his election on 9 April 1930)')),
    O('Kārlis Ulmanis', '1936-04-11', '1940-07-21', 'Kārlis Ulmanis', LIST_NOTE('President of Latvia')),
    { ...O('Anatolijs Gorbunovs', '1990-05-01', '1993-07-08', 'Anatolijs Gorbunovs', NOTE('the Chancery of the President of Latvia (president.lv) and English Wikipedia’s “President of Latvia”: as Chairman of the Supreme Council he did the head of state’s work in the transition period from May 1990, day not confirmed')), startPrecision: 'month' },
    O('Guntis Ulmanis', '1993-07-08', '1999-07-08', 'Guntis Ulmanis', NOTE('the Chancery of the President of Latvia (president.lv): from his oath on 8 July 1993 (Wikidata gives his election on 7 July)')),
    O('Vaira Vīķe-Freiberga', '1999-07-08', '2007-07-08', 'Vaira Vīķe-Freiberga', LIST_NOTE('President of Latvia')),
    O('Valdis Zatlers', '2007-07-08', '2011-07-08', 'Valdis Zatlers', LIST_NOTE('President of Latvia'))
  ],
  // Lithuania: Landsbergis, Chairman of the Supreme Council and the official head of state from 11 March 1990 (his
  // English article and Lithuanian Wikipedia's prose; Wikidata dates his speakership 10 March to 22 November 1992), and
  // Brazauskas acting from 25 November 1992 to his oath as President on 25 February 1993 (his English article; Wikidata
  // P39 President of the Republic of Lithuania, Q878222, from 25 February 1993). Read on 26 and 27 November 2026. His
  // presidency ends on 26 February 1998, the day Adamkus took the oath, as Wikidata's head of state (P35) of Lithuania
  // gives it; his own P39 ends it on 25 February (the fixer, 27 November 2026).
  // English Wikipedia's "List of heads of state of Lithuania" agrees; it links rulers.org and is not counted.
  Q37: [
    O('Vytautas Landsbergis', '1990-03-11', '1992-11-25', 'Vytautas Landsbergis', NOTE('his English Wikipedia article and Lithuanian Wikipedia: Chairman of the Supreme Council, the head of state (Wikidata dates his speakership from 10 March to 22 November 1992)')),
    O('Algirdas Brazauskas', '1992-11-25', '1993-02-25', 'Algirdas Brazauskas', WP_NOTE('Algirdas Brazauskas', 'acting President as Speaker of the Seimas; Wikidata dates the speakership from 24 November 1992'))
  ],
  // Malta: Wikidata P39 (President of Malta, Q796593) and the persons' English and Maltese articles, read on 26 and 27
  // November 2026. English Wikipedia's "List of heads of state of Malta" cites nothing and links rulers.org, so it is
  // not counted. Albert Hyzler, acting, 27 December 1981 to 15 February 1982 (his en and mt articles; his P39, for the
  // office Q19367406, has no dates). Paul
  // Xuereb, acting, from 16 February 1987 (Wikidata, his en and mt articles) to the next oath on 4 April 1989.
  Q233: [
    O('Anthony Mamo', '1974-12-13', '1976-12-27', 'Anthony Mamo', MT_NOTE),
    O('Anton Buttigieg', '1976-12-27', '1981-12-27', 'Anton Buttigieg', MT_NOTE),
    O('Albert Hyzler', '1981-12-27', '1982-02-15', 'Albert Hyzler', WP_NOTE('Albert Hyzler', 'acting; also Maltese Wikipedia; Wikidata’s “position held” for it has no dates')),
    O('Agatha Barbara', '1982-02-15', '1987-02-15', 'Agatha Barbara', MT_NOTE),
    O('Paul Xuereb', '1987-02-16', '1989-04-04', 'Paul Xuereb', NOTE('his “position held” (P39) in Wikidata (CC0) and his English and Maltese Wikipedia articles (acting)')),
    O('Ċensu Tabone', '1989-04-04', '1994-04-04', 'Ċensu Tabone', MT_NOTE),
    O('Ugo Mifsud Bonnici', '1994-04-04', '1999-04-04', 'Ugo Mifsud Bonnici', MT_NOTE),
    O('Guido de Marco', '1999-04-04', '2004-04-04', 'Guido de Marco', MT_NOTE),
    O('Eddie Fenech Adami', '2004-04-04', '2009-04-04', 'Eddie Fenech Adami', MT_NOTE),
    O('George Abela', '2009-04-04', '2014-04-04', 'George Abela', MT_NOTE)
  ],
  // Moldova: the acting Presidents of 2009-12, from Wikidata P39 (President of Moldova, Q312271; Ghimpu's with P5102
  // acting) and English Wikipedia's "President of Moldova" (rev 1375165325), read on 26 and 27 November 2026. Voronin's
  // term, which Wikidata's P35 gives only to the year, ends on 11 September 2009 (his P39; the en list), CORRECTIONS
  // below, so the lane does not draw him and Ghimpu together to the end of 2009.
  Q217: [
    O('Mihai Ghimpu', '2009-09-11', '2010-12-28', 'Mihai Ghimpu', LIST_NOTE('President of Moldova')),
    O('Vlad Filat', '2010-12-28', '2010-12-30', 'Vlad Filat', LIST_NOTE('President of Moldova')),
    O('Marian Lupu', '2010-12-30', '2012-03-23', 'Marian Lupu', LIST_NOTE('President of Moldova'))
  ],
  // Nicaragua: Wikidata P39 (President of Nicaragua, Q852448), Spanish Wikipedia's "Copresidente de Nicaragua" (rev
  // 176313743), German Wikipedia's list and the persons' English articles, read on 26 and 27 November 2026. Sacasa to
  // 6 June 1936 (the es and de lists, his es article, Wikidata's statement on Julián Irías, acting 6 to 9 June; his en
  // infobox and his own P39 give 9 June); Irías has no English article and is not drawn. Lacayo Sacasa from 27 May 1947
  // (his en article's lead, the es and de lists; Wikidata 26 May). Somoza García from 7 May 1950 is contested: Wikidata
  // and the es list give 7 May, his en article and the de list 21 May; 7 May meets Zurita's end. The two juntas have
  // their own articles (succession boxes, members named). Solórzano and Chamorro in 1926 are not drawn yet: the change
  // between them is 14 March 1926 in Wikidata and English Wikipedia and 17 January in Spanish Wikipedia.
  Q811: [
    O('Sebastián Uriza', '1926-11-11', '1926-11-14', 'Sebastián Uriza', NOTE('his “position held” (P39) in Wikidata (CC0), Spanish Wikipedia’s list and his Spanish article (interim; his English article gives 30 October to 11 November)')),
    O('Adolfo Díaz', '1926-11-14', '1929-01-01'),
    O('Juan Bautista Sacasa', '1933-01-01', '1936-06-06', 'Juan Bautista Sacasa', NOTE('Spanish and German Wikipedia’s lists and his Spanish article for the end (Wikidata and his English article give 9 June 1936)')),
    O('Carlos Alberto Brenes', '1936-06-09', '1937-01-01'),
    O('Benjamín Lacayo Sacasa', '1947-05-27', '1947-08-15', 'Benjamín Lacayo Sacasa', NOTE('his English Wikipedia article’s lead and the Spanish and German lists (Wikidata gives 26 May 1947)')),
    O('Víctor Manuel Román y Reyes', '1947-08-15', '1950-05-06'),
    O('Manuel Fernando Zurita', '1950-05-06', '1950-05-07', 'Manuel Fernando Zurita', NOTE('his “position held” (P39) in Wikidata (CC0) and Spanish Wikipedia’s list (acting)')),
    O('Anastasio Somoza García', '1950-05-07', '1956-09-29', 'Anastasio Somoza García', NOTE('his “position held” (P39) in Wikidata (CC0) and Spanish Wikipedia’s list (his English article and German Wikipedia give 21 May 1950)')),
    O('Orlando Montenegro Medrano', '1966-08-03', '1966-08-04'),
    O('Lorenzo Guerrero', '1966-08-04', '1967-05-01'),
    O('Anastasio Somoza Debayle', '1967-05-01', '1972-05-01'),
    O('Liberal-Conservative Junta', '1972-05-01', '1974-12-01', 'Liberal-Conservative Junta', WP_NOTE('Liberal-Conservative Junta', 'a collective head of state; also Spanish Wikipedia’s list')),
    O('Anastasio Somoza Debayle', '1974-12-01', '1979-07-17'),
    O('Francisco Urcuyo', '1979-07-17', '1979-07-18'),
    O('Junta of National Reconstruction', '1979-07-18', '1985-01-10', 'Junta of National Reconstruction', WP_NOTE('Junta of National Reconstruction', 'a collective head of state; also Spanish Wikipedia’s list')),
    O('Daniel Ortega', '1985-01-10', '1990-04-25')
  ],
  // Panama: English Wikipedia's "President of Panama" (rev 1387046007), Spanish Wikipedia's "Anexo:Presidentes de
  // Panamá" (rev 175407243), the persons' articles and Wikidata P39 (President of Panama, Q886965), read on 26 and 27
  // November 2026. Jiménez to 7 August 1948 and Díaz Arosemena from that day (Wikidata, the en list, the articles; the es
  // list gives 1 October). Endara's end is contested: 1 September 1994 (the en list, Wikidata) or 31 August (his article,
  // the es list); 1 September meets Pérez Balladares's start. Pinilla and Urrutia led the Provisional Junta of 1968-69
  // jointly (two rows). Torrijos and Noriega led the National Guard, to which Spanish Wikipedia says the head of state's
  // role passed in those years; the lane draws the Presidents, as both lists do. Bernardino González Ruiz, acting from
  // 17 to 23 March 1963 in the en list only, is not drawn.
  Q804: [
    O('Rodolfo Chiari', '1924-10-01', '1928-10-01', 'Rodolfo Chiari', LIST_NOTE('President of Panama')),
    O('Florencio Harmodio Arosemena', '1928-10-01', '1931-01-03', 'Florencio Harmodio Arosemena', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Harmodio Arias Madrid', '1931-01-03', '1931-01-16', 'Harmodio Arias Madrid', LIST_NOTE('President of Panama')),
    O('Ricardo J. Alfaro', '1931-01-16', '1932-06-05', 'Ricardo J. Alfaro', LIST_NOTE('President of Panama')),
    O('Harmodio Arias Madrid', '1932-06-05', '1936-10-01', 'Harmodio Arias Madrid', LIST_NOTE('President of Panama')),
    O('Juan Demóstenes Arosemena', '1936-10-01', '1939-12-16', 'Juan Demóstenes Arosemena', WP_LIST('President of Panama', 'he died in office; also Spanish Wikipedia’s list')),
    O('Ezequiel Fernández', '1939-12-16', '1939-12-18', 'Ezequiel Fernández (Panamanian politician)', WP_LIST('President of Panama', 'acting; also Spanish Wikipedia’s list')),
    O('Augusto Samuel Boyd', '1939-12-18', '1940-10-01', 'Augusto Samuel Boyd', WP_LIST('President of Panama', 'acting; also Spanish Wikipedia’s list')),
    O('Arnulfo Arias', '1940-10-01', '1941-10-09', 'Arnulfo Arias', LIST_NOTE('President of Panama')),
    O('Ricardo Adolfo de la Guardia', '1941-10-09', '1945-06-15', 'Ricardo Adolfo de la Guardia', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Enrique Adolfo Jiménez', '1945-06-15', '1948-08-07', 'Enrique Adolfo Jiménez', WP_LIST('President of Panama', 'provisional; also Wikidata; Spanish Wikipedia’s list gives 1 October 1948')),
    O('Domingo Díaz Arosemena', '1948-08-07', '1949-07-28', 'Domingo Díaz Arosemena', WP_LIST('President of Panama', 'also Wikidata; Spanish Wikipedia’s list gives 1 October 1948')),
    O('Roberto Francisco Chiari Remón', '1949-11-20', '1949-11-24', 'Roberto Francisco Chiari Remón', WP_LIST('President of Panama', 'acting; also Spanish Wikipedia’s list')),
    O('Arnulfo Arias', '1949-11-24', '1951-05-09', 'Arnulfo Arias', LIST_NOTE('President of Panama')),
    O('Alcibíades Arosemena', '1951-05-09', '1952-10-01', 'Alcibíades Arosemena', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('José Antonio Remón Cantera', '1952-10-01', '1955-01-02', 'José Antonio Remón Cantera', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('José Ramón Guizado', '1955-01-02', '1955-03-29', 'José Ramón Guizado', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Ricardo Arias', '1955-03-29', '1956-10-01', 'Ricardo Arias (politician)', LIST_NOTE('President of Panama')),
    O('Ernesto de la Guardia', '1956-10-01', '1960-10-01', 'Ernesto de la Guardia', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Roberto Francisco Chiari Remón', '1960-10-01', '1964-10-01', 'Roberto Francisco Chiari Remón', NOTE('his English Wikipedia article and Spanish Wikipedia’s list of presidents of Panama')),
    O('Marco Aurelio Robles', '1964-10-01', '1968-10-01', 'Marco Aurelio Robles', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Arnulfo Arias', '1968-10-01', '1968-10-11', 'Arnulfo Arias', LIST_NOTE('President of Panama')),
    O('José María Pinilla Fábrega', '1968-10-11', '1969-12-18', 'José María Pinilla Fábrega', WP_LIST('President of Panama', 'the Provisional Junta, jointly with Bolívar Urrutia Parrilla; also Spanish Wikipedia’s list')),
    O('Bolívar Urrutia Parrilla', '1968-10-11', '1969-12-18', 'Bolívar Urrutia Parrilla', WP_LIST('President of Panama', 'the Provisional Junta, jointly with José María Pinilla Fábrega; also Spanish Wikipedia’s list')),
    O('Demetrio B. Lakas', '1969-12-19', '1978-10-11', 'Demetrio B. Lakas', WP_LIST('President of Panama', 'chairman of the Junta, then President from 11 October 1972; also Spanish Wikipedia’s list')),
    O('Arístides Royo', '1978-10-11', '1982-07-31', 'Arístides Royo', LIST_NOTE('President of Panama')),
    O('Ricardo de la Espriella', '1982-07-31', '1984-02-13', 'Ricardo de la Espriella', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Jorge Illueca', '1984-02-13', '1984-10-11', 'Jorge Illueca', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Nicolás Ardito Barletta', '1984-10-11', '1985-09-28', 'Nicolás Ardito Barletta', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Eric Arturo Delvalle', '1985-09-28', '1988-02-26', 'Eric Arturo Delvalle', LIST_NOTE('President of Panama')),
    O('Manuel Solís Palma', '1988-02-26', '1989-09-01', 'Manuel Solís Palma', WP_LIST('President of Panama', 'acting; Spanish Wikipedia’s list ends it on 31 August')),
    O('Francisco Rodríguez', '1989-09-01', '1989-12-20', 'Francisco Rodríguez (politician)', WP_LIST('President of Panama', 'provisional; also Spanish Wikipedia’s list')),
    O('Guillermo Endara', '1989-12-20', '1994-09-01', 'Guillermo Endara', LIST_NOTE('President of Panama')),
    O('Ernesto Pérez Balladares', '1994-09-01', '1999-09-01', 'Ernesto Pérez Balladares', WP_LIST('President of Panama', 'also Spanish Wikipedia’s list')),
    O('Juan Carlos Varela', '2014-07-01', '2019-07-01', 'Juan Carlos Varela', LIST_NOTE('President of Panama'))
  ],
  // Poland: Wikidata P39, English Wikipedia's "List of heads of state of Poland" (rev 1387770809), Polish Wikipedia's
  // list of chairmen of the Council of State (rev 79217318, which cites the Encyklopedia Powszechna PWN) and the persons'
  // en and pl articles, read on 26 and 27 November 2026. Rataj from 15 May 1926 (Wikidata, his en and pl articles; the en
  // list 14 May). Raczkiewicz, President in exile, drawn to his death on 6 June 1947 (the en list, his pl article); the
  // Western Allies withdrew their recognition on 5 or 6 July 1945 (pl and en). The later exile Presidents, after that
  // recognition, are not drawn. His term overlaps Bierut's from 5 February to 6 June 1947 on purpose: the exile
  // President is drawn to his death, as the en list and his pl article date him, beside the head of state in Warsaw,
  // so the lane draws two rows then (the fixer, 27 November 2026). Bierut before 1947 is not drawn yet: his start as head of state is contested (1943 or
  // 1944). Bierut's presidency to 20 November 1952 (the en and pl lists; Wikidata 21 November). Ochab to 11 April 1968
  // and Spychalski from that day (the pl list, their pl articles; Wikidata and the en list split 10 and 11 April). From
  // 1952 the Council of State was the head of state; the lane draws its Chairmen, as the lists do.
  Q36: [
    O('Stanisław Wojciechowski', '1922-12-22', '1926-05-14', 'Stanisław Wojciechowski', LIST_NOTE('List of heads of state of Poland')),
    O('Maciej Rataj', '1926-05-15', '1926-06-04', 'Maciej Rataj', NOTE('his “position held” (P39) in Wikidata (CC0) and his English and Polish Wikipedia articles (acting)')),
    O('Ignacy Mościcki', '1926-06-04', '1939-09-30', 'Ignacy Mościcki', LIST_NOTE('List of heads of state of Poland')),
    O('Władysław Raczkiewicz', '1939-09-30', '1947-06-06', 'Władysław Raczkiewicz', WP_LIST('List of heads of state of Poland', 'President in exile, to his death; the Western Allies withdrew their recognition in July 1945; also his Polish article; Wikidata gives 5 June')),
    O('Bolesław Bierut', '1947-02-05', '1952-11-20', 'Bolesław Bierut', WP_LIST('List of heads of state of Poland', 'also Polish Wikipedia’s list; Wikidata gives 21 November')),
    O('Aleksander Zawadzki', '1952-11-20', '1964-08-07', 'Aleksander Zawadzki', LIST_NOTE('List of heads of state of Poland')),
    O('Edward Ochab', '1964-08-12', '1968-04-11', 'Edward Ochab', NOTE('his “position held” (P39) in Wikidata (CC0), his Polish article and Polish Wikipedia’s list of chairmen of the Council of State (English Wikipedia gives 10 April 1968)')),
    O('Marian Spychalski', '1968-04-11', '1970-12-23', 'Marian Spychalski', NOTE('his Polish Wikipedia article and Polish Wikipedia’s list of chairmen of the Council of State (Wikidata and English Wikipedia give 10 April 1968)')),
    O('Józef Cyrankiewicz', '1970-12-23', '1972-03-28', 'Józef Cyrankiewicz', LIST_NOTE('List of heads of state of Poland')),
    O('Henryk Jabłoński', '1972-03-28', '1985-11-06', 'Henryk Jabłoński', WP_LIST('List of heads of state of Poland', 'Wikidata gives no “position held” for it')),
    O('Wojciech Jaruzelski', '1985-11-06', '1989-07-19', 'Wojciech Jaruzelski', WP_LIST('List of heads of state of Poland', 'chairman of the Council of State'))
  ],
  // Portugal: Wikidata P39 (President of Portugal, Q322459; Interim President, Q48879649) and English Wikipedia's "List
  // of presidents of Portugal" (rev 1379556965), read on 26 and 27 November 2026. From 17 June 1926 the Ministry was head
  // of state ex officio (the en list), presided by Gomes da Costa (his en and pt infoboxes, citing Braga 2010; the en list
  // and Wikidata give 29 June for his formal start), then by Carmona from 9 July (the en list's note; he was President
  // from 29 November 1926 by the Diário do Govêrno, and Wikidata says 16 November). Spínola headed the National Salvation
  // Junta, the de facto head of state, from 25 April 1974, and was President from 15 May (the en list; Wikidata 15 May).
  Q45: [
    O('Bernardino Machado', '1925-12-11', '1926-05-31', 'Bernardino Machado', LIST_NOTE('List of presidents of Portugal')),
    O('José Mendes Cabeçadas', '1926-05-31', '1926-06-17', 'José Mendes Cabeçadas', LIST_NOTE('List of presidents of Portugal')),
    O('Manuel Gomes da Costa', '1926-06-17', '1926-07-09', 'Manuel Gomes da Costa', NOTE('his English and Portuguese Wikipedia articles and English Wikipedia’s list of presidents of Portugal: president of the Ministry, head of state ex officio, from 17 June 1926 (Wikidata gives 29 June)')),
    O('Óscar Carmona', '1926-07-09', '1951-04-18', 'Óscar Carmona', WP_LIST('List of presidents of Portugal', 'de facto head of state from 9 July 1926, President from 29 November 1926; he died in office')),
    O('António de Oliveira Salazar', '1951-04-18', '1951-08-09', 'António de Oliveira Salazar', LIST_NOTE('List of presidents of Portugal')),
    O('Francisco Craveiro Lopes', '1951-08-09', '1958-08-09', 'Francisco Craveiro Lopes', LIST_NOTE('List of presidents of Portugal')),
    O('Américo Tomás', '1958-08-09', '1974-04-25', 'Américo Tomás', LIST_NOTE('List of presidents of Portugal')),
    O('António de Spínola', '1974-04-25', '1974-09-30', 'António de Spínola', WP_LIST('List of presidents of Portugal', 'head of the National Salvation Junta from 25 April 1974, President from 15 May'))
  ],
  // Slovenia: Milan Kučan, President of the Presidency from 10 May 1990, then President of the Republic (English
  // Wikipedia's "President of Slovenia", rev 1383570822, both its lists; Wikidata's P39 starts on 8 October 1991), to
  // 23 December 1992, when his P35 term begins. The cited list moves him from the Presidency to the office of President
  // (de jure) on 23 December 1991; the end here is chosen to meet the P35 term, so this one term covers both roles
  // (the fixer, 27 November 2026). Read on 26 and 27 November 2026.
  Q215: [O('Milan Kučan', '1990-05-10', '1992-12-23', 'Milan Kučan', WP_NOTE('President of Slovenia', 'President of the Presidency, then President of the Republic; Wikidata’s “position held” starts on 8 October 1991'))],
  // Spain, the Second Republic. The decree of 14 April 1931 (Gaceta de Madrid núm. 105, 15 April 1931, p. 193) gave the
  // President of the Provisional Government the functions of head of state; Spanish Wikipedia's "Gobierno provisional
  // de la Segunda República española" (rev 174375482) and English Wikipedia's "Provisional Government of the Second
  // Spanish Republic" (rev 1385285675) give its heads, Alcalá-Zamora to 14 October and Azaña to December 1931. Then the
  // Presidents (Wikidata P39 Q33753220; English Wikipedia's "List of heads of state of Spain", rev 1383568475; the
  // Spanish list, rev 174435886, gives each change a day later). Azaña's presidency runs beside Franco's from 1 October
  // 1936, two rows for the civil war. Read on 26 and 27 November 2026.
  Q29: [
    O('Niceto Alcalá-Zamora', '1931-04-14', '1931-10-14', 'Niceto Alcalá-Zamora', NOTE('the decree of 14 April 1931 (Gaceta de Madrid, 15 April 1931), English and Spanish Wikipedia’s articles on the Provisional Government and his English article: President of the Provisional Government, with the functions of head of state')),
    O('Manuel Azaña', '1931-10-14', '1931-12-10', 'Manuel Azaña', NOTE('English and Spanish Wikipedia’s articles on the Provisional Government: its President, to the day Alcalá-Zamora became President of the Republic')),
    O('Niceto Alcalá-Zamora', '1931-12-10', '1936-04-07', 'Niceto Alcalá-Zamora', LIST_NOTE('List of heads of state of Spain')),
    O('Diego Martínez Barrio', '1936-04-07', '1936-05-10', 'Diego Martínez Barrio', WP_LIST('List of heads of state of Spain', 'interim')),
    O('Manuel Azaña', '1936-05-10', '1939-03-03', 'Manuel Azaña', LIST_NOTE('List of heads of state of Spain'))
  ],
  // Switzerland: the Federal Council is the head of state; the lane draws its President for the year, 1 January to
  // 31 December, as it does for the years Wikidata's leaders give. Wikidata P39 (President of the Swiss Confederation,
  // Q688230) and English Wikipedia's "List of presidents of the Swiss Confederation" (rev 1385574960), read on 26 and 27
  // November 2026. Heinrich Häberlin (1926, 1931) has no P39 for it: the list, his English article and his German
  // article (rev 272506260) give the years. Kurt Furgler's P39 for 1981 starts on 31 December, a slip: the list and his
  // article (rev 1378164319) give 1 January.
  Q39: [
    swissHos(1926, 'Heinrich Häberlin', WP_LIST(SWISS, 'also his German article; Wikidata gives no “position held” for his presidency')),
    swissHos(1928, 'Edmund Schulthess'),
    swissHos(1931, 'Heinrich Häberlin', WP_LIST(SWISS, 'also his German article; Wikidata gives no “position held” for his presidency')),
    swissHos(1938, 'Johannes Baumann'),
    swissHos(1939, 'Philipp Etter'), swissHos(1942, 'Philipp Etter'), swissHos(1947, 'Philipp Etter'),
    swissHos(1949, 'Ernst Nobs'),
    swissHos(1953, 'Philipp Etter'),
    swissHos(1979, 'Hans Hürlimann'),
    swissHos(1980, 'Georges-André Chevallaz'),
    swissHos(1981, 'Kurt Furgler', WP_LIST(SWISS, 'Wikidata’s “position held” for 1981 starts on 31 December, a slip')),
    swissHos(1992, 'René Felber'),
    swissHos(2003, 'Pascal Couchepin'), swissHos(2007, 'Micheline Calmy-Rey'), swissHos(2008, 'Pascal Couchepin'),
    swissHos(2010, 'Doris Leuthard'), swissHos(2011, 'Micheline Calmy-Rey'), swissHos(2013, 'Ueli Maurer'),
    swissHos(2014, 'Didier Burkhalter'), swissHos(2015, 'Simonetta Sommaruga')
  ],
  // Trinidad and Tobago, the Presidents from the republic of 1 August 1976: Wikidata P39 (Q2522739), the persons'
  // English articles and the Office of the President's "History of the Presidency" (otp.tt, an official page), read on
  // 26 and 27 November 2026. English Wikipedia's list cites one source and links rulers.org and worldstatesmen.org, so
  // it is not counted. Clarke was sworn in on 1 August 1976 under a transitional arrangement ("President of Trinidad and
  // Tobago", rev 1385938815) and chosen by the electoral college on 24 September, the Office's start; his end is
  // 19 March 1987 (the Office, his article; Wikidata 13 March). Richards to 18 March 2013 (the Office, his article;
  // Wikidata 17 March). Carmona from 18 March 2013 (Wikidata, his article and the Office's text; its heading says
  // 19 March) to 19 March 2018 (Wikidata, his article; the Office 18 March). Weekes to 20 March 2023 (Wikidata, her
  // article, Kangaloo's start; the Office 19 March).
  Q754: [
    O('Ellis Clarke', '1976-08-01', '1987-03-19', 'Ellis Clarke', NOTE('his English Wikipedia article and Wikidata (CC0) for the start; his article and the Office of the President’s “History of the Presidency” for the end (Wikidata gives 13 March 1987)')),
    O('Noor Hassanali', '1987-03-20', '1997-03-17', 'Noor Hassanali', TT_NOTE),
    O('A. N. R. Robinson', '1997-03-18', '2003-03-16', 'A. N. R. Robinson', TT_NOTE),
    O('George Maxwell Richards', '2003-03-17', '2013-03-18', 'George Maxwell Richards', NOTE('his English Wikipedia article and the Office of the President’s “History of the Presidency” (Wikidata ends it on 17 March)')),
    O('Anthony Carmona', '2013-03-18', '2018-03-19', 'Anthony Carmona', NOTE('his “position held” (P39) in Wikidata (CC0) and his English Wikipedia article (the Office of the President gives 19 March 2013 to 18 March 2018)')),
    O('Paula-Mae Weekes', '2018-03-19', '2023-03-20', 'Paula-Mae Weekes', NOTE('her “position held” (P39) in Wikidata (CC0) and her English Wikipedia article (the Office of the President ends it on 19 March)'))
  ],
  // The United States: George H. W. Bush, 20 January 1989 to 20 January 1993 (Wikidata P39 Q11696, rev 2572470928; his
  // article, rev 1388155043), read on 26 and 27 November 2026. Archigos's record of him, with the same days, is not drawn.
  Q30: [O('George H. W. Bush', '1989-01-20', '1993-01-20')],
  // Yugoslavia, then Serbia and Montenegro, then Serbia: English Wikipedia's "List of heads of state of Yugoslavia" (rev
  // 1387441335), "President of Yugoslavia" (rev 1384187935), "President of Serbia and Montenegro" (rev 1386518055) and
  // "List of presidents of Serbia" (rev 1387819373), with Wikidata P39 (President of Yugoslavia, Q24944203; President of
  // the Presidency, Q16761225; President of the Federal Republic, Q61039224; President of Serbia, Q889830) and the
  // persons' articles, read on 26 and 27 November 2026. From 4 May 1980 the collective Presidency was the head of state
  // and the lane draws its President in turn. Ribar has no dated P39: his article and the list give 1 December 1945 to
  // 14 January 1953. Kostić from 5 December 1991 (Wikidata, the list; his article gives 6 December). The acting
  // Presidents Miloš Radulović (June 1993) and Srđa Božović (June to July 1997) are not drawn: their only sources are
  // uncited tables and articles whose citation is not a free source. Tadić is drawn from 5 June 2006, when Serbia became
  // independent (the list; his presidency began on 11 July 2004); Vučić to 27 September 2026 (the list, citing N1).
  Q191077: [
    O('Ivan Ribar', '1945-12-01', '1953-01-14', 'Ivan Ribar', WP_LIST(YU, 'Wikidata gives no dated “position held”')),
    O('Josip Broz Tito', '1953-01-14', '1980-05-04', 'Josip Broz Tito', LIST_NOTE(YU)),
    O('Lazar Koliševski', '1980-05-04', '1980-05-15', 'Lazar Koliševski', LIST_NOTE(YU)),
    O('Cvijetin Mijatović', '1980-05-15', '1981-05-15', 'Cvijetin Mijatović', LIST_NOTE(YU)),
    O('Sergej Kraigher', '1981-05-15', '1982-05-15', 'Sergej Kraigher', LIST_NOTE(YU)),
    O('Petar Stambolić', '1982-05-15', '1983-05-15', 'Petar Stambolić', LIST_NOTE(YU)),
    O('Veselin Đuranović', '1984-05-15', '1985-05-15', 'Veselin Đuranović', LIST_NOTE(YU)),
    O('Radovan Vlajković', '1985-05-15', '1986-05-15', 'Radovan Vlajković', LIST_NOTE(YU)),
    O('Sinan Hasani', '1986-05-15', '1987-05-15', 'Sinan Hasani', LIST_NOTE(YU)),
    O('Lazar Mojsov', '1987-05-15', '1988-05-15', 'Lazar Mojsov', LIST_NOTE(YU)),
    O('Raif Dizdarević', '1988-05-15', '1989-05-15', 'Raif Dizdarević', LIST_NOTE(YU)),
    O('Janez Drnovšek', '1989-05-15', '1990-05-15', 'Janez Drnovšek', LIST_NOTE(YU)),
    O('Borisav Jović', '1990-05-15', '1991-05-15', 'Borisav Jović', LIST_NOTE(YU)),
    O('Sejdo Bajramović', '1991-05-16', '1991-06-30', 'Sejdo Bajramović', LIST_NOTE(YU)),
    O('Stjepan Mesić', '1991-06-30', '1991-12-05', 'Stjepan Mesić', LIST_NOTE(YU)),
    O('Branko Kostić', '1991-12-05', '1992-06-15', 'Branko Kostić', LIST_NOTE(YU)),
    O('Dobrica Ćosić', '1992-06-15', '1993-06-01', 'Dobrica Ćosić', LIST_NOTE('President of Serbia and Montenegro')),
    O('Zoran Lilić', '1993-06-25', '1997-06-25', 'Zoran Lilić', LIST_NOTE('President of Serbia and Montenegro')),
    O('Slobodan Milošević', '1997-07-23', '2000-10-07', 'Slobodan Milošević', LIST_NOTE('President of Serbia and Montenegro')),
    O('Boris Tadić', '2006-06-05', '2012-04-05', 'Boris Tadić', WP_LIST('List of presidents of Serbia', 'as head of state of Serbia from its independence on 5 June 2006; his presidency began on 11 July 2004, Wikidata’s “position held”')),
    O('Slavica Đukić Dejanović', '2012-04-05', '2012-05-31', 'Slavica Đukić Dejanović', LIST_NOTE('List of presidents of Serbia')),
    O('Tomislav Nikolić', '2012-05-31', '2017-05-31', 'Tomislav Nikolić', LIST_NOTE('List of presidents of Serbia')),
    O('Aleksandar Vučić', '2017-05-31', '2026-09-27', 'Aleksandar Vučić', LIST_NOTE('List of presidents of Serbia'))
  ],
  // Kosovo: Justina Shiroka Pula, President from 7 October 2026. The Assembly's sitting of 6 October ran past
  // midnight: French Wikipedia's "Élection présidentielle kosovare de 2026" (rev 240191164) says she was elected "dans
  // la nuit du 6 au 7 octobre 2026", German Wikipedia's "Justina Pula" (rev 272280935) dates the vote 7 October and
  // has her take the oath shortly after, and her English (rev 1386242127, lead and infobox) and Albanian (rev 3100810)
  // articles and English Wikipedia's "President of Kosovo" (rev 1385603793) date her from 7 October. The Office of
  // the President's release (president-ksgov.net, posted at 01:18 on 7 October) names the sitting "e datës 6 tetor
  // 2026" and says she took the oath before the deputies after the vote, with no hour; the English article's text
  // says "on the evening of 6 October" (the fixer, 27 November 2026: the note on the page now names each source for
  // what it says, where it credited the English articles with "after midnight"). So 7 October follows the majority, and the vote keeps the sitting's date,
  // 6 October (scripts/election-corrections.mjs). Wikidata's "position held" for her (Q124608726) has no dates. Read
  // on 27 November 2026. Albulena Haxhiu's acting term ends that day (GAP_FIXES above).
  // Read again by Builder 2 on 27 November 2026 (the votes group's second reader): the Office's later post of that day
  // (post 194879, 18:19) says the inauguration took place that day, after which she took office from the Acting
  // President, Albulena Haxhiu; Albanian Wikipedia's "Justina Shiroka Pula" (rev 3100810) and "Presidenti i Kosovës"
  // (rev 3095835) give 7 October too.
  Q1246: [O('Justina Shiroka Pula', '2026-10-07', null, 'Justina Shiroka Pula', NOTE('the Office of the President of Kosovo, which says she took office from the Acting President on 7 October 2026, after the Assembly’s sitting of 6 October; English Wikipedia’s “President of Kosovo”, the lead and infobox of her English article and her Albanian article date her from 7 October; French and German Wikipedia have her elected in the night of 6 to 7 October (the text of her English article says the evening of 6 October)'))],
  // Mexico: Felipe Calderón, President from 1 December 2006 to 30 November 2012, a term Wikidata's head of state (P35)
  // of Mexico leaves out. The lane drew him from his leader record, matched to Wikidata; once the edit of his end
  // (CORRECTIONS above) keeps that record as Archigos's in a rebuild, only this term draws him (Builder 2,
  // 27 November 2026, from the names group's two readers, read that day). The days are those of the infoboxes of his
  // English (rev 1387879464) and Spanish (rev 176338817) Wikipedia articles; his "position held: President of Mexico"
  // (P39) in Wikidata (Q57269) starts on 1 December 2006 and ends on 1 December 2012, his successor's first day.
  Q96: [O('Felipe Calderón', '2006-12-01', '2012-11-30', 'Felipe Calderón', NOTE('his English and Spanish Wikipedia articles (1 December 2006 to 30 November 2012), with his “position held” (P39) in Wikidata (CC0), which ends it on 1 December 2012, his successor’s first day'))]
};
for (const [key, list] of Object.entries(HOS_GAPS)) REIGNS[key] = [...(REIGNS[key] || []), ...list];

const hasLetters = s => /\p{L}/u.test(s || '');
const titleOf = url => decodeURIComponent((url || '').split('/wiki/')[1] || '').replace(/_/g, ' ').replace(/ \(.*\)$/, '');
// The same wording build-data.mjs (leaderEvents) gives a leader's arrival; like it, none before 1926 (the first year).
const how = l => (l.entry === 'Irregular' ? ' (irregular seizure of power)' : l.entry === 'Foreign Imposition' ? ' (imposed by a foreign power)' : '');
// A start known only to the month or year gives the event that precision, as build-data.mjs does, so the page shows
// "May 1982", not the 1st (builder 3, 27 November 2026: John Compton's return in Saint Lucia read "1 May 1982").
const atPrecision = l => (l.startPrecision && l.startPrecision !== 'day' ? { precision: l.startPrecision } : {});
const arrival = l => ({ date: l.start, type: l.entry === 'Irregular' ? 'coup' : 'leader', text: `${l.full || l.name} takes power${how(l)}`, url: l.url, ...atPrecision(l) });

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
    delete e.precision;
    Object.assign(e, atPrecision(l));
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
  if (!fix) return finish(key, c);
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
  // One office's holders replaced by VM's own list (Saudi Arabia's heads of government, fixer, 26 November 2026), each
  // keeping the party tags build-parties.mjs gave the same term (office, start and article), the offices kept in order
  // of start.
  for (const [office, list] of Object.entries(fix.replaceOffices || {})) {
    const was = (c.offices || []).filter(o => o.office === office);
    const fresh = list.map(o => {
      const old = was.find(x => x.start === o.start && x.url === o.url);
      return { ...o, ...(old?.parties ? { parties: old.parties } : {}) };
    });
    c.offices = [...(c.offices || []).filter(o => o.office !== office), ...fresh].sort((p, q) => (p.start < q.start ? -1 : p.start > q.start ? 1 : 0));
  }
  // One office-holder's fields set by hand: found by office, name and start, or by the name and start the edit gives
  // once a run has changed them, so a second run finds the same entry (small corrections, 26 November 2026).
  for (const oe of fix.officeEdits || []) {
    const o = (c.offices || []).find(x => x.office === oe.office && (x.full === oe.full || (oe.set.full && x.full === oe.set.full)) && (x.start === oe.start || x.start === oe.set.start));
    if (!o) throw new Error(`leader-corrections: ${key} has no ${oe.office} office of ${oe.full} starting ${oe.start}`);
    Object.assign(o, oe.set);
  }
  return finish(key, c);
}

// The steps every state takes after its own corrections: the monarchs added by hand (REIGNS), then the spelling rule.
function finish(key, c) {
  addReigns(key, c);
  spellNames(c);
  return c;
}

// Adds the REIGNS of a state to its offices, each at its place by start. One already there (the same office and article,
// and the same start or the same end) is not added again but takes the entry's fields (its party tags kept), so a run is
// safe to repeat and a start or source note put right reaches data/countries.json; nor is one added that would overlap
// a term of the same person already listed in that office (the lanes would skip it anyway).
function addReigns(key, c) {
  for (const r of REIGNS[key] || []) {
    c.offices ||= [];
    // A record with no article (a junta, HOS_GAPS) is the same only by its name too.
    const same = c.offices.filter(o => o.office === r.office && o.url === r.url && (r.url || o.full === r.full));
    const had = same.find(o => o.start === r.start) || same.find(o => o.end && o.end === r.end);
    if (had) {
      Object.assign(had, r);
      if (r.noParties) delete had.parties;
      c.offices.splice(c.offices.indexOf(had), 1);
      const at = c.offices.findIndex(o => o.start > had.start);
      c.offices.splice(at < 0 ? c.offices.length : at, 0, had);
      continue;
    }
    if (same.some(o => (!o.end || o.end > r.start) && (!r.end || r.end > o.start))) {
      throw new Error(`leader-corrections: ${key}'s reign of ${r.full} from ${r.start} overlaps a term of the same person`);
    }
    const at = c.offices.findIndex(o => o.start > r.start);
    c.offices.splice(at < 0 ? c.offices.length : at, 0, { ...r });
  }
}

// A short name that is the last words of the full name once accents and case are set aside takes the full name's
// spelling: Archigos's "Diaz Ordaz" and "Lopez Portillo" are Gustavo Díaz Ordaz and José López Portillo (small
// corrections, D6, 26 November 2026). Letters that are not a base letter with a mark are folded by hand (Đ is "Dj",
// as Archigos writes Đuranović).
const FOLD = { đ: 'dj', ð: 'd', ø: 'o', ł: 'l', æ: 'ae', œ: 'oe', ı: 'i', ß: 'ss', þ: 'th' };
const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[đðøłæœıßþ]/g, ch => FOLD[ch]);
export function spellNames(c) {
  for (const l of c.leaders || []) {
    if (!l.name || !l.full || l.name === l.full) continue;
    const tail = l.full.split(' ').slice(-l.name.split(' ').length).join(' ');
    if (tail !== l.name && fold(tail) === fold(l.name)) l.name = tail;
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
