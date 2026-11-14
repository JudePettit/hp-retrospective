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
  assert.equal(await page.textContent('#year-big'), String(new Date().getUTCFullYear()));
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
