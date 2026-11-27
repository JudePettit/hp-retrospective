// Leader lists built by hand for the states Archigos 4.1 does not cover (correction RT-04, 16 November 2026):
// Montenegro, Dominica, Grenada, Saint Lucia, Saint Vincent and the Grenadines, Antigua and Barbuda, Saint Kitts and
// Nevis, Monaco, Liechtenstein, Andorra and San Marino. leader-corrections.mjs applies them (CORRECTIONS), so
// `npm run build-data` keeps them and `node scripts/leader-corrections.mjs` patches data/countries.json on its own.
//
// Each list follows the state's effective leader, Archigos's rule (README, Known limits), from the state's first day
// (independence, or 1926 for the four European microstates independent before it; Montenegro from its independence,
// 3 June 2006) to the present. The lists are keyed by each state's Wikidata item, as countries.mjs keys them. A first entry starts on that day, as
// Archigos starts Kosovo, Czechia and Slovakia, except before 1926, where it keeps the day its holder took the office
// (the page starts in 1926 and shows no event before it). The other office goes
// under "Also in office" (`offices`, which replaces what Wikidata's head-of-state and head-of-government statements gave
// these states). Every entry was read on 16 November 2026, and read again from free sources only on 27 November 2026,
// from at least two of: Wikidata "position held" (P39) with its start and end qualifiers (CC0), Wikipedia's lists of
// office holders and the persons' articles in any language (CC BY-SA, by revision), and the states' official acts and
// records (the Journal de Monaco, the Landesgesetzblatt, the General Council of Andorra's acts, San Marino's Council
// archive), with Liechtenstein's national historical lexicon for single facts only. Where they disagree the entry
// follows the official act, then the majority of the free sources; where no free source gives the day, or the free
// sources are split and no official act settles it, the date carries the month or year only and its comment says
// "day not confirmed", naming the days given (the fixer, 27 November 2026: one cited source no longer outweighs
// several uncited ones). rulers.org (non-commercial use only), worldstatesmen.org and enciclopedia.cat (Grup
// Enciclopèdia, whose legal notice forbids reuse without written consent) are not sources, and a Wikipedia page whose
// only source is one of them is not counted. The Wikidata id (`qid`) names the person; `url` is their English Wikipedia article, or null where
// there is none (the page then links a search). `entry` and `exit` are set only where a source says how the person
// came or went (a coup, a death in office, a foreign invasion); otherwise they stay null, the page's "unknown" form.
//
// A person is written 'Full name|Wikidata id|English Wikipedia title' ('=' when the title is the name; nothing when
// there is no article). The notes for the second readers, entry by entry with their sources, are kept with the RT-04
// work (entries-<state>.md).

const W = t => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
const PARTICLES = new Set(['Della', 'Di', 'De', 'Del', 'Dal', 'Da', 'de', 'di', 'della']);
// San Marino's two-word family names (Wikidata's "family name", P734, gives both words; second reader, 16 November
// 2026). Marino Valdes Franciosi is not one: Wikidata gives Valdes as a second given name.
const COMPOUND = ['Suzzi Valli', 'Manzoni Borghesi', 'Pedini Amati'];
// The family name the search box and National Analysis use: the last word, with its particle (Della Balda), a
// two-word family name above, the regnal name of a monarch (Albert II), or the name given.
function family(full) {
  if (/ (I|II|III|IV|V)$/.test(full)) return full;
  const compound = COMPOUND.find(f => full.endsWith(` ${f}`));
  if (compound) return compound;
  const w = full.split(' ');
  return w.length > 2 && PARTICLES.has(w.at(-2)) ? w.slice(-2).join(' ') : w.at(-1);
}
function person(spec) {
  const [full, qid, title] = spec.split('|');
  return { full, qid: qid || null, url: title ? W(title === '=' ? full : title) : null };
}
// A leader: who, from, to (null: in office), and { name, entry, exit, noQid, noParties } where a source gives them
// (`noParties`: the person held this term for no party, so build-parties.mjs tags it with none). Where no free source
// gives the day, the date is the first of the month or year, with startPrecision or endPrecision 'month' or 'year'
// (27 November 2026), and the page shows the month or the year.
const precise = ({ startPrecision, endPrecision } = {}) => ({ ...(startPrecision ? { startPrecision } : {}), ...(endPrecision ? { endPrecision } : {}) });
export function E(spec, start, end, more = {}) {
  const p = person(spec);
  const { name, entry = null, exit = null, noQid, noParties } = more;
  if (!p.qid && !noQid) throw new Error(`leader-lists: ${p.full} has no Wikidata id and no reason why`);
  return { name: name || family(p.full), full: p.full, url: p.url, qid: p.qid, start, end, entry, exit, exitHow: null, source: 'leader-lists', ...precise(more), ...(noQid ? { noQid } : {}), ...(noParties ? { noParties: true } : {}) };
}
// Someone under "Also in office": 'hos' (head of state) or 'hog' (head of government), with { startPrecision,
// endPrecision } where the day is not known.
const O = (office, spec, start, end, more) => ({ office, ...person(spec), start, end, ...precise(more) });
// Consecutive terms: each [start, spec, (more)] ends where the next starts (or on more.end, where the sources show a
// gap); the last is still in office. A start known only to the month or year ends the term before it to the same.
function chain(rows) {
  return rows.map(([start, spec, more = {}], i) => {
    const next = rows[i + 1];
    const endPrecision = 'end' in more ? more.endPrecision : next?.[2]?.startPrecision;
    return E(spec, start, 'end' in more ? more.end : (next?.[0] ?? null), { ...more, endPrecision });
  });
}
// The same for "Also in office": each [start, spec, (end), (more)], `more` giving { startPrecision } where the day is not
// known; the term before such an entry ends to the same precision, unless it has its own end (the fixer, 27 November
// 2026, for Fornesa's start in February 1940).
const officeChain = (office, rows) => rows.map(([start, spec, end, more = {}], i) => {
  const next = rows[i + 1];
  const endPrecision = end !== undefined ? more.endPrecision : next?.[3]?.startPrecision;
  return O(office, spec, start, end !== undefined ? end : (next?.[0] ?? null), { startPrecision: more.startPrecision, endPrecision });
});
// The British monarch as head of state of a Caribbean realm, from its independence (Wikidata's "monarch of …" items).
const realm = from => [O('hos', 'Elizabeth II|Q9682|=', from, '2022-09-08'), O('hos', 'Charles III|Q43274|=', '2022-09-08', null)];

const IRREGULAR = { entry: 'Irregular', exit: 'Irregular' };
const DIED = { exit: 'Natural Death' };
// Appointed officials, or a holder who sat for no party: no party tag (build-parties.mjs).
const noParties = o => ({ ...o, noParties: true });

