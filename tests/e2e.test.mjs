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
  browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] }); // test browsers stay silent
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

// MP-11 (Jude, 17 November 2026: "Correct. Let's use only free data if possible, and note where not doing so makes a
// function impossible."): since 20 November 2026 the borders are Cliopatria v0.2.1 (CC BY 4.0), not CShapes 2.0
// (CC BY-NC-SA 4.0), and the states are keyed by Wikidata item, not by Gleditsch and Ward number.
const json = file => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
test('no CShapes in the data or the credits: the borders are Cliopatria\'s rows, the keys Wikidata items (MP-11)', async () => {
  for (const file of ['data/countries.json', 'data/borders.topo.json']) assert.doesNotMatch(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /CShapes/i, file);
  const data = json('data/countries.json');
  assert.equal(data.format, 'retro-countries/2');
  for (const [key, c] of Object.entries(data.countries)) {
    assert.match(key, /^Q[1-9]\d*$/, key);
    assert.equal(c.qid, key);
    assert.equal(c.qids[0], key);
    for (const f of ['name', 'iso3', 'yearPage', 'yearPages', 'leaders', 'offices', 'events']) assert.ok(f in c, `${key} keeps ${f}`);
    // Statehood events are Wikidata's since 21 November 2026 (they were CShapes's before 20 November): each names the
    // item and property it follows, and its date's precision.
    for (const e of c.events.filter(e => e.type === 'statehood')) {
      assert.equal(e.src, 'wikidata', JSON.stringify(e));
      assert.match(e.item, /^Q[1-9]\d*$/, JSON.stringify(e));
      assert.match(e.property, /^P[1-9]\d*$/, JSON.stringify(e));
      assert.ok(['day', 'month', 'year'].includes(e.precision), JSON.stringify(e));
    }
    for (const e of c.events.filter(e => e.type === 'border')) assert.deepEqual([e.precision, e.src, e.date.slice(4)], ['year', 'cliopatria', '-01-01'], JSON.stringify(e));
  }
  assert.equal(Object.keys(data.countries).length, 79);
  assert.match(data.sources[0], /^Cliopatria v0\.2\.1 .*CC BY 4\.0/);
  const rows = json('data/borders.topo.json').objects.borders.geometries.map(g => g.properties);
  assert.ok(rows.length > 1000, `${rows.length} rows`);
  for (const r of rows) {
    assert.match(r.id, /^cl-[0-9a-f]{10}$/);
    assert.ok(Number.isInteger(r.f) && Number.isInteger(r.t) && r.f <= r.t, JSON.stringify(r));
    if (r.c) assert.ok(data.countries[r.c], `${r.n} stands for ${r.c}`);
  }
  await open('#y=1950');
  for (const sel of ['#status', '#caption', 'footer']) {
    const text = await page.textContent(sel);
    assert.doesNotMatch(text, /CShapes/, sel);
  }
  assert.match(await page.textContent('#status'), /Cliopatria v0\.2\.1/);
  assert.match(await page.textContent('footer'), /Cliopatria v0\.2\.1[^.]*CC BY 4\.0/);
  assert.ok(await page.locator('footer a[href="https://github.com/Seshat-Global-History-Databank/cliopatria"]').count(), 'Cliopatria is linked');
  // Which leader is counted and how each took and left office stay Archigos's, said plainly, until the owner decides
  // (MP-11 fixer, 20 November 2026); since 21 November most names and dates are Wikidata's, and the line says which
  // part each source gives, Archigos's terms as its page states them, and what could not be shown without it.
  const foot = (await page.textContent('footer')).replace(/\s+/g, ' ');
  assert.match(foot, /otherwise, and for which leader is counted and how each took and left office \(to 2015\): Archigos 4\.1 \(Goemans, Gleditsch and Chiozza\), whose page states no licence and asks users to “cite this article as their reference for the data” \(Journal of Peace Research, 2009\); kept until VM’s owner decides/);
  assert.match(foot, /no free source records how leaders took and left office, so without it the irregular seizures of power could not be shown/);
  assert.deepEqual(errors, []);
});

// MP-11 fixer (20 November 2026): Cliopatria's sample years, said beside the map, with the four states whose rows for
// 2024 differ from 2023's; and a name ending in s takes the apostrophe alone ("United States’ border").
test('the map says Cliopatria gives one border a year and names its 2024 changes; "United States’ border", not "United States’s"', async () => {
  await open('#y=2024&c=Q30');
  const note = (await page.textContent('figcaption #border-limit')).replace(/\s+/g, ' ');
  assert.match(note, /^One border a year, in Cliopatria’s sample years: a border that changed within a year is not shown, and a change can show a year late\./);
  assert.match(note, /In 2024, Cliopatria’s last year, the United Kingdom, France, the United States and Ukraine are each marked “Cliopatria’s border differs”/);
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const in2024 = Object.values(data.countries).filter(c => c.events.some(e => e.type === 'border' && e.date.startsWith('2024'))).map(c => c.name).sort();
  assert.deepEqual(in2024, ['France', 'Ukraine', 'United Kingdom', 'United States'], 'the note names the states the data gives');
  for (const c of Object.values(data.countries)) for (const e of c.events) if (e.type === 'border') assert.doesNotMatch(e.text, /s’s border/, e.text);
  await page.waitForFunction(() => document.querySelector('#panel h2')?.textContent === 'United States', null, { timeout: 20000 });
  const panel = await page.textContent('#panel');
  assert.match(panel, /United States’ border in Cliopatria differs from 2023’s/);
  assert.match(panel, /the map shows United States’ border for 2024/);
  assert.doesNotMatch(panel, /United States’s/);
  assert.deepEqual(errors, []);
});

// Every address that opened a state still opens it: the old #c=<Gleditsch and Ward number> is read through the
// data's oldKeys and rewritten to the state's Wikidata key.
test('an old address by Gleditsch and Ward number opens the same state and is rewritten to its Wikidata key', async () => {
  await open('#y=1962&c=2');
  assert.equal(await page.textContent('#panel h2'), 'United States');
  assert.equal(new URL(page.url()).hash, '#y=1962&c=Q30');
  await open('#y=1945&f=1938&c=255');
  assert.equal(await page.textContent('#panel h2'), 'Germany');
  assert.equal(new URL(page.url()).hash, '#y=1945&f=1938&c=Q41304');
  await open('#y=1946&c=200');
  assert.equal(await page.textContent('#panel h2'), 'United Kingdom');
  assert.equal(new URL(page.url()).hash, '#y=1946&c=Q145');
  // The new address, and a number that was never a state, as before (no state chosen).
  await open('#y=1962&c=Q30');
  assert.equal(await page.textContent('#panel h2'), 'United States');
  await open('#y=1962&c=999');
  assert.equal(await page.textContent('#panel h2'), '1962');
  assert.deepEqual(errors, []);
});

// Review X1 of 21 November 2026: a key is looked up in the data's own states only. Before, #c=constructor (or any name
// every object inherits) was taken for a state, and the panel failed with "Could not load historical data". A key that
// names no state opens the year with no state selected, as an unknown number did before the Wikidata keys; so does one
// arriving by a change of the address.
test('an address key that names no state opens the year with none selected, never a property every object has', async () => {
  for (const c of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'Q0', '%00']) {
    await open(`#y=1962&c=${c}`);
    assert.equal(await page.textContent('#panel h2'), '1962', `#c=${c}`);
    assert.doesNotMatch(await page.textContent('#status'), /Could not load/, `#c=${c}`);
    assert.equal(await page.locator('#close').count(), 0, `#c=${c}: no state's panel`);
  }
  await open('#y=1962&c=Q30');
  for (const c of ['constructor', '__proto__']) {
    await page.evaluate(h => { location.hash = h; }, `#y=1962&c=${c}`);
    await page.waitForFunction(() => document.querySelector('#panel h2')?.textContent === '1962', null, { timeout: 5000 });
  }
  assert.deepEqual(errors, []);
});

// What the free borders cannot show is said in plain words where it is missing.
test('a covered state with no free border for the year is named as one VM cannot place; 2025–2026 are drawn at 2024', async () => {
  await open('#y=1950');
  const sub = await page.textContent('#panel .sub');
  const m = sub.match(/ (\d+) (?:is|are) covered in 1950 but not drawn: VM cannot place ([^.]+) on a free border for 1950\./);
  assert.ok(m, sub);
  for (const name of ['Poland', 'San Marino', 'Liechtenstein']) assert.ok(m[2].includes(name), `${name} in ${m[2]}`);
  assert.doesNotMatch(m[2], /Monaco|Andorra/, 'Cliopatria draws Monaco and Andorra');
  await open('#y=1950&c=Q36');
  assert.match(await page.textContent('#panel .sub'), /VM cannot place Poland on a free border for 1950/);
  assert.match(await page.textContent('#panel'), /Bolesław Bierut|Józef Cyrankiewicz/);
  await open('#y=1950&c=Q235');
  assert.equal(await page.locator('path.shape.active[data-key="Q235"]').count() > 0, true, 'Monaco is drawn');
  await open('#y=2026');
  assert.match(await page.textContent('#caption'), /2025 and 2026 are drawn on the borders of 2024/);
  await open('#y=1938&c=Q41304');
  assert.equal(await page.locator('#animate').count(), 0, 'no animation within one year');
  // Review X3 (21 November 2026): the border differs in Cliopatria, which may be a redrawing; no change is asserted.
  assert.match(await page.textContent('#panel'), /Cliopatria gives borders by the year: the map shows Germany’s border for 1938, which differs in Cliopatria from 1937’s by more than 1% of its area\. That may be a redrawing of Cliopatria’s rows rather than a change of border, and a change within 1938 cannot be shown\./);
  assert.deepEqual(errors, []);
});

// Statehood from Wikidata (21 November 2026). Until then a state was covered from its first leader to its last, so
// Ukraine, whose first Archigos leader took office on 18 July 1990, was "covered" at the end of 1990 and named as a
// state VM cannot place, though it declared independence on 24 August 1991 (Wikidata, Q212's inception). A state is
// now covered inside its statehood (data/countries.json statehood, from Wikidata; spans are written from it), and
// listed as one VM cannot place only while it exists and Cliopatria has no row for it (Ukraine's rows start in 1992).
test('Ukraine 1990 is not an independent state, and not one VM cannot place; in 1991 it exists and is counted', async () => {
  const data = json('data/countries.json');
  const ua = data.countries.Q212;
  assert.deepEqual(ua.statehood.map(s => [s.start?.date, s.start?.precision, s.start?.item, s.start?.property, s.end]), [['1991-08-24', 'day', 'Q212', 'P571', null]]);
  assert.deepEqual(ua.spans, [['1991-08-24', null]]);
  await open('#y=1990');
  assert.doesNotMatch(await page.textContent('#unplaced'), /Ukraine/);
  assert.doesNotMatch(await page.textContent('#panel .sub'), /cannot place[^.]*Ukraine/);
  await open('#y=1990&c=Q212');
  assert.equal(await page.textContent('#panel .sub'), 'Not an independent state at the end of 1990');
  await open('#y=1991');
  assert.match(await page.textContent('#unplaced'), /VM cannot place [^.]*Ukraine[^.]* on a free border for 1991/);
  await open('#y=1991&c=Q212');
  assert.match(await page.textContent('#panel .sub'), /VM cannot place Ukraine on a free border for 1991/);
  // Its statehood event, to the day, among its events.
  assert.match(await page.textContent('#panel .events li[data-type="statehood"]'), /^24 Aug 1991statehood\s*Ukraine becomes an independent state/);
  assert.deepEqual(errors, []);
});

