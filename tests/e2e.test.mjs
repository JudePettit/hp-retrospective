// End-to-end tests for Political Retrospective (PRP, Retrospective Intelligence) (installed Edge via playwright-core).
//   RETRO_URL=https://hp-retrospective.pages.dev node --test tests/e2e.test.mjs
// JDPI_URL (by default https://jdpi.pages.dev) is the jdpi site whose period control this page's copy must match.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = (process.env.RETRO_URL || 'http://localhost:8095').replace(/\/$/, '');
const JDPI = (process.env.JDPI_URL || 'https://jdpi.pages.dev').replace(/\/$/, '');
let browser, page;
const errors = [];

async function open(hash) {
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('path.shape').length > 50, null, { timeout: 30000 });
}

before(async () => {
  browser = await chromium.launch({ channel: 'msedge' });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page.on('pageerror', e => errors.push(e.message));
});
after(async () => { await browser?.close(); });

test('loads with data and no script errors', async () => {
  await open('');
  assert.match(await page.textContent('#status'), /79 countries/);
  assert.match(await page.textContent('#status'), /1926–present/);
  // With no year in the address the map opens on its last two years (the next test).
  assert.equal(await page.textContent('#year-big'), `${new Date().getUTCFullYear() - 1}–${new Date().getUTCFullYear()}`);
  assert.deepEqual(errors, []);
});

// Review of 12 November 2026: the status line's coverage (every country over all the years) and a year's count of
// covered states differed with no word why. Beside the year's count the panel and the table now say how many of the
// whole coverage existed as states that year and why the rest are missing, worked out from the data.
test('a year\'s count of states says how it differs from the coverage over all the years', async () => {
  await open('#y=1950');
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const total = Object.keys(data.countries).length;
  // The reason is worked out per country: a country with no border in CShapes at all (Monaco, San Marino, six Caribbean
  // islands) is never described as "not independent" (the second reader of 14 November 2026 found it was).
  const topo = JSON.parse(readFileSync(new URL('../data/borders.topo.json', import.meta.url), 'utf8'));
  const drawn = new Set(topo.objects.borders.geometries.map(g => g.properties.gw));
  const noBorder = Object.entries(data.countries).filter(([gw]) => !drawn.has(+gw)).map(([, c]) => c.name);
  assert.ok(noBorder.length > 1, 'some covered countries have no border in CShapes');
  const sub = await page.textContent('#panel .sub');
  const head = sub.match(/^(\d+) of the (\d+) countries covered over the years are on the map at the end of 1950\./);
  const nb = sub.match(/ (\d+) have no border in CShapes 2\.0, so the map does not draw them in any year: ([^.]+)\./);
  const other = sub.match(/ The other (\d+) were not independent states then: (.+)\.$/);
  assert.ok(head && nb && other, sub);
  assert.equal(+head[2], total);
  assert.equal(+nb[1], noBorder.length);
  for (const name of noBorder) {
    assert.ok(nb[2].includes(name), `${name} is named among the countries with no border`);
    assert.ok(!other[0].includes(name), `${name} is not called "not independent"`);
  }
  assert.equal(+head[1] + +nb[1] + +other[1], total, sub);
  // "14 not yet, 1 no longer and 3 between two spells of independence" in 1950: the kinds add up to the other count.
  assert.equal([...other[2].matchAll(/(\d+) (not yet|no longer|between two spells of independence)/g)].reduce((s, x) => s + +x[1], 0), +other[1], other[2]);
  assert.match(other[2], /between two spells of independence/, 'the Baltic states in 1950');
  assert.match(await page.textContent('#status'), new RegExp(`${total} countries over all the years`));
  await page.click('#tab-table');
  await page.waitForSelector('#year-table tbody tr');
  assert.match(await page.textContent('#table-caption'), new RegExp(`^${head[1]} of the ${total} countries covered over the years`));
  assert.match(await page.textContent('#table-caption'), new RegExp(`For each of the ${head[1]} on the map:`));
  assert.equal(await page.locator('#year-table tbody tr').count(), +head[1], 'the table lists exactly the states the note counts');
  await page.click('#tab-map');
});

// Correction RT-02 (15 November 2026): the leader lists of nine countries stopped years ago (Archigos ends in 2015 and
// Wikidata did not always continue it), so National Analysis showed a past leader as current. Every state that still
// exists must have a list whose latest leader is still in office and named; a leader carried over from Archigos
// (whose data ends in 2015) must be one known to be still in office; a state with no list at all is named here.
test('every existing state\'s leader list reaches the present', () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const shapes = JSON.parse(readFileSync(new URL('../data/borders.topo.json', import.meta.url), 'utf8')).objects.borders.geometries;
  const drawn = new Set(shapes.map(g => g.properties.gw)), current = new Set(shapes.filter(g => g.properties.e === '9999-12-31').map(g => g.properties.gw));
  // Since RT-04 (16 November 2026) every state has a list: Montenegro and the ten microstates, which Archigos does not
  // cover, were built by hand (the test below).
  const NO_LIST = [];
  // Archigos records still open at its last day whose holder was still in office in November 2026.
  const STILL_IN_OFFICE = { Nicaragua: 'Daniel Ortega', Albania: 'Edi Rama', 'Soviet Union / Russia': 'Vladimir Putin', Azerbaijan: 'Ilham Aliyev', 'Saudi Arabia': 'Salman of Saudi Arabia', China: 'Xi Jinping' };
  const problems = [], empty = [];
  for (const [gw, c] of Object.entries(data.countries)) {
    if (drawn.has(+gw) && !current.has(+gw)) continue; // a state that no longer exists (Weimar and Nazi Germany, East Germany, Czechoslovakia)
    const last = [...c.leaders].sort((a, b) => a.start.localeCompare(b.start)).at(-1);
    if (!last) { empty.push(c.name); continue; }
    const who = last.full || last.name;
    if (last.end) problems.push(`${c.name}: the list ends with ${who}, out of office since ${last.end}`);
    else if (!/\p{L}/u.test(who)) problems.push(`${c.name}: the current leader's name is "${who}"`);
    else if (last.source === 'Archigos' && STILL_IN_OFFICE[c.name] !== who) problems.push(`${c.name}: ${who} (Archigos, from ${last.start}) is not known to be still in office`);
  }
  assert.deepEqual(problems, []);
  assert.deepEqual(empty.sort(), [...NO_LIST].sort(), 'the states with no leader list');
});

