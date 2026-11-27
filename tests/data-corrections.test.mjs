// Small corrections to the data, 26 November 2026 (faults D1 to D9 of the retrospective's small build). Each test reads
// data/countries.json, data/succession.json, index.html or the correction scripts, with no browser:
//   node --test tests/data-corrections.test.mjs
// RETRO_DATA=<folder> reads the two data files from another folder (to show that a test fails on an older build).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const dataDir = process.env.RETRO_DATA ? pathToFileURL(process.env.RETRO_DATA.replace(/[\\/]?$/, '/')) : new URL('data/', root);
const read = f => JSON.parse(readFileSync(new URL(f, dataDir), 'utf8'));
const { countries } = read('countries.json');
const succession = read('succession.json');
const text = f => readFileSync(new URL(f, root), 'utf8');
const W = t => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
const votes = key => countries[key].events.filter(e => e.type === 'election' || e.type === 'referendum');
const vote = (key, title) => votes(key).find(e => e.url === W(title));
const leader = (key, full) => countries[key].leaders.find(l => l.full === full);

// D1. Wikidata P39 (President of Mexico): Peña Nieto 1 December 2012 to 1 December 2018, López Obrador 1 December 2018
// to 30 September 2024, Sheinbaum from 1 October 2024; the three English Wikipedia infoboxes agree (Peña Nieto to 30
// November 2018).
test('Mexico: Peña Nieto to 2018, López Obrador from 1 December 2018, Sheinbaum from 1 October 2024 (D1)', () => {
  const c = countries.Q96;
  const pena = leader('Q96', 'Enrique Peña Nieto');
  assert.deepEqual([pena.start, pena.end], ['2012-12-01', '2018-11-30']);
  const amlo = leader('Q96', 'Andrés Manuel López Obrador');
  assert.ok(amlo, 'López Obrador is in the leader list');
  assert.deepEqual([amlo.start, amlo.end, amlo.name, amlo.url], ['2018-12-01', '2024-09-30', 'López Obrador', W('Andrés Manuel López Obrador')]);
  const sheinbaum = leader('Q96', 'Claudia Sheinbaum');
  assert.deepEqual([sheinbaum.start, sheinbaum.end], ['2024-10-01', null]);
  assert.equal(c.leaders.at(-1), sheinbaum, 'Sheinbaum is the last');
  assert.ok(c.events.some(e => e.date === '2018-12-01' && e.text === 'Andrés Manuel López Obrador takes power'));
  assert.ok(c.events.some(e => e.date === '2024-10-01' && e.text === 'Claudia Sheinbaum takes power'));
  assert.ok(!c.events.some(e => e.date === '2024-09-30' && /takes power/.test(e.text)), 'nobody takes power on 30 September 2024');
  // Her offices, as head of state and of government, both from 1 October 2024.
  assert.deepEqual(c.offices.filter(o => o.full === 'Claudia Sheinbaum').map(o => `${o.office} ${o.start}`).sort(), ['hog 2024-10-01', 'hos 2024-10-01']);
  // Both carry their party, as the leaders before them do.
  for (const l of [amlo, sheinbaum]) assert.ok(l.parties?.some(p => p.name === 'Morena'), `${l.full}: Morena`);
});

test('a Spanish double surname is the short name: "López Obrador", never "Obrador" (D1)', async () => {
  const { CORRECTIONS } = await import('../scripts/leader-corrections.mjs');
  assert.equal(CORRECTIONS.Q96.leaders[0].name, 'López Obrador');
});

// D2 and D5: the votes whose date fell in another year than their title's, and Kosovo's February 2025 election.
test('four misdated votes take their own dates, and Kosovo\'s February 2025 election its day (D2, D5)', () => {
  assert.equal(vote('Q792', '1935 Salvadoran presidential election')?.date, '1935-01-13');
  const hu = vote('Q28', '1944 Hungarian parliamentary election');
  assert.deepEqual([hu?.date, hu?.precision], ['1944-01-01', 'year'], 'Hungary 1944, to the year');
  // Croatia-Slavonia's Sabor election of December 1911 is not a vote of the state Croatia is, and no longer in 2015.
  for (const [key, c] of Object.entries(countries)) assert.ok(!c.events.some(e => e.url === W('1911 Croatian parliamentary election')), key);
  // Nicaragua's election of 2026 was put back to 2027 and the electoral system abolished: it is not listed.
  for (const [key, c] of Object.entries(countries)) assert.ok(!c.events.some(e => e.url === W('2026 Nicaraguan general election')), key);
  const ko = vote('Q1246', 'February 2025 Kosovan parliamentary election');
  assert.deepEqual([ko?.date, ko?.precision], ['2025-02-09', undefined]);
  // The 2026 presidential vote is dated by its electing session, 6 October 2026 (English Wikipedia's infobox and lead;
  // French Wikipedia: Justina Shiroka Pula elected in the first round with 81 votes, in the night of 6 to 7 October),
  // not left at its year as the small build had it (fixer, 26 November 2026).
  const ko26 = vote('Q1246', '2026 Kosovan presidential election');
  assert.deepEqual([ko26?.date, ko26?.precision], ['2026-10-06', undefined]);
});

// The fixer's pass (26 November 2026): Portugal's abortion referendum was held on Sunday 28 June 1998 (English
// Wikipedia's lead; the National Elections Commission's page "Referendo Nacional 1998"), not on 8 June.
test('Portugal\'s abortion referendum of 1998 is dated 28 June 1998', () => {
  const pt = vote('Q45', '1998 Portuguese abortion referendum');
  assert.deepEqual([pt?.date, pt?.precision], ['1998-06-28', undefined]);
});

test('the footer counts and names every vote the election corrections hold', async () => {
  const { ELECTIONS } = await import('../scripts/election-corrections.mjs');
  const span = text('index.html').match(/<span id="election-corrections">([^<]*)<\/span>/)[1];
  const WORDS = ['Twenty', 'Twenty-one', 'Twenty-two', 'Twenty-three', 'Twenty-four', 'Twenty-five'];
  assert.ok(span.startsWith(`${WORDS[ELECTIONS.length - 20]} votes are corrected`), span.slice(0, 40));
  for (const words of ['Portugal 1998', 'Kosovo 2025 and 2026', 'Liechtenstein 2025']) assert.ok(span.includes(words), words);
});

test('no vote is dated more than a year from the year its title names (D2)', () => {
  const far = [];
  for (const [key, c] of Object.entries(countries)) for (const e of votes(key)) {
    const m = (e.text || '').match(/^(?:\w+ )?(1[89]\d\d|20\d\d)(?:[–-](\d{2}|\d{4}))?\b/);
    if (!m) continue;
    const to = m[2] ? +(m[2].length === 2 ? m[1].slice(0, 2) + m[2] : m[2]) : +m[1];
    const y = +e.date.slice(0, 4);
    if (y < +m[1] - 1 || y > to + 1) far.push(`${key} ${e.date} ${e.text}`);
  }
  assert.deepEqual(far, []);
});

// D3. Parliament voted on 15 and 24 January and 28 February 2003 (English and Czech Wikipedia); the vote is listed by
// its first day, as the site lists every vote of several rounds.
test('the 2003 Czech presidential election is dated by its first ballot, 15 January 2003 (D3)', () => {
  assert.equal(vote('Q213', '2003 Czech presidential election')?.date, '2003-01-15');
  // The footer says so, as it says why Hungary's vote of 1944 is given to the year (fixer, 26 November 2026).
  assert.ok(text('index.html').includes('Czechia’s presidential vote of 2003 is listed by its first session, 15 January; Parliament elected Václav Klaus at the third, on 28 February.'));
});

// D4. Already right before 26 November 2026: the cancelled referendums are not listed.
test('referendums that were cancelled or never held are not listed (D4)', () => {
  const never = ['United Kingdom European Constitution referendum', 'Irish European Constitution referendum', 'Portuguese European Constitution referendum',
    'Polish European Constitution referendum', 'Czech European Constitution referendum', 'Danish European Constitution referendum',
    '2011 Greek economy referendum attempt', 'Honduran fourth ballot box referendum', '2015 Romanian constitutional referendum', '2020 Armenian constitutional amendment'];
  for (const [key, c] of Object.entries(countries)) for (const t of never) assert.ok(!c.events.some(e => e.url === W(t)), `${key}: ${t}`);
  // The European Constitution votes that were held stay.
  for (const [key, t] of [['Q55', '2005 Dutch European Constitution referendum'], ['Q29', '2005 Spanish European Constitution referendum']]) assert.ok(vote(key, t), t);
});

