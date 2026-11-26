// Election dates that the Wikidata election fetch in build-data.mjs gets wrong or files under the wrong country
// (small corrections, 17 November 2026; found after RT-04 added the microstates on 16-17 November).
// leader-corrections.mjs applies these with the leader corrections, so both `npm run build-data` and
// `node scripts/leader-corrections.mjs` (which patches data/countries.json on its own) keep them. Safe to run again.
//
// Each entry is one election, found by its English Wikipedia article (the link the page shows). It is moved to the
// country `key` (its Wikidata item, as countries.mjs keys the states) if it was filed elsewhere, its date is set to
// `date`, and it is added to `key` if the fetch missed it.
// `wd` is the election's Wikidata item, and `sources` say where the date was read: checked on 17 November 2026, or on
// the day an entry's own comment gives (the entries added on 25 November 2026 and on 26 November 2026, on those days).
// An entry with `precision` ('month' or 'year') is a vote its sources date only so far, shown as the month or year.
import { byDay } from './retro-shape.mjs';

export const ELECTIONS = [
  {
    key: 'Q757', wd: 'Q103768254', title: '2025 Vincentian general election', date: '2025-11-27',
    // Wikidata's point in time (P585) is 30 November 2025, referenced to an IPU Parline page retrieved on 3 December
    // 2020, five years before the vote: a forecast of the due date that was never updated. The election was called
    // for and held on Thursday 27 November 2025.
    sources: ['English Wikipedia\'s article (infobox and lead: 27 November 2025, citing the Electoral Office)',
      'St Vincent Times, "St Vincent to hold General Elections on 27th November, 2025" (28 October 2025)']
  },
  {
    key: 'Q769', wd: 'Q115632342', title: '2026 Grenadian general election', date: '2026-11-05',
    // The election cache in build/ holds Wikidata's earlier date, 30 June 2027 (the latest day the vote was due);
    // Wikidata's point in time (P585) is now 5 November 2026, the day it was held.
    sources: ['Wikidata Q115632342, point in time (P585): 5 November 2026 (no reference given)',
      'English Wikipedia\'s article (infobox and lead: held on 5 November 2026)',
      'Caribbean National Weekly, "Grenada sets Nov. 5 date for general elections" (5 October 2026)',
      'WIC News\'s report of the results ("the November 5 general election")']
  },
  {
    key: 'Q769', wd: 'Q5607417', title: '1967 Grenadian general election', date: '1967-08-24',
    // Wikidata gives its country (P17) as Spain (Q29), though it applies to Grenada (P1001 Q769), so the fetch filed it
    // under Spain and Grenada's list skipped from 1962 to 1972.
    sources: ['Wikidata Q5607417, point in time (P585): 24 August 1967',
      'English Wikipedia\'s article (24 August 1967, citing Nohlen, Elections in the Americas, 2005, p. 307)']
  },
  {
    key: 'Q769', wd: 'Q3537542', title: '2003 Grenadian general election', date: '2003-11-27',
    // Wikidata gives two countries (P17), Grenada and Spain, so the fetch showed it under Spain as well.
    sources: ['Wikidata Q3537542, point in time (P585): 27 November 2003 (imported from English Wikipedia)',
      'English Wikipedia\'s article (27 November 2003)']
  },
  // Six more found by the review of 24-25 November 2026 (retrospective-6 and front-pages-1). In each the cache holds a
  // date Wikidata gives to the month or the wrong day, which the build read as a day.
  {
    key: 'Q20', wd: 'Q1348221', title: '1969 Norwegian parliamentary election', date: '1969-09-07',
    // The cache holds 7 June 1969. Polling ran over two days, 7 and 8 September 1969; the page lists the first.
    sources: ['English Wikipedia\'s article (infobox and lead: 7 and 8 September 1969, citing Nohlen & Stöver, Elections in Europe, 2010, p. 1438)',
      'Statistics Norway, Stortingsvalget 1969, Hefte I (NOS A 308), foreword: "the Storting elections 7 and 8 September 1969"']
  },
  {
    key: 'Q215', wd: 'Q1607581', title: '1997 Slovenian presidential election', date: '1997-11-23',
    // The cache holds 23 December 1997, a month late.
    sources: ['English Wikipedia\'s article (infobox and lead: 23 November 1997)',
      'Slovenia\'s National Electoral Commission (DVK), "Volitve predsednika RS 1997": the election was held on Sunday 23 November 1997']
  },
  {
    key: 'Q766', wd: 'Q116442752', title: '2025 Jamaican general election', date: '2025-09-03',
    // The cache holds 1 September 2025, Wikidata's date to the month.
    sources: ['English Wikipedia\'s article (infobox and lead: 3 September 2025)',
      'The Gleaner, "General election set for September 3 as parties battle over Jamaica’s future" (10 August 2025)']
  },
  {
    key: 'Q37', wd: 'Q20182177', title: '2019 Lithuanian presidential election', date: '2019-05-12',
    // The cache holds 1 May 2019, Wikidata's date to the month. The first round was on 12 May, the second on 26 May.
    sources: ['English Wikipedia\'s article (infobox and lead: first round 12 May 2019, second round 26 May 2019)',
      'OSCE Office for Democratic Institutions and Human Rights, elections in Lithuania: "Presidential Election, 12 and 26 May 2019"']
  },
  {
    key: 'Q37', wd: 'Q84028744', title: '2024 Lithuanian presidential election', date: '2024-05-12',
    // The cache holds 1 May 2024, Wikidata's date to the month. The first round was on 12 May, the second on 26 May.
    sources: ['English Wikipedia\'s article (infobox and lead: first round 12 May 2024, second round 26 May 2024)',
      'OSCE Office for Democratic Institutions and Human Rights, elections in Lithuania: "Presidential Election, 12 May 2024"']
  },
  {
    key: 'Q224', wd: 'Q84027698', title: '2024–25 Croatian presidential election', date: '2024-12-29',
    // The cache holds 1 December 2024, Wikidata's date to the month. The first round was on 29 December 2024, the
    // second on 12 January 2025.
    sources: ['English Wikipedia\'s article (infobox and lead: first round 29 December 2024, second round 12 January 2025)',
      'Croatia\'s State Electoral Commission (DIP), decision of 30 December 2024 on the results of the presidential election "held on 29 December 2024"']
  },
  // Seven more from the second reading of 25 November 2026, each read that day.
  // Three independence referendums that Wikidata files only under the state the republic then belonged to (P17: the
  // Soviet Union or the SFR Yugoslavia), though each applies to the republic (P1001) and falls inside its statehood on
  // this site (Lithuania from 11 March 1990, Ukraine from 24 August 1991, North Macedonia from 8 September 1991). They
  // are moved to the state they belong to; until 25 November 2026 they were listed under the Soviet Union and
  // Yugoslavia, and for a day under no state at all.
  {
    key: 'Q37', wd: 'Q4139793', title: '1991 Lithuanian independence referendum', date: '1991-02-09',
    sources: ['Wikidata Q4139793, point in time (P585): 9 February 1991; applies to jurisdiction (P1001): Lithuania',
      'English Wikipedia\'s article (lead: "held in Lithuania on 9 February 1991")']
  },
  {
    key: 'Q212', wd: 'Q926594', title: '1991 Ukrainian independence referendum', date: '1991-12-01',
    sources: ['Wikidata Q926594, point in time (P585): 1 December 1991; applies to jurisdiction (P1001): Ukraine',
      'English Wikipedia\'s article (lead: "held in Ukraine on 1 December 1991", the day of the presidential election)']
  },
  {
    key: 'Q221', wd: 'Q3130232', title: '1991 Macedonian independence referendum', date: '1991-09-08',
    sources: ['Wikidata Q3130232, point in time (P585): 8 September 1991; applies to jurisdiction (P1001): North Macedonia',
      'English Wikipedia\'s article (lead: "held in Macedonia (now North Macedonia) on 8 September 1991")']
  },
  // Two Lithuanian presidential elections that Wikidata's preferred value gives only to the month (June 2004, May 2014),
  // which the cache read as the 1st. Wikidata also holds both rounds' days, at normal rank.
  {
    key: 'Q37', wd: 'Q769557', title: '2004 Lithuanian presidential election', date: '2004-06-13',
    // The first round was on 13 June, the second on 27 June 2004.
    sources: ['English Wikipedia\'s article (infobox: 13 June 2004, first round; 27 June 2004, second round)',
      'Wikidata Q769557, point in time (P585): June 2004 (preferred, to the month) and 13 and 27 June 2004 (to the day)']
  },
  {
    key: 'Q37', wd: 'Q1285451', title: '2014 Lithuanian presidential election', date: '2014-05-11',
    // The first round was on 11 May, the second on 25 May 2014.
    sources: ['English Wikipedia\'s article (lead: "held in Lithuania on 11 May 2014, with a second round held on 25 May")',
      'OSCE Office for Democratic Institutions and Human Rights, elections in Lithuania: "Presidential Election, 11 May 2014"']
  },
  // Two Czech Senate elections that Wikidata dates by a by-election of the year after (P585: 28 January 2017 and
  // 13 August 2019), so the page counted them in 2017 and 2019. Polling ran over two days; the page lists the first.
  {
    key: 'Q213', wd: 'Q21187621', title: '2016 Czech Senate election', date: '2016-10-07',
    sources: ['English Wikipedia\'s article (lead: "held in the Czech Republic on 7 and 8 October 2016, with a second round on 14 and 15 of October")',
      'Czech Statistical Office, volby.gov.cz, Senát 2016: "Volby do Senátu Parlamentu ČR konané dne 07.10. – 08.10.2016"']
  },
  {
    key: 'Q213', wd: 'Q30321491', title: '2018 Czech Senate election', date: '2018-10-05',
    sources: ['English Wikipedia\'s article (lead: "held in the Czech Republic on 5 and 6 October 2018", second round 12 and 13 October)',
      'Czech Statistical Office, volby.gov.cz, Senát 2018: "Volby do Senátu Parlamentu ČR konané dne 05.10. – 06.10.2018"']
  },
  // Four votes whose dates fell in another year than their title's (small corrections, D2 to D5, read on 26 November
  // 2026), and Kosovo's February 2025 election, which Wikidata dates only to the year.
  {
    key: 'Q792', wd: 'Q17087354', title: '1935 Salvadoran presidential election', date: '1935-01-13',
    // Wikidata's only point in time (P585) is 15 January 1939. Polling ran over three days; the page lists the first.
    sources: ['English Wikipedia\'s article (infobox and lead: held from 13 to 15 January 1935)',
      'Spanish Wikipedia\'s article "Elección presidencial de El Salvador de 1935" (held from 13 to 15 January 1935)']
  },
  {
    key: 'Q28', wd: 'Q5942985', title: '1944 Hungarian parliamentary election', date: '1944-01-01', precision: 'year',
    // The build dated it 2 April 1945, a later round. The Provisional National Assembly was elected in the liberated
    // east in late 1944, and members were added on 2 April and 24 June 1945. English Wikipedia and Wikidata (P585, to
    // the month) give November 1944; Hungarian Wikipedia says the assembly's election was prepared from 14 December
    // and the assembly met on 21 December 1944. As the sources differ on the month, the page gives the year.
    sources: ['English Wikipedia\'s article (lead: elections held in November 1944, more members elected on 2 April and 24 June 1945)',
      'Wikidata Q5942985, point in time (P585): November 1944 (to the month)',
      'Hungarian Wikipedia\'s article "Ideiglenes Nemzetgyűlés" (the assembly met on 21 December 1944)']
  },
  {
    key: 'Q213', wd: 'Q16153250', title: '2003 Czech presidential election', date: '2003-01-15',
    // Parliament's joint sessions voted on 15 and 24 January and on 28 February 2003, when Václav Klaus was elected at
    // the third. Wikidata gives 28 February 2003, 24 January 2003 and "15 January 2002" (a slip for 2003), so the build
    // took 24 January. A vote of several rounds is listed by its first day, as the Lithuanian and Senate votes above.
    sources: ['English Wikipedia\'s article (lead: the first two ballots, on 15 and 24 January 2003, failed; Klaus was elected on 28 February 2003)',
      'Czech Wikipedia\'s article "Volba prezidenta České republiky 2003" (joint sessions on 15 and 24 January and 28 February 2003)']
  },
  {
    key: 'Q1246', wd: 'Q113574091', title: 'February 2025 Kosovan parliamentary election', date: '2025-02-09',
    // Wikidata dates it only to 2025, so the page showed "2025".
    sources: ['English Wikipedia\'s article (infobox and lead: 9 February 2025)',
      'Albanian Wikipedia\'s article "Zgjedhjet parlamentare të Kosovës të shkurtit 2025" (held on 9 February 2025)']
  },
  // Two found by the fixer's pass of 26 November 2026, both read that day.
  {
    key: 'Q1246', wd: 'Q106555011', title: '2026 Kosovan presidential election', date: '2026-10-06',
    // Wikidata dates it only to 2026, and the builder of the small corrections left it so, reading that the Assembly
    // had sat several times without electing anyone. It did elect: the session of 5 March 2026 failed for want of a
    // quorum, the Assembly failed again by the deadline of 28 April and was dissolved, Bekim Sejdiu's candidacy of
    // September found too few deputies to make the quorum, and at the session of 6 October Justina Shiroka Pula was
    // elected in the first round with 81 votes, after midnight (so her own article dates her election and term from
    // 7 October). The vote is listed by the day its electing session sat.
    sources: ['English Wikipedia\'s article (infobox: election_date 6 October 2026; lead: "held an indirect election for president on 6 October 2026"; revision 1387394214)',
      'French Wikipedia\'s article "Élection présidentielle kosovare de 2026" (section "Session du 6 octobre 2026": elected in the night of 6 to 7 October 2026, in the first round, with 81 votes)']
  },
  {
    key: 'Q45', wd: 'Q2105455', title: '1998 Portuguese abortion referendum', date: '1998-06-28',
    // Wikidata's only point in time (P585) is 8 June 1998, a slip for the 28th.
    sources: ['English Wikipedia\'s article (lead: "On 28 June 1998 a referendum on a new abortion law was conducted in Portugal")',
      'Portugal\'s Comissão Nacional de Eleições, "Referendo Nacional 1998" (cne.pt): "Domingo, 28 Junho, 1998", on the decriminalisation of abortion in the first ten weeks']
  }
];