// Steps 2 and 3 of the statehood work (21 November 2026): every state VM cannot place in a year exists then by its
// statehood, and every state's spans are its statehood's spells (one span for each, from the spell's first day, or
// 1926 for a state that existed throughout it, to its last day or the present).
test('no state is named as one VM cannot place outside its statehood, in any year, and the spans are the statehood', async () => {
  const data = json('data/countries.json');
  const { displayName } = await import('../names.mjs');
  for (const [key, c] of Object.entries(data.countries)) {
    assert.ok(Array.isArray(c.statehood) && c.statehood.length, `${key}: a statehood`);
    assert.deepEqual(c.spans, c.statehood.map(s => [s.start ? s.start.date : `${data.firstYear}-01-01`, s.end ? s.end.date : null]), `${key}: spans from the statehood`);
    for (const s of c.statehood) for (const p of [s.start, s.end].filter(Boolean)) {
      assert.match(p.date, /^\d{4}-\d\d-\d\d$/, `${key} ${JSON.stringify(p)}`);
      assert.ok(['day', 'month', 'year'].includes(p.precision) && /^Q[1-9]\d*$/.test(p.item) && /^P[1-9]\d*$/.test(p.property), `${key} ${JSON.stringify(p)}`);
    }
  }
  const exists = (c, date) => c.statehood.some(s => (!s.start || s.start.date <= date) && (!s.end || date <= s.end.date));
  await open(`#y=${data.firstYear}`);
  const problems = [];
  for (let y = data.firstYear; y <= data.lastYear; y++) {
    await page.evaluate(h => { location.hash = h; }, `#y=${y}`);
    await page.waitForFunction(y => document.querySelector('#year-big')?.textContent === String(y), y, { timeout: 5000 });
    const text = (await page.textContent('#unplaced')).trim();
    if (!text) continue;
    const date = y >= new Date().getUTCFullYear() ? new Date().toISOString().slice(0, 10) : `${y}-12-31`;
    for (const [key, c] of Object.entries(data.countries)) {
      // A whole name in the list ("VM cannot place A, B and C on a free border for y"), so that "Germany" is not
      // found inside "West Germany".
      const name = displayName(key, c.name, date).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`(?:place |, | and )${name}(?:,| and | on a free)`).test(text)) continue;
      if (!exists(c, date)) problems.push(`${y}: ${c.name} is named as one VM cannot place, outside its statehood`);
    }
  }
  assert.deepEqual(problems, []);
  assert.deepEqual(errors, []);
});

// Step 3: statehood events are back on the page (as before 20 November, ec2a173), from Wikidata, apart from the border
// events: Germany's unification on 3 October 1990 to the day, in the legend's own colour; a date Wikidata gives only
// to the year is shown as the year (Grenada's independence, 1974).
test('a statehood event is shown to its day in the events and has its own place in the legend: Germany, 3 October 1990', async () => {
  const data = json('data/countries.json');
  const de = data.countries.Q713750.events.filter(e => e.type === 'statehood');
  assert.ok(de.some(e => e.date === '1990-10-03' && e.precision === 'day' && e.src === 'wikidata'), JSON.stringify(de));
  const gd = data.countries.Q16957.events.filter(e => e.type === 'statehood');
  assert.ok(gd.some(e => e.date === '1990-10-03' && e.precision === 'day'), JSON.stringify(gd));
  await open('#y=1990&c=Q713750');
  const item = page.locator('#panel .events li[data-type="statehood"]');
  assert.equal(await item.count(), 1);
  assert.match(await item.textContent(), /^3 Oct 1990statehood/);
  const legend = await page.textContent('.legend');
  assert.match(legend, /Independence, union or end of a state/);
  assert.match(legend, /Cliopatria’s border differs/);
  assert.equal(await page.locator('.legend .swatch[style*="--c-statehood"]').count(), 1);
  const fill = await page.locator('path.shape[data-key="Q713750"]').first().getAttribute('fill');
  assert.equal(fill, 'var(--c-statehood)', 'West Germany / Germany in 1990 takes the statehood colour');
  await open('#y=1974&c=Q769');
  assert.match(await page.textContent('#panel .events li[data-type="statehood"]'), /^1974statehood\s*Grenada becomes an independent state/);
  // The year's counts keep the border and statehood events apart.
  await open('#y=1990');
  assert.match(await page.textContent('#panel .prp-kpis'), /Independence, union or end\s*\d+/);
  assert.deepEqual(errors, []);
});

// Where a state exists but VM holds no leader for the date (the Netherlands at the end of 1942, its government in exile
// not in Archigos), the panel says so in one plain line.
test('a state that exists with no leader held for the date says VM holds no leader for it', async () => {
  await open('#y=1942&c=Q55');
  assert.match(await page.textContent('#panel'), /VM holds no leader for 31 Dec 1942\./);
  // Once (review R6, 21 November 2026): not also "No leader recorded for this year".
  assert.doesNotMatch(await page.textContent('#panel'), /No leader recorded/);
  // R6 also: Wikidata's two statements of Wilhelmina's reign make one entry, in the overview and in the list.
  assert.equal((await page.textContent('.overview')).split('Wilhelmina of the Netherlands').length - 1, 1);
  assert.doesNotMatch(await page.textContent('#panel .sub'), /Not an independent state/);
  await open('#y=1990&c=Q212');
  assert.doesNotMatch(await page.textContent('#panel'), /VM holds no leader/, 'a year outside its statehood says that instead');
  assert.deepEqual(errors, []);
});

// Review of 21 November 2026 (D3, R1): a leader list can start before the state's statehood (Archigos starts Ukraine's
// Kravchuk on 18 July 1990, before its independence on 24 August 1991). Outside its statehood the panel no longer says
// anyone "led" the state: such leaders and events are listed apart, under "While not an independent state", and the
// year's counts and its list of key events leave them out. Grenada's 1967 election, before its independence in 1974,
// is no longer listed (election-corrections.mjs keeps an election inside its state's statehood, as the build does).
test('a panel outside statehood names no one as leading the state, and the year\'s counts leave such arrivals out', async () => {
  const data = json('data/countries.json');
  await open('#y=1990&c=Q212');
  assert.equal(await page.textContent('#panel .sub'), 'Not an independent state at the end of 1990');
  const overview = await page.textContent('#panel .overview');
  assert.doesNotMatch(overview, /led Ukraine/, overview);
  assert.match(overview, /^Ukraine was not an independent state in 1990; VM’s list names Leonid Kravchuk[^.]* for that time\./, overview);
  assert.match(await page.textContent('#panel .outside'), /While not an independent state[\s\S]*Leonid Kravchuk[\s\S]*Leonid Kravchuk takes power/);
  assert.equal(await page.locator('#panel .events:not(.outside .events) li[data-type="leader"]').count(), 0, 'no arrival among the key events');
  await open('#y=1950&c=Q40');
  assert.doesNotMatch(await page.textContent('#panel .overview'), /led Austria/);
  await open('#y=1991&c=Q212');
  const ov91 = await page.textContent('#panel .overview');
  assert.match(ov91, /^Leonid Kravchuk[^.]* led Ukraine in 1991\./, ov91);
  assert.equal(await page.locator('#panel .outside').count(), 0, 'in charge in 1991, inside its statehood');
  // Second review, X2: what is said of the state counts no party membership from before its statehood. Kravchuk's
  // membership of the Communist Party of the Soviet Union ends in 1991 before 24 August, the day of independence.
  const cpsu = data.countries.Q212.leaders.find(l => l.full === 'Leonid Kravchuk').parties.find(m => /Communist Party of the Soviet Union/.test(m.name));
  assert.ok(cpsu && cpsu.e < data.countries.Q212.spans[0][0], 'the membership ends before independence');
  assert.doesNotMatch(ov91, /Communist Party of the Soviet Union/, ov91);
  assert.doesNotMatch(await page.textContent('#panel'), /Parties in power in 1991[\s\S]*Communist Party of the Soviet Union held|The Communist Party of the Soviet Union held power/);
  // Second review, X5: in the year's list a statehood event stands first on its day, across states. On 1 January 1993
  // Czechia and Slovakia become independent states and three leaders take office.
  await open('#y=1993');
  const jan1 = await page.$$eval('#panel .events li', els => els.map(e => [e.dataset.type, e.textContent]).filter(([, t]) => /^1 Jan 1993/.test(t)).map(([type]) => type));
  assert.ok(jan1.filter(t => t === 'statehood').length >= 2 && jan1.some(t => t === 'leader'), JSON.stringify(jan1));
  assert.ok(jan1.lastIndexOf('statehood') < jan1.findIndex(t => t !== 'statehood'), `statehood first on the day: ${jan1}`);
  // The year's list and its counts: no arrival dated outside its state's statehood.
  await open('#y=1990');
  assert.doesNotMatch(await page.textContent('#panel .events'), /Leonid Kravchuk takes power/);
  const inside = (c, d) => c.spans.some(([s, e]) => s <= d && (!e || d <= e));
  const changes = Object.values(data.countries).flatMap(c => c.events.filter(e => /^(leader|coup)$/.test(e.type) && e.date.startsWith('1990') && inside(c, e.date))).length;
  assert.match(await page.textContent('#panel .prp-kpis'), new RegExp(`Leader changes\\s*${changes}\\b`));
  assert.deepEqual(errors, []);
});

// Review D1 and R3 (21 November 2026): Wikidata's English label is checked against the title of the English Wikipedia
// article the leader links to, and where they differ the title is shown: "Adolph Bowler" (Q336034), "Isaac Shamir"
// (Q184351) and "Lázaro Cárdenas segundo" (Q296718) were Wikidata's labels. A person keeps one spelling in a list.
test('leader names are their articles\' names, not doubtful labels, with one spelling for each person in a list', async () => {
  const data = json('data/countries.json');
  // The leaders' names and the events' texts; archigos.full keeps the name held before the match, as the README says,
  // and the office holders under "Also in office" keep Wikidata's labels (a leader's own office row is left out, by
  // name or by article: Israel 1990 below).
  const all = JSON.stringify(Object.values(data.countries).map(c => [c.leaders, c.events]), (k, v) => (k === 'archigos' ? undefined : v));
  for (const bad of ['Adolph Bowler', 'Isaac Shamir', 'Cárdenas segundo']) assert.ok(!all.includes(bad), bad);
  const title = url => decodeURIComponent(url.split('/wiki/')[1]).replace(/_/g, ' ').replace(/ \(.*\)$/, '');
  const problems = [];
  // A name that leader-corrections.mjs gives by hand, with its source, is kept (second reading, 25 November 2026:
  // Simeon Sakskoburggotski, the name he served under, whose article is "Simeon II").
  const { CORRECTIONS } = await import('../scripts/leader-corrections.mjs');
  const named = (key, l) => Object.values(CORRECTIONS[key]?.edit || {}).some(f => f.full && f.full === l.full && f.url === l.url);
  for (const [key, c] of Object.entries(data.countries)) {
    const byUrl = new Map();
    for (const l of c.leaders) if (l.url) byUrl.set(l.url, [...(byUrl.get(l.url) || []), l.full]);
    for (const [url, names] of byUrl) if (new Set(names).size > 1) problems.push(`${c.name}: ${[...new Set(names)].join(' / ')} (${url})`);
    for (const l of c.leaders.filter(l => l.archigos)) if (l.full !== title(l.url) && !named(key, l)) problems.push(`${c.name}: ${l.full} is not its article's title, ${title(l.url)}`);
  }
  assert.deepEqual(problems, []);
  assert.ok(data.countries.Q211.events.some(e => e.text === 'Ādolfs Bļodnieks takes power'));
  await open('#y=1933&c=Q211');
  assert.match(await page.textContent('#panel'), /Ādolfs Bļodnieks/);
  await open('#y=1990&c=Q801');
  const israel = await page.textContent('#panel');
  assert.match(israel, /Yitzhak Shamir/);
  assert.ok(!/Isaac Shamir/.test(israel), 'Shamir is not listed again under his Wikidata label');
  assert.deepEqual(errors, []);
});

// Review D2 (21 November 2026): an office's label is stored only where it reads as an office (President of Cyprus,
// Q841760, had the English label "Padre y esposo Coughlan"). Review D5: a term joined across two offices names each
// (positions) and is labelled by the office held at its end; another office's term is joined only where that brings
// the dates nearer Archigos's (Ulmanis's premiership alone ends on 20 June 1940, 2 days from Archigos's 22 June).
test('the offices stored with the Wikidata leaders read as offices, and a term across two offices names both', () => {
  const data = json('data/countries.json');
  assert.ok(!JSON.stringify(data).includes('Coughlan'));
  const office = /\b(president|prime minister|premier|chancellor|taoiseach|king|queen|monarch|emperor|chairman|chairperson|chair|head of|leader|minister|regent|prince|princess|captain|governor|secretary|sultan|emir|shah|ruler|syndic)\b/i;
  for (const c of Object.values(data.countries)) for (const l of c.leaders) {
    for (const p of [l.position, ...(l.positions || []).map(x => x.label)]) if (p != null) assert.ok(office.test(p) || c.name.split(' / ').some(n => p.includes(n)), `${c.name}: ${l.full}: ${p}`);
  }
  const ilham = data.countries.Q227.leaders.find(l => l.full === 'Ilham Aliyev');
  assert.equal(ilham.position, 'President of Azerbaijan');
  assert.deepEqual(ilham.positions.map(p => p.label), ['Prime Minister of Azerbaijan', 'President of Azerbaijan']);
  const ulmanis = data.countries.Q211.leaders.find(l => l.archigos?.start === '1934-03-16');
  assert.deepEqual([ulmanis.end, ulmanis.position, ulmanis.positions], ['1940-06-20', 'Prime Minister of Latvia', undefined]);
});

