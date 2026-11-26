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
  for (const words of ['Portugal 1998', 'Kosovo 2025 and 2026']) assert.ok(span.includes(words), words);
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
    ['Saud of Saudi Arabia', '1953-10-09', '1954-08-16'],
    ['King Faisal bin Abdulaziz Al Saud', '1954-08-16', '1960-12-21'],
    ['Saud of Saudi Arabia', '1960-12-21', '1962-10-31'],
    ['King Faisal bin Abdulaziz Al Saud', '1962-10-31', '1975-03-25'],
    ['Khalid of Saudi Arabia', '1975-03-25', '1982-06-13'],
    ['Fahd bin Abdulaziz Al Saud', '1982-06-13', '2005-08-01'],
    ['Abdullah of Saudi Arabia', '2005-08-01', '2015-01-23'],
    ['Salman bin Abdulaziz Al Saud', '2015-01-23', '2022-09-27'],
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
  for (const key of ['Q96', 'Q20', 'Q35', 'Q851', 'Q145', 'Q17', 'Q27', 'Q786', 'Q45']) {
    const c = structuredClone(countries[key]);
    correctCountry(key, c);
    assert.deepEqual(c, countries[key], key);
  }
});

// D8. rulers.org is the work of B. Schemmel (the site names its author; English Wikipedia cites it as "rulers.org.
// B. Schemmel"); Ben Cahoon runs worldstatesmen.org, a different site.
test('the footer credits rulers.org to B. Schemmel (D8)', () => {
  const html = text('index.html');
  assert.match(html, /<a href="https:\/\/www\.rulers\.org">rulers\.org<\/a> by B\. Schemmel/);
  assert.doesNotMatch(html, /Cahoon/);
  // And so does every source line the page writes for VM's own lists (fixer, 26 November 2026).
  const app = text('app.js');
  assert.ok(app.includes('rulers.org (B. Schemmel)'));
  assert.deepEqual(app.match(/rulers\.org(?! \(B\. Schemmel\))/g), null);
});

// D9. The comment at the head of election-corrections.mjs no longer counts "six entries".
test('the election corrections\' opening comment does not count its entries (D9)', () => {
  const head = text('scripts/election-corrections.mjs').split('\nimport ')[0];
  assert.doesNotMatch(head, /\bsix entries\b/);
  assert.match(head, /26 November 2026/);
});