// Votes the Wikidata fetch files as national votes of a state, but which were not (review retrospective-5 and
// front-pages-2, 25 November 2026). Wikidata gives the state as their country (P17), because the state then ruled the
// colony, held the territory or contained the region, city or community that voted. Each is listed by the state's key
// and the vote's Wikidata item (and its English Wikipedia title), so the same vote stays under the state it belongs to
// (Barbados's 1946-1966 elections stay under Barbados and leave the United Kingdom's list). A rule on Wikidata's
// "applies to jurisdiction" (P1001) or on a second country would have dropped national votes too, such as the Danish
// general elections, the 2004 Annan Plan referendums in Cyprus, France's Évian referendum of 1962 and Germany's 1938
// vote, so the list is explicit. Each item's country and jurisdiction were read from Wikidata on 25 November 2026.
export const NOT_NATIONAL = [
  // United States: the Navajo Nation's own presidential elections (Wikidata's applies to, P1001: Navajo Nation).
  ['Q30', 'Q6981642', '2006 Navajo Nation presidential election'],
  ['Q30', 'Q6981644', '2010 Navajo Nation presidential election'],
  ['Q30', 'Q139906521', '2026 Navajo Nation presidential election'],
  ['Q30', 'Q113827329', '2022 Navajo Nation presidential election'],
  ['Q30', 'Q114983584', '2014–15 Navajo Nation presidential election'],
  ['Q30', 'Q60528187', '2018 Navajo Nation presidential election'],
  // Canada: a city referendum in Regina.
  ['Q16', 'Q96369356', '2013 Regina wastewater plant financing referendum'],
  // Saint Kitts and Nevis: the votes of the island of Nevis alone (its Island Assembly and its 1998 secession vote).
  ['Q763', 'Q16999238', '1998 Nevis independence referendum'],
  ['Q763', 'Q115945797', '2013 Nevis Island Assembly election'],
  ['Q763', 'Q115945785', '2011 Nevis Island Assembly election'],
  ['Q763', 'Q115907725', '2017 Nevis Island Assembly election'],
  ['Q763', 'Q115693941', '2022 Nevis Island Assembly election'],
  // United Kingdom: votes of its colonies and dependencies (Anguilla, Tristan da Cunha, the Southern Cameroons,
  // British Togoland, Alderney, British Honduras, the Gilbert and Ellice Islands, Pitcairn, Jamaica in 1955, Barbados
  // before its independence in 1966) and of parts of Britain (Shetland, Strathclyde, North East England).
  ['Q145', 'Q7058330', '2004 North East England devolution referendum'],
  ['Q145', 'Q83089579', '2020 Anguillian general election'],
  ['Q145', 'Q61994180', '2019 Tristan da Cunha general election'],
  ['Q145', 'Q20312335', '1957 Southern Cameroons parliamentary election'],
  ['Q145', 'Q4969592', '1961 West Cameroon parliamentary election'],
  ['Q145', 'Q4969591', '1959 Southern Cameroons parliamentary election'],
  ['Q145', 'Q27957645', '1978 Shetland referendum'],
  ['Q145', 'Q1339526', '1956 British Togoland status plebiscite'],
  ['Q145', 'Q7622056', '1994 Strathclyde water referendum'],
  ['Q145', 'Q104866331', '1972 Anguillian general election'],
  ['Q145', 'Q104866468', '1968 Anguillian general election'],
  ['Q145', 'Q104866465', '1967 Anguillian general election'],
  ['Q145', 'Q104879315', '2020 Alderney general election'],
  ['Q145', 'Q104855598', '1948 British Honduras general election'],
  ['Q145', 'Q104855606', '1942 British Honduras general election'],
  ['Q145', 'Q104855603', '1939 British Honduras general election'],
  ['Q145', 'Q60789322', '2018 Alderney general election'],
  ['Q145', 'Q25060895', '1971 Gilbert and Ellice Islands general election'],
  ['Q145', 'Q25060924', '1967 Gilbert and Ellice Islands general election'],
  ['Q145', 'Q16824465', '1961 British Honduras general election'],
  ['Q145', 'Q7198645', '2004 Pitcairnese general election'],
  ['Q145', 'Q4970060', '1969 British Honduras general election'],
  ['Q145', 'Q4970059', '1965 British Honduras general election'],
  ['Q145', 'Q3587176', '1955 Jamaican general election'],
  ['Q145', 'Q4858569', '1966 Barbadian general election'],
  ['Q145', 'Q4858567', '1961 Barbadian general election'],
  ['Q145', 'Q4858568', '1956 Barbadian general election'],
  ['Q145', 'Q4858566', '1951 Barbadian general election'],
  ['Q145', 'Q4858565', '1946 Barbadian general election'],
  // Netherlands: the status votes of Saba and Sint Eustatius in the Caribbean.
  ['Q55', 'Q19605087', '2014 Sint Eustatius status referendum'],
  ['Q55', 'Q7395796', '2004 Saban status referendum'],
  // France: votes of its colonies, trust territories and overseas territories (French Oceania, the Comoros and
  // Mayotte, Algeria's own independence vote of July 1962, seven African territories' votes on the 1958 constitution,
  // French Togoland). France's own votes on Algeria (1961, and the Évian referendum of April 1962) and on New Caledonia
  // (Matignon, 1988) are national and stay.
  ['Q142', 'Q5501883', '1940 French Oceanian referendum'],
  ['Q142', 'Q1135832', '2009 Mahoran status referendum'],
  ['Q142', 'Q1769884', '1974 Comorian independence referendum'],
  ['Q142', 'Q128513', '1962 Algerian independence referendum'],
  ['Q142', 'Q7033087', '1958 Nigerien constitutional referendum'],
  ['Q142', 'Q6927634', '1958 Moyen-Congo constitutional referendum'],
  ['Q142', 'Q6740999', '1958 Malagasy constitutional referendum'],
  ['Q142', 'Q19878919', '1958 Cameroonian constitutional referendum'],
  ['Q142', 'Q5501931', '1958 French Sudan constitutional referendum'],
  ['Q142', 'Q5208934', '1958 Dahomeyan constitutional referendum'],
  ['Q142', 'Q30474', '1958 Senegalese constitutional referendum'],
  ['Q142', 'Q16900048', '2004 Mahoran departmental election'],
  ['Q142', 'Q6734842', '2000 Mahoran status referendum'],
  ['Q142', 'Q6734844', '1976 Mahoran status referendum'],
  ['Q142', 'Q6734837', '1976 Mahoran Comoros referendum'],
  ['Q142', 'Q4251987', '1956 French Togoland autonomy referendum'],
  // Switzerland: a cantonal vote in Basel.
  ['Q39', 'Q106742442', '1967 Basel Picasso paintings purchase referendum'],
  // Spain: votes of Melilla and Navarre alone, and of Spanish Guinea in 1963.
  ['Q29', 'Q55622731', '1999 Melilla Assembly election'],
  ['Q29', 'Q55622730', '1995 Melilla Assembly election'],
  ['Q29', 'Q4892436', '1979 Navarrese foral election'],
  ['Q29', 'Q6103421', '1963 Spanish Guinean autonomy referendum'],
  // Portugal: Angola's Legislative Assembly election of 1973, when Angola was a Portuguese colony.
  ['Q45', 'Q18160604', '1973 Angolan Legislative Assembly election'],
  // West Germany and Germany: the Saar's vote of 1955 (the Saar was then outside West Germany) and votes of single
  // Länder (Hamburg, Berlin, Baden-Württemberg).
  ['Q713750', 'Q7395672', '1955 Saar Statute referendum'],
  ['Q713750', 'Q137830553', '2026 Hamburg Olympics referendum'],
  ['Q713750', 'Q108711372', 'Deutsche Wohnen & Co. enteignen'],
  ['Q713750', 'Q15127004', '2013 Berlin energy referendum'],
  ['Q713750', 'Q96362338', '1951 Baden-Württemberg referendum'],
  // Poland: a city referendum in Kraków.
  ['Q36', 'Q16595384', '2014 Kraków referendum'],
  // Czechoslovakia: the Slovak National Council's election of 1971.
  ['Q33946', 'Q11931811', '1971 Slovak parliamentary election'],
  // Czech Republic: city referendums in Plzeň and Brno.
  ['Q213', 'Q28402483', '2013 Plzeň shopping center referendum'],
  ['Q213', 'Q18114171', '2016 Brno central station referendum'],
  // Italy: regional votes in Lombardy and Veneto.
  ['Q38', 'Q15975645', '2014 Venetian independence referendum'],
  ['Q38', 'Q30091696', '2017 Lombard autonomy referendum'],
  ['Q38', 'Q29587269', '2017 Venetian autonomy referendum'],
  // North Macedonia: the Albanian community's own autonomy referendum of 1992.
  ['Q221', 'Q28313790', '1992 Macedonian Albanian autonomy referendum'],
  // Yugoslavia and Serbia: the republics' and Kosovo's independence votes, and Kosovo's 2007 election (Serbia's own
  // votes, as one of Yugoslavia's republics, stay). Each of these came before its own state's statehood on this site,
  // so it is listed under neither. Macedonia's referendum of 8 September 1991, held on the day its statehood begins,
  // is moved to North Macedonia by ELECTIONS above.
  ['Q191077', 'Q6433341', '1991 Kosovan independence referendum'],
  ['Q191077', 'Q4947346', '1992 Bosnian independence referendum'],
  ['Q191077', 'Q3439107', '1990 Slovenian independence referendum'],
  ['Q191077', 'Q1131784', '2006 Montenegrin independence referendum'],
  ['Q191077', 'Q821029', '2007 Kosovan parliamentary election'],
  // Kosovo: votes held in North Kosovo alone.
  ['Q1246', 'Q125480857', '2024 North Kosovo referendum'],
  ['Q1246', 'Q4393797', '2012 North Kosovo referendum'],
  // Moldova: Gagauzia's referendums of 1995.
  ['Q217', 'Q124289387', '1995 Gagauz autonomy referendums'],
  // Soviet Union and Russia: the Union republics' elections and referendums (the Russian SFSR's among them), and the
  // votes of single Russian regions (Ingushetia, Tatarstan, Chechnya, Khabarovsk, Yaroslavl, Krasnodar). The Estonian
  // and Georgian independence votes and Ukraine's sovereignty vote came before their states' statehood on this site.
  // Lithuania's independence referendum of 9 February 1991 and Ukraine's of 1 December 1991 fall inside their states'
  // statehood and are moved to them by ELECTIONS above.
  ['Q15180', 'Q7855453', '1990 Turkmenistan presidential election'],
  ['Q15180', 'Q2044515', '1990 Russian Supreme Soviet election'],
  ['Q15180', 'Q4832429', '1990 Azerbaijani Supreme Soviet election'],
  ['Q15180', 'Q133770', '1990 Latvian Supreme Soviet election'],
  ['Q15180', 'Q23074', '1990 Lithuanian Supreme Soviet election'],
  ['Q15180', 'Q3827128', '1990 Moldavian Supreme Soviet election'],
  ['Q15180', 'Q3651327', '1990 Georgian Supreme Soviet election'],
  ['Q15180', 'Q4793282', '1990 Armenian Supreme Soviet election'],
  ['Q15180', 'Q3824117', '1990 Ukrainian Supreme Soviet election'],
  ['Q15180', 'Q4345440', '1990 Byelorussian Supreme Soviet election'],
  ['Q15180', 'Q3788154', '1990 Kazakh Supreme Soviet election'],
  ['Q15180', 'Q6452425', '1990 Kirghiz Supreme Soviet election'],
  ['Q15180', 'Q7904722', '1990 Uzbek Supreme Soviet election'],
  ['Q15180', 'Q7676838', '1990 Tajik Supreme Soviet election'],
  ['Q15180', 'Q7855449', '1990 Turkmen Supreme Soviet election'],
  ['Q15180', 'Q17096515', '1991 Ukrainian sovereignty referendum'],
  ['Q15180', 'Q5401664', '1991 Estonian independence referendum'],
  ['Q15180', 'Q3648797', '1991 Georgian independence referendum'],
  ['Q15180', 'Q4127536', '1991 Russian presidential referendum'],
  ['Q15180', 'Q116736442', '1955 Russian Supreme Soviet election'],
  ['Q15180', 'Q116730950', '1951 Russian Supreme Soviet election'],
  ['Q15180', 'Q111913777', '1985 Russian Supreme Soviet election'],
  ['Q15180', 'Q111913567', '1947 Russian Supreme Soviet election'],
  ['Q15180', 'Q85865032', '1990 Uzbek presidential election'],
  ['Q15180', 'Q25713830', '1938 Russian Supreme Soviet election'],
  ['Q15180', 'Q16975102', '1947 Estonian Supreme Soviet election'],
  ['Q15180', 'Q16934213', '1941 Moldavian Supreme Soviet election'],
  ['Q15180', 'Q3740797', '1990 Estonian Supreme Soviet election'],
  ['Q15180', 'Q124458999', '1991 Ingush referendum'],
  ['Q15180', 'Q4393804', '1992 Tatarstani sovereignty referendum'],
  ['Q15180', 'Q25063980', '1997 Chechen general election'],
  ['Q15180', 'Q5089035', '2007 Chechen constitutional referendum'],
  ['Q15180', 'Q125470345', '2024 Khabarovsk Krai Legislative Duma election'],
  ['Q15180', 'Q119716783', '2023 Yaroslavl Oblast Duma election'],
  ['Q15180', 'Q30646338', '2017 Krasnodar Krai Legislative Assembly election'],
  ['Q15180', 'Q16829319', '2005 Chechen legislative election'],
  // Estonia: Narva and Sillamäe's autonomy referendum of 1993.
  ['Q191', 'Q16412101', '1993 Narva and Sillamäe autonomy referendum'],
  // Ukraine: the referendums held by Russia and by Russian-backed separatists in parts of Ukraine.
  ['Q212', 'Q16854494', '2014 Donetsk status referendum'],
  ['Q212', 'Q16854545', '2014 Luhansk status referendum'],
  ['Q212', 'Q113495737', '2022 annexation referendums in Russian-occupied Ukraine'],
  // Georgia: Adjara's Supreme Council elections.
  ['Q230', 'Q28220900', '2016 Adjaran legislative election'],
  ['Q230', 'Q4683146', '2012 Adjaran legislative election'],
  // Sweden: Sjöbo's municipal referendum of 1988.
  ['Q34', 'Q7307661', 'Refugee controversy in Sjöbo'],
  // Japan: votes of Osaka, Okinawa and the Ryukyu Islands under US administration.
  ['Q17', 'Q100316023', '2020 Osaka Metropolis Plan referendum'],
  ['Q17', 'Q19931485', '2015 Osaka Metropolis Plan referendum'],
  ['Q17', 'Q7385535', '1968 Ryukyu Islands legislative election'],
  ['Q17', 'Q7385533', '1962 Ryukyu Islands legislative election'],
  ['Q17', 'Q60988901', '2019 Okinawan referendum'],
  ['Q17', 'Q56349476', '1996 Okinawan referendum'],
  // Croatia: the Sabor election of Croatia-Slavonia, then a kingdom within Hungary, "held in Croatia-Slavonia in
  // December 1911" (its English Wikipedia article, read on 26 November 2026). Wikidata dates it 17 December 2015, so
  // the page listed it under Croatia in 2015 (small corrections, D2); it is not a vote of the state that Croatia is.
  ['Q224', 'Q15984054', '1911 Croatian parliamentary election'],
];