export const LISTS = {
  // Montenegro: Prime Minister (a parliamentary republic; the President is under "Also in office"), from independence,
  // 3 June 2006, where Wikipedia's list ("Prime Minister of Montenegro") splits Đukanović's term of 8 January 2003 and
  // starts the independent state (second reader, 16 November 2026); Vujanović, President since 22 May 2003, is dated
  // from the same day. Wikidata (Q2353252) and Wikipedia agree on every later date; Wikidata's statement on Montenegro
  // itself (P6) ends his terms on 10 October 2006 and 21 December 2010, against 10 November 2006 and 29 December 2010
  // in both. Read again on 27 November 2026: Wikidata's holders of Q2353252 and Q1149153, English Wikipedia's "Prime
  // Minister of Montenegro" (revision 1377838575) and "List of presidents of Montenegro" (revision 1386516674), and the
  // Government's reports at gov.me. Each day is the same in all of them.
  Q236: {
    leaders: chain([
      ['2006-06-03', 'Milo Đukanović|Q200305|='],
      ['2006-11-10', 'Željko Šturanović|Q356556|='],
      ['2008-02-29', 'Milo Đukanović|Q200305|='],
      ['2010-12-29', 'Igor Lukšić|Q57746|='],
      ['2012-12-04', 'Milo Đukanović|Q200305|='],
      ['2016-11-28', 'Duško Marković|Q27941657|='],
      ['2020-12-04', 'Zdravko Krivokapić|Q97999161|='],
      ['2022-04-28', 'Dritan Abazović|Q16353146|='],
      ['2023-10-31', 'Milojko Spajić|Q101225458|=']
    ]),
    offices: officeChain('hos', [
      ['2006-06-03', 'Filip Vujanović|Q57542|='],
      ['2018-05-20', 'Milo Đukanović|Q200305|='],
      ['2023-05-20', 'Jakov Milatović|Q104417661|=']
    ])
  },
  // Dominica: Prime Minister (a parliamentary republic) from independence, 3 November 1978. John left and Seraphin was
  // sworn in in June 1979, day not confirmed: 21 June in German Wikipedia's "Oliver Seraphin" (revision 246196606),
  // which has Judge Bruno swear him in that day, citing Christian, "A Rain of Stones", in André and Christian, In
  // Search of Eden (1992), pp. 145-146, the one free source that cites a published work for the day; German
  // Wikipedia's "Patrick John" (revision 268548353), Wikidata and John's English article also end John on 21 June.
  // The English, French and Spanish lists give 25 June for both, and Wikidata's start for Seraphin (imported from
  // English Wikipedia) and his English article give 25 June, none citing a source for it (read 27 November 2026). The
  // free sources are split, five to four, no official act was found, and one cited source does not outweigh the
  // others (header), so only the month is given (the fixer, 27 November 2026). Pierre Charles acted from Douglas's death on
  // 1 October 2000 (the English, French, Spanish, German and Russian lists; Wikidata, imported from English Wikipedia,
  // dates him from 3 October). Wikidata ends Riviere's term on 8 August 2004; he acted for two days, to 8 January.
  Q784: {
    leaders: chain([
      ['1978-11-03', 'Patrick John|Q1281003|='],
      ['1979-06-01', 'Oliver Seraphin|Q324474|=', { startPrecision: 'month' }],
      ['1980-07-21', 'Eugenia Charles|Q258685|='],
      ['1995-06-14', 'Edison James|Q366200|='],
      ['2000-02-03', 'Rosie Douglas|Q1279447|=', DIED],
      ['2000-10-01', 'Pierre Charles|Q1293269|Pierre Charles (Dominican politician)', DIED],
      ['2004-01-06', 'Osborne Riviere|Q324486|='],
      ['2004-01-08', 'Roosevelt Skerrit|Q57823|=']
    ]),
    // Presidents, as Wikipedia's "List of presidents of Dominica" dates them (acting ones included). The acting
    // President Armour sat for no party (Wikidata's tag is "independent politician", which the page would list as a
    // party in power).
    offices: [
      O('hos', 'Louis Cools-Lartigue|Q2118173|=', '1978-11-03', '1979-01-16'),
      O('hos', 'Fred Degazon|Q2353201|=', '1979-01-16', '1980-01-29'),
      O('hos', 'Louis Cools-Lartigue|Q2118173|=', '1979-06-15', '1979-06-16'),
      noParties(O('hos', 'Jenner Armour|Q22918445|=', '1979-06-21', '1980-02-25')),
      ...officeChain('hos', [
        ['1980-02-25', 'Aurelius Marie|Q21997041|='],
        ['1983-12-19', 'Clarence Seignoret|Q2975576|='],
        ['1993-10-25', 'Crispin Sorhaindo|Q4429403|=', '1998-10-05'],
        ['1998-10-06', 'Vernon Shaw|Q887688|='],
        ['2003-10-01', 'Nicholas Liverpool|Q310129|='],
        ['2012-09-17', 'Eliud Williams|Q1707507|='],
        ['2013-10-02', 'Charles Savarin|Q2960197|='],
        ['2023-10-02', 'Sylvanie Burton|Q122208779|=']
      ])
    ]
  },
  // Grenada: Prime Minister from independence, 7 February 1974, with those who held power from 1979 to 1984, as
  // Wikipedia's "List of heads of government of Grenada" gives them: Bishop's People's Revolutionary Government (from the
  // coup of 13 March 1979), Coard (Bishop was put under house arrest on 13 October 1983; Strachan announced his
  // dismissal and Coard's leadership on 14 October, the People's Revolutionary Government article), Austin's
  // Revolutionary Military Council (from 19 October to the US-led invasion of 25 October: his article's text and
  // succession box, the People's Revolutionary Government article and Wikidata; the list and his infobox give 30 October,
  // the day he was captured, a change made on 17 November 2026 without a citation), the Governor-General Scoon as
  // interim head of government from his Proclamation of 31 October 1983 (Government Gazette Extraordinary Vol. 101
  // No. 49, printed in the UN Secretary-General's report A/38/568, annex II; no free source gives 25 October), and
  // Brathwaite's Interim Advisory Council. The days between 25 and 31 October are left empty. Wikidata ends Gairy on
  // 9 March 1979 and Bishop on 16 October (as Bishop's succession box does), both imported from English Wikipedia, and
  // leaves out Coard and Scoon (read 27 November 2026). Brathwaite's Interim Advisory Council was non-party
  // (Wikipedia's list: independent; his National Democratic Congress was founded in 1987), so that term carries no
  // party (second reader, 16 November 2026).
  Q769: {
    leaders: chain([
      ['1974-02-07', 'Eric Gairy|Q203046|=', { exit: 'Irregular' }],
      ['1979-03-13', 'Maurice Bishop|Q468234|=', IRREGULAR],
      ['1983-10-14', 'Bernard Coard|Q118047|=', IRREGULAR],
      ['1983-10-19', 'Hudson Austin|Q953795|=', { entry: 'Irregular', exit: 'Foreign', end: '1983-10-25' }],
      ['1983-10-31', 'Paul Scoon|Q709738|='],
      ['1983-12-09', 'Nicholas Brathwaite|Q1984818|=', { noParties: true }],
      ['1984-12-04', 'Herbert Blaize|Q1276896|=', { ...DIED, end: '1989-12-19' }],
      ['1989-12-20', 'Ben Jones|Q816529|Ben Jones (Grenadian politician)'],
      ['1990-03-16', 'Nicholas Brathwaite|Q1984818|='],
      ['1995-02-01', 'George Brizan|Q550570|='],
      ['1995-06-22', 'Keith Mitchell|Q370110|='],
      ['2008-07-09', 'Tillman Thomas|Q57796|='],
      ['2013-02-20', 'Keith Mitchell|Q370110|='],
      ['2022-06-24', 'Dickon Mitchell|Q112679881|=']
    ]),
    offices: realm('1974-02-07')
  },
  // Saint Lucia: Prime Minister from independence, 22 February 1979. Compton's second term starts in May 1982 (the
  // Office of the Prime Minister's history page). The day is not confirmed: Wikipedia's lists give 3 May, the day
  // of the election, without a source for the day, and the IPU's chronicle gives 5 May; Wikidata and his English
  // infobox give 3 November, against the official page. Compton was sworn in on 15 December 2006 (the Government
  // Information Service's release of that day; Wikidata's end for Anthony; Wikipedia's English list and Wikidata:
  // the 11th, the day of the election). King acted for Compton, disabled by strokes, from 1 May 2007, the day
  // Compton arrived in New York (King's own statement as Acting Prime Minister; his infobox in English and French;
  // Wikidata). No source names the day his acting term began, and the Government Information Service calls him
  // Acting Prime Minister by 14 May. Wikipedia's lists date him from Compton's death on 7 September. He is dated
  // from 1 May, as Archigos dates Olmert from Sharon's stroke, with Compton's exit as Sharon's (second reader,
  // 16 November 2026). Compton's article says he "temporarily resumed power" in early June 2007 to reshuffle the
  // cabinet; that is not a separate entry. Pierre took the oath on 28 July 2021 (the Government Information
  // Service's release of 30 July; Wikidata's head of government; Wikidata's end for Chastanet: 26 July, the day of
  // the election). Read again from free sources on 27 November 2026.
  Q760: {
    leaders: chain([
      ['1979-02-22', 'John Compton|Q716020|='],
      ['1979-07-02', 'Allan Louisy|Q966659|='],
      ['1981-05-04', 'Winston Cenac|Q1281039|='],
      ['1982-01-17', 'Michael Pilgrim|Q353922|='],
      ['1982-05-01', 'John Compton|Q716020|=', { startPrecision: 'month' }],
      ['1996-04-02', 'Vaughan Lewis|Q353918|='],
      ['1997-05-24', 'Kenny Anthony|Q57750|='],
      ['2006-12-15', 'John Compton|Q716020|=', { exit: 'Retired Due to Ill Health' }],
      ['2007-05-01', 'Stephenson King|Q708289|='],
      ['2011-11-30', 'Kenny Anthony|Q57750|='],
      ['2016-06-07', 'Allen Chastanet|Q16203640|='],
      ['2021-07-28', 'Philip J. Pierre|Q7184214|=', { name: 'Pierre' }]
    ]),
    offices: realm('1979-02-22')
  },
  // Saint Vincent and the Grenadines: Prime Minister from independence, 27 October 1979. Gonsalves took office on
  // 29 March 2001 by the majority of free sources: Wikipedia's list (rev 1373760138), its articles on Gonsalves in
  // English, German, French and Spanish, the French article on Eustace, and Wikidata's end for Eustace. Wikidata's
  // start for Gonsalves and the English and Spanish articles on Eustace give 28 March, the polling day. None cites
  // a source for the day, so the day is contested. Friday was sworn in on 28 November 2025 (Wikipedia, "2025
  // Vincentian general election", rev 1387453426; his articles in four languages agree). Wikidata has no end for
  // Gonsalves yet. Read 26 and 27 November 2026.
  Q757: {
    leaders: chain([
      ['1979-10-27', 'Milton Cato|Q165402|='],
      ['1984-07-30', 'James Fitz-Allen Mitchell|Q1281056|=', { name: 'Mitchell' }],
      ['2000-10-27', 'Arnhim Eustace|Q1268324|='],
      ['2001-03-29', 'Ralph Gonsalves|Q57800|='],
      ['2025-11-28', 'Godwin Friday|Q28319076|=']
    ]),
    offices: realm('1979-10-27')
  },
  // Antigua and Barbuda: Prime Minister from independence, 1 November 1981 (the Constitution at ab.gov.ag counts from
  // that day, ss. 111 and 112). Every day is the same in Wikidata (P39 of Q20682527; three of the four statements were
  // imported from English Wikipedia), the English Wikipedia list (revision 1356599174), the Spanish list (revision
  // 176247379) and the French list (revision 241093031) (read 26 November 2026, checked again 27 November 2026).
  Q781: {
    leaders: chain([
      ['1981-11-01', 'Vere Bird|Q561911|='],
      ['1994-03-09', 'Lester Bird|Q365451|='],
      ['2004-03-24', 'Baldwin Spencer|Q57602|='],
      ['2014-06-13', 'Gaston Browne|Q17177542|=']
    ]),
    offices: realm('1981-11-01')
  },
  // Saint Kitts and Nevis: Prime Minister from independence, 19 September 1983. Douglas was sworn in on 4 July 1995
  // (the government's biography at gov.kn, his office's release of 5 July 2012, SFLCN of 6 July 2010; Wikipedia's list,
  // revision 1373760107, and Wikidata's end for Simmonds: 7 July; Wikidata's start for Douglas and his article: 6 July,
  // though the article's own source is the gov.kn biography). Harris from 18 February 2015 and Drew from 6 August 2022
  // (Wikidata, citing gov.kn; Wikipedia's list). Read again on 27 November 2026.
  Q763: {
    leaders: chain([
      ['1983-09-19', 'Kennedy Simmonds|Q953225|='],
      ['1995-07-04', 'Denzil Douglas|Q57738|='],
      ['2015-02-18', 'Timothy Harris|Q3529064|=', { name: 'Harris' }],
      ['2022-08-06', 'Terrance Drew|Q113443525|=']
    ]),
    offices: realm('1983-09-19')
  },
  // Monaco: the Sovereign Prince, who holds executive power (the Minister of State, appointed by him, is under "Also in
  // office"). Dates from Wikidata (Q2457774) and the French and German lists of rulers; Louis II's death on 9 May 1949
  // from the Journal de Monaco (no. 4779). Albert was regent from 31 March 2005 while Rainier III was dying; he is dated
  // from his accession on 6 April (read 27 November 2026).
  Q235: {
    leaders: chain([
      ['1922-06-26', 'Louis II|Q316543|Louis II of Monaco', DIED],
      ['1949-05-09', 'Rainier III|Q185025|Rainier III of Monaco', DIED],
      ['2005-04-06', 'Albert II|Q3910|Albert II of Monaco']
    ]),
    // Ministers of State (acting ones included), each from the official Journal de Monaco (journaldemonaco.gouv.mc),
    // read 27 November 2026: the day the Sovereign Ordinance names for the appointment to take effect; where it names
    // none, the day the Journal shows him taking up the post (Gregh's oath on 1 April 1969, Soum received at the
    // Government Palace on 14 November 1953, Journal no. 5016); where it shows none, the day of the act. So Mauran acted
    // from 15 January 1932 (Ordinances 1.277 and 1.278) and again from 22 May 1937 (Ordinance 1.987, Journal no. 4153;
    // Ordinance 2.012 ends Bouilloux-Lafont's mission formally on 31 May); de Witasse from 20 November 1944
    // (Ordinances 2.929 and 2.931, Journal no. 4545, "Donné en Notre Palais à Monaco, le vingt novembre", read again by
    // the fixer on 27 November 2026: the day of the act, as the rule gives, for neither names a day of effect and the
    // Journal shows no day he took up the post; his first signature in it is of 16 December). Wikidata (Q7192530) dates
    // him from 13 October 1944, with no reference, against the Journal, which still calls Blanchy "Ministre d'Etat
    // intérimaire" on 9 November (no. 4543); Voizard from 24 July 1950 (Ordinance 261, Journal no. 4843: "prendra effet du 24 juillet 1950");
    // Pelletier from 1 February 1959, Demange from 1 January 1967, Saint-Mleux from 1 June 1972, Herly from 8 July 1981
    // and Dupont from 18 February 1991 (each ordinance's effect clause); Berro-Amadeï from 10 January 2025, when
    // Ordinance 11.020 gave her the interim of the stricken Guillaume, as Ordinance 5.657 gave Tonelli his in 2015.
    // Blanchy acted between Voizard and Soum in 1953 (the Journal calls him "Ministre d'État intérimaire" in nos. 5006,
    // 5015 and 5016); no act was found, and his start, 2 September, is the end of Voizard's term in Wikidata (Q961184)
    // and in the French, Italian and Spanish lists, which leave the interim out (Wikidata gives Blanchy no term in
    // 1953; read again by the fixer on 27 November 2026). Wikidata's Minister statements (Q1655971) carry no references, except Dartout's, and stop in
    // January 2025; the German list's only source is rulers.org and the English list's is worldstatesmen.org, so
    // neither is counted. Philippe Mettoux, named on 4 June 2025 in French Wikipedia, gave it up before taking office
    // (no ordinance names him; Ordinance 11.290 repeals 11.020 only from Mirmand's day), so he has no entry. The
    // Ministers are appointed officials, so they carry no party (Wikidata's tag for most is "independent politician",
    // which the page would list as a party in power).
    offices: officeChain('hog', [
      ['1923-10-01', 'Maurice Piette|Q6793413|='],
      ['1932-01-15', 'Henry Mauran|Q16010445|='],
      ['1932-06-14', 'Maurice Bouilloux-Lafont|Q3300465|='],
      ['1937-05-22', 'Henry Mauran|Q16010445|='],
      ['1937-08-01', 'Émile Roblot|Q8078312|='],
      ['1944-09-29', 'Pierre Blanchy|Q3384034|='],
      ['1944-11-20', 'Pierre de Witasse|Q7192530|='],
      ['1948-12-31', 'Pierre Blanchy|Q3384034|='],
      ['1949-07-12', 'Jacques Rueff|Q1398687|='],
      ['1950-07-24', 'Pierre Voizard|Q961184|='],
      ['1953-09-02', 'Pierre Blanchy|Q3384034|='],
      ['1953-11-14', 'Henry Soum|Q5728515|=', '1958-12-31'],
      ['1959-01-01', 'Pierre Blanchy|Q3384034|='],
      ['1959-02-01', 'Émile Pelletier|Q3588689|='],
      ['1962-01-23', 'Pierre Blanchy|Q3384034|='],
      ['1963-08-16', 'Jean Reymond|Q4392628|='],
      ['1967-01-01', 'Paul Demange|Q3371035|Paul Demange (politician)'],
      ['1969-04-01', 'François-Didier Gregh|Q4148820|='],
      ['1972-06-01', 'André Saint-Mleux|Q4416048|='],
      ['1981-07-08', 'Jean Herly|Q1685665|='],
      ['1985-09-16', 'Jean Ausseil|Q931543|='],
      ['1991-02-18', 'Jacques Dupont|Q1677870|Jacques Dupont (politician)'],
      ['1994-12-02', 'Paul Dijoud|Q3371082|='],
      ['1997-02-03', 'Michel Lévêque|Q3310255|='],
      ['2000-01-01', 'Patrick Leclercq|Q1395490|='],
      ['2005-06-01', 'Jean-Paul Proust|Q354691|='],
      ['2010-03-29', 'Michel Roger|Q57849|='],
      ['2015-12-16', 'Gilles Tonelli|Q19924352|='],
      ['2016-02-01', 'Serge Telle|Q3479546|='],
      ['2020-09-01', 'Pierre Dartout|Q20556507|='],
      ['2024-09-02', 'Didier Guillaume|Q3027038|='],
      ['2025-01-10', 'Isabelle Berro-Amadeï|Q1673628|='],
      ['2025-07-21', 'Christophe Mirmand|Q29934395|=']
    ]).map(noParties)
  },
  // Liechtenstein: the Prince, who holds executive power, or the member of his house who exercises his powers for him:
  // Franz Joseph empowered to exercise the rights of Franz I from 30 March 1938 (the letter of that day, LGBl. 1938
  // Nr. 9; Liechtenstein's national historical lexicon, in its articles on both men; his English infobox: 31 March),
  // Prince from 25 July 1938; Hans-Adam as his father's deputy from 26 August 1984 (LGBl. 1984 Nr. 32, "mit Wirkung ab
  // heutigem Tage"), Prince from 13 November 1989; Hereditary Prince Alois for Hans-Adam II since 15 August 2004
  // (LGBl. 2004 Nr. 171; as National Analysis names him). The reigning Prince is then under "Also in office", as head
  // of state. Reigns from Wikipedia's "List of monarchs of Liechtenstein" (revision 1387499961), the German list of
  // Princes (revision 272398544) and Wikidata (whose start for Johann II is the year 1858 only; his father's death,
  // P570, gives 12 November 1858). Read again on 27 November 2026.
  Q347: {
    leaders: chain([
      ['1858-11-12', 'Johann II|Q317016|Johann II of Liechtenstein', DIED],
      ['1929-02-11', 'Franz I|Q455890|Franz I of Liechtenstein'],
      ['1938-03-30', 'Franz Joseph II|Q165674|Franz Joseph II of Liechtenstein'],
      ['1984-08-26', 'Hans-Adam II|Q57454|Hans-Adam II of Liechtenstein'],
      ['2004-08-15', 'Alois, Hereditary Prince of Liechtenstein|Q311308|=', { name: 'Alois' }]
    ]),
    offices: [
      ...officeChain('hos', [
        ['1929-02-11', 'Franz I|Q455890|Franz I of Liechtenstein'],
        ['1938-07-25', 'Franz Joseph II|Q165674|Franz Joseph II of Liechtenstein'],
        ['1989-11-13', 'Hans-Adam II|Q57454|Hans-Adam II of Liechtenstein']
      ]),
      // Heads of Government (Prime Ministers), from Wikidata (Q62396915, and its statements on Liechtenstein, P6, from
      // 1978), English Wikipedia's "List of heads of government of Liechtenstein" (revision 1368831918) and the German
      // list (revision 270585793), read again on 27 November 2026; neither list cites rulers.org. Schädler from
      // 10 June 1922, when the Prince appointed him on the Landtag's proposal (the lexicon, Wikidata, the English list);
      // the Landtag had elected him on 6 June (the lexicon on Felix Gubelmann; the German list dates him from then). In
      // 1928 the lexicon is followed: Schädler's whole government resigned on 15 June (also the German list; the English
      // list and Wikidata: 24 June) and Prince Alfred ran the government provisionally from 24 June (also the English
      // list and his German article; the German list leaves him out; Wikidata and his English infobox: 26 June); the
      // days between are left empty. Hoop keeps 4 August (Wikidata, both lists, both his articles; the lexicon ends
      // Alfred's term on 6 August).
      ...officeChain('hog', [
        ['1922-06-10', 'Gustav Schädler|Q345161|=', '1928-06-15'],
        ['1928-06-24', 'Prince Alfred of Liechtenstein|Q16403716|Prince Alfred of Liechtenstein (1875–1930)'],
        ['1928-08-04', 'Josef Hoop|Q345112|='],
        ['1945-09-03', 'Alexander Frick|Q689754|='],
        ['1962-07-16', 'Gerard Batliner|Q268968|='],
        ['1970-03-18', 'Alfred Hilbe|Q1368902|='],
        ['1974-03-27', 'Walter Kieber|Q717704|='],
        ['1978-04-26', 'Hans Brunhart|Q696665|='],
        ['1993-05-26', 'Markus Büchel|Q1901454|='],
        ['1993-12-15', 'Mario Frick|Q543453|Mario Frick (politician)'],
        ['2001-04-05', 'Otmar Hasler|Q238670|='],
        ['2009-03-25', 'Klaus Tschütscher|Q57778|='],
        ['2013-03-27', 'Adrian Hasler|Q373092|='],
        ['2021-03-25', 'Daniel Risch|Q30882650|='],
        ['2025-04-10', 'Brigitte Haas|Q129676165|=']
      ])
    ]
  },
  // Andorra: the General Syndic (Síndic General), elected by the General Council, who led the Valleys' government until
  // the office of Head of Government was created in January 1982; then the Head of Government. The Syndics' days come
  // from the General Council's own records, read 27 November 2026: its summary of the acts ("Del Consell de la Terra al
  // Consell General. Síndics, subsíndics, consellers i cònsols (1133-2023)", consellgeneral.ad, cited by entry) and its
  // index of office holders (Jordi Guillamet, "Índex de càrrecs institucionals 1133-2023"). A Syndic is dated from the
  // oath where the act gives one, and otherwise from the election: Font 17 December 1923 (entry 1.142), Pallarès
  // 19 December 1927 (1.148), Torres 18 September 1933 (1.166), Molné acting from 21 July 1936 "fins al pròxim Consell
  // del 16 de desembre" (1.183), Cairat sworn on 16 December 1936 (1.187), Reig from 31 December 1960 (1.269), Escudé
  // sworn on 31 December 1966 (1.286: elected on the 27th), Reig elected on 28 December 1972 (1.307 names no oath;
  // Wikidata gives the 29th and Escudé's Catalan article the 31st, so that day is contested), Sangrà sworn on
  // 30 December 1978 (1.336: elected on the 29th), Sangrà's end on 4 January 1982 (1.349) and Ribas from 8 January
  // (1.350). Pallarès left office in August 1933 (his Catalan Wikipedia article, revision 37843718, "l'agost de 1933"),
  // when French gendarmes had the General Council dismissed; the day is not confirmed (the Catalan list's 19 August is
  // an uncited note in a list whose main source is rulers.org, which VM does not use; the act of 18 September, 1.166,
  // says only that the Council "va ser destituït"), and the weeks to Torres's election are left empty. The index and
  // the summary name Pere Font Altimir and Francesc Molné Armengol (Wikidata's labels and the Catalan list: Font i
  // Altamir, Molné i Rogé; their Wikidata ids, whose dates match, are kept); the index's "Escudé Farrero" stands
  // alone against the others, so Ferrero stays. Heads of Government from Wikipedia's list and Wikidata (Q634322) and
  // the Council's journals (oaths of Martí on 12 May 2011 and 1 April 2015, of Espot on 16 May 2019). Bartumeu ends
  // on 12 May 2011 (Wikidata; the Spanish list's row for him): the acting head of April and May 2011 is not confirmed,
  // since the one source his English article gives for Pere López Agràs's acting term is rulers.org and the lists cite
  // nothing for it. Saboya acted in 2015 by the delegation decree of 18 March 2015 (Martí's English article, citing
  // Ràdio Seu and the BOPA).
  Q228: {
    leaders: chain([
      ['1923-12-17', 'Pere Font Altimir|Q68173609', { name: 'Font' }],
      ['1927-12-19', 'Roc Pallarès Rossell|Q68168956', { name: 'Pallarès', end: '1933-08-01', endPrecision: 'month' }],
      ['1933-09-18', 'Pere Torres i Riba|Q68174128', { name: 'Torres' }],
      ['1936-07-21', 'Francesc Molné Armengol|Q68192409', { name: 'Molné' }],
      ['1936-12-16', 'Francesc Cairat Freixes|Q68115365', { name: 'Cairat' }],
      ['1960-12-31', 'Julià Reig Ribó|Q3819390|=', { name: 'Reig' }],
      ['1966-12-31', 'Francesc Escudé Ferrero|Q68117747', { name: 'Escudé' }],
      ['1972-12-28', 'Julià Reig Ribó|Q3819390|=', { name: 'Reig' }],
      ['1978-12-30', 'Estanislau Sangrà Font|Q68111337', { name: 'Sangrà', end: '1982-01-04' }],
      ['1982-01-08', 'Òscar Ribas Reig|Q292884|=', { name: 'Ribas' }],
      ['1984-05-21', 'Josep Pintat-Solans|Q72546|Josep Pintat Solans'],
      ['1990-01-12', 'Òscar Ribas Reig|Q292884|=', { name: 'Ribas' }],
      ['1994-12-07', 'Marc Forné Molné|Q365542|=', { name: 'Forné' }],
      ['2005-05-27', 'Albert Pintat|Q312785|='],
      ['2009-06-05', 'Jaume Bartumeu|Q217598|='],
      ['2011-05-12', 'Antoni Martí|Q24801|='],
      ['2015-03-23', 'Gilbert Saboya Sunyé|Q3105855|=', { name: 'Saboya' }],
      ['2015-04-01', 'Antoni Martí|Q24801|='],
      ['2019-05-16', 'Xavier Espot Zamora|Q21001195|=', { name: 'Espot' }]
    ]),
    // The two Co-Princes: the French head of state (Wikidata Q19808845; Sarkozy's days, which Wikidata gives as years,
    // are his predecessor's end and his successor's start there; Bidault to 16 December 1946 as chairman of the
    // Provisional Government, as French head of state, from his French and English articles; Poher acted from
    // Pompidou's death on 2 April 1974, as the French Senate's page on him and the French and English lists date it,
    // against Wikidata's 3 April). Blum's five weeks, from 16 December 1946 to 16 January 1947, as chairman of the
    // Provisional Government, the office that made Bidault head of state: English Wikipedia's "List of presidents of
    // France" (revision 1381038946, no reference on the row), French Wikipedia's "Liste des chefs d'État français"
    // (revision 241242427, his row in the Provisional Government's table) and Wikidata (Q18434, P39 Q23004974, from
    // 16 December 1946; Auriol's Co-Prince statement, Q158772, names Blum as his predecessor). Against them, French
    // Wikipedia's "Liste des présidents de la République française" (revision 240836626, citing elysee.fr) says Auriol
    // exercised the head of state's functions from the constitution of 27 October 1946, with no day; Wikidata's
    // 3 December 1946 for Auriol is his presidency of the National Assembly, not a head of state's term. The majority
    // is followed, as in the head-of-state lane of France (HOS_GAPS in leader-corrections.mjs; the fixer, 27 November
    // 2026). The Bishop of Urgell: Guitart to his death on 30 January 1940 (his Catalan article, revision 39164253, and
    // English article, revision 1342282087, and Wikidata's date of death, P570), against 31 January in Wikidata's
    // "position held" and the Catalan list (revision 38198573); La Vanguardia's archive refused the request and was
    // left. Apostolic administrators acted in 1940-43 and 1969-71: Fornesa from February 1940, day not confirmed (the
    // Catalan list's 2 February, a row that cites nothing; his Catalan article, revision 38890935, cites only
    // enciclopedia.cat, which is not a source, so it is not counted, and Wikidata's dates are imported from it; he has
    // no English article); Iglesias from 4 April 1943, his possession of the see, as the bishops are dated (the Catalan
    // list, his Catalan article, revision 38697031, and his English article; the fixer, 27 November 2026: until then
    // Fornesa's article's 15 April), with his oath as Co-Prince on 1 May 1943 (the Council's act, summary entry 1.217)
    // and Wikidata's 29 December 1942, his appointment, named; Iglesias left on 29 April 1969 (the Council's act
    // of 30 April 1969, entry 1.294: "els dies 28 i 29 han plegat els dos coprínceps"; his Catalan article; Wikidata)
    // and Malla took possession as Co-Prince on 19 June 1969 (entry 1.295; his Catalan article; Wikidata's 29 April,
    // imported from Italian and English Wikipedia, is his appointment), so the seven weeks between are left empty.
    // Martí i Alanis from 31 January 1971, when he took possession of the see (his Catalan article, citing La
    // Vanguardia of 2 February 1971; his English article; Wikidata; the Council's act of 17 March 1971, entry 1.301,
    // records his possession as Co-Prince); Vives from 12 May 2003 (Wikidata, the Catalan list, his English and
    // Catalan articles; he took the oath as Co-Prince on 10 July 2003); Serrano Pentinat from 31 May 2025 (Wikidata,
    // citing andorradifusio.ad; the Catalan list; his English article). So the bishops are dated by the see, except
    // Malla, whose possession as Co-Prince is the only free day for him (read 26 and 27 November 2026). A French president's party is not an Andorran party, so build-parties.mjs gives the
    // French Co-Prince none (noParties).
    offices: [
      ...officeChain('hos', [
        ['1924-06-13', 'Gaston Doumergue|Q296064|='],
        ['1931-06-13', 'Paul Doumer|Q12680|=', '1932-05-07'],
        ['1932-05-10', 'Albert Lebrun|Q158749|='],
        ['1940-07-11', 'Philippe Pétain|Q5721|='],
        ['1944-08-20', 'Charles de Gaulle|Q2042|=', '1946-01-20'],
        ['1946-01-26', 'Félix Gouin|Q381187|='],
        ['1946-06-24', 'Georges Bidault|Q312026|='],
        ['1946-12-16', 'Léon Blum|Q18434|='],
        ['1947-01-16', 'Vincent Auriol|Q158772|='],
        ['1954-01-16', 'René Coty|Q158768|='],
        ['1959-01-08', 'Charles de Gaulle|Q2042|='],
        ['1969-04-28', 'Alain Poher|Q12950|='],
        ['1969-06-20', 'Georges Pompidou|Q2185|='],
        ['1974-04-02', 'Alain Poher|Q12950|='],
        ['1974-05-27', 'Valéry Giscard d\'Estaing|Q2124|='],
        ['1981-05-21', 'François Mitterrand|Q2038|='],
        ['1995-05-17', 'Jacques Chirac|Q2105|='],
        ['2007-05-16', 'Nicolas Sarkozy|Q329|='],
        ['2012-05-15', 'François Hollande|Q157|='],
        ['2017-05-14', 'Emmanuel Macron|Q3052772|=']
      ]).map(o => ({ ...o, noParties: true })),
      ...officeChain('hos', [
        ['1920-06-01', 'Justí Guitart i Vilardebó|Q2402274|=', '1940-01-30'],
        ['1940-02-01', 'Ricard Fornesa i Puigdemasa|Q3430238', undefined, { startPrecision: 'month' }],
        ['1943-04-04', 'Ramón Iglesias i Navarri|Q879315|=', '1969-04-29'],
        ['1969-06-19', 'Ramón Malla Call|Q944649|='],
        ['1971-01-31', 'Joan Martí i Alanis|Q684487|='],
        ['2003-05-12', 'Joan Enric Vives i Sicília|Q57473|='],
        ['2025-05-31', 'Josep-Lluís Serrano Pentinat|Q93244592|=']
      ])
    ]
  },
  // San Marino: the two Captains Regent, who preside over the collective executive (the Congress of State) and change on
  // 1 April and 1 October: the nearest pattern in the data is Switzerland's President of the Confederation, the chair of
  // a collective executive. Both are entered, with the same days. Every semester since October 1925 is in Wikipedia's
  // "List of captains regent of San Marino" (revision 1377833924), in the Regency's own list
  // (reggenzadellarepubblica.sm) and, to March 2023, in Wikidata (Q258045), and the three name the same pairs (read
  // again on 27 November 2026, with the Great and General Council's archive of acts). Two semesters differ from the
  // pattern: in 1930 Marino Lonfernini died on 10 September (Notificazione Ufficiale n. 2 of 11 September 1930; it
  // does not say how, so his exit is unknown) and Turiddu Foschi took his place on 16 September (Notificazione n. 3,
  // of that day; the act spells him "Turiddo", both Wikipedias "Turiddu"); in 1957 the provisional government formed
  // at Rovereta on 1 October holds the office from that day, as the official acts date it (Decreti 18, 19 and 20 of
  // 23 October 1957 ratify its decrees from 1 October, annul the Regency's acts from 19 September to 14 October, and
  // unseat the councillors who accepted the election called by "la Reggenza che si è successivamente autoprorogata
  // nei poteri"), and the Regency's list ends Giacomini and Marani on 1 October 1957 (read again by the fixer on
  // 27 November 2026), as Wikidata does. The old pair kept the capital and the gendarmerie until 11 October, when they
  // recognised it (Italian Wikipedia, "Fatti di Rovereta", revision 153408108: "L'11 ottobre i reggenti misero fine
  // alla crisi"; English Wikipedia's list dates it from 10 October); until the fixer's pass of 27 November 2026 the list
  // followed that day, on that one free source, and now follows the official act, as the header's rule gives. The
  // next pair took office on 27 October (Notificazione n. 2 of 23 October 1957; their first decree is of 28 October;
  // the Regency's list and Wikidata: 1 October, the day of the semester). San Marino has no other head of state or
  // government, so nobody is under "Also in office".
  Q238: {
    leaders: semesters([
    ['1925-10-01', 'Valerio Pasquali|Q98105684', 'Marco Marcucci|Q98105288'],
    ['1926-04-01', 'Manlio Gozi|Q98105280', 'Giuseppe Mularoni|Q98105221'],
    ['1926-10-01', 'Giuliano Gozi|Q1093721|=', 'Ruggero Morri|Q98105623'],
    ['1927-04-01', 'Gino Gozi|Q98105034', 'Marino Morri|Q98105380'],
    ['1927-10-01', 'Marino Rossi|Q98105385', 'Nelson Burgagni|Q98105474'],
    ['1928-04-01', 'Domenico Suzzi Valli|Q98104834', 'Francesco Pasquali|Q98104980'],
    ['1928-10-01', 'Francesco Morri|Q98104977', 'Melchiorre Filippi|Q98105414'],
    ['1929-04-01', 'Girolamo Gozi|Q98123313', 'Filippo Mularoni|Q98104878'],
    ['1929-10-01', 'Ezio Balducci|Q98104851', 'Aldo Busignani|Q98104574'],
    ['1930-04-01', 'Manlio Gozi|Q98105280', { who: 'Marino Lonfernini|Q98105367', end: '1930-09-10' }, { who: 'Turiddu Foschi', start: '1930-09-16', more: { noQid: 'no Wikidata item names him as Captain Regent' } }],
    ['1930-10-01', 'Valerio Pasquali|Q98105684', 'Gino Ceccoli|Q98105032'],
    ['1931-04-01', 'Angelo Manzoni Borghesi|Q98104596', 'Francesco Mularoni|Q98104978'],
    ['1931-10-01', 'Domenico Suzzi Valli|Q98104834', 'Marino Morri|Q98105380'],
    ['1932-04-01', 'Giuliano Gozi|Q1093721|=', 'Pompeo Righi|Q98105559'],
    ['1932-10-01', 'Gino Gozi|Q98105034', 'Ruggero Morri|Q98105623'],
    ['1933-04-01', 'Francesco Morri|Q98104977', 'Settimio Belluzzi|Q98105641'],
    ['1933-10-01', 'Carlo Balsimelli|Q98104737', 'Melchiorre Filippi|Q98105414'],
    ['1934-04-01', 'Marino Rossi|Q98105385', 'Giovanni Lonfernini|Q98105140'],
    ['1934-10-01', 'Angelo Manzoni Borghesi|Q98104596', 'Marino Michelotti|Q98105381'],
    ['1935-04-01', 'Federico Gozi|Q126488995', 'Salvatore Foschi|Q98105625'],
    ['1935-10-01', 'Pompeo Righi|Q98105559', 'Marino Morri|Q98105380'],
    ['1936-04-01', 'Gino Gozi|Q98105034', 'Ruggero Morri|Q98105623'],
    ['1936-10-01', 'Francesco Morri|Q98104977', 'Gino Ceccoli|Q98105032'],
    ['1937-04-01', 'Giuliano Gozi|Q1093721|=', 'Settimio Belluzzi|Q98105641'],
    ['1937-10-01', 'Marino Rossi|Q98105385', 'Giovanni Lonfernini|Q98105140'],
    ['1938-04-01', 'Manlio Gozi|Q98105280', { who: 'Luigi Mularoni', more: { noQid: 'no Wikidata item names him as Captain Regent' } }],
    ['1938-10-01', 'Carlo Balsimelli|Q98104737', 'Celio Gozi|Q98104752'],
    ['1939-04-01', 'Pompeo Righi|Q98105559', 'Marino Morri|Q98105380'],
    ['1939-10-01', 'Marino Michelotti|Q98105381', 'Orlando Reffi|Q98105491'],
    ['1940-04-01', 'Angelo Manzoni Borghesi|Q98104596', 'Filippo Mularoni|Q98104878'],
    ['1940-10-01', 'Federico Gozi|Q126488995', 'Salvatore Foschi|Q98105625'],
    ['1941-04-01', 'Gino Gozi|Q98105034', 'Secondo Menicucci|Q98105638'],
    ['1941-10-01', 'Giuliano Gozi|Q1093721|=', 'Giovanni Lonfernini|Q98105140'],
    ['1942-04-01', 'Settimio Belluzzi|Q98105641', 'Celio Gozi|Q98104752'],
    ['1942-10-01', 'Carlo Balsimelli|Q98104737', 'Renato Martelli|Q98105604'],
    ['1943-04-01', 'Marino Michelotti|Q98105381', 'Bartolomeo Manzoni Borghesi|Q98104709'],
    ['1943-10-01', 'Marino Della Balda|Q98105349', 'Sante Lonfernini|Q98105631'],
    ['1944-04-01', 'Francesco Balsimelli|Q18411735', 'Sanzio Valentini|Q98105633'],
    ['1944-10-01', 'Teodoro Lonfernini|Q98105669', 'Leonida Suzzi Valli|Q27467941'],
    ['1945-04-01', 'Alvaro Casali|Q98104582', 'Vittorio Valentini|Q98105751'],
    ['1945-10-01', 'Ferruccio Martelli|Q98104866', 'Secondo Fiorini|Q98105637'],
    ['1946-04-01', 'Giuseppe Forcellini|Q98105211', 'Vincenzo Pedini|Q98105744'],
    ['1946-10-01', 'Filippo Martelli|Q98104877', 'Luigi Montironi|Q98105273'],
    ['1947-04-01', 'Marino Della Balda|Q98105349', 'Luigi Zafferani|Q98105276'],
    ['1947-10-01', 'Domenico Forcellini|Q98104832', 'Mariano Ceccoli|Q98105296'],
    ['1948-04-01', 'Arnaldo Para|Q98104643', 'Giuseppe Renzi|Q98105224'],
    ['1948-10-01', 'Giordano Giacomini|Q98105100', 'Domenico Tomassoni|Q98104835'],
    ['1949-04-01', 'Ferruccio Martelli|Q98104866', 'Primo Bugli|Q98105597'],
    ['1949-10-01', 'Vincenzo Pedini|Q98105744', 'Agostino Biordi|Q98104569'],
    ['1950-04-01', 'Giuseppe Forcellini|Q98105211', 'Primo Taddei|Q98105600'],
    ['1950-10-01', 'Marino Della Balda|Q98105349', 'Luigi Montironi|Q98105273'],
    ['1951-04-01', 'Alvaro Casali|Q98104582', 'Romolo Giacomini|Q98105619'],
    ['1951-10-01', 'Domenico Forcellini|Q98104832', 'Giovanni Terenzi|Q98105148'],
    ['1952-04-01', 'Domenico Morganti|Q98104833', 'Mariano Ceccoli|Q98105296'],
    ['1952-10-01', 'Arnaldo Para|Q98104643', 'Eugenio Bernardini|Q98104845'],
    ['1953-04-01', 'Vincenzo Pedini|Q98105744', 'Alberto Reffi|Q98104573'],
    ['1953-10-01', 'Giordano Giacomini|Q98105100', 'Giuseppe Renzi|Q98105224'],
    ['1954-04-01', 'Giuseppe Forcellini|Q98105211', 'Secondo Fiorini|Q98105637'],
    ['1954-10-01', 'Agostino Giacomini|Q98104570', 'Luigi Montironi|Q98105273'],
    ['1955-04-01', 'Domenico Forcellini|Q98104832', 'Vittorio Meloni|Q98105749'],
    ['1955-10-01', 'Primo Bugli|Q98105597', 'Giuseppe Maiani|Q25850795|='],
    ['1956-04-01', 'Mario Nanni|Q98105397', 'Enrico Andreoli|Q98104843'],
    ['1956-10-01', 'Mariano Ceccoli|Q98105296', 'Eugenio Bernardini|Q98104845'],
    ['1957-04-01', 'Giordano Giacomini|Q98105100', 'Primo Marani|Q16335472'],
    ['1957-10-01', 'Federico Bigi|Q28859148', 'Alvaro Casali|Q98104582', 'Pietro Giancecchi|Q98105538', 'Zaccaria Giovanni Savoretti|Q16335597'],
    ['1957-10-27', 'Marino Valdes Franciosi|Q98105392', 'Federico Micheloni|Q16677101'],
    ['1958-04-01', 'Zaccaria Giovanni Savoretti|Q16335597', 'Stelio Montironi|Q98105664'],
    ['1958-10-01', 'Domenico Forcellini|Q98104832', 'Pietro Reffi|Q3904202'],
    ['1959-04-01', 'Marino Benedetto Belluzzi|Q98105343', 'Agostino Biordi|Q98104569'],
    ['1959-10-01', 'Giuseppe Forcellini|Q98105211', 'Ferruccio Piva|Q28335744'],
    ['1960-04-01', 'Alvaro Casali|Q98104582', 'Gino Vannucci|Q98105035'],
    ['1960-10-01', 'Eugenio Reffi|Q98104847', 'Pietro Giancecchi|Q98105538'],
    ['1961-04-01', 'Federico Micheloni|Q16677101', 'Giancarlo Ghironzi|Q37494583|='],
    ['1961-10-01', 'Giovanni Vito Marcucci|Q98105149', 'Pio Galassi|Q98105553'],
    ['1962-04-01', 'Domenico Forcellini|Q98104832', 'Francesco Valli|Q119520693'],
    ['1962-10-01', 'Antonio Maria Morganti|Q98104631', 'Agostino Biordi|Q98104569'],
    ['1963-04-01', 'Leonida Suzzi Valli|Q27467941', 'Stelio Montironi|Q98105664'],
    ['1963-10-01', 'Giovan Luigi Franciosi|Q98105102', 'Domenico Bollini|Q98104831'],
    ['1964-04-01', 'Marino Benedetto Belluzzi|Q98105343', 'Eusebio Reffi|Q98104848'],
    ['1964-10-01', 'Giuseppe Micheloni|Q98105220', 'Pier Marino Mularoni|Q3902926'],
    ['1965-04-01', 'Ferruccio Piva|Q28335744', 'Federico Carattoni|Q98104856'],
    ['1965-10-01', 'Alvaro Casali|Q98104582', 'Pietro Reffi|Q3904202'],
    ['1966-04-01', 'Francesco Valli|Q119520693', 'Emilio Della Balda|Q98104840'],
    ['1966-10-01', 'Giovanni Vito Marcucci|Q98105149', 'Francesco Maria Francini|Q98104974'],
    ['1967-04-01', 'Vittorio Rossini|Q98105750', 'Alberto Lonfernini|Q98104572'],
    ['1967-10-01', 'Domenico Forcellini|Q98104832', 'Romano Michelotti|Q98105618'],
    ['1968-04-01', 'Marino Benedetto Belluzzi|Q98105343', 'Dante Rossi|Q98104822'],
    ['1968-10-01', 'Pietro Giancecchi|Q98105538', 'Aldo Zavoli|Q98104575'],
    ['1969-04-01', 'Ferruccio Piva|Q28335744', 'Stelio Montironi|Q98105664'],
    ['1969-10-01', 'Alvaro Casali|Q98104582', 'Giancarlo Ghironzi|Q37494583|='],
    ['1970-04-01', 'Francesco Valli|Q119520693', 'Eusebio Reffi|Q98104848'],
    ['1970-10-01', 'Simone Rossini|Q98105660', 'Giuseppe Lonfernini|Q98105217'],
    ['1971-04-01', 'Luigi Lonfernini|Q3266465|=', 'Attilio Montanari|Q98104646'],
    ['1971-10-01', 'Federico Carattoni|Q98104856', 'Marino Vagnetti|Q98105395|='],
    ['1972-04-01', 'Marino Benedetto Belluzzi|Q98105343', 'Giuseppe Micheloni|Q98105220'],
    ['1972-10-01', 'Rosolino Martelli|Q98105622', 'Bruno Casali|Q98104734'],
    ['1973-04-01', 'Francesco Maria Francini|Q98104974', 'Primo Bugli|Q98105597'],
    ['1973-10-01', 'Antonio Lazzaro Volpinari|Q3619743', 'Giovan Luigi Franciosi|Q98105028'],
    ['1974-04-01', 'Ferruccio Piva|Q28335744', 'Giordano Bruno Reffi|Q30088645'],
    ['1974-10-01', 'Francesco Valli|Q119520693', 'Enrico Andreoli|Q98104843'],
    ['1975-04-01', 'Alberto Cecchetti|Q3608224', 'Michele Righi|Q98105426'],
    ['1975-10-01', 'Giovanni Vito Marcucci|Q98105149', 'Giuseppe Della Balda|Q98105218'],
    ['1976-04-01', 'Clelio Galassi|Q21525768', 'Marino Venturini|Q98105394|='],
    ['1976-10-01', 'Primo Bugli|Q98105597', 'Virgilio Cardelli|Q98105747'],
    ['1977-04-01', 'Alberto Lonfernini|Q98104572', 'Antonio Lazzaro Volpinari|Q3619743'],
    ['1977-10-01', 'Giordano Bruno Reffi|Q30088645', 'Tito Masi|Q3991881'],
    ['1978-04-01', 'Francesco Valli|Q119520693', 'Enrico Andreoli|Q98104843'],
    ['1978-10-01', 'Ermenegildo Gasperoni|Q5389884|=', 'Adriano Reffi|Q98104568'],
    ['1979-04-01', 'Marino Bollini|Q3293300|=', 'Lino Celli|Q98105253'],
    ['1979-10-01', 'Giuseppe Amici|Q522511|=', 'Germano De Biagi|Q3761114'],
    ['1980-04-01', 'Pietro Chiaruzzi|Q98105533', 'Primo Marani|Q16335472'],
    ['1980-10-01', 'Giancarlo Berardi|Q98105022', 'Rossano Zafferani|Q98105621'],
    ['1981-04-01', 'Gastone Pasolini|Q28058679', 'Maria Lea Pedini-Angelini|Q542939|='],
    ['1981-10-01', 'Mario Rossi|Q98105398', 'Ubaldo Biordi|Q3547611|='],
    ['1982-04-01', 'Giuseppe Maiani|Q25850795|=', 'Marino Venturini|Q98105394|='],
    ['1982-10-01', 'Libero Barulli|Q98105252', 'Maurizio Gobbi|Q98105407'],
    ['1983-04-01', 'Adriano Reffi|Q98104568', 'Massimo Roberto Rossini|Q21196994'],
    ['1983-10-01', 'Renzo Renzi|Q7313632|=', 'Germano De Biagi|Q3761114'],
    ['1984-04-01', 'Gloriana Ranocchini|Q16189465|=', 'Giorgio Crescentini|Q3765390|='],
    ['1984-10-01', 'Marino Bollini|Q3293300|=', 'Giuseppe Amici|Q522511|='],
    ['1985-04-01', 'Enzo Colombini|Q3055535|=', 'Severiano Tura|Q3480817|='],
    ['1985-10-01', 'Pier Paolo Gasperoni|Q1124340', 'Ubaldo Biordi|Q3547611|='],
    ['1986-04-01', 'Marino Venturini|Q98105394|=', 'Ariosto Maiani|Q98104641'],
    ['1986-10-01', 'Giuseppe Arzilli|Q301069|=', 'Maurizio Tomassoni|Q98105408'],
    ['1987-04-01', 'Renzo Renzi|Q7313632|=', 'Carlo Franciosi|Q41978652|='],
    ['1987-10-01', 'Rossano Zafferani|Q98105621', 'Gianfranco Terenzi|Q878336|='],
    ['1988-04-01', 'Umberto Barulli|Q7881264|=', 'Rosolino Martelli|Q98105622'],
    ['1988-10-01', 'Luciano Cardelli|Q98105268', 'Reves Salvatori|Q98105607'],
    ['1989-04-01', 'Mauro Fiorini|Q98105409', 'Marino Vagnetti|Q98105395|='],
    ['1989-10-01', 'Gloriana Ranocchini|Q16189465|=', 'Leo Achilli|Q98105245'],
    ['1990-04-01', 'Adalmiro Bartolini|Q3604961', 'Ottaviano Rossi|Q3887178'],
    ['1990-10-01', 'Cesare Gasperoni|Q2247250|=', 'Roberto Bucci|Q42044386'],
    ['1991-04-01', 'Domenico Bernardini|Q65497283', 'Claudio Podeschi|Q18411174'],
    ['1991-10-01', 'Edda Ceccoli|Q5335762|=', 'Marino Riccardi|Q557019|='],
    ['1992-04-01', 'Germano De Biagi|Q3761114', 'Ernesto Benedettini|Q878358|='],
    ['1992-10-01', 'Romeo Morri|Q3940826|=', 'Marino Zanotti|Q3848227'],
    ['1993-04-01', 'Patrizia Busignani|Q7148082|=', 'Salvatore Tonelli|Q98105627'],
    ['1993-10-01', 'Gian Luigi Berti|Q23008489|=', 'Paride Andreoli|Q3895838'],
    ['1994-04-01', 'Alberto Cecchetti|Q3608224', 'Fausto Mularoni|Q98104854'],
    ['1994-10-01', 'Renzo Ghiotti|Q42616674', 'Luciano Ciavatta|Q42661397'],
    ['1995-04-01', 'Marino Bollini|Q3293300|=', 'Settimio Lonfernini|Q98105643'],
    ['1995-10-01', 'Pier Natalino Mularoni|Q98105529', 'Marino Venturini|Q98105394|='],
    ['1996-04-01', 'Pier Paolo Gasperoni|Q1124340', 'Pietro Bugli|Q3903726'],
    ['1996-10-01', 'Maurizio Rattini|Q663639|=', 'Gian Carlo Venturini|Q16064803|='],
    ['1997-04-01', 'Paride Andreoli|Q3895838', 'Pier Marino Mularoni|Q3902926'],
    ['1997-10-01', 'Luigi Mazza|Q3839873', 'Marino Zanotti|Q3848227'],
    ['1998-04-01', 'Alberto Cecchetti|Q3608224', 'Loris Francini|Q888228|='],
    ['1998-10-01', 'Pietro Berti|Q3903698', 'Paolo Bollini|Q557046|='],
    ['1999-04-01', 'Antonello Bacciocchi|Q596870|=', 'Rosa Zafferani|Q437309|='],
    ['1999-10-01', 'Marino Bollini|Q3293300|=', 'Giuseppe Arzilli|Q301069|='],
    ['2000-04-01', 'Maria Domenica Michelotti|Q2259726|=', 'Gian Marco Marcucci|Q1090389|='],
    ['2000-10-01', 'Gianfranco Terenzi|Q878336|=', 'Enzo Colombini|Q3055535|='],
    ['2001-04-01', 'Luigi Lonfernini|Q3266465|=', 'Fabio Berardi|Q2252615|='],
    ['2001-10-01', 'Alberto Cecchetti|Q3608224', 'Gino Giovagnoli|Q3764629'],
    ['2002-04-01', 'Antonio Lazzaro Volpinari|Q3619743', 'Giovanni Francesco Ugolini|Q887674|='],
    ['2002-10-01', 'Mauro Chiaruzzi|Q3852797', 'Giuseppe Maria Morganti|Q3770918'],
    ['2003-04-01', 'Pier Marino Menicucci|Q3902925', 'Giovanni Giannoni|Q3767372'],
    ['2003-10-01', 'Giovanni Lonfernini|Q889575|=', 'Valeria Ciavatta|Q167075|='],
    ['2004-04-01', 'Paolo Bollini|Q557046|=', 'Marino Riccardi|Q557019|='],
    ['2004-10-01', 'Giuseppe Arzilli|Q301069|=', 'Roberto Raschi|Q3939090|='],
    ['2005-04-01', 'Fausta Morganti|Q386550|=', 'Cesare Gasperoni|Q2247250|='],
    ['2005-10-01', 'Claudio Muccioli|Q767664|=', 'Antonello Bacciocchi|Q596870|='],
    ['2006-04-01', 'Gianfranco Terenzi|Q878336|=', 'Loris Francini|Q888228|='],
    ['2006-10-01', 'Antonio Carattoni|Q601273|=', 'Roberto Giorgetti|Q507718|='],
    ['2007-04-01', 'Alessandro Mancini|Q888508|=', 'Alessandro Rossi|Q82919|Alessandro Rossi (Captain Regent)'],
    ['2007-10-01', 'Alberto Selva|Q888458|=', 'Mirko Tomassoni|Q771240|='],
    ['2008-04-01', 'Federico Pedini Amati|Q888414|=', 'Rosa Zafferani|Q437309|='],
    ['2008-10-01', 'Ernesto Benedettini|Q878358|=', 'Assunta Meloni|Q437620|='],
    ['2009-04-01', 'Massimo Cenci|Q888420|=', 'Oscar Mina|Q888482|='],
    ['2009-10-01', 'Francesco Mussoni|Q887796|=', 'Stefano Palmieri|Q888503|='],
    ['2010-04-01', 'Marco Conti|Q887182|=', 'Glauco Sansovini|Q886886|='],
    ['2010-10-01', 'Giovanni Francesco Ugolini|Q887674|=', 'Andrea Zafferani|Q495277|='],
    ['2011-04-01', 'Maria Luisa Berti|Q289413|=', 'Filippo Tamagnini|Q879064|='],
    ['2011-10-01', 'Matteo Fiorini|Q885363|=', 'Gabriele Gatti|Q694614|='],
    ['2012-04-01', 'Maurizio Rattini|Q663639|=', 'Italo Righi|Q1353628|='],
    ['2012-10-01', 'Denise Bronzetti|Q57546|=', 'Teodoro Lonfernini|Q57547|='],
    ['2013-04-01', 'Denis Amici|Q9160318|=', 'Antonella Mularoni|Q58075|='],
    ['2013-10-01', 'Gian Carlo Capicchioni|Q15039600|=', 'Anna Maria Muccioli|Q1112792|='],
    ['2014-04-01', 'Luca Beccari|Q15998324|=', 'Valeria Ciavatta|Q167075|='],
    ['2014-10-01', 'Gianfranco Terenzi|Q878336|=', 'Guerrino Zanotti|Q18119638|='],
    ['2015-04-01', 'Andrea Belluzzi|Q19691256|=', 'Roberto Venturini|Q19691303|='],
    ['2015-10-01', 'Nicola Renzi|Q21035121|=', 'Lorella Stefanelli|Q21035139|='],
    ['2016-04-01', 'Gian Nicola Berti|Q16549371|=', 'Massimo Andrea Ugolini|Q23681818|='],
    ['2016-10-01', 'Fabio Berardi|Q2252615|=', 'Marino Riccardi|Q557019|='],
    ['2017-04-01', "Vanessa D'Ambrosio|Q28968160|=", 'Mimma Zavoli|Q28968159|='],
    ['2017-10-01', 'Enrico Carattoni|Q40112930|=', 'Matteo Fiorini|Q885363|='],
    ['2018-04-01', 'Matteo Ciacci|Q50772653|=', 'Stefano Palmieri|Q888503|='],
    ['2018-10-01', 'Luca Santolini|Q56849253|=', 'Mirko Tomassoni|Q771240|='],
    ['2019-04-01', 'Michele Muratori|Q62627285|=', 'Nicola Selva|Q37817514|='],
    ['2019-10-01', 'Luca Boschi|Q69382559|=', 'Mariella Mularoni|Q69382520|='],
    ['2020-04-01', 'Alessandro Mancini|Q888508|=', 'Grazia Zafferani|Q87974161|='],
    ['2020-10-01', 'Alessandro Cardelli|Q3609898|=', 'Mirko Dolcini|Q99485737|='],
    ['2021-04-01', 'Marco Nicolini|Q65499704|=', 'Gian Carlo Venturini|Q16064803|='],
    ['2021-10-01', 'Francesco Mussoni|Q887796|=', 'Giacomo Simoncini|Q108584119|='],
    ['2022-04-01', 'Oscar Mina|Q888482|=', 'Paolo Rondelli|Q7132238|='],
    ['2022-10-01', 'Maria Luisa Berti|Q289413|=', 'Manuel Ciavatta|Q114239945|='],
    ['2023-04-01', 'Alessandro Scarano|Q117197974|=', 'Adele Tonnini|Q117199896|='],
    ['2023-10-01', 'Filippo Tamagnini|Q879064|=', 'Gaetano Troina|Q122423364|='],
    ['2024-04-01', 'Milena Gasperoni|Q125102936|=', 'Alessandro Rossi|Q82919|Alessandro Rossi (Captain Regent)'],
    ['2024-10-01', 'Francesca Civerchia|Q130390817|=', 'Dalibor Riccardi|Q130360479|='],
    ['2025-04-01', 'Denise Bronzetti|Q57546|=', 'Italo Righi|Q1353628|='],
    ['2025-10-01', 'Lorenzo Bugli|Q106519616|=', 'Matteo Rossi|Q123678970|Matteo Rossi (politician)'],
    ['2026-04-01', 'Alice Mina|Q138650200|=', 'Vladimiro Selva|Q131783131|='],
    ['2026-10-01', 'Gerardo Giovagnoli|Q141538307|=', 'William Casali|Q141531158|=']
    ]),
    offices: []
  }
};

// San Marino's semesters: [start, person, person, …]; each ends where the next starts. A person may be an object
// { who, start, end, more } for one who left or came during the semester.
function semesters(rows) {
  return rows.flatMap(([start, ...people], i) => {
    const end = rows[i + 1]?.[0] ?? null;
    return people.map(p => (typeof p === 'string' ? E(p, start, end) : E(p.who, p.start || start, 'end' in p ? p.end : end, p.more)));
  });
}
