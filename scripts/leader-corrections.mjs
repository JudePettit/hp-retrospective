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
  // and linked so (fixer, 26 November 2026). Archigos's dates are kept.
  Q96: {
    from: '2018-12-01',
    edit: {
      '2012-12-01': { end: '2018-11-30' },
      '1970-12-01': { name: 'Echeverría Álvarez', full: 'Luis Echeverría', url: W('Luis Echeverría') },
      '2000-12-01': { name: 'Fox Quesada', full: 'Vicente Fox', url: W('Vicente Fox') }
    },
    leaders: [
      P('Andrés Manuel López Obrador', '2018-12-01', '2024-09-30'),
      P('Claudia Sheinbaum', '2024-10-01', null)
    ],
    // Her term as head of government is Wikidata's P6 statement with its start put right, so its source says so.
    officeEdits: [{ office: 'hog', full: 'Claudia Sheinbaum', start: '2024-09-30', set: { start: '2024-10-01', source: 'corrections',
      sourceNote: 'Wikidata (CC0): the state’s head of government (P6), whose start, 30 September 2024, VM puts right to 1 October 2024 from her “position held” (P39) and her English Wikipedia article (scripts/leader-corrections.mjs)' } }]
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
  // is no head of government. Names and articles are those the data already gave each king.
  Q851: {
    edit: {
      '2015-01-23': { full: 'Salman of Saudi Arabia', url: W('Salman of Saudi Arabia'), end: null, exit: null, exitHow: null },
      '1927-05-20': { name: 'Ibn Saud', full: 'Ibn Saud', url: W('Ibn Saud') }
    },
    replaceOffices: {
      hog: [
        H('Saud of Saudi Arabia', '1953-10-09', '1954-08-16', 'Saud of Saudi Arabia', SAUDI_PM),
        H('King Faisal bin Abdulaziz Al Saud', '1954-08-16', '1960-12-21', 'Faisal of Saudi Arabia', SAUDI_PM),
        H('Saud of Saudi Arabia', '1960-12-21', '1962-10-31', 'Saud of Saudi Arabia', SAUDI_PM),
        H('King Faisal bin Abdulaziz Al Saud', '1962-10-31', '1975-03-25', 'Faisal of Saudi Arabia', SAUDI_PM),
        H('Khalid of Saudi Arabia', '1975-03-25', '1982-06-13', 'Khalid of Saudi Arabia', SAUDI_PM),
        H('Fahd bin Abdulaziz Al Saud', '1982-06-13', '2005-08-01', 'Fahd of Saudi Arabia', SAUDI_PM),
        H('Abdullah of Saudi Arabia', '2005-08-01', '2015-01-23', 'Abdullah of Saudi Arabia', SAUDI_PM),
        H('Salman bin Abdulaziz Al Saud', '2015-01-23', '2022-09-27', 'Salman of Saudi Arabia', SAUDI_PM),
        H('Mohammed bin Salman', '2022-09-27', null, 'Mohammed bin Salman', SAUDI_PM)
      ]
    }
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
  // RT-04: whole lists, each starting with its first entry.
  ...Object.fromEntries(Object.entries(LISTS).map(([key, l]) => [key, { from: l.leaders[0].start, leaders: l.leaders, offices: l.offices }]))
};

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
    const same = c.offices.filter(o => o.office === r.office && o.url === r.url);
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