// Wikidata items the fetch takes for public votes that are not votes of the electorate at all: the confirmations of
// two US vice presidents by Congress (1973 and 1974, typed "presidential election" in Wikidata), a party's members'
// ballots (the Czech Social Democrats' of 2018, KINAL's of 2022 in Greece), and articles about a campaign, an opinion
// poll or a list of nominations (25 November 2026). Also votes that were planned and never held, each as its English
// Wikipedia article says (read on 25 November 2026); Wikidata dates most of them only to the year.
export const NOT_VOTES = [
  ['Q30', 'Q25046283', '1973 United States vice presidential confirmation'],
  ['Q30', 'Q25046275', '1974 United States vice presidential confirmation'],
  ['Q40', 'Q5027875', 'Campaigning in the 2008 Austrian legislative election'],
  ['Q213', 'Q55099363', '2018 Czech Social Democratic Party government referendum'],
  ['Q41', 'Q125457737', '2022 KINAL internal referendum'],
  ['Q43', 'Q116272166', '2023 Turkish presidential election candidate nominations'],
  ['Q43', 'Q110158559', 'Opinion polling for the 2023 Turkish parliamentary election'],
  // Armenia's constitutional referendum was set for 5 April 2020 and postponed indefinitely on 16 March 2020; the
  // parliament adopted the amendment itself on 22 June 2020 (the article "2020 Armenian constitutional amendment").
  ['Q399', 'Q84502896', '2020 Armenian constitutional amendment'],
  // The referendums on the Treaty establishing a Constitution for Europe that were not held after the French and Dutch
  // votes of 2005: the United Kingdom's was "postponed indefinitely", Ireland's "was planned but did not occur",
  // Portugal's, planned for 9 October 2005, was postponed, Poland's "was cancelled", the Czech government announced
  // that its referendum "would not be held", and Denmark's, planned for 27 September 2005, was cancelled.
  ['Q145', 'Q3454840', 'United Kingdom European Constitution referendum'],
  ['Q27', 'Q6070719', 'Irish European Constitution referendum'],
  ['Q45', 'Q3454893', 'Portuguese European Constitution referendum'],
  ['Q36', 'Q3454888', 'Polish European Constitution referendum'],
  ['Q213', 'Q3454915', 'Czech European Constitution referendum'],
  ['Q35', 'Q3454862', 'Danish European Constitution referendum'],
  // Greece's referendum on the EU deal of 2011, which Papandreou "decided to cancel" and which was "later cancelled".
  ['Q41', 'Q2814530', '2011 Greek economy referendum attempt'],
  // Honduras's "planned non-binding referendum" of 2009 (la cuarta urna), stopped by the coup of 28 June 2009.
  ['Q783', 'Q5892959', 'Honduran fourth ballot box referendum'],
  // Romania's constitutional referendum, "scheduled to take place in Romania at the end of 2015, but was never held".
  ['Q218', 'Q15631520', '2015 Romanian constitutional referendum'],
  // Nicaragua's general election, due in November 2026 and put back to November 2027 by an amendment; on 20 July 2026
  // Ortega announced the abolition of the electoral system (its English Wikipedia article, and Spanish Wikipedia's
  // "Abolición del sistema electoral de Nicaragua", read on 26 November 2026). Wikidata dated it November 2027, so the
  // page listed a vote of 2027 under its 2026 title (small corrections, D2).
  ['Q811', 'Q110453621', '2026 Nicaraguan general election'],
];