// RT-04 (Jude, 15 November 2026: "Add this to the queue of tasks"): Montenegro and the ten microstates had no leader
// list, because Archigos has no record of them. Each now has a dated list, built by hand in scripts/leader-lists.mjs
// from Wikidata, Wikipedia and rulers.org, from the state's first day (independence, or 1926 for the four European
// microstates; Montenegro from its first day on the map) to the present, with no gap or overlap beyond those named here.
const RT04 = { 54: '1978-11-03', 55: '1974-02-07', 56: '1979-02-22', 57: '1979-10-27', 58: '1981-11-01', 60: '1983-09-19', 221: '1926-01-01', 223: '1926-01-01', 232: '1926-01-01', 331: '1926-01-01', 341: null };
test('Montenegro and the ten microstates have dated leader lists from their start to the present (RT-04)', () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const shapes = JSON.parse(readFileSync(new URL('../data/borders.topo.json', import.meta.url), 'utf8')).objects.borders.geometries;
  // Montenegro starts on its first day on the map (CShapes: 12 June 2006); the ten microstates have no border in CShapes,
  // so their start is Gleditsch and Ward's (independence, or 1926 for those independent since before it).
  const startOf = gw => RT04[gw] || shapes.filter(g => g.properties.gw === +gw).map(g => g.properties.s).sort()[0];
  // Gaps of more than a day between two leaders that the sources show (the office was empty, or the next holder took
  // office later): the start date of the leader after the gap.
  // Andorra 1933: the General Council was dismissed and Pallarès left for exile on 19 August; the next Syndic was chosen
  // on 18 September (rulers.org).
  const GAPS = { 54: ['1979-06-25'], 232: ['1933-09-18', '1982-01-08'] };
  // San Marino has two Captains Regent at a time, except while one who died in 1930 was not yet replaced, and while the
  // provisional government of four held power in October 1957: the number in office on these days.
  const SAN_MARINO = { '1930-09-10': 1, '1957-10-11': 4 };
  const day = d => Date.parse(`${d}T00:00:00Z`) / 864e5;
  const ENTRY = [null, 'Regular', 'Irregular', 'Foreign Imposition'];
  const EXIT = [null, 'Regular', 'Natural Death', 'Irregular', 'Retired Due to Ill Health', 'Foreign', 'Suicide'];
  const DATE = /^\d{4}-\d\d-\d\d$/, QID = /^Q[1-9]\d*$/, letters = s => /\p{L}/u.test(s || '');
  const problems = [];
  for (const gw of Object.keys(RT04)) {
    const c = data.countries[gw], start = startOf(gw), say = m => problems.push(`${c.name}: ${m}`);
    const list = [...c.leaders].sort((a, b) => a.start.localeCompare(b.start));
    if (!list.length) { say('no leader list'); continue; }
    if (!(list[0].start <= start && (!list[0].end || list[0].end >= start))) say(`the first leader (${list[0].full}, from ${list[0].start}) is not in office on ${start}`);
    for (const l of list) {
      const who = `${l.full} (from ${l.start})`;
      if (!DATE.test(l.start) || (l.end !== null && !DATE.test(l.end))) say(`${who}: dates ${l.start} to ${l.end}`);
      if (l.end && l.end < l.start) say(`${who}: ends before it starts`);
      if (!letters(l.full) || !letters(l.name)) say(`${who}: name "${l.name}"`);
      // A person Wikidata has no item for is allowed only with the reason written beside them.
      if (!QID.test(l.qid || '') && !(l.qid === null && letters(l.noQid))) say(`${who}: Wikidata id ${l.qid}`);
      if (l.url !== null && !/^https:\/\/en\.wikipedia\.org\/wiki\/./.test(l.url)) say(`${who}: link ${l.url}`);
      if (!ENTRY.includes(l.entry) || !EXIT.includes(l.exit)) say(`${who}: entry ${l.entry}, exit ${l.exit}`);
    }
    if (gw === '331') {
      // On every day a Captain Regent came or went, two are in office (or the number named above), and the list ends
      // with a pair in office.
      const days = [...new Set(list.flatMap(l => [l.start, l.end]).filter(Boolean))].sort();
      for (const d of days) {
        const n = list.filter(l => l.start <= d && (!l.end || l.end > d)).length;
        if (n !== (SAN_MARINO[d] || 2)) say(`${n} Captains Regent in office on ${d}`);
      }
      if (list.filter(l => !l.end).length !== 2) say('not two Captains Regent in office today');
      continue;
    }
    // Entries with the same start and end form one term of one person.
    const terms = list.map(l => ({ start: l.start, end: l.end, people: [l.full] }));
    terms.forEach((t, i) => {
      if (i < terms.length - 1 && !t.end) say(`${t.people.join(' and ')} (from ${t.start}) has no end but is followed by others`);
      if (!i) return;
      const gap = day(t.start) - day(terms[i - 1].end);
      if (gap < 0) say(`${t.people.join(' and ')} (from ${t.start}) overlaps the term before, which ends ${terms[i - 1].end}`);
      else if (gap > 1 && !(GAPS[gw] || []).includes(t.start)) say(`a gap of ${gap} days before ${t.people.join(' and ')} (from ${t.start})`);
    });
    if (terms.at(-1).end) say(`the list ends on ${terms.at(-1).end}`);
    // The other office ("Also in office"), replaced for these states from the same sources.
    for (const o of c.offices) {
      if (!['hos', 'hog'].includes(o.office) || !DATE.test(o.start) || (o.end && (!DATE.test(o.end) || o.end < o.start)) || !letters(o.full) || !QID.test(o.qid || '')) say(`office ${JSON.stringify(o)}`);
    }
    if (!c.offices.length) say('nobody under "Also in office"');
  }
  assert.deepEqual(problems, []);
  // Spot checks against the sources (Wikipedia's lists of office holders and rulers.org).
  const at = (gw, date) => data.countries[gw].leaders.filter(l => l.start <= date && (!l.end || l.end > date)).map(l => l.full);
  assert.deepEqual(at(341, '2026-11-16'), ['Milojko Spajić']);
  assert.deepEqual(at(55, '1983-10-17'), ['Bernard Coard']);
  assert.deepEqual(at(54, '2004-01-07'), ['Osborne Riviere']);
  assert.deepEqual(at(221, '1960-01-01'), ['Rainier III']);
  assert.deepEqual(at(232, '1950-01-01'), ['Francesc Cairat Freixes']);
  assert.deepEqual(at(223, '1990-01-01'), ['Hans-Adam II']);
  assert.deepEqual(at(331, '1957-10-20').sort(), ['Alvaro Casali', 'Federico Bigi', 'Pietro Giancecchi', 'Zaccaria Giovanni Savoretti']);
  assert.deepEqual(at(331, '2020-06-01').sort(), ['Alessandro Mancini', 'Grazia Zafferani']);
  const grenada = Object.fromEntries(data.countries[55].leaders.map(l => [l.full, l]));
  for (const who of ['Maurice Bishop', 'Bernard Coard', 'Hudson Austin']) assert.equal(grenada[who].entry, 'Irregular', who);
});