// Review D7 (21 November 2026): Wikidata's office holders after 2015 keep each date's precision; a statement known only
// to the year is not a second term beside the same person's dated one (Dick Schoof was listed twice, from "1 Jan 2024"
// and from 2 July 2024), and a date given to the year is shown as the year, never as 1 January.
test('office holders\' dates keep their precision, and no person is listed twice for one term', async () => {
  const data = json('data/countries.json');
  const problems = [];
  for (const c of Object.values(data.countries)) {
    const seen = new Set();
    for (const l of c.leaders) { const k = `${l.url}|${l.end}`; if (l.url && seen.has(k)) problems.push(`${c.name}: ${l.full} twice, to ${l.end}`); seen.add(k); }
    for (const p of [...c.leaders, ...c.offices]) for (const [d, pr] of [[p.start, p.startPrecision], [p.end, p.endPrecision]]) {
      if (pr && !['day', 'month', 'year'].includes(pr)) problems.push(`${c.name}: ${p.full}: precision ${pr}`);
      if (pr === 'year' && !d.endsWith('-01-01')) problems.push(`${c.name}: ${p.full}: ${d} to the year`);
    }
  }
  assert.deepEqual(problems, []);
  assert.equal(data.countries.Q55.leaders.filter(l => l.full === 'Dick Schoof').length, 1);
  assert.equal(data.countries.Q55.leaders.find(l => l.full === 'Mark Rutte' && l.start === '2010-10-14').end, '2024-07-02');
  // Every leader or office holder dated only to the year is shown as the year in its panel.
  const yearOnly = Object.entries(data.countries).flatMap(([key, c]) => c.leaders.filter(l => l.startPrecision === 'year' && l.start >= '2016-01-01').map(l => [key, l]));
  for (const [key, l] of yearOnly.slice(0, 3)) {
    await open(`#y=${l.start.slice(0, 4)}&c=${key}`);
    const metas = await page.$$eval('#panel .leader .meta', els => els.map(e => e.textContent));
    assert.ok(metas.some(m => m.startsWith(`${l.start.slice(0, 4)} – `)), `${l.full}: ${metas.join(' | ')}`);
    assert.ok(!metas.some(m => m.startsWith(`1 Jan ${l.start.slice(0, 4)}`)), `${l.full}: ${metas.join(' | ')}`);
  }
  assert.deepEqual(errors, []);
});

// Review R8 (21 November 2026): the overview gives a statehood event's cause and date in one bracket, and the year's
// list names a state that ends by the name it had until that day (the Soviet Union, not Russia, is dissolved).
test('the overview gives a statehood event\'s cause and date in one bracket, and an ending state keeps its name', async () => {
  await open('#y=1990&c=Q16957');
  const ov = await page.textContent('#panel .overview');
  assert.doesNotMatch(ov, /\) \(/, ov);
  assert.match(ov, /East Germany ceases to be an independent state \(German reunification, 3 Oct 1990\)\./, ov);
  await open('#y=1991');
  const items = await page.$$eval('#panel .events li[data-type="statehood"]', els => els.map(e => e.textContent));
  assert.ok(items.some(t => /Soviet Union: The Soviet Union is dissolved/.test(t)), items.join(' | '));
  assert.ok(!items.some(t => /Russia: The Soviet Union is dissolved/.test(t)), items.join(' | '));
  assert.deepEqual(errors, []);
});

// Step 4 (21 November 2026): every state's leader list stays in order by start, with no leader doubled; each arrival
// event has its leader and each leader from 1926 its arrival event, on the same day; a leader whose name and dates now
// come from Wikidata carries the item and Archigos's own dates, within 31 days of Wikidata's at each end.
test('every state\'s leader list is in order, with no leader lost or doubled, and the Wikidata leaders are within 31 days of Archigos', () => {
  const data = json('data/countries.json');
  const day = d => Date.parse(`${d}T00:00:00Z`) / 864e5;
  const problems = [];
  for (const [key, c] of Object.entries(data.countries)) {
    const L = c.leaders;
    L.forEach((l, i) => { if (i && l.start < L[i - 1].start) problems.push(`${c.name}: ${l.full || l.name} (${l.start}) after ${L[i - 1].full || L[i - 1].name} (${L[i - 1].start})`); });
    const seen = new Set();
    for (const l of L) { const k = `${l.full || l.name}|${l.start}|${l.end}`; if (seen.has(k)) problems.push(`${c.name}: ${k} twice`); seen.add(k); }
    const arrivals = c.events.filter(e => e.type === 'leader' || e.type === 'coup');
    for (const l of L.filter(l => l.start >= `${data.firstYear}-01-01`)) if (!arrivals.some(e => e.date === l.start)) problems.push(`${c.name}: no arrival event for ${l.full || l.name} on ${l.start}`);
    for (const e of arrivals) if (!L.some(l => l.start === e.date)) problems.push(`${c.name}: "${e.text}" on ${e.date} has no leader`);
    for (const l of L.filter(l => l.archigos)) {
      if (l.source !== 'Wikidata' || !/^Q[1-9]\d*$/.test(l.qid || '')) problems.push(`${c.name}: ${l.full} has Archigos dates but source ${l.source}, item ${l.qid}`);
      if (Math.abs(day(l.start) - day(l.archigos.start)) > 31) problems.push(`${c.name}: ${l.full} starts ${l.start}, Archigos ${l.archigos.start}`);
      // Second review, X1: Archigos 4.1 ends on 31 December 2015, so no later day is Archigos's. A leader in office on
      // that day has an empty Archigos end, and whatever end the list holds is after it (or none).
      if (l.archigos.end && l.archigos.end > '2015-12-31') problems.push(`${c.name}: ${l.full} has ${l.archigos.end} as Archigos's end, after Archigos's last day`);
      if (!l.archigos.end ? (l.end && l.end <= '2015-12-31') : (!l.end || Math.abs(day(l.end) - day(l.archigos.end)) > 31)) problems.push(`${c.name}: ${l.full} ends ${l.end}, Archigos ${l.archigos.end}`);
    }
    // No gap or overlap over a day between neighbours that was not there with Archigos's dates.
    const was = l => l.archigos || l;
    L.forEach((b, i) => {
      const a = L[i - 1];
      if (!a || !a.end || !(a.archigos || b.archigos)) return;
      const g1 = day(b.start) - day(a.end), g0 = was(a).end ? day(was(b).start) - day(was(a).end) : g1;
      // A break already over the 31 days a match may move a date (Latvia's from 1940 to 1990) may change by a few days.
      if (Math.abs(g1) > 1 && Math.abs(g1) > Math.abs(g0) && !(g0 > 31 && g1 > 31)) problems.push(`${c.name}: ${Math.abs(g1)} days ${g1 > 0 ? 'apart' : 'overlapping'} between ${a.full} and ${b.full}, ${Math.abs(g0)} with Archigos's dates`);
      // Review R4: no leader takes power before the one before leaves where Archigos's dates do not overlap (Egon
      // Krenz had taken Wikidata's 17 October 1989, the day before Honecker left).
      if (g1 < 0 && g0 >= 0) problems.push(`${c.name}: ${b.full} takes power on ${b.start}, before ${a.full} leaves on ${a.end}`);
    });
  }
  assert.deepEqual(problems, []);
  assert.ok(Object.values(data.countries).flatMap(c => c.leaders).filter(l => l.archigos).length > 500, 'most Archigos leaders now take Wikidata\'s names and dates');
});

// Step 5: the Sources line, the data's sources and the README say where statehood and the leaders come from.
test('the Sources line names Wikidata for statehood and for the leaders', async () => {
  const data = json('data/countries.json');
  assert.match(data.sources.statehood || '', /^Wikidata \(CC0\)/);
  assert.match(data.sources.leaders || '', /Wikidata \(CC0\)/);
  await open('');
  const foot = (await page.textContent('footer')).replace(/\s+/g, ' ');
  assert.match(foot, /Statehood \(when each state began, ended or was unified\): Wikidata \(CC0\)/);
  assert.match(foot, /Leaders’ names and dates: Wikidata \(CC0\)/);
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /statehood[^\n]*Wikidata/i);
  // Review R7: for how many leaders, counted from the data the page reads.
  const leaders = Object.values(data.countries).flatMap(c => c.leaders);
  const moved = leaders.filter(l => l.archigos).length, chosen = moved + leaders.filter(l => l.source === 'Archigos').length;
  const n = x => x.toLocaleString('en-GB');
  assert.ok(foot.includes(`for ${n(moved)} of the ${n(chosen)} leaders Archigos counts`), foot);
  assert.ok(readme.includes(`${n(moved)} of the ${n(chosen)} leaders Archigos counts`), 'the README gives the same count');
  // Review R5: the Limits line names the states the page says it cannot place, as the README does, not the list of
  // before 21 November (which gave Poland from 1944 to 1952 and left out the wartime occupations).
  assert.doesNotMatch(foot, /Poland from 1944 to 1952/);
  assert.match(foot, /the Netherlands, Belgium, Luxembourg and Monaco 1940–44/);
  assert.match(foot, /Poland 1940–52/);
  // Reviews D4 and D6: the choices behind Austria's 1945–55 and the Baltic and Georgian dates are said where they apply.
  assert.match(foot, /Austria from 1945 to 1955 is counted as not an independent state, as Germany is from 1945 to 1949, and unlike Japan from 1945 to 1952/);
  assert.match(foot, /The Baltic and Georgian dates are Wikidata’s own items’ dates, and differ in kind/);
  assert.deepEqual(errors, []);
});