const DROPPED = new Set([...NOT_NATIONAL, ...NOT_VOTES].map(([key, wd]) => `${key}|${wd}`));
const DROPPED_TITLES = new Set([...NOT_NATIONAL, ...NOT_VOTES].map(([key, , title]) => `${key}|${title}`));

// True when the vote with Wikidata item `wd` (a bare Q-id) is not to be listed under the state `key`.
export const dropped = (key, wd) => DROPPED.has(`${key}|${wd}`);

// A vote is a referendum when its title says so: "referendum", a "plebiscite" (Canada 1942, British Togoland 1956), or
// Ireland's constitutional votes, whose articles are titled by the amendment ("Eighth Amendment of the Constitution of
// Ireland", "Adoption of the Constitution of Ireland"). Until 25 November 2026 only "referendum" counted, so 41 of
// Ireland's constitutional referendums were listed as elections (review retrospective-4). "Constitutional amendment"
// is not read as a referendum: the one vote it named, Armenia's of 2020, was never held (NOT_VOTES).
export const voteType = title =>
  /referendum|plebiscite|Amendment of the Constitution|Adoption of the Constitution/i.test(title) ? 'referendum' : 'election';

// Which of an election item's point-in-time values (P585) the page shows (second reading, 25 November 2026). `values`
// are the item's statements that are not deprecated, as [time, precision, rank], with time "YYYY-MM-DD" (Wikidata's
// "-00" for a month or day it does not give is read as "-01") and precision 'day', 'month' or 'year'. Of the
// best-ranked values (preferred where there are any), the earliest held to the day; else, a value held to the day at
// another rank that falls within the best value's month or year (Lithuania 2004: preferred "June 2004", normal
// 13 and 27 June 2004, so 13 June, the first round); else the best value at its own precision, which the page shows as
// "Jun 2004" or "2004", never as a 1st. Until 25 November 2026 the build read Wikidata's truthy value alone, which
// loses the precision, so a month was shown as its 1st (review front-pages-1). Where the vote's `title` names its year
// or years ("2013 Cypriot presidential election", "2015–17 Haitian parliamentary election") and some days fall in
// them, only those days are taken: on 25 November 2026 Wikidata also gave the 2013 Cypriot presidential election
// 24 February 2008 (the 2008 election's day) and the 2003 Czech presidential election 15 January 2002, beside their
// own days. Returns { date, precision } or null.
const titleYears = title => {
  const m = String(title || '').match(/\b(1[89]\d\d|20\d\d)(?:[–-](\d{2}|\d{4}))?\b/);
  if (!m) return null;
  const to = m[2] ? (m[2].length === 2 ? m[1].slice(0, 2) + m[2] : m[2]) : m[1];
  return [m[1], to];
};
export function pickDate(values, title) {
  const live = (values || []).filter(([, , rank]) => rank !== 'deprecated');
  if (!live.length) return null;
  const best = live.filter(([, , rank]) => rank === 'preferred');
  const top = (best.length ? best : live).slice().sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const span = titleYears(title);
  const inSpan = list => (span ? list.filter(([t]) => t.slice(0, 4) >= span[0] && t.slice(0, 4) <= span[1]) : []);
  const dayOf = list => {
    const days = list.filter(([, p]) => p === 'day');
    const named = inSpan(days);
    return (named.length ? named : days).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))[0];
  };
  const d = dayOf(top);
  if (d) return { date: d[0], precision: 'day' };
  const [t, p] = top[0];
  const within = p === 'month' ? t.slice(0, 7) : t.slice(0, 4);
  const near = dayOf(live.filter(([x]) => x.startsWith(within)));
  if (near) return { date: near[0], precision: 'day' };
  return { date: t, precision: p };
}