// RT-04's second readers (16 November 2026) checked the lists against other sources; each correction they found real is
// held here, with the source it follows.
test('the RT-04 lists follow the sources the second readers checked', () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const on = (l, date) => l.start <= date && (!l.end || l.end > date);
  const at = (gw, date) => data.countries[gw].leaders.filter(l => on(l, date)).map(l => l.full);
  const office = (gw, kind, date) => data.countries[gw].offices.filter(o => o.office === kind && on(o, date)).map(o => o.full);
  const find = (gw, full, start) => data.countries[gw].leaders.find(l => l.full === full && (!start || l.start === start));
  // Montenegro's list starts at independence (3 June 2006, where Wikipedia's list splits Đukanović's term), as Archigos
  // starts Kosovo, Czechia and Slovakia, so no Montenegro event falls in its years inside Serbia and Montenegro.
  assert.equal([...data.countries[341].leaders].sort((a, b) => a.start.localeCompare(b.start))[0].start, '2006-06-03');
  assert.deepEqual(data.countries[341].events.filter(e => e.date < '2006-06-03'), []);
  assert.deepEqual(office(341, 'hos', '2006-06-03'), ['Filip Vujanović']);
  assert.deepEqual(office(341, 'hos', '2006-06-02'), []);
  // Saint Lucia: King acted for the ailing Compton from 1 May 2007 (Wikidata, rulers.org, his own article), as Archigos
  // dates Olmert from Sharon's stroke.
  assert.deepEqual(at(56, '2007-06-01'), ['Stephenson King']);
  assert.equal(find(56, 'John Compton', '2006-12-15').exit, 'Retired Due to Ill Health');
  // Grenada: Brathwaite's Interim Advisory Council of 1983-84 was non-party (Wikipedia's list: independent); the
  // National Democratic Congress was founded in 1987.
  assert.equal(find(55, 'Nicholas Brathwaite', '1983-12-09').parties, undefined);
  // Saint Kitts and Nevis: Douglas was sworn in on 4 July 1995 (the government's biography, his office's 2012 release,
  // rulers.org).
  assert.deepEqual(at(60, '1995-07-05'), ['Denzil Douglas']);
  // Liechtenstein: Franz Joseph's regency began on 30 March 1938 (the national historical lexicon, rulers.org); Schädler's
  // government resigned on 15 June 1928 and Prince Alfred ran the government from 24 June (the lexicon).
  assert.deepEqual(at(223, '1938-03-30'), ['Franz Joseph II']);
  assert.deepEqual(office(223, 'hog', '1928-06-20'), []);
  assert.deepEqual(office(223, 'hog', '1928-06-24'), ['Prince Alfred of Liechtenstein']);
  assert.deepEqual(office(223, 'hog', '1928-06-14'), ['Gustav Schädler']);
  // Monaco: Piette's resignation was accepted on 15 January 1932 and Bouilloux-Lafont's mission ended on 31 May 1937
  // (Sovereign Ordinances 1277, 1278 and 2012, Journal de Monaco). Its Ministers of State are appointed officials, and
  // Dominica's acting President of 1979-80 sat for no party: none carries a party.
  assert.deepEqual(office(221, 'hog', '1932-01-14'), ['Maurice Piette']);
  assert.deepEqual(office(221, 'hog', '1937-05-30'), ['Maurice Bouilloux-Lafont']);
  assert.deepEqual(data.countries[221].offices.filter(o => o.parties), []);
  assert.deepEqual(data.countries[54].offices.filter(o => o.full === 'Jenner Armour' && o.parties), []);
  // Andorra: the General Council's own index of office holders and rulers.org name two Syndics Font Altimir and Molné
  // Armengol; Pallarès left on 19 August 1933; the Bishop Co-Prince Iglesias resigned on 29 April 1969 (Catalan
  // Wikipedia, Wikidata) and Malla acted from 19 June (Catalan Wikipedia, rulers.org).
  assert.deepEqual(at(232, '1925-01-01'), ['Pere Font Altimir']);
  assert.equal(find(232, 'Pere Font Altimir').name, 'Font');
  assert.deepEqual(at(232, '1936-08-01'), ['Francesc Molné Armengol']);
  assert.deepEqual(at(232, '1933-09-01'), []);
  assert.deepEqual(office(232, 'hos', '1969-05-15').filter(n => !/de Gaulle|Poher|Pompidou/.test(n)), []);
  assert.ok(data.countries[232].offices.some(o => o.full === 'Ramón Iglesias i Navarri' && o.end === '1969-04-29'));
  assert.ok(data.countries[232].offices.some(o => o.full === 'Ramón Malla Call' && o.start === '1969-06-19'));
  // San Marino: the sources say only that Lonfernini died in 1930, not how; compound family names are kept whole.
  assert.equal(find(331, 'Marino Lonfernini').exit, null);
  const family = Object.fromEntries(data.countries[331].leaders.map(l => [l.full, l.name]));
  for (const [full, name] of [['Domenico Suzzi Valli', 'Suzzi Valli'], ['Leonida Suzzi Valli', 'Suzzi Valli'], ['Angelo Manzoni Borghesi', 'Manzoni Borghesi'], ['Bartolomeo Manzoni Borghesi', 'Manzoni Borghesi'], ['Federico Pedini Amati', 'Pedini Amati'], ['Marino Valdes Franciosi', 'Franciosi']]) assert.equal(family[full], name, full);
});