// Review of 12 November 2026: the status line's coverage (every country over all the years) and a year's count of
// covered states differed with no word why. Beside the year's count the panel and the table now say how many of the
// whole coverage existed as states that year and why the rest are missing, worked out from the data.
test('a year\'s count of states says how it differs from the coverage over all the years', async () => {
  await open('#y=1950');
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const total = Object.keys(data.countries).length;
  // The reason is worked out per country: a covered country with no row in Cliopatria for the year (San Marino,
  // Liechtenstein, Poland in 1950) is never described as "not independent" (the second reader of 14 November 2026 found
  // one that was). Covered: inside one of its spans; placed: some row stands for it that year (keyIn, scripts/retro-shape.mjs).
  const { keyIn } = await import('../scripts/retro-shape.mjs');
  const rows = json('data/borders.topo.json').objects.borders.geometries.map(g => g.properties);
  const date = '1950-12-31', covered = c => c.spans.some(([s, e]) => s <= date && (!e || date <= e));
  const placed = new Set(rows.map(r => keyIn(r, 1950)).filter(Boolean));
  const noBorder = Object.entries(data.countries).filter(([key, c]) => covered(c) && !placed.has(key)).map(([, c]) => c.name);
  assert.ok(noBorder.length > 1, 'some covered countries have no free border in 1950');
  const sub = await page.textContent('#panel .sub');
  const head = sub.match(/^(\d+) of the (\d+) countries covered over the years are on the map at the end of 1950\./);
  const nb = sub.match(/ (\d+) are covered in 1950 but not drawn: VM cannot place ([^.]+) on a free border for 1950\./);
  const other = sub.match(/ The other (\d+) were not independent states then: (.+)\.$/);
  assert.ok(head && nb && other, sub);
  assert.equal(+head[2], total);
  assert.equal(+nb[1], noBorder.length);
  for (const name of noBorder) {
    assert.ok(nb[2].includes(name), `${name} is named among the countries VM cannot place`);
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

// Review X2 of 21 November 2026: the states VM cannot place were named only in the panel with no state selected, so
// choosing the United Kingdom in 1950 took Poland, Japan, Liechtenstein and San Marino off the page while the map still
// did not draw them. #unplaced, beside the map, names them whether or not a state is selected (and over a period, for
// the year the map draws), in words a screen reader reads, at desktop and phone widths with no sideways scroll.
test('the states VM cannot place stay named beside the map, with a state selected or not, at 1440, 390 and 360 px', async () => {
  const data = json('data/countries.json');
  const { keyIn } = await import('../scripts/retro-shape.mjs');
  const { displayName } = await import('../names.mjs');
  const rows = json('data/borders.topo.json').objects.borders.geometries.map(g => g.properties);
  const date = '1950-12-31', placed = new Set(rows.map(r => keyIn(r, 1950)).filter(Boolean));
  const noBorder = Object.entries(data.countries).filter(([key, c]) => c.spans.some(([s, e]) => s <= date && (!e || date <= e)) && !placed.has(key))
    .map(([key, c]) => displayName(key, c.name, date));
  for (const name of ['Poland', 'Japan', 'Liechtenstein', 'San Marino']) assert.ok(noBorder.includes(name), `${name} has no free border in 1950`);
  for (const width of [1440, 390, 360]) {
    const m = await browser.newPage({ viewport: { width, height: 900 }, ...(width < 768 ? { isMobile: true, hasTouch: true } : {}) });
    const errs = []; m.on('pageerror', e => errs.push(e.message));
    try {
      for (const hash of ['#y=1950', '#y=1950&c=Q145', '#y=1950&f=1946&c=Q145', '#y=1950&c=Q36']) {
        await m.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
        await m.waitForFunction(() => document.querySelectorAll('path.shape').length > 50, null, { timeout: 30000 });
        const note = m.locator('#view-map #unplaced');
        assert.ok(await note.isVisible(), `${width} px ${hash}: the note is shown`);
        const text = (await note.textContent()).replace(/\s+/g, ' ').trim();
        const got = text.match(/^VM cannot place (.+) on a free border for 1950\.$/);
        assert.ok(got, `${width} px ${hash}: ${text}`);
        for (const name of noBorder) assert.ok(got[1].includes(name), `${width} px ${hash}: ${name} in ${text}`);
        assert.doesNotMatch(text, /Monaco|Andorra|United Kingdom/, 'only states the map does not draw');
        assert.ok(!/'/.test(text), 'the typographic apostrophe');
        assert.match(await m.locator('#view-map').ariaSnapshot(), /VM cannot place [^\n]*Liechtenstein[^\n]* on a free border for 1950/, 'a screen reader reads it');
        const { scroll, inner } = await m.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: innerWidth }));
        assert.ok(scroll <= inner + 1, `${width} px ${hash}: page is ${scroll}px wide on ${inner}px`);
      }
      assert.deepEqual(errs, []);
    } finally { await m.close(); }
  }
});

// Correction RT-02 (15 November 2026): the leader lists of nine countries stopped years ago (Archigos ends in 2015 and
// Wikidata did not always continue it), so National Analysis showed a past leader as current. Every state that still
// exists must have a list whose latest leader is still in office and named; a leader carried over from Archigos
// (whose data ends in 2015) must be one known to be still in office; a state with no list at all is named here.
test('every existing state\'s leader list reaches the present', async () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  // Since RT-04 (16 November 2026) every state has a list: Montenegro and the ten microstates, which Archigos does not
  // cover, were built by hand (the test below).
  const NO_LIST = [];
  // Archigos records still open at its last day whose holder was still in office in November 2026.
  const STILL_IN_OFFICE = { Nicaragua: 'Daniel Ortega', Albania: 'Edi Rama', 'Soviet Union / Russia': 'Vladimir Putin', Azerbaijan: 'Ilham Aliyev', 'Saudi Arabia': 'Salman of Saudi Arabia', China: 'Xi Jinping' };
  const problems = [], empty = [];
  // A state that no longer exists (Weimar and Nazi Germany, East Germany, Czechoslovakia) has rows in Cliopatria in
  // earlier years and none in its last year, 2024 (from the borders, not the leader list this test checks).
  const { keyIn } = await import('../scripts/retro-shape.mjs');
  const rows = JSON.parse(readFileSync(new URL('../data/borders.topo.json', import.meta.url), 'utf8')).objects.borders.geometries.map(g => g.properties);
  const drawn = new Set(rows.flatMap(r => Array.from({ length: r.t - r.f + 1 }, (_, i) => keyIn(r, r.f + i))).filter(Boolean));
  const current = new Set(rows.map(r => keyIn(r, 2024)).filter(Boolean));
  for (const [key, c] of Object.entries(data.countries)) {
    if (drawn.has(key) && !current.has(key)) continue;
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
// from Wikidata, Wikipedia and the states' official acts and records (free sources only since 27 November 2026), from the state's first day (independence, or 1926 for the four European
// microstates; Montenegro from its first day on the map) to the present, with no gap or overlap beyond those named here.
// Keyed by Wikidata item since 20 November 2026 (Dominica Q784, Grenada Q769, Saint Lucia Q760, Saint Vincent Q757,
// Antigua Q781, Saint Kitts Q763, Monaco Q235, Liechtenstein Q347, Andorra Q228, San Marino Q238, Montenegro Q236).
const RT04 = { Q784: '1978-11-03', Q769: '1974-02-07', Q760: '1979-02-22', Q757: '1979-10-27', Q781: '1981-11-01', Q763: '1983-09-19', Q235: '1926-01-01', Q347: '1926-01-01', Q228: '1926-01-01', Q238: '1926-01-01', Q236: '2006-06-03' };
test('Montenegro and the ten microstates have dated leader lists from their start to the present (RT-04)', () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  // Each start is the state's independence, as its first leader's entry gives it from the lists' sources (Wikidata's
  // positions held, the Wikipedia lists and the states' official acts), or 1926 for those independent since before it; Montenegro's is
  // its independence, 3 June 2006 (the test below).
  const startOf = key => RT04[key];
  // Gaps of more than a day between two leaders that the sources show (the office was empty, or the next holder took
  // office later): the start date of the leader after the gap.
  // Grenada 1983: Austin's council fell with the invasion of 25 October and Scoon took the government by his
  // Proclamation of 31 October. Andorra 1933: the General Council was dismissed and Pallarès left for exile in August
  // (the day is not confirmed); the next Syndic was chosen on 18 September (the Council's act). Andorra 1982: from the
  // last Syndic to the first Head of Government. (Dominica's gap of June 1979 closed on 27 November 2026: John's end and
  // Seraphin's start are both June 1979, day not confirmed.)
  const GAPS = { Q769: ['1983-10-31'], Q228: ['1933-09-18', '1982-01-08'] };
  // San Marino has two Captains Regent at a time, except while one who died in 1930 was not yet replaced, and while the
  // provisional government of four held power in October 1957 (from 1 October, as the official acts date it; the
  // fixer, 27 November 2026): the number in office on these days.
  const SAN_MARINO = { '1930-09-10': 1, '1957-10-01': 4 };
  const day = d => Date.parse(`${d}T00:00:00Z`) / 864e5;
  const ENTRY = [null, 'Regular', 'Irregular', 'Foreign Imposition'];
  const EXIT = [null, 'Regular', 'Natural Death', 'Irregular', 'Retired Due to Ill Health', 'Foreign', 'Suicide'];
  const DATE = /^\d{4}-\d\d-\d\d$/, QID = /^Q[1-9]\d*$/, letters = s => /\p{L}/u.test(s || '');
  const problems = [];
  for (const key of Object.keys(RT04)) {
    const c = data.countries[key], start = startOf(key), say = m => problems.push(`${c.name}: ${m}`);
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
    if (key === 'Q238') {
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
      else if (gap > 1 && !(GAPS[key] || []).includes(t.start)) say(`a gap of ${gap} days before ${t.people.join(' and ')} (from ${t.start})`);
    });
    if (terms.at(-1).end) say(`the list ends on ${terms.at(-1).end}`);
    // The other office ("Also in office"), replaced for these states from the same sources.
    for (const o of c.offices) {
      if (!['hos', 'hog'].includes(o.office) || !DATE.test(o.start) || (o.end && (!DATE.test(o.end) || o.end < o.start)) || !letters(o.full) || !QID.test(o.qid || '')) say(`office ${JSON.stringify(o)}`);
    }
    if (!c.offices.length) say('nobody under "Also in office"');
  }
  assert.deepEqual(problems, []);
  // Spot checks against the sources (Wikipedia's lists of office holders and the official acts).
  const at = (key, date) => data.countries[key].leaders.filter(l => l.start <= date && (!l.end || l.end > date)).map(l => l.full);
  assert.deepEqual(at('Q236', '2026-11-16'), ['Milojko Spajić']);
  assert.deepEqual(at('Q769', '1983-10-17'), ['Bernard Coard']);
  assert.deepEqual(at('Q784', '2004-01-07'), ['Osborne Riviere']);
  assert.deepEqual(at('Q235', '1960-01-01'), ['Rainier III']);
  assert.deepEqual(at('Q228', '1950-01-01'), ['Francesc Cairat Freixes']);
  assert.deepEqual(at('Q347', '1990-01-01'), ['Hans-Adam II']);
  assert.deepEqual(at('Q238', '1957-10-20').sort(), ['Alvaro Casali', 'Federico Bigi', 'Pietro Giancecchi', 'Zaccaria Giovanni Savoretti']);
  assert.deepEqual(at('Q238', '2020-06-01').sort(), ['Alessandro Mancini', 'Grazia Zafferani']);
  const grenada = Object.fromEntries(data.countries.Q769.leaders.map(l => [l.full, l]));
  for (const who of ['Maurice Bishop', 'Bernard Coard', 'Hudson Austin']) assert.equal(grenada[who].entry, 'Irregular', who);
});

// The build drops votes that are not national. Twenty-eight had slipped through its lists (21 November 2026):
// by-elections named in the plural, the Welsh Assembly's and Greater London's votes, the votes of Bosnia's two
// entities and one French region's referendum.
test('no by-election and no vote of a part of a state stands among a state\'s events', () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const found = Object.values(data.countries).flatMap(c => c.events.filter(e => (e.type === 'election' || e.type === 'referendum')
    && /\bby-elections?\b|National Assembly for Wales|Greater London|Republika Srpska|Federation of Bosnia and Herzegovina|territorial collectivity/i.test(e.text)).map(e => `${c.name}: ${e.text}`));
  assert.deepEqual(found, []);
  // National votes whose titles hold a near word stay: a recall of the President, a border referendum.
  const texts = key => data.countries[key].events.map(e => e.text);
  assert.ok(texts('Q96').includes('2022 Mexican presidential recall referendum'));
  assert.ok(texts('Q242').includes('2019 Belizean territorial dispute referendum'));
});

// "Also in office" in a fixed order (21 November 2026). Wikidata returns its rows in no set order, and the build kept
// it: Bosnia's three Presidency members, sworn in on one day, changed places from build to build, and where Wikidata
// gives one term two ends the build kept whichever came first (Mark Rutte's term ended on 2 July 2024 in one build and
// in "2024" in the next). The order is now by start, head of state first, then by name; of two ends the build keeps the
// one given to the day, then the later.
test('people who took office on one day are listed in a fixed order, and one term keeps one end', () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const sameDay = (key, start) => data.countries[key].offices.filter(o => o.start === start).map(o => `${o.office} ${o.full}`);
  assert.deepEqual(sameDay('Q225', '2002-10-28'), ['hos Dragan Čović', 'hos Mirko Šarović', 'hos Sulejman Tihić']);
  assert.deepEqual(sameDay('Q225', '2006-11-06'), ['hos Haris Silajdžić', 'hos Nebojša Radmanović', 'hos Željko Komšić']);
  assert.deepEqual(sameDay('Q225', '2014-11-17'), ['hos Bakir Izetbegović', 'hos Dragan Čović', 'hos Mladen Ivanić']);
  const term = (key, full, start) => data.countries[key].offices.filter(o => o.full === full && o.start === start);
  assert.deepEqual(term('Q55', 'Mark Rutte', '2010-10-14').map(o => [o.end, o.endPrecision]), [['2024-07-02', undefined]]);
  assert.deepEqual(term('Q43', 'Cemal Gürsel', '1960-05-27').map(o => o.end), ['1966-03-28']);
  assert.deepEqual(term('Q43', 'Turgut Özal', '1989-11-09').map(o => o.end), ['1993-04-17']);
  // The second review of that change found three more picks that rested on the order of Wikidata's answer. Votes held
  // on one day are listed by title; a leader whose two offices carry the same dates is named by the office whose
  // item has the lower number.
  assert.deepEqual(data.countries.Q30.events.filter(e => e.date === '2024-11-05').map(e => e.text),
    ['2024 United States House of Representatives elections', '2024 United States presidential election']);
  for (const c of Object.values(data.countries)) {
    const votes = c.events.filter(e => e.type === 'election' || e.type === 'referendum');
    for (let i = 1; i < votes.length; i++) if (votes[i - 1].date === votes[i].date && votes[i - 1].type === votes[i].type) assert.ok(votes[i - 1].text <= votes[i].text, `${c.name} ${votes[i].date}: ${votes[i - 1].text} before ${votes[i].text}`);
  }
  const position = (key, full) => data.countries[key].leaders.filter(l => l.full === full).map(l => l.position);
  for (const king of ['Saud of Saudi Arabia', 'Faisal of Saudi Arabia', 'Khalid of Saudi Arabia']) assert.deepEqual(position('Q851', king), ['King of Saudi Arabia'], king);
  assert.deepEqual(position('Q17', 'Masayoshi Ito'), ['Prime Minister of Japan']);
  assert.deepEqual(position('Q191077', 'Svetozar Marović'), ['President of Serbia and Montenegro']);
});