// D6. Each name read from the leader's English Wikipedia article and Wikidata on 26 November 2026.
test('leaders are named with their accents, Ibn Saud by his name, and Norway\'s acting Prime Minister of 1998 is Anne Enger Lahnstein (D6)', () => {
  const named = [
    ['Q29', '1976-07-01', 'Suárez González', 'Adolfo Suárez'],
    ['Q36', '1935-05-12', 'Śmigły-Rydz', 'Edward Śmigły-Rydz'],
    ['Q191077', '1984-05-15', 'Đuranović', 'Veselin Đuranović'],
    ['Q35', '1972-10-05', 'Jørgensen', 'Anker Jørgensen'],
    ['Q35', '1975-02-13', 'Jørgensen', 'Anker Jørgensen'],
    ['Q189', '2009-02-01', 'Sigurðardóttir', 'Jóhanna Sigurðardóttir'],
    ['Q851', '1927-05-20', 'Ibn Saud', 'Ibn Saud'],
    ['Q20', '1998-08-30', 'Enger Lahnstein', 'Anne Enger Lahnstein']
  ];
  for (const [key, start, name, full] of named) {
    const l = countries[key].leaders.find(x => x.start === start);
    assert.deepEqual([l?.name, l?.full], [name, full], `${key} ${start}`);
    assert.ok(countries[key].events.some(e => e.date === start && e.text.startsWith(`${full} takes power`)), `${full}: the arrival`);
  }
  assert.equal(countries.Q20.leaders.find(x => x.start === '1998-08-30').url, W('Anne Enger'));
  const all = JSON.stringify(countries);
  for (const wrong of ['Erik_Lahnstein', '"Aziz takes power', 'Suarez Gonzalez', 'Smigly-Rydz', 'Djuranovic', '"Jorgensen"', 'Sigurdardottir']) assert.ok(!all.includes(wrong), wrong);
});

test('a short name that is the full name\'s last words, accents aside, takes their accents (D6)', () => {
  const mx = Object.fromEntries(countries.Q96.leaders.map(l => [l.full, l.name]));
  assert.equal(mx['Gustavo Díaz Ordaz'], 'Díaz Ordaz');
  assert.equal(mx['José López Portillo'], 'López Portillo');
  const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'dj').replace(/ð/g, 'd').replace(/ø/g, 'o').replace(/ł/g, 'l');
  const left = [];
  for (const [key, c] of Object.entries(countries)) for (const l of c.leaders) {
    if (!l.name || !l.full) continue;
    const tail = l.full.split(' ').slice(-l.name.split(' ').length).join(' ');
    if (tail !== l.name && fold(tail) === fold(l.name)) left.push(`${key} ${l.name} (${l.full})`);
  }
  assert.deepEqual(left, []);
});

test('the spelling rule itself (D6)', async () => {
  const { spellNames } = await import('../scripts/leader-corrections.mjs');
  const c = { leaders: [
    { name: 'Diaz Ordaz', full: 'Gustavo Díaz Ordaz' }, { name: 'Djuranovic', full: 'Veselin Đuranović' },
    { name: 'MacMillan', full: 'Harold Macmillan' }, { name: 'Cruz', full: 'Manuel Marrero Cruz' }, { name: 'Smith', full: 'John Major' }
  ] };
  spellNames(c);
  assert.deepEqual(c.leaders.map(l => l.name), ['Díaz Ordaz', 'Đuranović', 'Macmillan', 'Cruz', 'Smith']);
});

// D7. Monarchs that Wikidata's head of state (P35) leaves out, added from their own "position held" (P39) and their
// English Wikipedia articles.
test('George V, Hirohito and the other missing monarchs hold the head of state\'s office (D7)', () => {
  const reigns = [
    ['Q145', 'George V', '1910-05-06', '1936-01-20'],
    ['Q17', 'Emperor Taishō', '1912-07-30', '1926-12-25'],
    ['Q17', 'Hirohito', '1926-12-25', '1989-01-07'],
    ['Q38', 'Victor Emmanuel III', '1900-07-29', '1946-05-09'],
    ['Q38', 'Umberto II', '1946-05-09', '1946-06-12'],
    ['Q29', 'Alfonso XIII', '1886-05-17', '1931-04-14'],
    ['Q32', 'Charlotte, Grand Duchess of Luxembourg', '1919-01-14', '1964-11-12'],
    ['Q32', 'Jean, Grand Duke of Luxembourg', '1964-11-12', '2000-10-07'],
    ['Q222', 'Zog I', '1928-09-01', '1939-04-07'],
    ['Q222', 'Victor Emmanuel III', '1939-04-16', '1943-09-08'],
    ['Q191077', 'Alexander I of Yugoslavia', '1921-08-16', '1934-10-09'],
    ['Q191077', 'Peter II of Yugoslavia', '1934-10-09', '1945-11-29'],
    ['Q41', 'George II of Greece', '1935-11-03', '1947-04-01'],
    ['Q41', 'Paul of Greece', '1947-04-01', '1964-03-06'],
    ['Q41', 'Constantine II of Greece', '1964-03-06', '1973-06-01'],
    ['Q219', 'Boris III of Bulgaria', '1918-10-03', '1943-08-28'],
    ['Q219', 'Simeon II', '1943-08-28', '1946-09-15'],
    ['Q189', 'Christian X', '1918-12-01', '1944-06-17'],
    // From 8 January 1926, when he was proclaimed King of Hejaz (English Wikipedia's "Ibn Saud", whose infobox gives
    // that reign to 23 September 1932), not from his taking of Riyadh in 1902 (fixer, 26 November 2026).
    ['Q851', 'Ibn Saud', '1926-01-08', '1932-09-22'],
    ['Q233', 'Elizabeth II', '1964-09-21', '1974-12-13'],
    ['Q754', 'Elizabeth II', '1962-08-31', '1976-08-01'],
    ['Q778', 'Elizabeth II', '1973-07-10', '2022-09-08'],
    // Ireland (fixer, 26 November 2026): the kings, from English Wikipedia's "Irish head of state from 1922 to 1949",
    // and the presidents, from their "position held: President of Ireland" (P39) and Wikipedia's list.
    ['Q27', 'George V', '1922-12-06', '1936-01-20'],
    ['Q27', 'Edward VIII', '1936-01-20', '1936-12-12'],
    ['Q27', 'George VI', '1936-12-12', '1949-04-18'],
    ['Q27', 'Douglas Hyde', '1938-06-25', '1945-06-24'],
    ['Q27', 'Seán T. O\'Kelly', '1945-06-25', '1959-06-24'],
    ['Q27', 'Éamon de Valera', '1959-06-25', '1973-06-24'],
    ['Q27', 'Erskine Hamilton Childers', '1973-06-25', '1974-11-17'],
    ['Q27', 'Cearbhall Ó Dálaigh', '1974-12-19', '1976-10-22'],
    ['Q27', 'Patrick Hillery', '1976-12-03', '1990-12-02'],
    ['Q27', 'Mary Robinson', '1990-12-03', '1997-09-12'],
    ['Q27', 'Mary McAleese', '1997-11-11', '2011-11-10'],
    ['Q27', 'Michael D. Higgins', '2011-11-11', '2025-11-10']
  ];
  for (const [key, full, start, end] of reigns) {
    const o = countries[key].offices.filter(x => x.office === 'hos' && x.full === full && x.start === start);
    assert.equal(o.length, 1, `${key} ${full} from ${start}`);
    assert.equal(o[0].end, end, `${key} ${full} to ${end}`);
  }
  // Each state's offices stay in order of start.
  for (const key of new Set(reigns.map(r => r[0]))) {
    const starts = countries[key].offices.map(o => o.start);
    assert.deepEqual(starts, [...starts].sort(), key);
  }
});

test('the successions to and from the added monarchs are linked (D7)', () => {
  const has = (country, from, to, relation) => succession.links.some(l => l.country === country && l.office === 'state' && l.from === from && l.to === to && l.relation === relation);
  assert.ok(has('Q145', 'Q269412', 'Q590227', 'son'), 'Edward VIII, son of George V');
  assert.ok(has('Q17', 'Q157052', 'Q34479', 'son'), 'Hirohito, son of Taishō');
  assert.ok(has('Q17', 'Q34479', 'Q37979', 'son'), 'Akihito, son of Hirohito');
  assert.ok(has('Q38', 'Q150642', 'Q187149', 'son'), 'Umberto II, son of Victor Emmanuel III');
  assert.ok(has('Q32', 'Q155608', 'Q15988', 'son'), 'Jean, son of Charlotte');
});

// The fixer's pass (26 November 2026): the added heads of state were credited to Wikidata's P35, which leaves them out.
test('every added head of state names its own source, not Wikidata\'s head of state (P35)', async () => {
  const { REIGNS } = await import('../scripts/leader-corrections.mjs');
  for (const [key, list] of Object.entries(REIGNS)) for (const r of list) {
    const o = countries[key].offices.find(x => x.office === 'hos' && x.url === r.url && x.start === r.start);
    assert.ok(o, `${key} ${r.full} from ${r.start}`);
    assert.equal(o.source, 'reigns', `${key} ${r.full}`);
    assert.match(o.sourceNote, /^VM’s list of heads of state that Wikidata’s head of state \(P35\) leaves out \(scripts\/leader-corrections\.mjs\): /, `${key} ${r.full}`);
  }
  // Douglas Hyde was an interparty nominee and stood as an independent: no party is drawn for his term.
  assert.equal(countries.Q27.offices.find(o => o.full === 'Douglas Hyde').parties, undefined);
  // Sheinbaum's head-of-government term, whose start VM puts right, says so.
  assert.match(countries.Q96.offices.find(o => o.office === 'hog' && o.full === 'Claudia Sheinbaum').sourceNote, /1 October 2024/);
});