// Small corrections (17 November 2026): three election dates from the Wikidata election fetch were wrong or missing for
// the states RT-04 added (scripts/election-corrections.mjs gives the sources). Saint Vincent's 2025 election was held on
// 27 November (Wikidata still gives the forecast 30 November); Grenada's 2026 election on 5 November 2026 (the cached
// fetch gave 30 June 2027); Grenada's 1967 election, which Wikidata files under Spain, was missing from Grenada, and its
// 2003 election showed under Spain too.
test('the election dates of Saint Vincent 2025 and Grenada 1967 and 2026 follow their sources, and none is filed under Spain', async () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const vote = (gw, title) => data.countries[gw].events.filter(e => e.type === 'election' && e.text === title).map(e => e.date);
  assert.deepEqual(vote(57, '2025 Vincentian general election'), ['2025-11-27']);
  assert.deepEqual(vote(55, '2026 Grenadian general election'), ['2026-11-05']);
  assert.deepEqual(vote(55, '1967 Grenadian general election'), ['1967-08-24']);
  assert.deepEqual(vote(55, '2003 Grenadian general election'), ['2003-11-27']);
  assert.deepEqual(data.countries[230].events.filter(e => /Grenad/.test(e.text)), [], 'no Grenadian election under Spain');
  const shown = async hash => {
    await open(hash);
    return page.$$eval('#panel .events li[data-type="election"]', els => els.map(e => `${e.querySelector('time').firstChild.textContent} ${e.querySelector('a').textContent}`));
  };
  assert.ok((await shown('#y=2025&c=57')).includes('27 Nov 2025 2025 Vincentian general election'));
  assert.ok((await shown('#y=2026&c=55')).includes('5 Nov 2026 2026 Grenadian general election'));
  assert.ok((await shown('#y=1967&c=55')).includes('24 Aug 1967 1967 Grenadian general election'));
  assert.deepEqual((await shown('#y=1967&c=230')).filter(t => /Grenad/.test(t)), []);
  assert.deepEqual(errors, []);
});

