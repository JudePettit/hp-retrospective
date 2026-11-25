// Build 6 of the ChatGPT page reviews (CONFIRMED.md, 25 November 2026): the Retrospective page at view time.
//   front-pages-3: a vote dated after today (Spain's general election of 29 November 2026) was listed and counted as if
//     held. It stays in data/countries.json (the Historical Calendar and the lake and National Analysis refreshes read
//     it), and the page marks it "scheduled" and leaves it out of every count, the overview and the table.
//   retrospective-8: "Irregular seizures 0" for every year after 2015, though how leaders took office comes from
//     Archigos 4.1, which ends in 2015. A period after 2015 now says "Not recorded after 2015"; one that crosses 2015
//     says its count runs only to 2015.
// The page reads today's date from the browser, so each test fixes the clock (Playwright's clock) to the day it needs.
//   RETRO_URL=http://localhost:8811 node --test tests/scheduled-and-seizures.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = (process.env.RETRO_URL || 'http://localhost:8095').replace(/\/$/, '');
const data = JSON.parse(readFileSync(new URL('../data/countries.json', import.meta.url), 'utf8'));
let browser;
const errors = [];

before(async () => { browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] }); }); // silent
after(async () => { await browser?.close(); });

// A page whose clock stands at `when` (an ISO instant), opened at `hash`, in the time zone `timezoneId` if given.
async function openAt(when, hash, timezoneId) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...(timezoneId ? { timezoneId } : {}) });
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(new Date(when));
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('path.shape').length > 50, null, { timeout: 30000 });
  return page;
}
const kpi = async (page, label) => {
  const text = (await page.textContent('#panel .prp-kpis')).replace(/\s+/g, ' ');
  const m = text.match(new RegExp(`${label}\\s*(\\d+)`));
  return m ? +m[1] : null;
};
// The KPI box for irregular seizures, by its label.
const irregular = async page => (await page.$$eval('#panel .prp-kpi', els => els.map(e => [...e.children].map(c => c.textContent.replace(/\s+/g, ' ').trim()).join(' ')))).find(t => /^Irregular seizures/.test(t)) ?? '';
const items = page => page.$$eval('#panel .events li', els => els.map(li => ({ text: li.textContent.replace(/\s+/g, ' ').trim(), scheduled: li.hasAttribute('data-scheduled') })));

const SPAIN = 'Q29', VOTE = '2026 Spanish general election';
const spainVote = data.countries[SPAIN].events.find(e => e.text === VOTE);

test('the data keeps the Spanish general election of 29 November 2026 for the calendar and refreshes that read it', () => {
  assert.ok(spainVote, 'the vote is still in data/countries.json');
  assert.equal(spainVote.date, '2026-11-29');
});

test('a vote dated after today is marked "scheduled" and is not counted; on its day it is listed and counted as held (front-pages-3)', async () => {
  const before = await openAt('2026-11-25T12:00:00Z', `#y=2026&c=${SPAIN}`);
  let list = await items(before);
  const vote = list.find(i => i.text.includes(VOTE));
  assert.ok(vote, list.map(i => i.text).join(' | '));
  assert.ok(vote.scheduled, `marked scheduled: ${vote.text}`);
  assert.match(vote.text, /^29 Nov 2026 ?scheduled election/i);
  assert.match(await before.textContent('#panel'), /dated after today and has not taken place yet, so it is not counted/);
  // Spain holds no other vote in 2026, so its overview names none.
  const others = data.countries[SPAIN].events.filter(e => e.date.startsWith('2026') && /^(election|referendum)$/.test(e.type) && e.date <= '2026-11-25');
  if (!others.length) assert.doesNotMatch(await before.textContent('#panel .overview'), /election/);
  // The year's figures across every state, and the table's count for Spain, leave the vote out.
  await before.goto(`${BASE}/#y=2026`, { waitUntil: 'networkidle' });
  await before.waitForSelector('#panel .prp-kpis');
  const votesBefore = await kpi(before, 'Elections, referendums');
  const scheduledAll = (await items(before)).filter(i => i.scheduled);
  assert.ok(scheduledAll.some(i => i.text.includes(VOTE)), 'the year list marks it too');
  assert.ok(scheduledAll.every(i => /scheduled/i.test(i.text)));
  await before.goto(`${BASE}/?view=table#y=2026`, { waitUntil: 'networkidle' });
  await before.waitForSelector('#year-table tbody tr');
  const row = async p => p.$eval(`#year-table tr[data-key="${SPAIN}"] td.num`, td => +td.textContent);
  const tableBefore = await row(before);
  await before.close();

  // On 30 November the vote is past: listed unmarked, counted once more, and in the overview.
  const afterDay = await openAt('2026-11-30T12:00:00Z', `#y=2026&c=${SPAIN}`);
  list = await items(afterDay);
  const held = list.find(i => i.text.includes(VOTE));
  assert.ok(held && !held.scheduled && !/scheduled/i.test(held.text), JSON.stringify(held));
  assert.match(await afterDay.textContent('#panel .overview'), /\d+ elections?/);
  await afterDay.goto(`${BASE}/#y=2026`, { waitUntil: 'networkidle' });
  await afterDay.waitForSelector('#panel .prp-kpis');
  const between = Object.values(data.countries).flatMap(c => c.events).filter(e => /^(election|referendum)$/.test(e.type) && e.date > '2026-11-25' && e.date <= '2026-11-30').length;
  assert.equal(await kpi(afterDay, 'Elections, referendums'), votesBefore + between);
  await afterDay.goto(`${BASE}/?view=table#y=2026`, { waitUntil: 'networkidle' });
  await afterDay.waitForSelector('#year-table tbody tr');
  assert.equal(await row(afterDay), tableBefore + 1);
  await afterDay.close();
  assert.deepEqual(errors, []);
});