// The fixer's pass (26 November 2026). English Wikipedia's list "Prime Minister of Saudi Arabia", the infoboxes of
// Saud's and Faisal's articles and Wikidata's "position held" (P39): the office dates from 9 October 1953; Faisal was
// Prime Minister from 16 August 1954 to 21 December 1960 and from 31 October 1962; Mohammed bin Salman from 27 September
// 2022. Wikidata's head of government (P6) had the kings throughout, and Ibn Saud from 1932.
test('Saudi Arabia\'s heads of government: Faisal twice under Saud, Mohammed bin Salman from 2022, none before 1953', () => {
  const hog = countries.Q851.offices.filter(o => o.office === 'hog').map(o => [o.full, o.start, o.end]);
  assert.deepEqual(hog, [
    // Each king by his English Wikipedia article's title, as the list of leaders names him (27 November 2026).
    ['Saud of Saudi Arabia', '1953-10-09', '1954-08-16'],
    ['Faisal of Saudi Arabia', '1954-08-16', '1960-12-21'],
    ['Saud of Saudi Arabia', '1960-12-21', '1962-10-31'],
    ['Faisal of Saudi Arabia', '1962-10-31', '1975-03-25'],
    ['Khalid of Saudi Arabia', '1975-03-25', '1982-06-13'],
    ['Fahd of Saudi Arabia', '1982-06-13', '2005-08-01'],
    ['Abdullah of Saudi Arabia', '2005-08-01', '2015-01-23'],
    ['Salman of Saudi Arabia', '2015-01-23', '2022-09-27'],
    ['Mohammed bin Salman', '2022-09-27', null]
  ]);
  for (const o of countries.Q851.offices.filter(x => x.office === 'hog')) assert.match(o.sourceNote, /“Prime Minister of Saudi Arabia”/, o.full);
  // The family links follow: Mohammed bin Salman is the son of Salman, and Ibn Saud heads no government lane.
  const links = succession.links.filter(l => l.country === 'Q851' && l.office === 'government');
  assert.ok(links.some(l => l.from === 'Q367825' && l.to === 'Q6892571' && l.relation === 'son' && l.toStart === '2022-09-27'));
  assert.ok(!links.some(l => l.from === 'Q151509'));
  // His reign as head of state is linked from its new start.
  assert.ok(succession.links.some(l => l.country === 'Q851' && l.office === 'state' && l.from === 'Q151509' && l.fromStart === '1926-01-08'));
});

test('the Irish kings\' successions are linked, as the British ones are', () => {
  const has = (from, to, relation) => succession.links.some(l => l.country === 'Q27' && l.office === 'state' && l.from === from && l.to === to && l.relation === relation);
  assert.ok(has('Q269412', 'Q590227', 'son'), 'Edward VIII, son of George V');
  assert.ok(has('Q590227', 'Q280856', 'brother'), 'George VI, brother of Edward VIII');
});

// The fixer's pass (26 November 2026): the Dominican Republic's head of state and of government from 3 September 1965
// was Héctor García-Godoy (English Wikipedia's "Héctor García-Godoy" and list "President of the Dominican Republic").
test('the Dominican Republic\'s provisional President of 1965 is Héctor García-Godoy', () => {
  const o = countries.Q786.offices.filter(x => x.start === '1965-09-03').map(x => [x.office, x.full]).sort();
  assert.deepEqual(o, [['hog', 'Héctor García-Godoy'], ['hos', 'Héctor García-Godoy']]);
  assert.ok(!JSON.stringify(countries.Q786).includes('Jorge Luis Felipe'));
});

// The fixer's pass (26 November 2026): the leaders known only from Archigos carried its short name and no full name or
// article; each now takes the full name and article of the matching office holder (Wikidata) or English Wikipedia.
// They stay Archigos's, and are counted, not drawn.
test('the leaders known only from Archigos that the fixer named carry a full name and an article, and stay undrawn', () => {
  const rows = [
    ['Q96', '1970-12-01', 'Luis Echeverría'], ['Q96', '2000-12-01', 'Vicente Fox'], ['Q801', '1948-05-14', 'David Ben-Gurion'],
    ['Q801', '1955-11-03', 'David Ben-Gurion'], ['Q786', '1996-08-16', 'Leonel Fernández'], ['Q786', '2004-08-16', 'Leonel Fernández'],
    ['Q804', '2014-07-01', 'Juan Carlos Varela'], ['Q800', '2010-05-08', 'Laura Chinchilla'], ['Q800', '2014-05-08', 'Luis Guillermo Solís'],
    ['Q29', '1982-12-02', 'Felipe González'], ['Q29', '2011-12-20', 'Mariano Rajoy'], ['Q30', '1989-01-20', 'George H. W. Bush'],
    ['Q242', '2008-02-08', 'Dean Barrow'], ['Q774', '2000-01-15', 'Alfonso Portillo'], ['Q774', '2004-01-14', 'Óscar Berger'],
    ['Q774', '2008-01-14', 'Álvaro Colom'], ['Q792', '2004-06-01', 'Antonio Saca'], ['Q218', '2000-12-28', 'Adrian Năstase']
  ];
  for (const [key, start, full] of rows) {
    const l = countries[key].leaders.find(x => x.start === start);
    assert.deepEqual([l?.full, l?.url, l?.source], [full, W(full), 'Archigos'], `${key} ${start}`);
  }
});

test('the corrections are safe to run again (D1, D6, D7)', async () => {
  const { correctCountry } = await import('../scripts/leader-corrections.mjs');
  for (const key of ['Q96', 'Q20', 'Q35', 'Q851', 'Q145', 'Q17', 'Q27', 'Q786', 'Q45', 'Q30', 'Q142', 'Q28', 'Q36', 'Q39', 'Q1246', 'Q37', 'Q217', 'Q222', 'Q191077', 'Q235', 'Q228', 'Q760']) {
    const c = structuredClone(countries[key]);
    correctCountry(key, c);
    assert.deepEqual(c, countries[key], key);
  }
});