// Jude, 14 November 2026: "The sliders on the maps currently start off as overlayed on one another. They should start
// off one apart so both are visible when you first open the map." With no year in the address the map opens with the
// start one year before the end, on the last two years, shown as any period is; an address naming one year keeps it.
test('opened with no year, the handles stand one year apart and the map shows the last two years as a period', async () => {
  const y = new Date().getUTCFullYear();
  const handles = () => page.evaluate(() => {
    const el = document.querySelector('#period'), t = parseFloat(getComputedStyle(el).getPropertyValue('--prp-period-thumb')) || 16;
    const at = i => { const r = i.getBoundingClientRect(); return r.left + t / 2 + ((+i.value - +i.min) / Math.max(1, +i.max - +i.min)) * (r.width - t); };
    const f = el.querySelector('#from'), to = el.querySelector('#year');
    return { from: f.dataset.value, to: to.dataset.value, apart: at(to) - at(f) > 0, joined: el.querySelector('.prp-period-range').classList.contains('joined') };
  });
  await open('');
  assert.deepEqual(await handles(), { from: String(y - 1), to: String(y), apart: true, joined: false });
  assert.equal(await page.textContent('#year-big'), `${y - 1}–${y}`);
  assert.equal(await page.textContent('#year-label'), 'Period');
  assert.equal(await page.textContent('#legend-title'), 'In the period');
  assert.equal(new URL(page.url()).hash, '', 'opening writes nothing to the address');
  // The start moved a year further back: the address carries the period.
  await page.locator('#from').focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.textContent('#year-big'), `${y - 2}–${y}`);
  assert.match(page.url(), new RegExp(`#y=${y}&f=${y - 2}$`));
  // An address that names one year keeps it: the handles together, as before.
  await open(`#y=${y}`);
  assert.deepEqual(await handles(), { from: String(y), to: String(y), apart: false, joined: true });
  assert.equal(await page.textContent('#year-big'), String(y));
  assert.deepEqual(errors, []);
});

// Play from that opening runs through the years from 1926, as play from the single last year did, not one step.
test('play from the opening travels through the years from the first, one year at a time', async () => {
  const y = new Date().getUTCFullYear();
  await open('');
  await page.click('#play');
  assert.equal(await page.getAttribute('#play', 'aria-label'), 'Pause');
  // The end runs on past the first year, the start with it (one year, travelling).
  await page.waitForFunction(() => { const f = document.querySelector('#from'), t = document.querySelector('#year'); return +t.dataset.value > 1926 && f.dataset.value === t.dataset.value; }, null, { timeout: 8000 });
  await page.click('#play');
  const at = await page.evaluate(() => [document.querySelector('#from').dataset.value, document.querySelector('#year').dataset.value].map(Number));
  assert.ok(at[0] === at[1] && at[1] > 1926 && at[1] < y - 1, JSON.stringify(at));
  assert.equal(await page.getAttribute('#play', 'aria-label'), 'Play through the years');
  assert.deepEqual(errors, []);
});