// Second reading, 25 November 2026: "after today" is the reader's own date, not the date in UTC. On the evening of
// 28 November in Los Angeles (05:00 on the 29th in UTC) Spain's vote of 29 November is still to come there; on the
// morning of 29 November in Tokyo (20:00 on the 28th in UTC) it is being held.
test('a vote is "scheduled" until the reader\'s own date reaches it, whatever the date in UTC', async () => {
  const west = await openAt('2026-11-29T05:00:00Z', `#y=2026&c=${SPAIN}`, 'America/Los_Angeles');
  const w = (await items(west)).find(i => i.text.includes(VOTE));
  assert.ok(w?.scheduled, `Los Angeles, 28 November: ${JSON.stringify(w)}`);
  await west.close();
  const east = await openAt('2026-11-28T20:00:00Z', `#y=2026&c=${SPAIN}`, 'Asia/Tokyo');
  const e = (await items(east)).find(i => i.text.includes(VOTE));
  assert.ok(e && !e.scheduled, `Tokyo, 29 November: ${JSON.stringify(e)}`);
  await east.close();
  assert.deepEqual(errors, []);
});

test('no leader of a state Archigos covers has an entry after 2015, the premise of the note below', () => {
  for (const c of Object.values(data.countries)) {
    if (c.leaders.every(l => l.source === 'leader-lists')) continue; // VM's own lists give entry where a source says it
    for (const l of c.leaders) if (l.start > '2015-12-31' && l.source !== 'leader-lists') assert.equal(l.entry ?? null, null, `${c.name}: ${l.full || l.name}`);
  }
});

test('irregular seizures after 2015 are "Not recorded after 2015", not 0; a period across 2015 counts only to 2015 (retrospective-8)', async () => {
  const page = await openAt('2026-11-25T12:00:00Z', '#y=2020');
  const box = (await irregular(page)).replace(/\s+/g, ' ').trim();
  assert.equal(box, 'Irregular seizures Not recorded after 2015');
  assert.match(await page.textContent('#entry-note'), /^Irregular seizures of power are not recorded after 2015: how leaders took office comes from Archigos 4\.1, which ends in 2015, so for the states it covers/);
  assert.match(await page.textContent('#caption'), /not recorded after 2015/);
  // The opening period, 2025–2026, says the same.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#panel .prp-kpis');
  assert.match(await irregular(page), /Not recorded after 2015/);

  // 2010–2020: the count runs to 2015 and says so; it is the count for 2010–2015.
  await page.goto(`${BASE}/#y=2015&f=2010`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#panel .prp-kpis');
  const to2015 = await kpi(page, 'Irregular seizures');
  assert.ok(Number.isInteger(to2015), 'a number to 2015');
  assert.equal(await page.$('#entry-note'), null, 'no note for years to 2015');
  assert.doesNotMatch(await page.textContent('#caption'), /irregular seizure/i);
  await page.goto(`${BASE}/#y=2020&f=2010`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => /2010–2020/.test(document.querySelector('#panel h2')?.textContent || ''));
  assert.equal((await irregular(page)).replace(/\s+/g, ' ').trim(), `Irregular seizures, to 2015 ${to2015}`);
  assert.match(await page.textContent('#entry-note'), /^The count of irregular seizures of power runs only to 2015/);
  // The table says it too.
  await page.goto(`${BASE}/?view=table#y=2020`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#year-table tbody tr');
  assert.match(await page.textContent('#table-caption'), /Irregular seizures of power are not recorded after 2015/);
  // A single year to 2015 keeps its number and no note: 2015 itself.
  await page.goto(`${BASE}/#y=2015`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#panel .prp-kpis');
  assert.match((await irregular(page)).replace(/\s+/g, ' ').trim(), /^Irregular seizures \d+$/);
  await page.close();
  assert.deepEqual(errors, []);
});

test('the notes are plain text with typographic quotation marks and apostrophes', async () => {
  const page = await openAt('2026-11-25T12:00:00Z', `#y=2026&c=${SPAIN}`);
  const text = await page.textContent('#panel');
  assert.match(text, /The one marked “scheduled” is dated after today/);
  await page.goto(`${BASE}/#y=2020`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#entry-note');
  const note = await page.textContent('#entry-note');
  assert.match(note, /VM’s own lists for Montenegro and the ten microstates/);
  assert.ok(!/'/.test(note));
  await page.close();
});