// D8, rewritten on 27 November 2026. rulers.org (B. Schemmel) allows not-for-profit use only, and VM uses only data
// free for commercial use, so it stopped being a source that day: every date that rested on it was read again from
// free sources, the page no longer names it (nor worldstatesmen.org, a site of the same kind), and README says when and
// why it was dropped.
test('rulers.org is no longer a source: the page does not name it, and README says why it was dropped (D8)', () => {
  const html = text('index.html'), app = text('app.js');
  for (const [file, s] of [['index.html', html], ['app.js', app]]) assert.doesNotMatch(s, /rulers\.org|worldstatesmen|Schemmel|Cahoon/, file);
  // The source line the page writes for VM's own lists names the free sources.
  // Since the fixer's pass (27 November 2026) it says "most entries": Dominica's Presidents and a few single days rest
  // on one source, and say so. The footer names the Liechtenstein lexicon, cited for single facts.
  assert.ok(app.includes('VM’s own list, built from Wikidata, Wikipedia’s lists and articles and the state’s official acts and records: most entries are read from two or more of them'));
  assert.doesNotMatch(app, /at least two of/);
  assert.match(html, /VM’s own lists \(scripts\/leader-lists\.mjs, facts read from Wikidata, Wikipedia’s lists and articles and the states’ official acts and records; most entries rest on two or more of them/);
  assert.match(html, /Historisches Lexikon des Fürstentums Liechtenstein<\/a>, whose texts exclude commercial use, for the single fact and never as the only source/);
  assert.doesNotMatch(html, /draw only what is free to reuse/);
  // README's table of sources names only the sources used (builder 3: the row that said rulers.org was no longer
  // used is gone from it); Known limits says in two sentences when and why it was dropped, with the counts.
  const readme = text('README.md');
  const table = readme.split('## Data sources')[1].split('\n## ')[0];
  assert.doesNotMatch(table, /rulers\.org|worldstatesmen|Schemmel/, 'the table of sources');
  for (const used of ['[Wikidata](https://www.wikidata.org)', '| Wikipedia |', "| Governments' own records |", 'Historisches Lexikon']) assert.ok(table.includes(used), used);
  const note = readme.split('\n').find(l => l.startsWith('- Until 27 November 2026 the hand-built lists took day dates from rulers.org'));
  assert.ok(note, 'Known limits says what became of rulers.org');
  assert.equal(note.slice(2).split(/(?<=[a-z\d)]\.)\s+(?=[A-Z])/).length, 2, 'two sentences');
  for (const words of [/not-for-profit use only/, /free for commercial use/, /1,170 starts and ends/, /1,126 were confirmed/, /36 were changed/, /6 are given to the month only/, /enciclopedia\.cat/]) assert.match(note, words);
  assert.doesNotMatch(note, /\]\(https?:|https?:\/\//, 'no link to it');
});

// Builder 3 (27 November 2026). README's count of the hand lists' dates given to the month or year (from a comparison
// of scripts/leader-lists.mjs at the last commit with the build) matches the lists as they are now.
test('README counts the hand-built dates left to the month or year as the lists hold them', async () => {
  const { LISTS } = await import('../scripts/leader-lists.mjs');
  const vague = Object.values(LISTS).flatMap(c => [...(c.leaders || []), ...(c.offices || [])])
    .flatMap(x => [x.startPrecision, x.end ? x.endPrecision : undefined]).filter(p => p === 'month' || p === 'year');
  // Compton and Pilgrim, Pallarès, Seraphin and John, Fornesa (the fixer, 27 November 2026).
  assert.equal(vague.length, 6);
  assert.match(text('README.md'), /6 are given to the month only/);
});

// Builder 3 (27 November 2026). A leader whose start is known only to the month or year arrives on an event of that
// precision, which the page shows as "May 1982", not as the 1st. Until that day VM's own lists (leader-corrections.mjs,
// arrival) gave the event no precision, so John Compton's return in Saint Lucia was listed as "1 May 1982".
test('an arrival known only to the month or year carries that precision on its event', () => {
  let checked = 0;
  for (const [key, c] of Object.entries(countries)) {
    for (const l of c.leaders) {
      if (l.start < '1926-01-01') continue;
      const e = c.events.find(e => ['leader', 'coup'].includes(e.type) && e.date === l.start && e.text.startsWith(`${l.full || l.name} takes power`));
      if (!e) continue;
      const p = l.startPrecision && l.startPrecision !== 'day' ? l.startPrecision : undefined;
      assert.equal(e.precision, p, `${key} ${l.full} ${l.start}`);
      if (p) checked++;
    }
  }
  assert.ok(checked >= 2, `${checked} arrivals at month or year precision`);
  const compton = countries.Q760.events.find(e => e.date === '1982-05-01' && e.text === 'John Compton takes power');
  assert.equal(compton.precision, 'month');
});

// The same build (27 November 2026): no hand-built entry, no head of state added by hand and no record in the data
// rests on rulers.org or worldstatesmen.org. In the scripts' comments the two sites are named only to say that they are
// not sources, or that a page whose only source is one of them is not counted.
test('no hand-built entry and no record names rulers.org or worldstatesmen.org as its source (27 November 2026)', async () => {
  assert.doesNotMatch(readFileSync(new URL('countries.json', dataDir), 'utf8'), /rulers\.org|worldstatesmen/);
  const { LISTS } = await import('../scripts/leader-lists.mjs');
  const { REIGNS, CORRECTIONS } = await import('../scripts/leader-corrections.mjs');
  for (const [name, x] of [['LISTS', LISTS], ['REIGNS', REIGNS], ['CORRECTIONS', CORRECTIONS]]) assert.doesNotMatch(JSON.stringify(x), /rulers\.org|worldstatesmen/, name);
  for (const f of ['scripts/leader-lists.mjs', 'scripts/leader-corrections.mjs', 'scripts/election-corrections.mjs']) {
    const comments = text(f).split('\n').filter(l => /^\s*\/\//.test(l)).map(l => l.replace(/^\s*\/\/\s?/, '')).join(' ');
    const naming = comments.split(/(?<=[.;])\s+(?=[A-Z(])/).filter(s => /rulers\.org|worldstatesmen/.test(s));
    for (const s of naming) assert.match(s, /\bnot\b|\bneither\b|only source|no longer/, `${f}: ${s}`);
  }
});

// The head-of-state lane (27 November 2026): 73 stretches of over a year in 36 states had nobody drawn, because
// Wikidata's head of state (P35) starts late or leaves holders out. HOS_GAPS in scripts/leader-corrections.mjs fills
// them, each entry naming its sources. Three stay open, because the sources do not settle who held the office:
// Czechoslovakia under the Protectorate before the government in exile was recognised (March 1939 to July 1940),
// Estonia from independence to Meri's presidency (Rüütel's standing as head of state is not settled), and Slovakia in
// 1998-99, when the National Council could not elect a President.
test('the head-of-state lane has no year with nobody drawn, but for three stretches the sources leave open (27 November 2026)', async () => {
  const { buildModel, dateOfDay } = await import('../lanes.js');
  const data = read('countries.json');
  const found = [];
  for (const [key, c] of Object.entries(data.countries)) {
    const m = buildModel(c, key, { firstYear: data.firstYear, lastYear: data.lastYear, today: '2026-11-27', links: [] });
    for (const [p, q] of m.lanes.state.holes || []) if (q - p > 365) found.push(`${key} ${dateOfDay(p)} ${dateOfDay(q - 1)}`);
  }
  assert.deepEqual(found.sort(), ['Q191 1991-08-20 1992-10-05', 'Q214 1998-03-03 1999-06-14', 'Q33946 1939-03-15 1940-07-20']);
});

test('the heads of state added for the empty years are dated as their sources give them (27 November 2026)', async () => {
  const hos = (key, full, start) => countries[key].offices.filter(o => o.office === 'hos' && o.full === full && o.start === start);
  const rows = [
    // [state, holder, start, end], one or more per state, with the days the comments name as contested.
    ['Q30', 'George H. W. Bush', '1989-01-20', '1993-01-20'],
    ['Q142', 'Albert Lebrun', '1932-05-10', '1940-07-11'], ['Q142', 'Philippe Pétain', '1940-07-11', '1944-08-20'],
    ['Q142', 'Charles de Gaulle', '1944-08-20', '1946-01-20'], ['Q142', 'Georges Bidault', '1946-06-24', '1946-12-16'],
    ['Q28', 'Miklós Horthy', '1920-03-01', '1944-10-16'], ['Q28', 'Ferenc Szálasi', '1944-11-04', '1945-03-28'],
    ['Q28', 'Brunó Ferenc Straub', '1988-06-29', '1989-10-23'],
    ['Q36', 'Ignacy Mościcki', '1926-06-04', '1939-09-30'], ['Q36', 'Edward Ochab', '1964-08-12', '1968-04-11'],
    ['Q36', 'Marian Spychalski', '1968-04-11', '1970-12-23'],
    ['Q45', 'Manuel Gomes da Costa', '1926-06-17', '1926-07-09'], ['Q45', 'Óscar Carmona', '1926-07-09', '1951-04-18'],
    ['Q222', 'Zog I', '1925-02-01', '1928-09-01'], ['Q222', 'Ramiz Alia', '1982-11-22', '1991-04-30'],
    ['Q399', 'Robert Kocharyan', '1998-02-03', '2008-04-09'], ['Q227', 'Abulfaz Elchibey', '1992-06-17', '1993-06-24'],
    ['Q184', 'Myechyslaw Hryb', '1994-01-28', '1994-07-20'], ['Q225', 'Alija Izetbegović', '1990-12-20', '1996-10-05'],
    ['Q219', 'Todor Zhivkov', '1971-07-01', '1989-11-17'], ['Q13426199', 'Lin Sen', '1931-12-15', '1943-08-01'],
    ['Q800', 'Otilio Ulate Blanco', '1949-11-08', '1953-11-08'], ['Q241', 'Manuel Urrutia Lleó', '1959-01-02', '1959-07-18'],
    ['Q229', 'Spyros Kyprianou', '1977-08-03', '1988-02-28'], ['Q786', 'Rafael Trujillo', '1942-05-18', '1952-08-16'],
    ['Q792', 'Andrés Ignacio Menéndez', '1934-08-28', '1935-03-01'], ['Q191', 'Konstantin Päts', '1937-09-03', '1938-04-24'],
    ['Q41', 'Christos Sartzetakis', '1985-03-30', '1990-05-05'], ['Q774', 'Carlos Castillo Armas', '1954-07-08', '1957-07-26'],
    ['Q790', 'Henri Namphy', '1986-02-07', '1988-02-07'], ['Q783', 'Julio Lozano Díaz', '1954-12-05', '1956-10-21'],
    ['Q189', 'Sveinn Björnsson', '1944-06-17', '1952-01-25'], ['Q211', 'Alberts Kviesis', '1930-04-11', '1936-04-11'],
    ['Q37', 'Vytautas Landsbergis', '1990-03-11', '1992-11-25'], ['Q233', 'Paul Xuereb', '1987-02-16', '1989-04-04'],
    ['Q217', 'Mihai Ghimpu', '2009-09-11', '2010-12-28'], ['Q811', 'Juan Bautista Sacasa', '1933-01-01', '1936-06-06'],
    ['Q811', 'Anastasio Somoza García', '1950-05-07', '1956-09-29'], ['Q804', 'Guillermo Endara', '1989-12-20', '1994-09-01'],
    ['Q215', 'Milan Kučan', '1990-05-10', '1992-12-23'], ['Q29', 'Niceto Alcalá-Zamora', '1931-04-14', '1931-10-14'],
    ['Q39', 'Kurt Furgler', '1981-01-01', '1981-12-31'], ['Q754', 'Ellis Clarke', '1976-08-01', '1987-03-19'],
    ['Q191077', 'Josip Broz Tito', '1953-01-14', '1980-05-04'], ['Q191077', 'Aleksandar Vučić', '2017-05-31', '2026-09-27'],
    // Kosovo: Shiroka Pula was elected and sworn in after midnight in the sitting of 6 October 2026; Haxhiu acted to then.
    ['Q1246', 'Justina Shiroka Pula', '2026-10-07', null], ['Q1246', 'Albulena Haxhiu', '2026-04-04', '2026-10-07']
  ];
  for (const [key, full, start, end] of rows) {
    const o = hos(key, full, start);
    assert.equal(o.length, 1, `${key} ${full} from ${start}`);
    assert.equal(o[0].end, end, `${key} ${full} to ${end}`);
  }
  // Each one names its source, and those known only to the month say so.
  for (const c of Object.values(countries)) for (const o of c.offices.filter(x => x.source === 'reigns')) assert.match(o.sourceNote || '', /Wikidata|Wikipedia|president\.lv|Office of the President|Gaceta/, `${c.name} ${o.full}`);
  assert.equal(hos('Q786', 'Horacio Vásquez', '1924-07-01')[0].startPrecision, 'month');
  assert.equal(hos('Q211', 'Anatolijs Gorbunovs', '1990-05-01')[0].startPrecision, 'month');
  // The terms put right so that the added heads do not overlap them.
  assert.equal(hos('Q37', 'Algirdas Brazauskas', '1993-02-25').length, 1, 'Brazauskas President from his oath');
  assert.deepEqual(countries.Q217.offices.filter(o => o.full === 'Vladimir Voronin' && o.office === 'hos').map(o => o.end), ['2009-09-11']);
  // In these states nobody holds the office twice at once, and each state's offices stay in order of start.
  for (const key of new Set(rows.map(r => r[0]))) {
    const c = countries[key], starts = c.offices.map(o => o.start);
    assert.deepEqual(starts, [...starts].sort(), key);
    const byPerson = Object.groupBy(c.offices.filter(o => o.office === 'hos'), o => o.full);
    for (const [who, terms] of Object.entries(byPerson)) terms.forEach((t, i) => i && assert.ok(!terms[i - 1].end || terms[i - 1].end <= t.start, `${key} ${who} from ${t.start}`));
  }
});

// The hand-built lists read again from free sources (27 November 2026), each change from the source its comment names.
test('the hand-built lists follow the free sources read on 27 November 2026', async () => {
  const lead = (key, full, start) => countries[key].leaders.find(l => l.full === full && l.start === start);
  const office = (key, full, start) => countries[key].offices.find(o => o.full === full && o.start === start);
  // Monaco: each Minister of State from the day his Sovereign Ordinance names, or the day the Journal shows him in post.
  const ministers = countries.Q235.offices.filter(o => o.office === 'hog').map(o => `${o.start} ${o.full}`);
  for (const m of ['1937-05-22 Henry Mauran', '1944-11-20 Pierre de Witasse', '1950-07-24 Pierre Voizard', '1953-09-02 Pierre Blanchy',
    '1953-11-14 Henry Soum', '1959-02-01 Émile Pelletier', '1967-01-01 Paul Demange', '1972-06-01 André Saint-Mleux',
    '1981-07-08 Jean Herly', '1991-02-18 Jacques Dupont', '2025-01-10 Isabelle Berro-Amadeï']) assert.ok(ministers.includes(m), m);
  assert.equal(office('Q235', 'Pierre Voizard', '1950-07-24').end, '1953-09-02');
  // Liechtenstein: Schädler from the Prince's appointment on 10 June 1922 (the Landtag had elected him on 6 June).
  assert.equal(office('Q347', 'Gustav Schädler', '1922-06-10')?.end, '1928-06-15');
  // Grenada: Austin's council ended with the invasion of 25 October 1983; Scoon from his Proclamation of 31 October.
  assert.equal(lead('Q769', 'Hudson Austin', '1983-10-19').end, '1983-10-25');
  assert.ok(lead('Q769', 'Paul Scoon', '1983-10-31'));
  // Dominica: John left and Seraphin was sworn in in June 1979, day not confirmed (the free sources split between 21
  // and 25 June; the fixer, 27 November 2026).
  const john = lead('Q784', 'Patrick John', '1978-11-03');
  assert.deepEqual([john.end, john.endPrecision], ['1979-06-01', 'month']);
  assert.equal(lead('Q784', 'Oliver Seraphin', '1979-06-01').startPrecision, 'month');
  // Saint Lucia: Compton's return in May 1982, day not confirmed, and Pilgrim's end with it.
  const compton = lead('Q760', 'John Compton', '1982-05-01');
  assert.equal(compton.startPrecision, 'month');
  assert.deepEqual([lead('Q760', 'Michael Pilgrim', '1982-01-17').end, lead('Q760', 'Michael Pilgrim', '1982-01-17').endPrecision], ['1982-05-01', 'month']);
  // Andorra: Pallarès left in August 1933 (day not confirmed); Syndics dated from the oath where the act gives one;
  // no acting Head of Government in 2011 (the one source for it was rulers.org); Poher from Pompidou's death.
  const pallares = lead('Q228', 'Roc Pallarès Rossell', '1927-12-19');
  assert.deepEqual([pallares.end, pallares.endPrecision], ['1933-08-01', 'month']);
  assert.ok(lead('Q228', 'Francesc Escudé Ferrero', '1966-12-31'));
  assert.ok(lead('Q228', 'Estanislau Sangrà Font', '1978-12-30'));
  assert.equal(countries.Q228.leaders.some(l => l.full === 'Pere López Agràs'), false);
  assert.equal(lead('Q228', 'Jaume Bartumeu', '2009-06-05').end, '2011-05-12');
  assert.equal(office('Q228', 'Georges Pompidou', '1969-06-20').end, '1974-04-02');
  assert.ok(office('Q228', 'Alain Poher', '1974-04-02'));
});

// (chain() gives the term before such an entry the same end precision: Pilgrim's end, in the test above.)
test('a hand-built entry known only to the month carries its precision, and one known to the day carries none', async () => {
  const { E } = await import('../scripts/leader-lists.mjs');
  const l = E('Somebody|Q1|=', '1982-05-01', null, { startPrecision: 'month' });
  assert.equal(l.startPrecision, 'month');
  assert.equal('endPrecision' in l, false);
  assert.equal('startPrecision' in E('Somebody|Q1|=', '1982-05-03', null), false);
});

// D9. The comment at the head of election-corrections.mjs no longer counts "six entries".
test('the election corrections\' opening comment does not count its entries (D9)', () => {
  const head = text('scripts/election-corrections.mjs').split('\nimport ')[0];
  assert.doesNotMatch(head, /\bsix entries\b/);
  assert.match(head, /26 November 2026/);
});

/* -------- Builder 2 of 27 November 2026: votes the fetch misses, Liechtenstein 2025, the votes left out, names -------- */

// A count in words, as the footer writes it ("One hundred and fifty-four"), to 999.
const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const inWords = n => {
  const small = m => (m < 20 ? UNITS[m] : TENS[Math.floor(m / 10)] + (m % 10 ? `-${UNITS[m % 10]}` : ''));
  return n < 100 ? small(n) : `${UNITS[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${small(n % 100)}` : ''}`;
};
const Cap = s => s[0].toUpperCase() + s.slice(1);
test('the count in words reads as the footer writes it', () => {
  assert.deepEqual([154, 136, 68, 63, 24, 11, 7, 100].map(inWords),
    ['one hundred and fifty-four', 'one hundred and thirty-six', 'sixty-eight', 'sixty-three', 'twenty-four', 'eleven', 'seven', 'one hundred']);
});

// Votes the Wikidata fetch does not reach (MISSED): Japan's 63, three of Mexico's, one of Nicaragua's and Germany's
// referendum of 1934. Each is in the data once, under its state, on the day its entry gives.
test('the votes the fetch misses are listed once, under their state, on their day (Japan, Mexico, Nicaragua, Germany 1934)', async () => {
  const { MISSED } = await import('../scripts/election-corrections.mjs');
  const per = {};
  for (const m of MISSED) per[m.key] = (per[m.key] || 0) + 1;
  assert.deepEqual(per, { Q17: 63, Q96: 3, Q811: 1, Q41304: 1 });
  assert.equal(new Set(MISSED.map(m => m.wd)).size, MISSED.length, 'one entry per item');
  for (const m of MISSED) {
    const v = vote(m.key, m.title);
    assert.equal(v?.date, m.date, `${m.title} on ${m.date}`);
    assert.equal(v.precision, undefined, `${m.title} to the day`);
    const holders = Object.keys(countries).filter(k => votes(k).some(e => e.url === W(m.title)));
    assert.deepEqual(holders, [m.key], `${m.title} is listed once`);
    assert.ok(m.sources.length >= 2, `${m.title}: two sources`);
  }
  // Japan's lane of votes runs from 1928 to 2026, both houses, with the two days both were elected.
  const jp = votes('Q17');
  assert.equal(jp.length, 63);
  assert.equal(jp[0].date, '1928-02-20');
  assert.equal(jp.at(-1).date, '2026-02-08');
  assert.equal(jp.filter(e => e.date === '1980-06-22').length, 2);
  assert.equal(jp.filter(e => e.date === '1986-07-06').length, 2);
  assert.ok(jp.every(e => e.type === 'election'));
  // 1992: the Statistics Bureau's table and Japanese Wikipedia give 26 July; Wikidata's 7 July and English Wikipedia's
  // 23 July are not followed, and the entry says so.
  const hoc92 = MISSED.find(m => m.wd === 'Q6158217');
  assert.equal(vote('Q17', '1992 Japanese House of Councillors election').date, '1992-07-26');
  assert.match(hoc92.sources[0], /Statistics Bureau of Japan/);
  assert.match(hoc92.sources.at(-1), /^not followed: .*7 July 1992.*23 July 1992/);
  assert.deepEqual(['2012-07-01', '2018-07-01', '2024-06-02'].map(d => votes('Q96').some(e => e.date === d && /Mexican general election/.test(e.text))), [true, true, true]);
  assert.equal(vote('Q811', '2021 Nicaraguan general election').date, '2021-11-07');
  const de34 = vote('Q41304', '1934 German head of state referendum');
  assert.deepEqual([de34?.date, de34?.type], ['1934-08-19', 'referendum']);
});

test('Liechtenstein\'s general election of 2025 is on 9 February 2025, and 1997\'s stays on 2 February', async () => {
  const { ELECTIONS } = await import('../scripts/election-corrections.mjs');
  assert.equal(vote('Q347', '2025 Liechtenstein general election').date, '2025-02-09');
  assert.equal(vote('Q347', '1997 Liechtenstein general election').date, '1997-02-02');
  const li = ELECTIONS.find(e => e.wd === 'Q105556112');
  assert.ok(li.sources.some(s => /landtagswahlen\.li/.test(s)) && li.sources.some(s => /German Wikipedia/.test(s)));
});

// The footer counts the votes added and the votes left out, in words, from the lists themselves.
test('the footer counts the votes added and the votes left out by name, in words, from the lists (27 November 2026)', async () => {
  const { MISSED, NOT_NATIONAL, NOT_PUBLIC, NEVER_HELD, NOT_VOTES } = await import('../scripts/election-corrections.mjs');
  assert.deepEqual(NOT_VOTES, [...NOT_PUBLIC, ...NEVER_HELD]);
  const span = id => text('index.html').match(new RegExp(`<span id="${id}">([^<]*)</span>`))[1];
  const added = span('votes-added');
  assert.ok(added.startsWith(`${Cap(inWords(MISSED.length))} national votes that this site’s Wikidata fetch does not reach are added`), added.slice(0, 80));
  assert.ok(added.includes(`Japan’s ${inWords(MISSED.filter(m => m.key === 'Q17').length)} general and House of Councillors elections`), 'Japan');
  assert.match(added, /1992, dated 26 July/);
  const left = span('votes-left-out');
  const all = NOT_NATIONAL.length + NOT_PUBLIC.length + NEVER_HELD.length;
  assert.ok(left.startsWith(`${Cap(inWords(all))} votes in this site’s copy of Wikidata are left out by name`), left.slice(0, 80));
  for (const n of [NOT_NATIONAL.length, NOT_PUBLIC.length, NEVER_HELD.length]) assert.ok(left.includes(`: ${inWords(NOT_NATIONAL.length)} that`) && left.includes(` ${inWords(n)} `), `${inWords(n)}: ${left}`);
  assert.ok(left.includes(`${inWords(NOT_PUBLIC.length)} entries that are not public votes, and ${inWords(NEVER_HELD.length)} votes that were planned but never held`));
  // The words the footer names are words the rule on titles in build-data.mjs drops.
  const rule = text('scripts/build-data.mjs').match(/if \(\/\\b\(([^)]*)\)\\b\/i\.test\(label\)\) continue;/)[1].split('|');
  const named = left.match(/with words such as ([^)]*)\)/)[1].replace(' or ', ', ').split(', ');
  assert.ok(named.length >= 5);
  for (const w of named) assert.ok(rule.includes(w), `the rule drops "${w}"`);
  // The sentence on Archigos's names stays.
  assert.match(left, /Leaders’ names that Archigos misspells, and the short names it gives alone, are corrected or completed from Wikidata and the leaders’ English Wikipedia articles, or a Spanish article where there is none in English/);
});

// Archigos leaders shown only by Archigos's short name (78 on 27 November 2026) are named by their articles.
test('every Archigos leader has a full name; the 78 short names take their article\'s name and link (27 November 2026)', () => {
  const none = Object.entries(countries).flatMap(([k, c]) => c.leaders.filter(l => !l.full).map(l => `${k} ${l.start} ${l.name}`));
  assert.deepEqual(none, []);
  const rows = [
    ['Q241', '1925-05-20', 'Machado Morales', 'Gerardo Machado', 'Gerardo Machado'],
    ['Q241', '1933-09-10', 'Grau San Martín', 'Ramón Grau', 'Ramón Grau'],
    ['Q241', '1936-05-20', 'Gómez y Arias', 'Miguel Mariano Gómez', 'Miguel Mariano Gómez'],
    ['Q241', '1944-10-10', 'Grau San Martín', 'Ramón Grau', 'Ramón Grau'],
    ['Q790', '1957-04-06', 'Executive Government Council', 'Executive Government Council', 'Executive Government Council (Haiti)'],
    ['Q790', '1988-09-17', 'Avril', 'Prosper Avril', 'Prosper Avril'],
    ['Q786', '1962-01-17', 'Rodríguez Echavarría', 'Pedro Rafael Rodríguez Echavarría', null],
    ['Q786', '1963-09-26', 'de los Santos', 'Emilio de los Santos', 'Emilio de los Santos'],
    ['Q774', '1921-12-07', 'Orellana', 'José María Orellana', 'José María Orellana'],
    ['Q774', '1930-12-17', 'Orellana Contreras', 'Manuel María Orellana Contreras', 'Manuel María Orellana Contreras'],
    ['Q774', '1931-01-01', 'Reina Andrade', 'José María Reina Andrade', 'José María Reina Andrade'],
    ['Q774', '1931-02-15', 'Ubico Castañeda', 'Jorge Ubico', 'Jorge Ubico'],
    ['Q774', '1944-10-21', 'Árbenz Guzmán', 'Jacobo Árbenz', 'Jacobo Árbenz'],
    ['Q774', '1951-03-01', 'Árbenz Guzmán', 'Jacobo Árbenz', 'Jacobo Árbenz'],
    ['Q783', '1956-10-21', 'Caraccioli', 'Héctor Caraccioli Moncada', null],
    ['Q792', '1934-08-29', 'Menéndez', 'Andrés Ignacio Menéndez', 'Andrés Ignacio Menéndez'],
    ['Q792', '1944-05-09', 'Menéndez', 'Andrés Ignacio Menéndez', 'Andrés Ignacio Menéndez'],
    ['Q792', '1944-10-21', 'Aguirre y Salinas', 'Osmín Aguirre y Salinas', 'Osmín Aguirre y Salinas'],
    ['Q792', '1949-10-22', 'Bolaños', 'Óscar Adán Bolaños', null],
    ['Q792', '1960-10-26', 'Castillo', 'Miguel Ángel Castillo Maldonado', null],
    ['Q792', '1961-01-25', 'Portillo', 'Aníbal Portillo', 'Aníbal Portillo'],
    ['Q792', '1977-07-01', 'Romero Mena', 'Carlos Humberto Romero', 'Carlos Humberto Romero'],
    ['Q792', '1979-10-15', 'Majano Ramos', 'Adolfo Arnoldo Majano', 'Adolfo Arnoldo Majano'],
    ['Q811', '1936-06-06', 'Brenes Jarquín', 'Carlos Alberto Brenes', 'Carlos Alberto Brenes'],
    ['Q811', '1966-08-04', 'Guerrero Gutiérrez', 'Lorenzo Guerrero', 'Lorenzo Guerrero'],
    ['Q804', '1928-09-08', 'Duque', 'Tomás Gabriel Duque', null],
    ['Q804', '1931-01-03', 'Arias Madrid', 'Harmodio Arias Madrid', 'Harmodio Arias Madrid'],
    ['Q804', '1932-10-01', 'Arias Madrid', 'Harmodio Arias Madrid', 'Harmodio Arias Madrid'],
    ['Q804', '1940-10-01', 'Arias', 'Arnulfo Arias', 'Arnulfo Arias'],
    ['Q804', '1941-10-09', 'Jaén Guardia', 'Ernesto Jaén Guardia', null],
    ['Q804', '1941-10-09', 'de la Guardia', 'Ricardo Adolfo de la Guardia', 'Ricardo Adolfo de la Guardia'],
    ['Q804', '1949-11-20', 'Chiari Remón', 'Roberto Francisco Chiari Remón', 'Roberto Francisco Chiari Remón'],
    ['Q804', '1949-11-25', 'Arias', 'Arnulfo Arias', 'Arnulfo Arias'],
    ['Q804', '1952-10-01', 'Remón Cantera', 'José Antonio Remón Cantera', 'José Antonio Remón Cantera'],
    ['Q804', '1955-01-15', 'Arias Espinosa', 'Ricardo Arias', 'Ricardo Arias (politician)'],
    ['Q804', '1956-10-01', 'de la Guardia', 'Ernesto de la Guardia', 'Ernesto de la Guardia'],
    ['Q804', '1960-10-01', 'Chiari Remón', 'Roberto Francisco Chiari Remón', 'Roberto Francisco Chiari Remón'],
    ['Q804', '1968-10-01', 'Arias', 'Arnulfo Arias', 'Arnulfo Arias'],
    ['Q804', '1968-10-12', 'Torrijos Herrera', 'Omar Torrijos', 'Omar Torrijos'],
    ['Q804', '1982-03-03', 'Paredes', 'Rubén Darío Paredes', 'Rubén Darío Paredes'],
    ['Q27', '1973-03-14', 'Cosgrave', 'Liam Cosgrave', 'Liam Cosgrave'],
    ['Q27', '2008-05-07', 'Cowen', 'Brian Cowen', 'Brian Cowen'],
    ['Q27', '2011-03-09', 'Kenny', 'Enda Kenny', 'Enda Kenny'],
    ['Q31', '1932-10-22', 'de Broqueville', 'Charles de Broqueville', 'Charles de Broqueville'],
    ['Q31', '1949-08-10', 'Eyskens', 'Gaston Eyskens', 'Gaston Eyskens'],
    ['Q31', '1958-06-25', 'Eyskens', 'Gaston Eyskens', 'Gaston Eyskens'],
    ['Q31', '1968-06-17', 'Eyskens', 'Gaston Eyskens', 'Gaston Eyskens'],
    ['Q142', '1954-06-18', 'Mendès France', 'Pierre Mendès France', 'Pierre Mendès France'],
    ['Q29', '1931-04-14', 'Alcalá-Zamora', 'Niceto Alcalá-Zamora', 'Niceto Alcalá-Zamora'],
    ['Q29', '1936-05-13', 'Casares Quiroga', 'Santiago Casares Quiroga', 'Santiago Casares Quiroga'],
    ['Q45', '1925-12-16', 'Machado Guimarães', 'Bernardino Machado', 'Bernardino Machado'],
    ['Q41', '1926-08-23', 'Kondylis', 'Georgios Kondylis', 'Georgios Kondylis'],
    ['Q41', '1935-10-10', 'Kondylis', 'Georgios Kondylis', 'Georgios Kondylis'],
    ['Q41', '1941-01-29', 'Koryzis', 'Alexandros Koryzis', 'Alexandros Koryzis'],
    ['Q41', '1944-10-18', 'Papandreou', 'Georgios Papandreou', 'Georgios Papandreou'],
    ['Q41', '1945-11-22', 'Sofoulis', 'Themistoklis Sofoulis', 'Themistoklis Sofoulis'],
    ['Q41', '1946-04-04', 'Poulitsas', 'Panagiotis Poulitsas', 'Panagiotis Poulitsas'],
    ['Q41', '1946-04-18', 'Tsaldaris', 'Konstantinos Tsaldaris', 'Konstantinos Tsaldaris'],
    ['Q41', '1947-08-29', 'Tsaldaris', 'Konstantinos Tsaldaris', 'Konstantinos Tsaldaris'],
    ['Q41', '1947-09-08', 'Sofoulis', 'Themistoklis Sofoulis', 'Themistoklis Sofoulis'],
    ['Q41', '1950-03-23', 'Venizelos', 'Sofoklis Venizelos', 'Sofoklis Venizelos'],
    ['Q41', '1950-08-21', 'Venizelos', 'Sofoklis Venizelos', 'Sofoklis Venizelos'],
    ['Q41', '1963-11-08', 'Papandreou', 'Georgios Papandreou', 'Georgios Papandreou'],
    ['Q41', '1964-02-18', 'Papandreou', 'Georgios Papandreou', 'Georgios Papandreou'],
    ['Q41', '1995-11-20', 'Tsochatzopoulos', 'Akis Tsochatzopoulos', 'Akis Tsochatzopoulos'],
    ['Q41', '2011-11-11', 'Papademos', 'Lucas Papademos', 'Lucas Papademos'],
    ['Q41', '2012-05-16', 'Pikrammenos', 'Panayiotis Pikrammenos', 'Panayiotis Pikrammenos'],
    ['Q41', '2012-06-20', 'Samaras', 'Antonis Samaras', 'Antonis Samaras'],
    ['Q229', '2003-02-28', 'Papadopoulos', 'Tassos Papadopoulos', 'Tassos Papadopoulos'],
    ['Q219', '1943-08-29', 'Kiril', 'Kiril, Prince of Preslav', 'Kiril, Prince of Preslav'],
    ['Q219', '1991-11-08', 'Dimitrov', 'Philip Dimitrov', 'Philip Dimitrov'],
    // Kaarel Eenpalu, named as he was in 1932.
    ['Q191', '1932-07-19', 'Einbund', 'Karl August Einbund', 'Kaarel Eenpalu'],
    ['Q230', '2007-11-25', 'Burjanadze', 'Nino Burjanadze', 'Nino Burjanadze'],
    ['Q189', '1944-05-17', 'Þórðarson', 'Björn Þórðarson', 'Björn Þórðarson'],
    ['Q189', '2006-06-15', 'Haarde', 'Geir Haarde', 'Geir Haarde'],
    ['Q851', '1996-01-01', 'Abdullah', 'Abdullah of Saudi Arabia', 'Abdullah of Saudi Arabia'],
    ['Q17', '1945-04-07', 'Suzuki', 'Kantarō Suzuki', 'Kantarō Suzuki'],
    ['Q17', '2009-09-16', 'Hatoyama', 'Yukio Hatoyama', 'Yukio Hatoyama']
  ];
  assert.equal(rows.length, 78);
  for (const [key, start, name, full, title] of rows) {
    const l = countries[key].leaders.filter(x => x.start === start && x.full === full);
    assert.equal(l.length, 1, `${key} ${start} ${full}`);
    assert.deepEqual([l[0].name, l[0].url, l[0].source], [name, title ? W(title) : null, 'Archigos'], `${key} ${start} ${full}`);
    // Its arrival (from 1926) is named so too.
    if (start >= '1926-01-01') assert.ok(countries[key].events.some(e => e.date === start && ['leader', 'coup'].includes(e.type) && e.text.startsWith(`${full} takes power`)), `${full}: arrival`);
  }
  // Kenny: the name, and since the fixer's pass (27 November 2026) his term ends on 14 June 2017, when Varadkar took
  // office (until then his term ran on to 27 June 2020, and Varadkar's first term was missing).
  assert.equal(leader('Q27', 'Enda Kenny').end, '2017-06-14');
});

test('Japan\'s MacArthur, Iceland\'s Gröndal and Saudi Arabia\'s kings are named and linked by their articles (27 November 2026)', () => {
  const mac = countries.Q17.leaders.find(l => l.start === '1945-09-02');
  assert.deepEqual([mac.full, mac.url, mac.end, mac.entry], ['Douglas MacArthur', W('Douglas MacArthur'), '1951-04-11', 'Foreign Imposition']);
  assert.ok(countries.Q17.events.some(e => e.date === '1945-09-02' && e.text === 'Douglas MacArthur takes power (imposed by a foreign power)' && e.url === W('Douglas MacArthur')));
  assert.ok(!JSON.stringify(countries.Q17).includes('Service_summary'));
  const gr = countries.Q189.leaders.find(l => l.start === '1979-10-15');
  assert.deepEqual([gr.name, gr.full, gr.url, gr.source], ['Gröndal', 'Benedikt Gröndal', W('Benedikt Gröndal (born 1924)'), 'Wikidata']);
  assert.ok(!Object.values(countries).some(c => c.leaders.some(l => l.name === 'Groendal')));
  const sa = countries.Q851;
  assert.deepEqual(sa.offices.filter(o => o.office === 'hos').map(o => o.full),
    ['Ibn Saud', 'Ibn Saud', 'Saud of Saudi Arabia', 'Faisal of Saudi Arabia', 'Khalid of Saudi Arabia', 'Fahd of Saudi Arabia', 'Abdullah of Saudi Arabia', 'Salman of Saudi Arabia']);
  assert.deepEqual(sa.leaders.map(l => l.name), ['Ibn Saud', 'Saud', 'Faisal', 'Khalid', 'Fahd', 'Abdullah', 'Salman']);
  assert.ok(!JSON.stringify(sa).includes('bin Abdulaziz Al Saud'), 'no long form left');
  // Abdullah keeps Archigos's start, 1 January 1996, the day his article's infobox makes him regent.
  assert.deepEqual([leader('Q851', 'Abdullah of Saudi Arabia').start, leader('Q851', 'Abdullah of Saudi Arabia').source], ['1996-01-01', 'Archigos']);
});

test('Mexico: Echeverría and Calderón end on 30 November, and Calderón stays in the head-of-state lane after a rebuild (27 November 2026)', async () => {
  assert.equal(leader('Q96', 'Luis Echeverría').end, '1976-11-30');
  assert.equal(leader('Q96', 'Felipe Calderón').end, '2012-11-30');
  const o = countries.Q96.offices.filter(x => x.office === 'hos' && x.full === 'Felipe Calderón');
  assert.deepEqual(o.map(x => [x.start, x.end, x.source]), [['2006-12-01', '2012-11-30', 'reigns']]);
  assert.match(o[0].sourceNote, /English and Spanish Wikipedia articles/);
  // The end edit keeps his leader record as Archigos's in a rebuild (wikidata-leaders.mjs), which is not drawn: the
  // head-of-state term still draws him.
  const { buildModel } = await import('../lanes.js');
  const c = structuredClone(countries.Q96);
  for (const l of c.leaders) if (l.full === 'Felipe Calderón') l.source = 'Archigos';
  const m = buildModel(c, 'Q96', { firstYear: 1926, lastYear: 2026, today: '2026-11-27', links: [] });
  const t = m.lanes.state.terms.filter(x => x.full === 'Felipe Calderón');
  assert.deepEqual(t.map(x => [x.kind, x.start, x.end]), [['office', '2006-12-01', '2012-11-30']]);
});

test('Kosovo: Haxhiu\'s acting term ends on 7 October 2026 and its source says why (27 November 2026)', () => {
  const o = countries.Q1246.offices.find(x => x.office === 'hos' && x.full === 'Albulena Haxhiu');
  assert.deepEqual([o.start, o.end, o.source], ['2026-04-04', '2026-10-07', 'corrections']);
  assert.match(o.sourceNote, /head of state \(P35\)/);
  assert.match(o.sourceNote, /Office of the President of Kosovo/);
  assert.match(text('scripts/leader-corrections.mjs'), /post 194879/);
});

// The fixer's pass (27 November 2026), answering the three readers of the free-sources build. Each test fails if its
// change is undone.
test('GAP_FIXES names and links hold: Armenia, Azerbaijan, Belarus, China, Costa Rica, Honduras, Switzerland, Albania', () => {
  const at = (key, start) => countries[key].leaders.find(l => l.start === start);
  const rows = [
    ['Q399', '2008-04-09', 'Sargsyan', 'Serzh Sargsyan', 'Serzh Sargsyan'],
    ['Q227', '1992-05-19', 'Gambar', 'Isa Gambar', 'Isa Gambar'],
    ['Q227', '1992-03-06', 'Mammadov', 'Yagub Mammadov', 'Yagub Mammadov (politician)'],
    ['Q13426199', '1924-11-24', 'Duan Qirui', 'Duan Qirui', 'Duan Qirui'],
    ['Q13426199', '1926-04-21', 'Zhang Zuolin', 'Zhang Zuolin', 'Zhang Zuolin'],
    ['Q800', '2002-05-09', 'Pacheco', 'Abel Pacheco', 'Abel Pacheco'],
    ['Q39', '2003-01-01', 'Couchepin', 'Pascal Couchepin', 'Pascal Couchepin'],
    ['Q39', '2008-01-01', 'Couchepin', 'Pascal Couchepin', 'Pascal Couchepin'],
    ['Q39', '2010-01-01', 'Leuthard', 'Doris Leuthard', 'Doris Leuthard'],
    ['Q39', '2013-01-01', 'Maurer', 'Ueli Maurer', 'Ueli Maurer'],
    ['Q39', '2014-01-01', 'Burkhalter', 'Didier Burkhalter', 'Didier Burkhalter']
  ];
  for (const [key, start, name, full, title] of rows) assert.deepEqual([at(key, start)?.name, at(key, start)?.full, at(key, start)?.url], [name, full, W(title)], `${key} ${start}`);
  // Full name and link only (Archigos's short name kept).
  for (const [key, start, full] of [['Q800', '1994-05-08', 'José María Figueres'], ['Q783', '1998-01-27', 'Carlos Roberto Flores'], ['Q39', '2007-01-01', 'Micheline Calmy-Rey'], ['Q39', '2011-01-01', 'Micheline Calmy-Rey']]) {
    assert.deepEqual([at(key, start)?.full, at(key, start)?.url], [full, W(full)], `${key} ${start}`);
  }
  assert.equal(at('Q184', '1994-01-26').url, W('Vyacheslav Kuznetsov (politician)'));
  // Honduras: Wikidata's label "Carlos Roberto Flor" is cut short; the head-of-government term takes the full name.
  assert.deepEqual(countries.Q783.offices.filter(o => o.start === '1998-01-27').map(o => `${o.office} ${o.full}`).sort(), ['hog Carlos Roberto Flores', 'hos Carlos Roberto Flores']);
  assert.ok(!JSON.stringify(countries).includes('"Carlos Roberto Flor"'));
  assert.deepEqual(countries.Q222.offices.filter(o => o.full === 'Ilir Meta' && o.office === 'hos').map(o => o.end), ['2022-07-24']);
});

// Two people as head of state at once, in the states where heads were added by hand (REIGNS and HOS_GAPS). Only these
// overlaps are meant, each named in its comment: a junta of two (Panama 1968-69), the King and the President of
// Ireland (1938-49), rival authorities in a civil war or occupation (Spain 1936-39, Hungary 1945, Albania 1944,
// China 1928) and Poland's government in exile beside Bierut (1947).
test('no two people are head of state at once where heads were added by hand, but for the overlaps the comments name', () => {
  const found = [];
  for (const [key, c] of Object.entries(countries)) {
    const hos = c.offices.filter(o => o.office === 'hos');
    if (!hos.some(o => o.source === 'reigns')) continue;
    for (let i = 0; i < hos.length; i++) for (let j = i + 1; j < hos.length; j++) {
      const [a, b] = [hos[i], hos[j]];
      if (a.full === b.full || (a.source !== 'reigns' && b.source !== 'reigns')) continue;
      if (a.start < (b.end || '9999') && b.start < (a.end || '9999')) found.push(`${key} ${a.full} / ${b.full}`);
    }
  }
  assert.deepEqual(found.sort(), [
    'Q13426199 Zhang Zuolin / Tan Yankai', 'Q222 Mehdi Frashëri / Omer Nishani', 'Q27 George VI / Douglas Hyde',
    'Q27 George VI / Seán T. O\'Kelly', 'Q28 Ferenc Szálasi / High National Council', 'Q29 Manuel Azaña / Francisco Franco',
    'Q36 Władysław Raczkiewicz / Bolesław Bierut', 'Q804 José María Pinilla Fábrega / Bolívar Urrutia Parrilla'
  ]);
  for (const words of [/two rival authorities/, /Raczkiewicz/]) assert.match(text('scripts/leader-corrections.mjs'), words);
});

test('running the corrections again over the whole data changes nothing', async () => {
  const { applyCorrections } = await import('../scripts/leader-corrections.mjs');
  const again = applyCorrections(structuredClone(countries));
  for (const key of Object.keys(countries)) assert.deepEqual(again[key], countries[key], key);
});

test('the fixer\'s date changes: Ireland, Hungary, Mexico, Bulgaria, France, Andorra and San Marino (27 November 2026)', async () => {
  const hos = (key, full) => countries[key].offices.filter(o => o.office === 'hos' && o.full === full);
  // Ireland: Varadkar's first term as Taoiseach (his Wikidata P39 and English article), with Kenny ending that day.
  const varadkar = countries.Q27.leaders.filter(l => l.full === 'Leo Varadkar').map(l => [l.start, l.end]);
  assert.deepEqual(varadkar, [['2017-06-14', '2020-06-27'], ['2022-12-17', '2024-04-09']]);
  // Hungary: Sulyok to 20 July 2026, Forsthoffer acting from that day (not 20 June).
  assert.deepEqual(hos('Q28', 'Tamás Sulyok').map(o => [o.start, o.end]), [['2024-03-05', '2026-07-20']]);
  assert.deepEqual(hos('Q28', 'Ágnes Forsthoffer').map(o => [o.start, o.end]), [['2026-07-20', '2026-08-19']]);
  // Mexico: Echeverría and Fox to the day in the head-of-state lane, not to the year.
  for (const [full, s, e] of [['Luis Echeverría', '1970-12-01', '1976-11-30'], ['Vicente Fox', '2000-12-01', '2006-11-30']]) {
    const [o] = hos('Q96', full);
    assert.deepEqual([o.start, o.end, o.startPrecision, o.endPrecision], [s, e, 'day', 'day'], full);
    assert.match(o.sourceNote, /Wikipedia|Wikidata/, full);
  }
  // Bulgaria: July 1971 to the month, as the free sources give 6, 7, 8 and 9 July.
  assert.deepEqual(hos('Q219', 'Georgi Traykov').map(o => [o.end, o.endPrecision]), [['1971-07-01', 'month']]);
  assert.deepEqual(hos('Q219', 'Todor Zhivkov').map(o => [o.start, o.startPrecision]), [['1971-07-01', 'month']]);
  // France: Blum between Bidault and Auriol, in the head-of-state lane as among Andorra's Co-Princes, and the lane
  // draws Bidault's office term, not his leader record, to 16 December 1946.
  assert.deepEqual(hos('Q142', 'Léon Blum').map(o => [o.start, o.end]), [['1946-12-16', '1947-01-16']]);
  assert.deepEqual(hos('Q228', 'Léon Blum').map(o => [o.start, o.end]), [['1946-12-16', '1947-01-16']]);
  const { buildModel } = await import('../lanes.js');
  const m = buildModel(countries.Q142, 'Q142', { firstYear: 1926, lastYear: 2026, today: '2026-11-27', links: [] });
  const state = m.lanes.state.terms.filter(t => t.start >= '1946-06-01' && t.start <= '1947-01-16').map(t => `${t.full} ${t.start} ${t.end} ${t.kind}`);
  assert.deepEqual(state, ['Georges Bidault 1946-06-24 1946-12-16 office', 'Léon Blum 1946-12-16 1947-01-16 office', 'Vincent Auriol 1947-01-16 1954-01-16 office']);
  // Andorra's Bishops, dated by the see: Guitart to 30 January 1940, Fornesa from February 1940 (day not confirmed),
  // Iglesias from 4 April 1943.
  assert.deepEqual(hos('Q228', 'Justí Guitart i Vilardebó').map(o => o.end), ['1940-01-30']);
  assert.deepEqual(hos('Q228', 'Ricard Fornesa i Puigdemasa').map(o => [o.start, o.startPrecision, o.end]), [['1940-02-01', 'month', '1943-04-04']]);
  assert.deepEqual(hos('Q228', 'Ramón Iglesias i Navarri').map(o => [o.start, o.end]), [['1943-04-04', '1969-04-29']]);
  // San Marino: the provisional government of four from 1 October 1957, as the official acts date it.
  const sm = countries.Q238.leaders.filter(l => l.start === '1957-10-01').map(l => l.full).sort();
  assert.deepEqual(sm, ['Alvaro Casali', 'Federico Bigi', 'Pietro Giancecchi', 'Zaccaria Giovanni Savoretti']);
  assert.deepEqual(countries.Q238.leaders.filter(l => l.start === '1957-04-01').map(l => `${l.full} ${l.end}`).sort(), ['Giordano Giacomini 1957-10-01', 'Primo Marani 1957-10-01']);
});