test('the slider redraws borders and the year summary', async () => {
  await open('#y=1950');
  const before1950 = await page.locator('path.shape').count();
  assert.equal(await page.textContent('#panel h2'), '1950');
  await page.locator('#year').fill('1990');
  await page.locator('#year').dispatchEvent('input');
  assert.equal(await page.textContent('#year-big'), '1990');
  assert.equal(await page.textContent('#panel h2'), '1990');
  // 1990 and 1950 show different sets of states (e.g. two Germanys vs one).
  await page.locator('#year').fill('1995');
  await page.locator('#year').dispatchEvent('input');
  assert.notEqual(await page.locator('path.shape').count(), before1950);
  assert.match(page.url(), /#y=1995/);
});

test('a period of years: the panels and the address follow it; the handles close it onto one year and open it again', async () => {
  await open('#y=1945&f=1938&c=255');
  assert.equal(await page.textContent('#year-big'), '1938–1945');
  assert.equal(await page.textContent('#year-label'), 'Period');
  assert.equal(await page.textContent('#legend-title'), 'In the period');
  assert.match(await page.textContent('.overview'), /2 leaders between 1938 and 1945/);
  assert.match(await page.textContent('#panel'), /In charge during 1938–1945/);
  assert.match(await page.textContent('#animate'), /1938–1945 border changes/);
  // The end handle pulled back onto the start: one year again, and no f in the address.
  await page.locator('#year').fill('1938');
  await page.locator('#year').dispatchEvent('input');
  assert.equal(await page.textContent('#year-big'), '1938');
  assert.match(page.url(), /#y=1938&c=255$/);
  // The start handle pulled back from one year opens a period.
  await page.locator('#from').fill('1930');
  await page.locator('#from').dispatchEvent('input');
  assert.equal(await page.textContent('#year-big'), '1930–1938');
  assert.match(page.url(), /#y=1938&f=1930&c=255$/);
});

// A real pointer, as a reader drags: fill() above cannot see a layout that changes under the pointer mid-drag. The badge
// beside the track once grew as the period opened ("Year 1990" to "Period 1989–1990"), so the track shrank under the
// pointer, the start handle jumped back and forth, and the end year moved with it.
test('dragging the start handle with the pointer opens a period and leaves the end year where it was', async () => {
  await open('#y=1990');
  await page.waitForSelector('.jdpi-returnbar', { timeout: 15000 }); // prp-bar.js adds it after load, moving the page down
  await page.evaluate(() => document.fonts.ready);
  // The start handle's thumb, resting on the end: a thumb's centre runs from half a thumb in from each end of its input.
  const at = await page.locator('#from').evaluate(e => {
    const r = e.getBoundingClientRect(), t = parseFloat(getComputedStyle(e.closest('.prp-period')).getPropertyValue('--prp-period-thumb')) || 16;
    return { x: r.left + t / 2 + ((+e.value - +e.min) / Math.max(1, +e.max - +e.min)) * (r.width - t), y: r.top + r.height / 2 };
  });
  const starts = [], ends = [];
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) { // 60px back, 6px at a time
    await page.mouse.move(at.x - 6 * k, at.y);
    starts.push(+(await page.locator('#from').getAttribute('data-value')));
    ends.push(await page.locator('#year').getAttribute('data-value'));
  }
  await page.mouse.up();
  assert.deepEqual([...new Set(ends)], ['1990'], `the end handle stays on 1990: ${ends.join(' ')}`);
  assert.ok(starts.every((y, k) => y <= (k ? starts[k - 1] : 1990)), `the start only moves back: ${starts.join(' ')}`);
  assert.ok(starts.at(-1) < 1990, `a period opened: ${starts.at(-1)}`);
  assert.equal(await page.textContent('#year-big'), `${starts.at(-1)}–1990`);
  assert.match(page.url(), new RegExp(`#y=1990&f=${starts.at(-1)}$`));
});

// The period control is a copy of jdpi's: prp-period.js, less its two-line header, and in styles.css the "Period control"
// section of design/prp.css must be jdpi's as served at JDPI_URL. Until jdpi serves the control there is nothing to
// compare them with, and the test says so (Pages answers a missing file with its home page, so the script is known by
// what it says, not by its status).
test('the period control matches jdpi\'s: the script and its stylesheet section', async t => {
  const fetchText = async path => { const r = await fetch(`${JDPI}/${path}`); return r.ok ? (await r.text()).replace(/\r\n/g, '\n') : ''; };
  const [js, css] = await Promise.all([fetchText('design/prp-period.js'), fetchText('design/prp.css')]);
  const from = css.indexOf('/* --- Period control'), next = css.indexOf('\n/* --- ', from + 1);
  const section = from < 0 ? '' : css.slice(from, next < 0 ? undefined : next).trim();
  if (!js.includes('root.PRPPeriod =') || !section) return t.skip(`${JDPI} does not serve the period control yet`);
  const own = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(own('prp-period.js').split('\n').slice(2).join('\n'), js, 'prp-period.js is jdpi\'s design/prp-period.js');
  assert.ok(own('styles.css').includes(section), 'styles.css carries design/prp.css\'s "Period control" section as it is');
});

test('Germany 1938: leader, events, border changes, links', async () => {
  await open('#y=1938&c=255');
  const panel = await page.textContent('#panel');
  assert.equal(await page.textContent('#panel h2'), 'Germany');
  assert.match(panel, /Adolf Hitler/);
  assert.match(panel, /1938 German parliamentary election and referendum/);
  assert.match(panel, /Germany's borders change/);
  assert.ok(await page.locator('#animate').count(), 'animation button');
  assert.ok(await page.locator('a[href*="wikipedia.org/wiki/1938_in_Germany"]').count(), 'year page link');
  assert.ok(await page.locator('a[href*="wikipedia.org/wiki/Adolf_Hitler"]').count(), 'leader link');
});

test('parties in power and the yearly overview follow the year', async () => {
  await open('#y=2010&c=200');
  await page.waitForSelector('#wiki-events li', { timeout: 15000 });
  const panel = await page.textContent('#panel');
  assert.match(panel, /Parties in power in 2010/);
  assert.match(panel, /Conservative Party/);
  assert.match(panel, /Labour Party/); // Brown until May, then Cameron
  assert.match(await page.textContent('.overview'), /2 leaders in 2010/);
  assert.ok(await page.locator('#wiki-events a[href*="2010_in_the_United_Kingdom"]').count(), 'Wikipedia source link');
});

test('GIF download produces an animated GIF', async () => {
  await open('#y=1938&c=255');
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#gif')]);
  assert.match(download.suggestedFilename(), /Germany-1938-borders\.gif/);
  const stream = await download.createReadStream();
  const chunks = []; for await (const c of stream) chunks.push(c);
  const buf = Buffer.concat(chunks);
  assert.equal(buf.subarray(0, 6).toString(), 'GIF89a');
  assert.ok(buf.length > 5000, `GIF is ${buf.length} bytes`);
});

test('border animation steps through the year', async () => {
  await open('#y=1938&c=255');
  await page.click('#animate');
  await page.waitForSelector('#anim-label:not([hidden])');
  const first = await page.textContent('#anim-label');
  await page.waitForFunction(f => document.querySelector('#anim-label').textContent !== f, first, { timeout: 5000 });
  assert.match(first, /1 Jan 1938/);
});

// Jude, 14 November 2026: Russia's border changes zoomed in on Greenland. The Soviet Union / Russia crosses the 180th
// meridian (Chukotka), so its box ran from 20 E to 170 W; the United States and Canada had boxes padded past 180 W.
// The map is not rotated, so each box now stays within -180..180, and Russia's frames its main body. Once it has
// zoomed, the state's own centre (d3.geoCentroid of its shapes on that date) lies in the middle 60% of the map,
// also while its border changes play.
test('choosing a state across or near the 180th meridian zooms onto that state', async () => {
  const where = (gw, date) => page.evaluate(async ([gw, date]) => {
    const svg = document.querySelector('#map'), [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
    const topo = await (await fetch('data/borders.topo.json')).json(), today = new Date().toISOString().slice(0, 10);
    const all = topojson.feature(topo, topo.objects.borders).features, on = d => all.filter(f => f.properties.s <= d && d <= f.properties.e);
    // The projection the page draws with (app.js: fitted to today's states) and its zoom.
    const proj = d3.geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'FeatureCollection', features: on(today) });
    const mine = on(date).filter(f => f.properties.gw === gw);
    const [x, y] = d3.zoomTransform(svg).apply(proj(d3.geoCentroid({ type: 'FeatureCollection', features: mine })));
    return [x / W, y / H];
  }, [gw, date]);
  const inMiddle = ([fx, fy], what) => assert.ok(fx > 0.2 && fx < 0.8 && fy > 0.2 && fy < 0.8, `${what}: the state's centre at ${fx.toFixed(2)}, ${fy.toFixed(2)} of the map`);
  for (const [y, gw] of [[1950, 365], [2000, 365], [2000, 2], [2000, 20]]) {
    await open(`#y=${y}&c=${gw}`);
    await page.waitForTimeout(1200); // the zoom's 700 ms transition
    inMiddle(await where(gw, `${y}-12-31`), `#y=${y}&c=${gw}`);
  }
  await open('#y=1991&c=365');
  if (await page.locator('#animate').count()) {
    await page.click('#animate');
    await page.waitForSelector('#anim-label:not([hidden])');
    await page.waitForTimeout(1200);
    inMiddle(await where(365, '1991-01-01'), 'while Russia\'s border changes play');
  }
  assert.deepEqual(errors, []);
});

test('historical names follow the date', async () => {
  await open('#y=1960&c=365');
  assert.equal(await page.textContent('#panel h2'), 'Soviet Union');
  await open('#y=2000&c=365');
  assert.equal(await page.textContent('#panel h2'), 'Russia');
  await open('#y=1975&c=260');
  assert.equal(await page.textContent('#panel h2'), 'West Germany');
});

test('search finds a leader and jumps to their year', async () => {
  await open('#y=2000');
  await page.fill('#search', 'Churchill');
  await page.waitForSelector('#search-results li');
  await page.press('#search', 'Enter');
  assert.equal(await page.textContent('#year-big'), '1940');
  assert.match(await page.textContent('#panel'), /Winston Churchill/);
});

// RT-04: the panels of Montenegro and the microstates show who was in charge and who else held office. San Marino's two
// Captains Regent of a semester rule together, so the overview joins them with "and"; the ten microstates have no
// border in CShapes, so the panel says that, not that they were not independent.
test('the panels of Montenegro and the microstates name their leaders (RT-04)', async () => {
  const leaders = () => page.$$eval('#panel .leader', els => els.map(e => ({ who: e.querySelector('.who a').textContent, tag: e.querySelector('.tag')?.textContent || '' })));
  await open('#y=2026&c=341');
  let l = await leaders();
  assert.ok(l.some(x => x.who === 'Milojko Spajić' && !x.tag), JSON.stringify(l));
  assert.ok(l.some(x => x.who === 'Jakov Milatović' && x.tag === 'Head of state'), JSON.stringify(l));
  await open('#y=2026&c=223');
  l = await leaders();
  assert.ok(l.some(x => /^Alois/.test(x.who) && !x.tag), JSON.stringify(l));
  assert.ok(l.some(x => x.who === 'Hans-Adam II' && x.tag === 'Head of state'), JSON.stringify(l));
  assert.match(await page.textContent('#panel .sub'), /no border in CShapes/);
  assert.doesNotMatch(await page.textContent('#panel .sub'), /Not an independent state/);
  await open('#y=1983&c=55');
  l = await leaders();
  const inCharge = l.filter(x => x.tag !== 'Head of state' && x.tag !== 'Head of government').map(x => x.who);
  for (const who of ['Maurice Bishop', 'Bernard Coard', 'Hudson Austin', 'Paul Scoon', 'Nicholas Brathwaite']) assert.ok(inCharge.includes(who), `${who} in ${inCharge.join(', ')}`);
  for (const who of ['Maurice Bishop', 'Bernard Coard', 'Hudson Austin']) assert.equal(l.find(x => x.who === who).tag, 'irregular entry', who);
  await open('#y=2020&c=331');
  const text = await page.textContent('#panel');
  for (const who of ['Luca Boschi', 'Mariella Mularoni', 'Alessandro Mancini', 'Grazia Zafferani', 'Alessandro Cardelli', 'Mirko Dolcini']) assert.match(text, new RegExp(who));
  assert.doesNotMatch(text, /No leader recorded/);
  assert.match(await page.textContent('.overview'), /Alessandro Mancini[^,]* and Grazia Zafferani/);
  // 1930: Gozi and Lonfernini served together, Lonfernini died on 10 September and Foschi joined Gozi on 16 September
  // (second reader, 16 November 2026: the overview read as if the three followed one another).
  await open('#y=1930&c=331');
  assert.match(await page.textContent('.overview'), /Manlio Gozi[^,]* and Marino Lonfernini[^,]* \(until 10 Sept 1930\), joined by Turiddu Foschi[^,]* \(from 16 Sept 1930\), then Valerio Pasquali/);
  await page.click('#tab-table');
  await page.waitForSelector('#year-table tbody tr');
  assert.equal(await page.locator('#year-table tbody tr[data-gw="331"]').count(), 0, 'San Marino has no border, so the table of states on the map leaves it out');
  await page.click('#tab-map');
  await open('#y=2000');
  await page.fill('#search', 'Skerrit');
  await page.waitForSelector('#search-results li');
  await page.press('#search', 'Enter');
  assert.equal(await page.textContent('#year-big'), '2004');
  assert.equal(await page.textContent('#panel h2'), 'Dominica');
  assert.deepEqual(errors, []);
});

test('year view lists events across countries and opens them', async () => {
  await open('#y=1989');
  const n = await page.locator('#panel .events li').count();
  assert.ok(n > 10, `expected >10 events in 1989, got ${n}`);
  await page.click('#panel [data-open]');
  assert.ok(await page.locator('#close').count(), 'country panel opened');
});

test('PRP styling and phone layout', async () => {
  await open('');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(243, 244, 246)'); // PRP canvas, light theme
  assert.equal(await page.evaluate(() => document.documentElement.dataset.suite), 'rs');
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(`${BASE}/#y=1945&c=255`, { waitUntil: 'networkidle' });
  const { scroll, width } = await m.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  assert.ok(scroll <= width + 1, `page is ${scroll}px wide on ${width}px`);
  await m.close();
});

// MP-03 (15 Nov 2026, Jude's "Use your judgement" on the sliders on a phone): at 390 px one year is about 3 px of
// track, so the opening is as many years apart as gives at least about 24 px between the handles, the latest year at
// the right one; at desktop width it is still one year apart (the test above).
test('on a phone (390 px), opened with no year, the handles stand at least 24 px apart, the latest year at the right', async () => {
  const y = new Date().getUTCFullYear();
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = []; m.on('pageerror', e => errors.push(e.message));
  try {
    await m.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await m.waitForFunction(() => document.querySelector('#year')?.dataset.value, null, { timeout: 20000 });
    const h = await m.evaluate(() => {
      const el = document.querySelector('#period'), t = parseFloat(getComputedStyle(el).getPropertyValue('--prp-period-thumb')) || 16;
      const at = i => { const r = i.getBoundingClientRect(); return r.left + t / 2 + ((+i.value - +i.min) / Math.max(1, +i.max - +i.min)) * (r.width - t); };
      const f = el.querySelector('#from'), to = el.querySelector('#year');
      return { from: +f.dataset.value, to: +to.dataset.value, px: at(to) - at(f) };
    });
    assert.equal(h.to, y);
    assert.ok(h.px >= 23, `handles ${h.px.toFixed(1)} px apart`);
    assert.ok(y - h.from > 1 && y - h.from < 20, `opens ${y - h.from} years apart`);
    assert.equal(await m.textContent('#year-big'), `${h.from}–${y}`);
    assert.deepEqual(errors, []);
  } finally { await m.close(); }
});

// MI-10's sweep (15 Nov 2026): leader links that led to the wrong man of the name, or to a disambiguation page.
test('leader links name the right person: Kostas Karamanlis, George Papandreou, Ioannis Grivas, Willy Spühler and four more', () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const at = (gw, start) => { const l = data.countries[gw].leaders.find(x => x.start === start); return [l.full, decodeURIComponent(l.url.split('/wiki/')[1])]; };
  assert.deepEqual(at(350, '2004-03-10'), ['Kostas Karamanlis', 'Kostas_Karamanlis']);
  assert.deepEqual(at(350, '2009-10-06'), ['George Papandreou', 'George_Papandreou']);
  assert.deepEqual(at(350, '1989-10-11'), ['Ioannis Grivas', 'Ioannis_Grivas']);
  assert.deepEqual(at(350, '1974-07-24'), ['Konstantinos Karamanlis', 'Konstantinos_Karamanlis']); // the uncle's own terms stay
  assert.deepEqual(at(225, '1963-01-01'), ['Willy Spühler', 'Willy_Spühler']);
  assert.deepEqual(at(225, '1968-01-01'), ['Willy Spühler', 'Willy_Spühler']);
  assert.equal(at(42, '1963-02-27')[1], 'Juan_Bosch_(politician)');
  assert.equal(at(367, '2000-05-05')[1], 'Andris_Bērziņš_(prime_minister)');
  assert.equal(at(385, '1926-03-03')[1], 'Ivar_Lykke_(politician)');
  assert.equal(at(395, '1963-11-14')[1], 'Bjarni_Benediktsson_(born_1908)');
  const all = JSON.stringify(data);
  for (const wrong of ['Peter_Spuhler', 'Theodoros_Grivas', 'Georgios_Papandreou']) assert.ok(!all.includes(wrong), wrong);
});

// E6 of the decisions of 17 November 2026: the footer says which elections are corrected, from what, how many and where
// the list is, read from the list itself (scripts/election-corrections.mjs), so the line cannot drift from it.
test('the footer says which election dates are corrected, from each election\'s Wikipedia article, and where the list is', async () => {
  const { ELECTIONS } = await import('../scripts/election-corrections.mjs');
  await open('');
  const line = (await page.textContent('#election-corrections')).replace(/\s+/g, ' ').trim();
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  // "This site's copy of Wikidata", not "Wikidata": Grenada 2026 was wrong only in the build's cached fetch (Wikidata
  // itself now gives 5 November 2026), and Grenada 1967 and 2003 have Wikidata's right date under a wrong country.
  assert.ok(line.startsWith(`${words[ELECTIONS.length]} elections are corrected where this site’s copy of Wikidata had the wrong date or country`), line);
  assert.ok(!/Wikidata dates wrongly|checked against a second source/.test(line), `claims no more than the list holds: ${line}`);
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const byState = new Map();
  for (const e of ELECTIONS) { const n = data.countries[e.gw].name.replace(/ \/.*$/, ''); byState.set(n, [...(byState.get(n) || []), e.date.slice(0, 4)].sort()); }
  for (const [state, years] of byState) assert.ok(line.includes(`${state} ${years.length > 1 ? `${years.slice(0, -1).join(', ')} and ${years.at(-1)}` : years[0]}`), `${state} ${years}: ${line}`);
  for (const e of ELECTIONS) assert.ok(e.sources.some(s => /^English Wikipedia's article/.test(s)), `${e.title}: its Wikipedia article`);
  assert.match(line, /each takes its date and country from its English Wikipedia article/);
  assert.match(line, /listed, with their sources, in scripts\/election-corrections\.mjs/);
  assert.ok(!/'/.test(line), 'the typographic apostrophe');
});