// RT-04's second readers (16 November 2026) checked the lists against other sources; each correction they found real is
// held here, with the source it follows.
test('the RT-04 lists follow the sources the second readers checked', () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const on = (l, date) => l.start <= date && (!l.end || l.end > date);
  const at = (key, date) => data.countries[key].leaders.filter(l => on(l, date)).map(l => l.full);
  const office = (key, kind, date) => data.countries[key].offices.filter(o => o.office === kind && on(o, date)).map(o => o.full);
  const find = (key, full, start) => data.countries[key].leaders.find(l => l.full === full && (!start || l.start === start));
  // Montenegro's list starts at independence (3 June 2006, where Wikipedia's list splits Đukanović's term), as Archigos
  // starts Kosovo, Czechia and Slovakia, so no Montenegro event falls in its years inside Serbia and Montenegro.
  assert.equal([...data.countries.Q236.leaders].sort((a, b) => a.start.localeCompare(b.start))[0].start, '2006-06-03');
  assert.deepEqual(data.countries.Q236.events.filter(e => e.date < '2006-06-03'), []);
  assert.deepEqual(office('Q236', 'hos', '2006-06-03'), ['Filip Vujanović']);
  assert.deepEqual(office('Q236', 'hos', '2006-06-02'), []);
  // Saint Lucia: King acted for the ailing Compton from 1 May 2007 (his own statement as Acting Prime Minister, Wikidata,
  // his infoboxes), as Archigos
  // dates Olmert from Sharon's stroke.
  assert.deepEqual(at('Q760', '2007-06-01'), ['Stephenson King']);
  assert.equal(find('Q760', 'John Compton', '2006-12-15').exit, 'Retired Due to Ill Health');
  // Grenada: Brathwaite's Interim Advisory Council of 1983-84 was non-party (Wikipedia's list: independent); the
  // National Democratic Congress was founded in 1987.
  assert.equal(find('Q769', 'Nicholas Brathwaite', '1983-12-09').parties, undefined);
  // Saint Kitts and Nevis: Douglas was sworn in on 4 July 1995 (the government's biography, his office's 2012 release).
  assert.deepEqual(at('Q763', '1995-07-05'), ['Denzil Douglas']);
  // Liechtenstein: Franz Joseph's regency began on 30 March 1938 (LGBl. 1938 Nr. 9, the national historical lexicon); Schädler's
  // government resigned on 15 June 1928 and Prince Alfred ran the government from 24 June (the lexicon).
  assert.deepEqual(at('Q347', '1938-03-30'), ['Franz Joseph II']);
  assert.deepEqual(office('Q347', 'hog', '1928-06-20'), []);
  assert.deepEqual(office('Q347', 'hog', '1928-06-24'), ['Prince Alfred of Liechtenstein']);
  assert.deepEqual(office('Q347', 'hog', '1928-06-14'), ['Gustav Schädler']);
  // Monaco: Piette's resignation was accepted on 15 January 1932 (Sovereign Ordinances 1277 and 1278) and Mauran acted
  // for Bouilloux-Lafont from 22 May 1937 (Ordinance 1.987; Ordinance 2.012 ended the mission formally on 31 May),
  // Journal de Monaco. Its Ministers of State are appointed officials, and
  // Dominica's acting President of 1979-80 sat for no party: none carries a party.
  assert.deepEqual(office('Q235', 'hog', '1932-01-14'), ['Maurice Piette']);
  assert.deepEqual(office('Q235', 'hog', '1937-05-21'), ['Maurice Bouilloux-Lafont']);
  assert.deepEqual(office('Q235', 'hog', '1937-05-22'), ['Henry Mauran']);
  assert.deepEqual(data.countries.Q235.offices.filter(o => o.parties), []);
  assert.deepEqual(data.countries.Q784.offices.filter(o => o.full === 'Jenner Armour' && o.parties), []);
  // Andorra: the General Council's own index of office holders and summary of its acts name two Syndics Font Altimir
  // and Molné Armengol; Pallarès left in August 1933; the Bishop Co-Prince Iglesias left on 29 April 1969 and Malla took
  // possession as Co-Prince on 19 June (the Council's acts of 30 April and 19 June 1969, Catalan Wikipedia).
  assert.deepEqual(at('Q228', '1925-01-01'), ['Pere Font Altimir']);
  assert.equal(find('Q228', 'Pere Font Altimir').name, 'Font');
  assert.deepEqual(at('Q228', '1936-08-01'), ['Francesc Molné Armengol']);
  assert.deepEqual(at('Q228', '1933-09-01'), []);
  assert.deepEqual(office('Q228', 'hos', '1969-05-15').filter(n => !/de Gaulle|Poher|Pompidou/.test(n)), []);
  assert.ok(data.countries.Q228.offices.some(o => o.full === 'Ramón Iglesias i Navarri' && o.end === '1969-04-29'));
  assert.ok(data.countries.Q228.offices.some(o => o.full === 'Ramón Malla Call' && o.start === '1969-06-19'));
  // San Marino: the sources say only that Lonfernini died in 1930, not how; compound family names are kept whole.
  assert.equal(find('Q238', 'Marino Lonfernini').exit, null);
  const family = Object.fromEntries(data.countries.Q238.leaders.map(l => [l.full, l.name]));
  for (const [full, name] of [['Domenico Suzzi Valli', 'Suzzi Valli'], ['Leonida Suzzi Valli', 'Suzzi Valli'], ['Angelo Manzoni Borghesi', 'Manzoni Borghesi'], ['Bartolomeo Manzoni Borghesi', 'Manzoni Borghesi'], ['Federico Pedini Amati', 'Pedini Amati'], ['Marino Valdes Franciosi', 'Franciosi']]) assert.equal(family[full], name, full);
});