const W = t => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
const isVote = e => e.type === 'election' || e.type === 'referendum';
const titleOf = url => { try { return decodeURIComponent(url.split('/wiki/')[1] || '').replace(/_/g, ' '); } catch { return ''; } };

// Applies the election corrections to { key: { events, spans } } in place. Like every election the build keeps, a
// corrected one is listed only inside its state's spans (its statehood, from Wikidata): Grenada's 1967 election, held
// when Grenada was an associated state, seven years before its independence in 1974, is taken from Spain and not
// listed (fixer, D3, 21 November 2026; until then the correction added it outside Grenada's statehood).
// It also takes out the listed votes that are not national (by their article's title, as the events keep no Wikidata
// item, so that `node scripts/leader-corrections.mjs` mends an existing data/countries.json too) and sets each vote's
// type by voteType.
const inside = (c, date) => !c.spans || c.spans.some(([s, e]) => date >= s && (!e || date <= e));
export function correctElections(countries) {
  for (const [key, c] of Object.entries(countries)) {
    if (!c.events) continue;
    c.events = c.events.filter(e => !(isVote(e) && e.url && DROPPED_TITLES.has(`${key}|${titleOf(e.url)}`)));
    for (const e of c.events) if (isVote(e)) e.type = voteType(e.text || titleOf(e.url || ''));
  }
  for (const fix of ELECTIONS) {
    const url = W(fix.title);
    const home = countries[fix.key];
    if (!home) throw new Error(`election-corrections: no country ${fix.key}`);
    for (const [key, c] of Object.entries(countries)) {
      if (key === fix.key || !c.events) continue;
      c.events = c.events.filter(e => !(isVote(e) && e.url === url));
    }
    const events = home.events ||= [];
    const found = events.filter(e => isVote(e) && e.url === url);
    // A corrected date is a day unless the entry gives its precision: any precision the build read from Wikidata (a
    // month, a year) goes with the old date.
    if (found.length) for (const e of found) { e.date = fix.date; if (fix.precision) e.precision = fix.precision; else delete e.precision; }
    else events.push({ date: fix.date, type: voteType(fix.title), text: fix.title, url, ...(fix.precision ? { precision: fix.precision } : {}) });
    home.events = events.filter(e => !(isVote(e) && e.url === url && !inside(home, e.date))).sort(byDay);
  }
  return countries;
}