// Small corrections (17 November 2026): three election dates from the Wikidata election fetch were wrong or missing for
// the states RT-04 added (scripts/election-corrections.mjs gives the sources). Saint Vincent's 2025 election was held on
// 27 November (Wikidata still gives the forecast 30 November); Grenada's 2026 election on 5 November 2026 (the cached
// fetch gave 30 June 2027); Grenada's 1967 election, which Wikidata files under Spain, was missing from Grenada, and its
// 2003 election showed under Spain too.
test('the election dates of Saint Vincent 2025 and Grenada 1967 and 2026 follow their sources, and none is filed under Spain', async () => {
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const vote = (key, title) => data.countries[key].events.filter(e => e.type === 'election' && e.text === title).map(e => e.date);
  assert.deepEqual(vote('Q757', '2025 Vincentian general election'), ['2025-11-27']);
  assert.deepEqual(vote('Q769', '2026 Grenadian general election'), ['2026-11-05']);
  // Since 21 November 2026 (review D3) an election is listed only inside its state's statehood: Grenada's of 1967, held
  // seven years before its independence (Wikidata: 1974), is taken from Spain and not listed.
  assert.deepEqual(vote('Q769', '1967 Grenadian general election'), []);
  assert.deepEqual(vote('Q769', '2003 Grenadian general election'), ['2003-11-27']);
  assert.deepEqual(data.countries.Q29.events.filter(e => /Grenad/.test(e.text)), [], 'no Grenadian election under Spain');
  const shown = async hash => {
    await open(hash);
    return page.$$eval('#panel .events li[data-type="election"]', els => els.map(e => `${e.querySelector('time').firstChild.textContent} ${e.querySelector('a').textContent}`));
  };
  assert.ok((await shown('#y=2025&c=Q757')).includes('27 Nov 2025 2025 Vincentian general election'));
  assert.ok((await shown('#y=2026&c=Q769')).includes('5 Nov 2026 2026 Grenadian general election'));
  assert.ok(!(await shown('#y=1967&c=Q769')).some(t => /Grenadian/.test(t)));
  assert.deepEqual((await shown('#y=1967&c=Q29')).filter(t => /Grenad/.test(t)), []);
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
  await open('#y=1945&f=1938&c=Q41304');
  assert.equal(await page.textContent('#year-big'), '1938–1945');
  assert.equal(await page.textContent('#year-label'), 'Period');
  assert.equal(await page.textContent('#legend-title'), 'In the period');
  assert.match(await page.textContent('.overview'), /2 leaders between 1938 and 1945/);
  assert.match(await page.textContent('#panel'), /In charge during 1938–1945/);
  assert.match(await page.textContent('#animate'), /Play 1938–1945 borders/);
  // The end handle pulled back onto the start: one year again, and no f in the address.
  await page.locator('#year').fill('1938');
  await page.locator('#year').dispatchEvent('input');
  assert.equal(await page.textContent('#year-big'), '1938');
  assert.match(page.url(), /#y=1938&c=Q41304$/);
  // The start handle pulled back from one year opens a period.
  await page.locator('#from').fill('1930');
  await page.locator('#from').dispatchEvent('input');
  assert.equal(await page.textContent('#year-big'), '1930–1938');
  assert.match(page.url(), /#y=1938&f=1930&c=Q41304$/);
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

// MP-12 (Jude, 17 November 2026: "Every map slider should have 3 small buttons which say "Independent Movement" "Move
// Together" and "Single Year" when you hover over them"): the three buttons, Move Together moving both handles with the
// span kept, Single Year one year, and the address's move= read back on a reload; an address without it opens as before.
test('the movement buttons: Move Together moves both handles with the span kept, Single Year shows one year, the address keeps it', async () => {
  const state = () => page.evaluate(() => ({ from: +document.querySelector('#from').dataset.value, to: +document.querySelector('#year').dataset.value,
    pressed: [...document.querySelectorAll('.prp-period-move[aria-pressed="true"]')].map(b => b.dataset.move), hash: location.hash }));
  await open('#y=1945&f=1938');
  const buttons = await page.locator('#period .prp-period-move').evaluateAll(bs => bs.map(b => [b.dataset.move, b.getAttribute('aria-label'), b.title]));
  assert.deepEqual(buttons, [['independent', 'Independent Movement', 'Independent Movement'], ['together', 'Move Together', 'Move Together'], ['single', 'Single Year', 'Single Year']]);
  assert.deepEqual((await state()).pressed, ['independent']);
  // Move Together: the end handle dragged three years back by the pointer takes the start along.
  await page.locator('[data-move="together"]').click();
  assert.match((await state()).hash, /#y=1945&f=1938&move=together$/);
  await page.waitForTimeout(800);
  const at = await page.locator('#year').evaluate(e => {
    const r = e.getBoundingClientRect(), t = parseFloat(getComputedStyle(e.closest('.prp-period')).getPropertyValue('--prp-period-thumb')) || 16, per = (r.width - t) / Math.max(1, +e.max - +e.min);
    return { x: r.left + t / 2 + (+e.value - +e.min) * per, y: r.top + r.height / 2, per };
  });
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) await page.mouse.move(at.x - (k / 2) * at.per, at.y);
  await page.mouse.up();
  let s = await state();
  assert.deepEqual([s.from, s.to], [1935, 1942], 'both handles moved three years, the span kept');
  assert.equal(await page.textContent('#year-big'), '1935–1942');
  // ‹ moves both one year.
  await page.locator('#prev').click();
  s = await state();
  assert.deepEqual([s.from, s.to], [1934, 1941]);
  // Single Year: the start on the end's year, one year shown, and the arrow keys move the one year.
  await page.locator('[data-move="single"]').click();
  s = await state();
  assert.deepEqual([s.from, s.to, s.pressed], [1941, 1941, ['single']]);
  assert.equal(await page.textContent('#year-big'), '1941');
  assert.match(s.hash, /#y=1941&move=single$/);
  await page.locator('#year').focus();
  await page.keyboard.press('ArrowLeft');
  s = await state();
  assert.deepEqual([s.from, s.to], [1940, 1940]);
  // A reload keeps Single and its year; the address without move= opens as before.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('path.shape').length > 50, null, { timeout: 30000 });
  s = await state();
  assert.deepEqual([s.from, s.to, s.pressed], [1940, 1940, ['single']]);
  assert.equal(await page.textContent('#year-big'), '1940');
  await page.goto('about:blank');
  await open('#y=1945&f=1938');
  s = await state();
  assert.deepEqual([s.from, s.to, s.pressed, s.hash], [1938, 1945, ['independent'], '#y=1945&f=1938']);
  assert.equal(await page.textContent('#year-big'), '1938–1945');
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
  await open('#y=1938&c=Q41304');
  const panel = await page.textContent('#panel');
  assert.equal(await page.textContent('#panel h2'), 'Germany');
  assert.match(panel, /Adolf Hitler/);
  assert.match(panel, /1938 German parliamentary election and referendum/);
  // Cliopatria's borders are by the year: the 1938 border differs from 1937's (Austria, the Sudetenland), dated by the
  // year only, and one year has no animation (the test of the free borders above).
  assert.match(panel, /1938border\s*Germany’s border in Cliopatria differs from 1937’s/);
  assert.match(panel, /Cliopatria’s border in 1938/);
  assert.ok(await page.locator('a[href*="wikipedia.org/wiki/1938_in_Germany"]').count(), 'year page link');
  assert.ok(await page.locator('a[href*="wikipedia.org/wiki/Adolf_Hitler"]').count(), 'leader link');
});

// Review X3 of 21 November 2026: a border event is a year in which a state's area in Cliopatria differs from the year
// before's by more than 1%, which may be a redrawing of Cliopatria's rows (#border-limit). The overview said "changes to
// its borders" (the United Kingdom in 2024); it, the legend, the tooltip, the table, the year's counts, the panel's
// headings and the method now say that Cliopatria's border differs, never that the border changed.
test('the overview, legend, tooltip, table and panel say Cliopatria’s border differs, not that the border changed', async () => {
  const changed = /border change|changes? (?:to|of) (?:its|the) borders?|they changed/i;
  await open('#y=2024&c=Q145');
  const overview = await page.textContent('.overview');
  assert.doesNotMatch(overview, changed, overview);
  assert.match(overview, /United Kingdom’s border in Cliopatria differs from 2023’s\./, overview);
  const panel = await page.textContent('#panel');
  assert.doesNotMatch(panel, changed, panel);
  assert.match(panel, /may be a redrawing of Cliopatria’s rows rather than a change of border/);
  const legend = await page.textContent('.legend');
  assert.doesNotMatch(legend, changed, legend);
  assert.match(legend, /Cliopatria’s border differs/);
  // Ukraine in 2024: no new leader, and its border in Cliopatria differs from 2023's, so that is its colour and label.
  await page.locator('path.shape[data-key="Q212"]').first().dispatchEvent('mousemove');
  assert.match(await page.textContent('#tooltip'), /Cliopatria’s border differs in 2024/);
  await page.click('#tab-table');
  await page.waitForSelector('#year-table tbody tr[data-key="Q212"]');
  assert.equal((await page.textContent('#year-table tbody tr[data-key="Q212"] .cell-status')).trim(), 'Cliopatria’s border differs');
  assert.doesNotMatch(await page.textContent('#year-table'), changed);
  await page.click('#tab-map');
  // Over a period: the overview counts the years, the heading and the button name no change.
  await open('#y=1939&f=1935&c=Q41304');
  assert.match(await page.textContent('.overview'), /Germany’s border in Cliopatria differs from the year before’s in 3 of the years 1935–1939\./);
  assert.doesNotMatch(await page.textContent('#panel'), changed);
  // The year with no state selected: its counts.
  await open('#y=2024');
  assert.doesNotMatch(await page.textContent('#panel .prp-kpis'), changed);
  assert.match(await page.textContent('#panel .prp-kpis'), /Borders that differ in Cliopatria\s*4/);
  assert.doesNotMatch(await page.textContent('footer'), /otherwise a change of borders/);
  assert.deepEqual(errors, []);
});

test('parties in power and the yearly overview follow the year', async () => {
  await open('#y=2010&c=Q145');
  await page.waitForSelector('#wiki-events li', { timeout: 15000 });
  const panel = await page.textContent('#panel');
  assert.match(panel, /Parties in power in 2010/);
  assert.match(panel, /Conservative Party/);
  assert.match(panel, /Labour Party/); // Brown until May, then Cameron
  assert.match(await page.textContent('.overview'), /2 leaders in 2010/);
  assert.ok(await page.locator('#wiki-events a[href*="2010_in_the_United_Kingdom"]').count(), 'Wikipedia source link');
});

// Over a period, the GIF has a frame for the period's first year and one for each year the border differs from the
// year before's (Germany 1935–1939: 1935, 1936, 1938 and 1939).
test('GIF download produces an animated GIF', async () => {
  await open('#y=1939&f=1935&c=Q41304');
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#gif')]);
  assert.match(download.suggestedFilename(), /Germany-1935-1939-borders\.gif/);
  const stream = await download.createReadStream();
  const chunks = []; for await (const c of stream) chunks.push(c);
  const buf = Buffer.concat(chunks);
  assert.equal(buf.subarray(0, 6).toString(), 'GIF89a');
  assert.ok(buf.length > 5000, `GIF is ${buf.length} bytes`);
});

test('border animation steps through the years of a period', async () => {
  await open('#y=1939&f=1935&c=Q41304');
  assert.match(await page.textContent('#panel'), /3 years in which Cliopatria’s border differs from the year before’s: 1936, 1938, 1939/);
  await page.click('#animate');
  await page.waitForSelector('#anim-label:not([hidden])');
  const first = await page.textContent('#anim-label');
  await page.waitForFunction(f => document.querySelector('#anim-label').textContent !== f, first, { timeout: 5000 });
  assert.equal(first, '1935');
  assert.equal(await page.textContent('#anim-label'), '1936');
});

// Jude, 14 November 2026: Russia's border changes zoomed in on Greenland. The Soviet Union / Russia crosses the 180th
// meridian (Chukotka), so its box ran from 20 E to 170 W; the United States and Canada had boxes padded past 180 W.
// The map is not rotated, so each box now stays within -180..180, and Russia's frames its main body. Once it has
// zoomed, the state's own centre (d3.geoCentroid of its shapes on that date) lies in the middle 60% of the map,
// also while its border changes play.
test('choosing a state across or near the 180th meridian zooms onto that state', async () => {
  // Since 20 November 2026 the rows are Cliopatria's, by the year (f to t), and stand for a state through c, cf and ct.
  const where = (key, year) => page.evaluate(async ([key, year]) => {
    const svg = document.querySelector('#map'), [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
    const topo = await (await fetch('data/borders.topo.json')).json();
    const all = topojson.feature(topo, topo.objects.borders).features, on = y => all.filter(f => f.properties.f <= y && y <= f.properties.t);
    const keyIn = (p, y) => (p.f <= y && y <= p.t && p.c && (p.cf == null || y >= p.cf) && (p.ct == null || y <= p.ct) ? p.c : null);
    // The projection the page draws with (app.js: fitted to the rows of 2024, the last year Cliopatria holds) and its zoom.
    const proj = d3.geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'FeatureCollection', features: on(2024) });
    const mine = on(year).filter(f => keyIn(f.properties, year) === key);
    const [x, y] = d3.zoomTransform(svg).apply(proj(d3.geoCentroid({ type: 'FeatureCollection', features: mine })));
    return [x / W, y / H];
  }, [key, year]);
  const inMiddle = ([fx, fy], what) => assert.ok(fx > 0.2 && fx < 0.8 && fy > 0.2 && fy < 0.8, `${what}: the state's centre at ${fx.toFixed(2)}, ${fy.toFixed(2)} of the map`);
  // The Soviet Union / Russia, the United States and Canada.
  for (const [y, key] of [[1950, 'Q15180'], [2000, 'Q15180'], [2000, 'Q30'], [2000, 'Q16']]) {
    await open(`#y=${y}&c=${key}`);
    await page.waitForTimeout(1200); // the zoom's 700 ms transition
    inMiddle(await where(key, y), `#y=${y}&c=${key}`);
  }
  // 1990–1992: Cliopatria's border of 1992 (the Russian Federation) differs from 1991's, so the period plays 1990, 1992.
  await open('#y=1992&f=1990&c=Q15180');
  await page.click('#animate');
  await page.waitForSelector('#anim-label:not([hidden])');
  await page.waitForTimeout(1200);
  const frame = +(await page.textContent('#anim-label'));
  inMiddle(await where('Q15180', frame), `while Russia's border changes play (${frame})`);
  assert.deepEqual(errors, []);
});

test('historical names follow the date', async () => {
  await open('#y=1960&c=Q15180');
  assert.equal(await page.textContent('#panel h2'), 'Soviet Union');
  await open('#y=2000&c=Q15180');
  assert.equal(await page.textContent('#panel h2'), 'Russia');
  await open('#y=1975&c=Q713750');
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
// Captains Regent of a semester rule together, so the overview joins them with "and"; Liechtenstein and San Marino have
// no row in Cliopatria, so the panel says VM cannot place them on a free border, not that they were not independent.
test('the panels of Montenegro and the microstates name their leaders (RT-04)', async () => {
  const leaders = () => page.$$eval('#panel .leader', els => els.map(e => ({ who: e.querySelector('.who a').textContent, tag: e.querySelector('.tag')?.textContent || '' })));
  await open('#y=2026&c=Q236');
  let l = await leaders();
  assert.ok(l.some(x => x.who === 'Milojko Spajić' && !x.tag), JSON.stringify(l));
  assert.ok(l.some(x => x.who === 'Jakov Milatović' && x.tag === 'Head of state'), JSON.stringify(l));
  await open('#y=2026&c=Q347');
  l = await leaders();
  assert.ok(l.some(x => /^Alois/.test(x.who) && !x.tag), JSON.stringify(l));
  assert.ok(l.some(x => x.who === 'Hans-Adam II' && x.tag === 'Head of state'), JSON.stringify(l));
  assert.match(await page.textContent('#panel .sub'), /VM cannot place Liechtenstein on a free border for 2026/);
  assert.doesNotMatch(await page.textContent('#panel .sub'), /Not an independent state/);
  await open('#y=1983&c=Q769');
  l = await leaders();
  const inCharge = l.filter(x => x.tag !== 'Head of state' && x.tag !== 'Head of government').map(x => x.who);
  for (const who of ['Maurice Bishop', 'Bernard Coard', 'Hudson Austin', 'Paul Scoon', 'Nicholas Brathwaite']) assert.ok(inCharge.includes(who), `${who} in ${inCharge.join(', ')}`);
  for (const who of ['Maurice Bishop', 'Bernard Coard', 'Hudson Austin']) assert.equal(l.find(x => x.who === who).tag, 'irregular entry', who);
  await open('#y=2020&c=Q238');
  const text = await page.textContent('#panel');
  for (const who of ['Luca Boschi', 'Mariella Mularoni', 'Alessandro Mancini', 'Grazia Zafferani', 'Alessandro Cardelli', 'Mirko Dolcini']) assert.match(text, new RegExp(who));
  assert.doesNotMatch(text, /No leader recorded/);
  assert.match(await page.textContent('.overview'), /Alessandro Mancini[^,]* and Grazia Zafferani/);
  // 1930: Gozi and Lonfernini served together, Lonfernini died on 10 September and Foschi joined Gozi on 16 September
  // (second reader, 16 November 2026: the overview read as if the three followed one another).
  await open('#y=1930&c=Q238');
  assert.match(await page.textContent('.overview'), /Manlio Gozi[^,]* and Marino Lonfernini[^,]* \(until 10 Sept 1930\), joined by Turiddu Foschi[^,]* \(from 16 Sept 1930\), then Valerio Pasquali/);
  await page.click('#tab-table');
  await page.waitForSelector('#year-table tbody tr');
  assert.equal(await page.locator('#year-table tbody tr[data-key="Q238"]').count(), 0, 'San Marino has no free border, so the table of states on the map leaves it out');
  assert.equal(await page.locator('#year-table tbody tr[data-key="Q235"]').count(), 1, 'Cliopatria draws Monaco, so the table lists it');
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
  await m.goto(`${BASE}/#y=1945&c=Q41304`, { waitUntil: 'networkidle' });
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
  // A leader is found by Archigos's start, which a leader that now takes Wikidata's dates keeps in `archigos`.
  const at = (key, start) => { const l = data.countries[key].leaders.find(x => (x.archigos?.start || x.start) === start); return [l.full, decodeURIComponent(l.url.split('/wiki/')[1])]; };
  assert.deepEqual(at('Q41', '2004-03-10'), ['Kostas Karamanlis', 'Kostas_Karamanlis']);
  assert.deepEqual(at('Q41', '2009-10-06'), ['George Papandreou', 'George_Papandreou']);
  assert.deepEqual(at('Q41', '1989-10-11'), ['Ioannis Grivas', 'Ioannis_Grivas']);
  assert.deepEqual(at('Q41', '1974-07-24'), ['Konstantinos Karamanlis', 'Konstantinos_Karamanlis']); // the uncle's own terms stay
  assert.deepEqual(at('Q39', '1963-01-01'), ['Willy Spühler', 'Willy_Spühler']);
  assert.deepEqual(at('Q39', '1968-01-01'), ['Willy Spühler', 'Willy_Spühler']);
  assert.equal(at('Q786', '1963-02-27')[1], 'Juan_Bosch_(politician)');
  assert.equal(at('Q211', '2000-05-05')[1], 'Andris_Bērziņš_(prime_minister)');
  assert.equal(at('Q20', '1926-03-03')[1], 'Ivar_Lykke_(politician)');
  assert.equal(at('Q189', '1963-11-14')[1], 'Bjarni_Benediktsson_(born_1908)');
  // Review R2 (21 November 2026): Czechia's first Prime Minister is Václav Klaus, not Austria's Chancellor Josef Klaus.
  assert.deepEqual(at('Q213', '1993-01-01'), ['Václav Klaus', 'Václav_Klaus']);
  assert.ok(!data.countries.Q213.leaders.some(l => /Josef Klaus/.test(l.full)), 'no Josef Klaus in Czechia');
  // 21 November 2026: Czechoslovakia's first President is Tomáš Masaryk, not Jan Masaryk.
  assert.deepEqual(at('Q33946', '1918-10-28'), ['Tomáš Masaryk', 'Tomáš_Masaryk']);
  assert.ok(!data.countries.Q33946.leaders.some(l => /Jan Masaryk/.test(l.full)), 'no Jan Masaryk as Czechoslovakia’s leader');
  const all = JSON.stringify(data);
  for (const wrong of ['Peter_Spuhler', 'Theodoros_Grivas']) assert.ok(!all.includes(wrong), wrong);
  // "Georgios Papandreou" is the elder's article (1888-1968, Q311207): since 27 November 2026 his own three terms link
  // it (Archigos's "G. Papandreou"), and nothing else does, so George Papandreou (born 1952) is never linked to it.
  const georgios = Object.entries(data.countries).flatMap(([k, c]) => [...c.leaders, ...c.offices, ...c.events].filter(x => x.url === 'https://en.wikipedia.org/wiki/Georgios_Papandreou').map(x => `${k} ${x.start || x.date}`));
  assert.deepEqual(georgios.sort(), ['Q41 1944-10-18', 'Q41 1944-10-18', 'Q41 1963-11-08', 'Q41 1963-11-08', 'Q41 1964-02-18', 'Q41 1964-02-18'], 'the elder\'s three terms and their arrivals only');
  assert.equal((all.match(/Georgios_Papandreou/g) || []).length, 6);
});

// E6 of the decisions of 17 November 2026: the footer says which elections are corrected, from what, how many and where
// the list is, read from the list itself (scripts/election-corrections.mjs), so the line cannot drift from it.
test('the footer says which election dates are corrected, from each election\'s Wikipedia article, and where the list is', async () => {
  const { ELECTIONS } = await import('../scripts/election-corrections.mjs');
  await open('');
  const line = (await page.textContent('#election-corrections')).replace(/\s+/g, ' ').trim();
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-one', 'Twenty-two', 'Twenty-three', 'Twenty-four', 'Twenty-five'];
  // "This site's copy of Wikidata", not "Wikidata": Grenada 2026 was wrong only in the build's cached fetch (Wikidata
  // itself now gives 5 November 2026), and Grenada 1967 and 2003 have Wikidata's right date under a wrong country.
  // "Votes" since 25 November 2026, when three independence referendums joined the list.
  assert.ok(line.startsWith(`${words[ELECTIONS.length]} votes are corrected where this site’s copy of Wikidata had the wrong date or country`), line);
  assert.ok(!/Wikidata dates wrongly|checked against a second source/.test(line), `claims no more than the list holds: ${line}`);
  const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
  const byState = new Map();
  for (const e of ELECTIONS) { const n = data.countries[e.key].name.replace(/ \/.*$/, ''); byState.set(n, [...(byState.get(n) || []), e.date.slice(0, 4)].sort()); }
  for (const [state, years] of byState) assert.ok(line.includes(`${state} ${years.length > 1 ? `${years.slice(0, -1).join(', ')} and ${years.at(-1)}` : years[0]}`), `${state} ${years}: ${line}`);
  for (const e of ELECTIONS) assert.ok(e.sources.some(s => /^English Wikipedia's article/.test(s)), `${e.title}: its Wikipedia article`);
  assert.match(line, /each takes its date and country from its English Wikipedia article/);
  assert.match(line, /listed, with their sources, in scripts\/election-corrections\.mjs/);
  assert.ok(!/'/.test(line), 'the typographic apostrophe');
});

// Review of 24-25 November 2026, build 1 (retrospective data: leaders, votes and state names).
const retro = () => json('data/countries.json').countries;
const leaderNames = c => (c.leaders || []).map(l => `${l.name}|${l.full || ''}`);

// retrospective-2: Archigos 4.1 says it is Stata release 118 (UTF-8) but stores Latin-1 bytes, which were read as
// U+FFFD; read-dta.mjs now reads them as Latin-1 where they are not valid UTF-8.
test('no leader\'s name holds a replacement character: Niinistö, Löfven, Løkke Rasmussen and Hernández read right (retrospective-2)', async () => {
  const { text } = await import('../scripts/read-dta.mjs');
  assert.equal(text(Buffer.from([0x4e, 0x69, 0x69, 0x6e, 0x69, 0x73, 0x74, 0xf6])), 'Niinistö', 'Latin-1 bytes');
  assert.equal(text(Buffer.from('Løkke', 'utf8')), 'Løkke', 'UTF-8 bytes');
  const countries = retro();
  assert.doesNotMatch(JSON.stringify(countries), /�/);
  const names = Object.values(countries).flatMap(leaderNames).join('\n');
  for (const n of ['Niinistö', 'Löfven', 'Løkke Rasmussen', 'Hernández', 'Saca González']) assert.ok(names.includes(n), n);
});

// retrospective-1: five names Archigos misspells, put right in leader-corrections.mjs from Wikidata and the leaders'
// English Wikipedia articles.
test('misspelt leaders\' names are put right: Henri Jaspar, Rodolfo Chiari, Max Petitpierre, Luis Alberto Monge, Mika Špiljak (retrospective-1)', () => {
  const countries = retro();
  const all = Object.values(countries).flatMap(leaderNames).join('\n');
  for (const wrong of ['Jasper', 'Rudolfo', 'Petipierre', 'Alverez', 'Spiljac']) assert.ok(!all.includes(wrong), wrong);
  const has = (key, start, full) => assert.ok(countries[key].leaders.some(l => (l.start === start || l.archigos?.start === start) && l.full === full), `${key} ${start} ${full}`);
  has('Q31', '1926-05-20', 'Henri Jaspar');
  has('Q804', '1924-10-01', 'Rodolfo Chiari');
  for (const y of ['1950', '1955', '1960']) has('Q39', `${y}-01-01`, 'Max Petitpierre');
  has('Q800', '1982-05-08', 'Luis Alberto Monge');
  has('Q191077', '1983-05-15', 'Mika Špiljak');
  // Two Spanish leaders took office on 19 July 1936; each keeps his own arrival.
  const spain = countries.Q29.events.filter(e => e.date === '1936-07-19' && e.type === 'leader').map(e => e.text).sort();
  assert.deepEqual(spain, ['Diego Martínez Barrio takes power', 'José Giral takes power']);
});

// retrospective-3: Stambolić handed over to Špiljak on 15 May 1983 (Archigos: 13 May); the arrival event moves with
// the start, and the corrections give the same data when run again.
test('Stambolić leaves and Špiljak arrives on 15 May 1983, and running the corrections again changes nothing (retrospective-3)', async () => {
  const check = (c, label) => {
    const stambolic = c.leaders.find(l => /Stamboli/.test(l.name) && l.start.startsWith('1982'));
    const spiljak = c.leaders.find(l => l.full === 'Mika Špiljak');
    assert.equal(stambolic?.end, '1983-05-15', `${label}: Stambolić's end`);
    assert.equal(spiljak?.start, '1983-05-15', `${label}: Špiljak's start`);
    assert.ok(c.events.some(e => e.date === '1983-05-15' && /Špiljak takes power/.test(e.text)), `${label}: arrival on 15 May`);
    assert.ok(!c.events.some(e => e.date === '1983-05-13' && /Špiljak|Spiljac/.test(e.text)), `${label}: no arrival on 13 May`);
  };
  const countries = retro();
  check(countries.Q191077, 'data');
  const { applyCorrections } = await import('../scripts/leader-corrections.mjs');
  const once = applyCorrections(structuredClone(countries));
  const twice = applyCorrections(structuredClone(once));
  check(once.Q191077, 'first run');
  assert.deepEqual(twice, once, 'a second run is safe');
});

// retrospective-5 and front-pages-2: votes of colonies, regions, cities and communities, and items that are not public
// votes, are left out by state and Wikidata item; the national votes a rule on "applies to" or a second country would
// have caught stay.
test('colonial, regional and local votes are not listed as the ruling state\'s, and the national ones stay (retrospective-5)', async () => {
  const { NOT_NATIONAL, NOT_VOTES } = await import('../scripts/election-corrections.mjs');
  const countries = retro();
  const titles = key => new Set((countries[key]?.events || []).filter(e => /election|referendum/.test(e.type)).map(e => e.text));
  for (const [key, , title] of [...NOT_NATIONAL, ...NOT_VOTES]) assert.ok(!titles(key).has(title), `${key}: ${title}`);
  assert.ok(NOT_NATIONAL.length > 100, 'the list');
  for (const [key, title] of [
    ['Q145', '1955 Jamaican general election'], ['Q142', '1962 Algerian independence referendum'], ['Q30', '2006 Navajo Nation presidential election'],
    ['Q15180', '1990 Lithuanian Supreme Soviet election'], ['Q191077', '2006 Montenegrin independence referendum'], ['Q17', '2019 Okinawan referendum']
  ]) assert.ok(!titles(key).has(title), `${key}: ${title}`);
  const keep = [
    ['Q35', '1939 Danish constitutional referendum'], ['Q35', '1939 Danish Folketing election'],
    ['Q35', '1972 Danish European Communities membership referendum'], ['Q229', '2004 Cypriot Annan Plan referendums'],
    ['Q142', '1962 French Évian Accords referendum'], ['Q41304', '1938 German parliamentary election and referendum'],
    // Second reading, 25 November 2026: three independence referendums Wikidata files under the Soviet Union or the SFR
    // Yugoslavia, held inside their own states' statehood on this site, are listed under those states.
    ['Q37', '1991 Lithuanian independence referendum'], ['Q212', '1991 Ukrainian independence referendum'],
    ['Q221', '1991 Macedonian independence referendum']
  ];
  for (const [key, title] of keep) assert.ok(titles(key).has(title), `${key} keeps ${title}`);
  for (const title of ['1991 Lithuanian independence referendum', '1991 Ukrainian independence referendum', '1991 Macedonian independence referendum']) {
    const holders = Object.entries(countries).filter(([, c]) => (c.events || []).some(e => e.text === title)).map(([k]) => k);
    assert.equal(holders.length, 1, `${title} is listed once: ${holders}`);
  }
  // Votes that were planned and never held (the European Constitution referendums of 2005-06 that were called off,
  // Greece 2011, Honduras 2009, Romania 2015) are gone, by the NOT_VOTES loop above; one by name for the record.
  assert.ok(!titles('Q145').has('United Kingdom European Constitution referendum'), 'the UK vote that was never held');
  assert.ok(titles('Q29').has('2005 Spanish European Constitution referendum'), 'the Spanish vote that was held stays');
  assert.ok([...titles('Q35')].filter(t => /Danish (general|Folketing) election/.test(t)).length > 20, 'the Danish general elections stay');
});

// retrospective-4: Ireland's constitutional referendums are titled by the amendment, and plebiscites by that word; the
// US vice presidential confirmations of 1973 and 1974 were votes of Congress, not of the electorate.
test('Ireland\'s amendment votes and the plebiscites are referendums, and the vice presidential confirmations are gone (retrospective-4)', async () => {
  const { voteType } = await import('../scripts/election-corrections.mjs');
  const countries = retro();
  const irish = countries.Q27.events.filter(e => /Amendment of the Constitution|Adoption of the Constitution/.test(e.text));
  assert.ok(irish.length >= 40, `${irish.length} Irish votes`);
  for (const e of irish) assert.equal(e.type, 'referendum', e.text);
  assert.equal(countries.Q16.events.find(e => e.text === '1942 Canadian conscription plebiscite')?.type, 'referendum');
  assert.equal(voteType('1969 Norwegian parliamentary election'), 'election');
  // Armenia's referendum of 5 April 2020 was postponed on 16 March 2020 and never held; the parliament adopted the
  // amendment on 22 June 2020 (second reading, 25 November 2026), so it is no vote at all.
  assert.ok(!countries.Q399.events.some(e => e.text === '2020 Armenian constitutional amendment'), 'no Armenian vote in 2020');
  assert.equal(voteType('2020 Armenian constitutional amendment'), 'election', 'not read as a referendum by its title');
  assert.ok(!countries.Q30.events.some(e => /vice presidential confirmation/.test(e.text)), 'no confirmation by Congress');
});

// retrospective-6 and front-pages-1: six election dates the cache holds to the month or wrong, each from its English
// Wikipedia article and a second source (scripts/election-corrections.mjs).
test('Norway 1969, Slovenia 1997, Jamaica 2025, Lithuania 2019 and 2024 and Croatia 2024 have their polling days (retrospective-6)', () => {
  const countries = retro();
  for (const [key, title, date] of [
    ['Q20', '1969 Norwegian parliamentary election', '1969-09-07'], ['Q215', '1997 Slovenian presidential election', '1997-11-23'],
    ['Q766', '2025 Jamaican general election', '2025-09-03'], ['Q37', '2019 Lithuanian presidential election', '2019-05-12'],
    ['Q37', '2024 Lithuanian presidential election', '2024-05-12'], ['Q224', '2024–25 Croatian presidential election', '2024-12-29'],
    // Second reading, 25 November 2026.
    ['Q37', '2004 Lithuanian presidential election', '2004-06-13'], ['Q37', '2014 Lithuanian presidential election', '2014-05-11'],
    ['Q213', '2016 Czech Senate election', '2016-10-07'], ['Q213', '2018 Czech Senate election', '2018-10-05']
  ]) {
    const found = countries[key].events.filter(e => e.text === title);
    assert.equal(found.length, 1, title);
    assert.equal(found[0].date, date, title);
    assert.equal(found[0].precision, undefined, `${title}: a day`);
  }
});

// Second reading, 25 November 2026 (front-pages-1, the correction it named for later): a vote's date is read from
// Wikidata with its precision, so a date held only to the month or the year is shown as "Mar 2009" or "2004", never as
// the 1st; where Wikidata also holds a day within the month, the earliest such day is shown.
const MONTH_ONLY = [
  ['Q214', '2009 Slovak presidential election'], ['Q213', '2024 Czech Senate election'], ['Q213', '2026 Czech Senate election'],
  ['Q783', '1930 Honduran legislative election'], ['Q783', '1965 Honduran presidential election'], ['Q218', '1933 Romanian general election'],
  ['Q15180', '1927 Soviet Union legislative election'], ['Q15180', '1929 Soviet Union legislative election'],
  ['Q15180', '1931 Soviet Union legislative election'], ['Q15180', '1936 Soviet Union legislative election']
];
test('a vote Wikidata dates only to the month is shown as the month, not as the 1st (front-pages-1)', async () => {
  const { pickDate } = await import('../scripts/election-corrections.mjs');
  assert.deepEqual(pickDate([['2004-06-01', 'month', 'preferred'], ['2004-06-13', 'day', 'normal'], ['2004-06-27', 'day', 'normal']]), { date: '2004-06-13', precision: 'day' });
  assert.deepEqual(pickDate([['2009-03-01', 'month', 'normal']]), { date: '2009-03-01', precision: 'month' });
  assert.deepEqual(pickDate([['1983-03-21', 'day', 'normal'], ['1983-03-20', 'day', 'normal']]), { date: '1983-03-20', precision: 'day' });
  assert.deepEqual(pickDate([['2010-05-01', 'month', 'preferred'], ['2011-02-02', 'day', 'normal']]), { date: '2010-05-01', precision: 'month' }, 'a day outside the month is not taken');
  assert.deepEqual(pickDate([['1990-01-01', 'day', 'deprecated']]), null);
  // A day outside the years the title names is not taken where days inside them exist.
  assert.deepEqual(pickDate([['2013-02-17', 'day', 'normal'], ['2008-02-24', 'day', 'normal']], '2013 Cypriot presidential election'), { date: '2013-02-17', precision: 'day' });
  assert.deepEqual(pickDate([['2016-11-20', 'day', 'normal'], ['2015-08-09', 'day', 'normal']], '2015–17 Haitian parliamentary election'), { date: '2015-08-09', precision: 'day' });
  const countries = retro();
  const vote = (key, title) => countries[key].events.find(e => e.text === title);
  // The votes the second reader found dated to the month by Wikidata (SPARQL, 25 November 2026) and shown as the 1st.
  for (const [key, title] of MONTH_ONLY) assert.equal(vote(key, title)?.precision, 'month', `${key} ${title}`);
  await open('#y=2009&c=Q214');
  const items = await page.$$eval('#panel .events li', els => els.map(li => li.textContent.replace(/\s+/g, ' ').trim()));
  assert.ok(items.some(t => /^Mar 2009 ?election/i.test(t) && t.includes('2009 Slovak presidential election')), items.join(' | '));
  // A month that is January is shown as the month too, not as the year alone (the page shows an unmarked 1 January
  // vote as its year).
  if (vote('Q15180', '1935 Soviet Union legislative election')?.precision === 'month') {
    await open('#y=1935&c=Q15180');
    const soviet = await page.$$eval('#panel .events li', els => els.map(li => li.textContent.replace(/\s+/g, ' ').trim()));
    assert.ok(soviet.some(t => /^Jan 1935 ?election/i.test(t)), soviet.join(' | '));
  }
});

// Builder 3, 27 November 2026: a date in VM's own lists that no free source gives to the day (John Compton's return in
// Saint Lucia in May 1982, Roc Pallarès's exile from Andorra in August 1933) is shown as the month in the panel's
// list, its events and its lanes, never as the 1st. Until that day the event read "1 May 1982".
test('a hand-built date known only to the month is shown as the month in the list, the events and the lanes', async () => {
  await open('#y=1982&c=Q760');
  const panel = (await page.textContent('#panel')).replace(/\s+/g, ' ');
  const events = await page.$$eval('#panel .events li', els => els.map(li => li.textContent.replace(/\s+/g, ' ').trim()));
  assert.ok(events.some(t => /^May 1982 ?leader/i.test(t) && t.includes('John Compton takes power')), events.join(' | '));
  assert.doesNotMatch(panel, /\b1 May 1982\b/);
  assert.match(panel, /May 1982 – 2 Apr 1996/);
  assert.match(panel, /17 Jan 1982 – May 1982/);
  await open('#y=1933&c=Q228');
  const andorra = (await page.textContent('#panel')).replace(/\s+/g, ' ');
  assert.match(andorra, /19 Dec 1927 – Aug 1933/);
  assert.doesNotMatch(andorra, /\b1 Aug 1933\b/);
  // Pallarès is in the head of government's lane, from Wikidata's offices or VM's list; where his bar is drawn, its
  // words give the month.
  const bars = await page.$$eval('#lanes-scroll .lane-bar', els => els.map(e => e.getAttribute('aria-label')));
  const pallares = bars.filter(b => b.includes('Pallarès'));
  for (const b of pallares) assert.match(b, /19 Dec 1927 to Aug 1933/, b);
  assert.ok(!bars.join(' | ').includes('1 Aug 1933'));
  await open('#y=1982&c=Q760');
  const lucia = await page.$$eval('#lanes-scroll .lane-bar', els => els.map(e => e.getAttribute('aria-label')));
  assert.ok(lucia.some(b => b.includes('John Compton, May 1982 to 2 Apr 1996')), lucia.join(' | '));
});

// Second reading, 25 November 2026: Bulgaria's Prime Minister of 2001-05 is named as he served, "Simeon
// Sakskoburggotski" (his article's lead), with a link to his article, "Simeon II", once he takes Wikidata's dates.
test('Bulgaria\'s Prime Minister of 2001 is Simeon Sakskoburggotski, linked to his article Simeon II', () => {
  const c = retro().Q219;
  const l = c.leaders.find(x => (x.archigos?.start || x.start) === '2001-07-24');
  assert.equal(l?.full, 'Simeon Sakskoburggotski');
  assert.equal(l.url, 'https://en.wikipedia.org/wiki/Simeon_II');
  assert.ok(c.events.some(e => e.date === l.start && e.text === 'Simeon Sakskoburggotski takes power'), 'the arrival');
  assert.ok(!c.events.some(e => /^Simeon II takes power/.test(e.text)), 'no regnal name in 2001');
});

// Second reading, 25 November 2026: a leader whose Wikidata item has no English label arrived as its item id
// ("Q5771800 takes power" for Claudia Sheinbaum, "Q20055561 takes power" for Rishi Sunak).
test('no arrival names a leader by a Wikidata id', () => {
  const countries = retro();
  for (const [key, c] of Object.entries(countries)) for (const e of c.events) assert.doesNotMatch(e.text, /\bQ\d+ takes power/, `${key} ${e.date}`);
  // She took office on 1 October 2024 (small corrections, D1, 26 November 2026; until then 30 September).
  assert.ok(countries.Q96.events.some(e => e.date === '2024-10-01' && e.text === 'Claudia Sheinbaum takes power'));
  assert.ok(countries.Q145.events.some(e => e.date === '2022-10-25' && e.text === 'Rishi Sunak takes power'));
});

// retrospective-7: Saudi Arabia was the Kingdom of Hejaz and Nejd until 23 September 1932, North Macedonia was
// Macedonia until 12 February 2019, and Ireland was the Irish Free State until 29 December 1937 (names.mjs).
test('Hejaz and Nejd, Macedonia and the Irish Free State are named by the date (retrospective-7)', async () => {
  const { displayName } = await import('../names.mjs');
  for (const [key, name, date, want] of [
    ['Q851', 'Saudi Arabia', '1932-09-22', 'Hejaz and Nejd'], ['Q851', 'Saudi Arabia', '1932-09-23', 'Saudi Arabia'],
    ['Q221', 'North Macedonia', '2019-02-11', 'Macedonia'], ['Q221', 'North Macedonia', '2019-02-12', 'North Macedonia'],
    ['Q27', 'Ireland', '1937-12-28', 'Irish Free State'], ['Q27', 'Ireland', '1937-12-29', 'Ireland']
  ]) assert.equal(displayName(key, name, date), want, `${key} ${date}`);
  const countries = retro();
  assert.ok(countries.Q221.events.some(e => e.type === 'statehood' && e.text === 'Macedonia becomes an independent state'), 'the stored statehood text');
  await open('#y=1930&c=Q851');
  assert.equal(await page.textContent('#panel h2'), 'Hejaz and Nejd');
  await open('#y=2000&c=Q221');
  assert.equal(await page.textContent('#panel h2'), 'Macedonia');
  await open('#y=1930&c=Q27');
  assert.equal(await page.textContent('#panel h2'), 'Irish Free State');
});
