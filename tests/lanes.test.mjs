// Heads of state and government as lanes (the visualisation study's rank 2, built 25 November 2026): unit tests of
// the layout in lanes.js, then page tests of the lanes in the state panel (installed Edge via playwright-core).
//   RETRO_URL=http://localhost:8861 node --test tests/lanes.test.mjs   (the page tests need this folder served there;
//   without RETRO_URL they look for a server on port 8095, as tests/e2e.test.mjs does)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildModel, renderSvg, leftOut, laneOfPosition, partyOf, describe as describeTerm, DRAWN_SOURCES, LANES, MIN_BAR, pxPerYear, shortName, relationWords, barLabel, inProse, laneLabel, fitsWhole, SLOT_PATTERN, dayOf, oneOfficeWords } from '../lanes.js';
import { displayName } from '../names.mjs';

const read = f => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const data = read('data/countries.json');
const TODAY = '2026-11-25';
const opts = (links = []) => ({ firstYear: data.firstYear, lastYear: data.lastYear, today: TODAY, links });
const model = (key, links) => buildModel(data.countries[key], key, opts(links));
const terms = m => LANES.flatMap(l => m.lanes[l].terms);
// A made-up state for the layout rules (no figure from it is shown anywhere).
const fake = (leaders, offices = [], spans = [['1926-01-01', null]]) => ({ name: 'Testland', spans, leaders, offices, events: [] });
const L = (full, start, end, extra = {}) => ({ name: full.split(' ').at(-1), full, url: `https://en.wikipedia.org/wiki/${full.replace(/ /g, '_')}`, start, end, source: 'Wikidata', position: 'Prime Minister of Testland', ...extra });
const O = (office, full, start, end, extra = {}) => ({ office, full, url: `https://en.wikipedia.org/wiki/${full.replace(/ /g, '_')}`, start, end, ...extra });

/* ------------------------------------------------------------------ unit tests of the layout */

test('the leaders left out are counted from the data: those whose source is Archigos, for a state and in all', () => {
  const all = Object.values(data.countries).flatMap(c => c.leaders);
  const c = leftOut(data, 'Q851');
  assert.equal(c.all, all.filter(l => l.source === 'Archigos').length);
  assert.equal(c.allTotal, all.length);
  assert.equal(c.here, data.countries.Q851.leaders.filter(l => l.source === 'Archigos').length);
  assert.equal(c.hereTotal, data.countries.Q851.leaders.length);
  assert.ok(c.all > 0 && c.all < c.allTotal);
});

test('no leader whose source is Archigos is drawn, in any state; every other leader is drawn in a lane', () => {
  for (const [key, c] of Object.entries(data.countries)) {
    const m = model(key);
    assert.deepEqual(m.unplaced.map(t => t.full), [], `${c.name}: every free leader has a lane`);
    for (const t of terms(m)) if (t.kind === 'leader') assert.ok(DRAWN_SOURCES.has(t.rec.source), `${c.name}: ${t.full} is from ${t.rec.source}`);
    const drawn = new Set(terms(m).filter(t => t.kind === 'leader').map(t => t.rec));
    for (const l of c.leaders) if (l.source === 'Archigos') assert.ok(!drawn.has(l), `${c.name}: ${l.full || l.name} (Archigos) is drawn`);
  }
});

test('an office is read from its name: prime ministers, chancellors and presidents of a council lead governments', () => {
  assert.equal(laneOfPosition('Prime Minister of the United Kingdom'), 'government');
  assert.equal(laneOfPosition('Federal Chancellor of Austria'), 'government');
  assert.equal(laneOfPosition('Taoiseach'), 'government');
  assert.equal(laneOfPosition('Reich Chancellor in the Weimar Republic'), 'government');
  assert.equal(laneOfPosition('President of the Council of Ministers'), 'government');
  assert.equal(laneOfPosition('President of the United States'), 'state');
  assert.equal(laneOfPosition('King of Saudi Arabia'), 'state');
  assert.equal(laneOfPosition('President of the Swiss Confederation'), 'state');
  assert.equal(laneOfPosition('Something else'), null);
});

test('a leader who is also one of Wikidata\'s office holders for the term is drawn once, as the leader', () => {
  const c = fake([L('Ann Able', '1950-01-01', '1960-01-01')], [O('hog', 'Ann Able', '1950-01-02', '1960-01-01'), O('hos', 'Ben Bold', '1940-01-01', '1970-01-01')]);
  const m = buildModel(c, 'QTEST', opts());
  assert.equal(m.lanes.government.terms.length, 1);
  assert.equal(m.lanes.government.terms[0].kind, 'leader');
  assert.equal(m.lanes.state.terms.length, 1);
  assert.equal(m.lanes.state.terms[0].full, 'Ben Bold');
});

test('where one office leads both state and government, a leader with no office named stays in the list\'s lane', () => {
  // Wikidata gives the President of the United States as head of government (P6) from 1981 to 2025. Since 27 November
  // 2026 George H. W. Bush is drawn as head of state (HOS_GAPS), so every head of government drawn is the head of state
  // of the time: the leader stays in the list's lane (head of state) and the same person's term as head of government
  // goes with it, as for Mexico.
  const us = model('Q30');
  assert.equal(us.lanes.government.terms.length, 0);
  assert.equal(us.lanes.state.alsoGovernment, true);
  for (const name of ['Donald Trump', 'Joe Biden', 'Barack Obama', 'George H. W. Bush']) {
    const t = us.lanes.state.terms.find(x => x.full === name && x.start < '2025');
    assert.ok(t, `${name} as head of state`);
    assert.ok((t.alsoGovernment || []).some(g => g.lane === 'government' && g.start === t.start), `${name} as head of government, with the same term`);
  }
  assert.equal(us.lanes.state.terms.find(t => t.full === 'Ronald Reagan').kind, 'leader');
  // Where the leader before holds one office only, the office holders' lane stands (Bulgaria's Radev as Prime Minister).
  const c = fake([L('Ann Able', '1950-01-01', '1960-01-01'), L('Ben Bold', '1960-01-01', '1970-01-01', { position: undefined })],
    [O('hos', 'Ben Bold', '1960-01-01', '1970-01-01')]);
  assert.equal(buildModel(c, 'QTEST', opts()).lanes.state.terms[0].kind, 'leader');
  const d = fake([L('Ann Able', '1950-01-01', '1960-01-01'), L('Ben Bold', '1960-01-01', '1970-01-01', { position: undefined })],
    [O('hos', 'Ann Able', '1950-01-01', '1960-01-01'), O('hos', 'Ben Bold', '1960-01-01', '1970-01-01')]);
  const m = buildModel(d, 'QTEST', opts());
  // The two leaders are placed as heads of government; as each is the head of state of the time, with the same dates,
  // one lane stands for both offices and each leader's term goes with the same person's term as head of state (P1).
  assert.ok(m.lanes.government.folded);
  assert.deepEqual(m.lanes.state.terms.map(t => [t.full, t.kind, (t.alsoGovernment || []).map(g => [g.lane, g.kind])]),
    [['Ann Able', 'office', [['government', 'leader']]], ['Ben Bold', 'office', [['government', 'leader']]]]);
});

test('terms that overlap stack into rows; a hand-over a day apart does not', () => {
  const handover = buildModel(fake([], [O('hos', 'A One', '1950-01-01', '1960-01-02'), O('hos', 'B Two', '1960-01-01', '1970-01-01')]), 'QTEST', opts());
  assert.equal(handover.lanes.state.rows, 1);
  const pair = buildModel(fake([], [O('hos', 'A One', '1950-01-01', '1950-07-01'), O('hos', 'B Two', '1950-01-01', '1950-07-01'), O('hos', 'C Three', '1950-07-01', '1951-01-01')]), 'QTEST', opts());
  assert.equal(pair.lanes.state.rows, 2);
  assert.deepEqual(pair.lanes.state.terms.map(t => t.row), [0, 1, 0]);
  // A term of days inside another is an overlap.
  const acting = buildModel(fake([], [O('hog', 'A One', '1950-01-01', '1960-01-01'), O('hog', 'B Two', '1955-03-01', '1955-03-09')]), 'QTEST', opts());
  assert.equal(acting.lanes.government.rows, 2);
  // The real collective offices: San Marino's two Captains Regent, Bosnia's three members of the Presidency.
  assert.ok(model('Q238').lanes.state.rows >= 2);
  assert.ok(model('Q225').lanes.state.rows >= 3);
});

test('an end known only to the year runs to that year\'s end and is soft; a start known only to the year likewise', () => {
  const m = buildModel(fake([], [O('hos', 'A One', '1950-03-01', '1958-01-01', { endPrecision: 'year' }), O('hog', 'B Two', '1962-01-01', '1970-05-01', { startPrecision: 'year' })]), 'QTEST', opts());
  const [a] = m.lanes.state.terms, [b] = m.lanes.government.terms;
  assert.ok(a.softEnd && !a.softStart);
  assert.equal(new Date(a.e * 864e5).toISOString().slice(0, 10), '1959-01-01');
  assert.ok(b.softStart && !b.softEnd);
  assert.match(describeTerm(a), /^Head of state: A One, 1 Mar 1950 to 1958, /);
});

test('a term is coloured only by a party Wikidata dates for it; otherwise "party not dated" or "no party recorded"', () => {
  const t0 = Date.parse('1950-01-01') / 864e5, t1 = Date.parse('1960-01-01') / 864e5;
  assert.equal(partyOf({ parties: [{ name: 'Red', url: 'r', s: '1940-01-01', e: null }] }, t0, t1).status, 'dated');
  assert.equal(partyOf({ parties: [{ name: 'Red', url: 'r', s: '1961-01-01', e: null }] }, t0, t1).status, 'undated');
  assert.equal(partyOf({ parties: [{ name: 'Red', url: 'r', s: null, e: null }] }, t0, t1).status, 'undated');
  assert.equal(partyOf({ parties: [] }, t0, t1).status, 'none');
  // Two memberships each dated at one end only: the colour goes to the one with a date inside the term.
  const open = partyOf({ parties: [{ name: 'Old', url: 'o', s: '1930-01-01', e: null }, { name: 'New', url: 'n', s: null, e: '1959-10-18' }] }, t0, t1);
  assert.equal(open.main.name, 'New');
  const honecker = buildModel(data.countries.Q16957, 'Q16957', opts()).lanes.state.terms.find(t => t.full === 'Erich Honecker');
  assert.equal(honecker.party.main.name, 'Socialist Unity Party of Germany');
  const m = buildModel(fake([], [O('hog', 'A One', '1950-01-01', '1960-01-01', { parties: [{ name: 'Red', url: 'r', s: null, e: null }] })]), 'QTEST', opts());
  assert.equal(describeTerm(m.lanes.government.terms[0]), 'Head of government: A One, 1 Jan 1950 to 1 Jan 1960, party not dated');
  const n = buildModel(fake([], [O('hog', 'A One', '1950-01-01', null, { parties: [{ name: 'Red', url: 'r', s: '1945-01-01', e: null }] })]), 'QTEST', opts());
  assert.equal(describeTerm(n.lanes.government.terms[0]), 'Head of government: A One, 1 Jan 1950 to the present, Red');
  assert.equal(n.lanes.government.terms[0].slot, 1);
});

test('an open term followed by someone else\'s has no end recorded, and is drawn to the next start, soft', () => {
  const m = buildModel(fake([], [O('hog', 'A One', '2021-12-13', null), O('hog', 'B Two', '2022-08-02', '2023-06-06')]), 'QTEST', opts());
  const [a] = m.lanes.government.terms;
  assert.ok(a.noEnd && a.softEnd);
  assert.equal(m.lanes.government.rows, 1);
  assert.match(describeTerm(a), /to an end not recorded/);
  // Two co-holders, each succeeded by their own successor, keep their open terms (Andorra's Co-Princes).
  const co = buildModel(fake([], [O('hos', 'A One', '2017-05-14', null), O('hos', 'C Old', '2003-01-01', '2025-05-31'), O('hos', 'B Two', '2025-05-31', null)]), 'QTEST', opts());
  assert.ok(!co.lanes.state.terms.find(t => t.full === 'A One').noEnd);
});

test('terms outside the statehood are not drawn, and the years outside it are marked', () => {
  const m = buildModel(fake([], [O('hos', 'A One', '1930-01-01', '1938-01-01'), O('hos', 'B Two', '1945-01-01', '1950-01-01')], [['1926-01-01', '1940-06-17'], ['1990-05-04', null]]), 'QTEST', opts());
  assert.deepEqual(m.lanes.state.terms.map(t => t.full), ['A One']);
  assert.equal(m.gaps.length, 1);
  assert.equal(model('Q191').gaps.length, 1, 'Estonia between 1940 and 1991');
});

test('succession labels: the later holder of a link in the same state and lane, after the earlier or the one before', () => {
  const holders = [O('hos', 'A One', '1930-01-01', '1940-01-01', { qid: 'Q1' }), O('hos', 'R Regent', '1940-01-01', '1941-01-01', { qid: 'Q9' }),
    O('hos', 'B Two', '1941-01-01', '1950-01-01', { qid: 'Q2' }), O('hos', 'C Three', '1950-01-01', '1960-01-01', { qid: 'Q3' })];
  const links = [
    { country: 'QTEST', office: 'state', from: 'Q1', to: 'Q2', relation: 'son', property: 'P22', between: 'Q9' }, // the regent between
    { country: 'QTEST', office: 'state', from: 'Q2', to: 'Q3', relation: 'daughter', property: 'P22' },
    { country: 'QOTHER', office: 'state', from: 'Q3', to: 'Q1', relation: 'son', property: 'P22' }, // another state
    { country: 'QTEST', office: 'government', from: 'Q1', to: 'Q2', relation: 'son', property: 'P22' } // another lane
  ];
  const m = buildModel(fake([], holders), 'QTEST', opts(links));
  const [a, r, b, c] = m.lanes.state.terms;
  assert.equal(a.relation, undefined);
  assert.equal(r.relation, undefined);
  assert.equal(relationWords(b.relation), 'son of A One, who held the office before the previous holder');
  assert.equal(relationWords(c.relation), 'daughter of the previous holder');
  assert.equal(relationWords(c.relation, { short: true }), 'daughter');
  assert.match(describeTerm(c), /; daughter of the previous holder$/);
  // Past a holder the link does not name, it is not drawn: the bar between must be the regent or acting holder it names.
  const unnamed = buildModel(fake([], holders), 'QTEST', opts([{ ...links[0], between: undefined }]));
  assert.equal(unnamed.lanes.state.terms[2].relation, undefined);
  const other = buildModel(fake([], holders), 'QTEST', opts([{ ...links[0], between: 'Q8' }]));
  assert.equal(other.lanes.state.terms[2].relation, undefined);
  // A link between holders who are not next or next but one is not drawn.
  const far = buildModel(fake([], holders), 'QTEST', opts([{ country: 'QTEST', office: 'state', from: 'Q1', to: 'Q3', relation: 'grandson', property: 'P22' }]));
  assert.ok(far.lanes.state.terms.every(t => !t.relation));
  // By article, where the office holder is held without its item (most of Wikidata's are).
  const byUrl = buildModel(fake([], [O('hos', 'A One', '1930-01-01', '1940-01-01'), O('hos', 'B Two', '1940-01-01', '1950-01-01')]), 'QTEST',
    opts([{ country: 'QTEST', office: 'state', from: 'Q1', to: 'Q2', relation: 'brother', property: 'P3373', fromUrl: 'https://en.wikipedia.org/wiki/A_One', toUrl: 'https://en.wikipedia.org/wiki/B_Two' }]));
  assert.equal(byUrl.lanes.state.terms[1].relation?.relation, 'brother');
});

test('the drawing: one labelled list a lane, a named button a term, each bar at its own date, none under the minimum width or past the axis', () => {
  for (const key of ['Q145', 'Q238', 'Q225', 'Q39', 'Q38']) {
    const m = model(key);
    for (const close of [false, true]) {
      const px = pxPerYear(m, 343, close);
      const { svg, width: W } = renderSvg(m, { px, shown: { a: 1990, b: 1990, ref: '1990-12-31' } });
      const xOf = day => ((day - m.a0) / 365.2425) * px, byId = new Map(terms(m).map(t => [t.id, t]));
      assert.equal((svg.match(/role="list"/g) || []).length, 2, key);
      const bars = [...svg.matchAll(/<rect class="lane-bar[^"]*" data-id="([^"]+)" data-lane="(\w+)" data-index="\d+" x="([\d.]+)" y="(\d+)" width="([\d.]+)"[^>]*aria-label="([^"]+)"/g)]
        .map(([, id, lane, x, y, w, label]) => ({ id, lane, x: +x, y: +y, w: +w, label }));
      assert.equal(bars.length, terms(m).length, key);
      for (const b of bars) {
        assert.ok(b.w >= MIN_BAR - 1e-9, `${key} ${b.id} ${b.w}`);
        assert.match(b.label, /^Head of (state|government): .+, .+ to .+, .+/);
        // A bar starts at its own date (a short bar is widened, never moved), save one at the axis's end, which is
        // kept inside it; none runs past the axis.
        const at = xOf(byId.get(b.id).ds);
        assert.ok(Math.abs(b.x - at) <= 1 || (at > W - b.w && Math.abs(b.x - (W - b.w)) <= 0.02), `${key} ${b.id}: drawn at ${b.x}, its date at ${at.toFixed(2)}`);
        assert.ok(b.x + b.w <= W + 0.02, `${key} ${b.id} runs past the axis`);
      }
    }
  }
});

test('the scale fits the whole span to the box, at least 3 px a year, or 16 px a year in the closer view', () => {
  const m = model('Q145');
  assert.equal(m.from, 1926);
  assert.equal(m.to, data.lastYear);
  assert.equal(pxPerYear(m, 404, false), 4);
  assert.equal(pxPerYear(m, 200, false), 3);
  assert.equal(pxPerYear(m, 404, true), 16);
  const g = model('Q41304'); // Germany, 1926 to 1945
  assert.deepEqual([g.from, g.to], [1926, 1945]);
});

test('short names on narrow bars', () => {
  assert.equal(shortName({ full: 'Saud of Saudi Arabia', rec: {} }), 'Saud');
  assert.equal(shortName({ full: 'Fahd bin Abdulaziz Al Saud', rec: {} }), 'Fahd');
  assert.equal(shortName({ full: 'King Faisal bin Abdulaziz Al Saud', rec: {} }), 'Faisal');
  assert.equal(shortName({ full: 'Elizabeth II', rec: {} }), 'Elizabeth II');
  assert.equal(shortName({ full: 'Margaret Thatcher', rec: { name: 'Thatcher' } }), 'Thatcher');
  // Archigos-style short names keep the family name only ("Saito, M." is Saito).
  assert.equal(shortName({ full: 'Makoto Saito', rec: { name: 'Saito, M.' } }), 'Saito');
  // In China the family name comes first; in Japan the order varies, so a name with no short name of its own is cut.
  assert.equal(shortName({ full: 'Mao Zedong', rec: {} }, 'Q13426199'), 'Mao');
  assert.equal(shortName({ full: 'Li Keqiang', rec: {} }, 'Q13426199'), 'Li');
  assert.equal(shortName({ full: 'Fumio Kishida', rec: {} }, 'Q17'), null);
  assert.equal(barLabel({ full: 'Fumio Kishida', rec: {}, party: { status: 'none' } }, 60, 'Q17'), 'Fumio K…');
  assert.equal(barLabel({ full: 'Fumio Kishida', rec: {}, party: { status: 'none' } }, 60, 'Q30'), 'Kishida');
  // A monarch's name before " of " stands, never the country after it, and a comma before the title does not cut the
  // name (fixer, 26 November 2026).
  assert.equal(shortName({ full: 'William Alexander of the Netherlands', rec: {} }, 'Q55'), 'William Alexander');
  assert.equal(shortName({ full: 'Carl XVI Gustaf of Sweden', rec: {} }, 'Q34'), 'Carl XVI Gustaf');
  assert.equal(shortName({ full: 'Guillaume V, Grand Duke of Luxembourg', rec: {} }, 'Q32'), 'Guillaume V');
  assert.equal(shortName({ full: 'Charlotte, Grand Duchess of Luxembourg', rec: {} }, 'Q32'), 'Charlotte');
  assert.equal(shortName({ full: 'Patriarch Miron of Romania', rec: {} }, 'Q218'), 'Miron');
  // "Ibn Saud" is his whole name; "Saud" is his son's.
  assert.equal(shortName({ full: 'Ibn Saud', rec: {} }, 'Q851'), 'Ibn Saud');
  // A short name that is no run of the full name's words (Archigos's misspellings and initials) gives way to the rule
  // on the full name.
  assert.equal(shortName({ kind: 'leader', full: 'Neville Chamberlain', rec: { source: 'Wikidata', archigos: {}, name: 'Chamberlin' } }, 'Q145'), 'Chamberlain');
  assert.equal(shortName({ kind: 'leader', full: 'Gaston Thorn', rec: { source: 'Wikidata', archigos: {}, name: 'Thorn G.' } }, 'Q32'), 'Thorn');
  assert.equal(shortName({ kind: 'leader', full: 'George W. Bush', rec: { source: 'Wikidata', archigos: {}, name: 'G.W. Bush' } }, 'Q30'), 'Bush');
  // Particles: Portugal keeps the family name before one ("Rebelo de Sousa"), even where the build gave the last word;
  // the Netherlands keeps the last family name ("de Geer"); Irish "Ó" belongs to the name after it.
  assert.equal(shortName({ kind: 'office', full: 'Marcelo Rebelo de Sousa', rec: { name: 'Sousa' } }, 'Q45'), 'Rebelo de Sousa');
  assert.equal(shortName({ kind: 'office', full: 'Dirk Jan de Geer', rec: {} }, 'Q55'), 'de Geer');
  assert.equal(shortName({ kind: 'office', full: 'Cearbhall Ó Dálaigh', rec: {} }, 'Q27'), 'Ó Dálaigh');
});

// The fixer's sweeps (26 November 2026), over every term the lanes draw: a short name is none, or a run of the full
// name's words (commas aside), and never the country a monarch is "of".
test('every short name drawn is a run of the full name\'s words, and none is the country after " of "', () => {
  const bad = [];
  for (const [key, c] of Object.entries(data.countries)) for (const t of terms(model(key))) {
    const s = shortName(t, key);
    if (s == null) continue;
    const words = String(t.full).replace(/,/g, '').split(' '), sw = s.split(' ');
    if (!words.some((_, i) => words.slice(i, i + sw.length).join(' ') === s)) bad.push(`${key} ${t.full}: ${s}`);
    const after = String(t.full).match(/ of (?:the )?(.+)$/)?.[1];
    if (after && s.includes(after)) bad.push(`${key} ${t.full}: ${s}`);
    if (s === c.name || s === displayName(key, c.name, TODAY)) bad.push(`${key} ${t.full}: ${s} is the state's name`);
  }
  assert.deepEqual(bad, []);
});

// P2 (26 November 2026, the lanes verifier's note): "Cruz" was shown for Manuel Marrero Cruz, whose first family name
// is Marrero; in the Spanish way the last word is the mother's family name.
test('a Spanish double family name is never cut to the mother\'s name, and a short name keeps its accents (P2)', () => {
  const office = (full, name) => ({ kind: 'office', full, rec: { full, name } });
  const none = { status: 'none' };
  // Cuba's Prime Minister, as the build holds him (an office holder, with no short name of his own).
  assert.equal(shortName(office('Manuel Marrero Cruz'), 'Q241'), null);
  assert.equal(barLabel({ ...office('Manuel Marrero Cruz'), party: none }, 70, 'Q241'), 'Manuel Ma…');
  // Three names in the Spanish way may be one given name and two family names, or two and one: cut, never guessed.
  assert.equal(shortName(office('Juan Orlando Hernández', 'Hernández'), 'Q783'), null);
  // The build's last word for an office holder is no short name of its own (Peña Nieto, López Obrador).
  assert.equal(shortName(office('Enrique Peña Nieto', 'Nieto'), 'Q96'), null);
  assert.equal(shortName(office('Andrés Manuel López Obrador', 'Obrador'), 'Q96'), 'López Obrador');
  assert.equal(shortName(office('José Luis Rodríguez Zapatero', 'Zapatero'), 'Q29'), 'Rodríguez Zapatero');
  // Two family names joined by "i" or "y" are both given (Andorra's Co-Princes, Cuba's Céspedes).
  assert.equal(shortName(office('Joan Martí i Alanis', 'Alanis'), 'Q228'), 'Martí i Alanis');
  assert.equal(shortName(office('Justí Guitart i Vilardebó', 'Vilardebó'), 'Q228'), 'Guitart i Vilardebó');
  // A given name and one family name, with its particles.
  assert.equal(shortName(office('Felipe Calderón', 'Calderón'), 'Q96'), 'Calderón');
  assert.equal(shortName({ kind: 'leader', full: 'Miguel de la Madrid', rec: { source: 'Wikidata', archigos: {}, name: 'de La Madrid' } }, 'Q96'), 'de la Madrid');
  assert.equal(shortName({ kind: 'office', full: 'Éamon de Valera', rec: {} }, 'Q27'), 'de Valera');
  // Archigos's short name stands, in the full name's spelling (it gives "Diaz Ordaz" with no accents).
  assert.equal(shortName({ kind: 'leader', full: 'Gustavo Díaz Ordaz', rec: { source: 'Wikidata', archigos: {}, name: 'Diaz Ordaz' } }, 'Q96'), 'Díaz Ordaz');
  assert.equal(shortName({ kind: 'leader', full: 'José María Aznar', rec: { source: 'Wikidata', archigos: {}, name: 'Aznar' } }, 'Q29'), 'Aznar');
  assert.equal(shortName({ kind: 'leader', full: 'Eisaku Satō', rec: { source: 'Wikidata', archigos: {}, name: 'Sato' } }, 'Q17'), 'Satō');
  // In Portugal the father's family name comes last, so the last word stands; a king is named as a king.
  assert.equal(shortName(office('António de Oliveira Salazar', 'Salazar'), 'Q45'), 'Salazar');
  assert.equal(shortName(office('Juan Carlos I of Spain', 'Spain'), 'Q29'), 'Juan Carlos I');
  // In the data as built: no office holder of a Spanish-named state is shortened to his or her last word alone where
  // the name has three or more parts.
  for (const key of ['Q29', 'Q228', 'Q96', 'Q241', 'Q786', 'Q774', 'Q783', 'Q792', 'Q811', 'Q800', 'Q804']) {
    if (!data.countries[key]) continue;
    for (const t of terms(model(key))) {
      const w = t.full.split(' ').filter(x => !/^(de|del|la|las|los|y|i)$/.test(x));
      if (t.kind !== 'office' || w.length < 3 || /^[IVX]+$/.test(w.at(-1)) || / of /.test(t.full)) continue;
      assert.notEqual(shortName(t, key), w.at(-1), `${data.countries[key].name}: ${t.full}`);
    }
  }
  const cuba = terms(model('Q241')).find(t => t.full === 'Manuel Marrero Cruz');
  if (cuba) assert.notEqual(shortName(cuba, 'Q241'), 'Cruz');
  // Nor any leader drawn (Archigos's "Melgar", "Oduber", "Ydígoras" and the rest were the mother's or one of two family
  // names until the fixer's pass, 26 November 2026), except these nine, whose last word is the family name each is
  // known by, as his English Wikipedia article gives it (read that day; the leads give Elías Calles, Abelardo L. Rodríguez,
  // Reina Idiáquez, Hernández Alvarado, Molina Barraza, Duarte Fuentes, Moncada Tapia, Monge Álvarez and Rodríguez
  // Echeverría in full, and call each by the name drawn).
  const ONE_NAME = new Set(['Plutarco Elías Calles', 'Abelardo L. Rodríguez', 'Carlos Roberto Reina', 'Juan Orlando Hernández', 'Arturo Armando Molina',
    'José Napoleón Duarte', 'José María Moncada', 'Luis Alberto Monge', 'Miguel Ángel Rodríguez']);
  const last = [];
  for (const key of ['Q29', 'Q228', 'Q96', 'Q241', 'Q786', 'Q774', 'Q783', 'Q792', 'Q811', 'Q800', 'Q804']) {
    if (!data.countries[key]) continue;
    for (const t of terms(model(key))) {
      const w = t.full.split(' ').filter(x => !/^(de|del|la|las|los|y|i)$/.test(x));
      if (w.length < 3 || /^[IVX]+$/.test(w.at(-1)) || / of /.test(t.full) || ONE_NAME.has(t.full)) continue;
      if (shortName(t, key) === w.at(-1)) last.push(`${data.countries[key].name}: ${t.full}`);
    }
  }
  assert.deepEqual([...new Set(last)], []);
  // The bars the fixer's second readers named, as drawn.
  const drawn = (key, full) => terms(model(key)).filter(t => t.full === full).map(t => shortName(t, key));
  for (const [key, full, s] of [['Q783', 'Juan Alberto Melgar Castro', 'Melgar Castro'], ['Q800', 'Daniel Oduber Quirós', 'Oduber Quirós'],
    ['Q786', 'Salvador Jorge Blanco', 'Jorge Blanco'], ['Q774', 'Miguel Ydígoras Fuentes', 'Ydígoras Fuentes'], ['Q804', 'Daniel Chanis Pinzón', 'Chanis Pinzón'],
    ['Q241', 'Carlos Prío Socarrás', 'Prío Socarrás'], ['Q774', 'Álvaro Arzú', 'Arzú'], ['Q783', 'José Azcona del Hoyo', 'Azcona del Hoyo']]) {
    const got = drawn(key, full);
    assert.ok(got.length && got.every(x => x === s), `${full}: ${got.join(', ')}`);
  }
});

test('a bar names its party where the name and party both fit, else the name alone', () => {
  const t = { full: 'Ann Able', rec: {}, party: { status: 'dated', main: { name: 'Red Party' }, dated: [{ name: 'Red Party' }] } };
  assert.equal(barLabel(t, 200), 'Ann Able · Red Party');
  assert.equal(barLabel(t, 70), 'Ann Able');
  assert.equal(barLabel({ ...t, party: { status: 'undated' } }, 200), 'Ann Able');
});

test('every state\'s display name reads rightly inside a sentence, with "the" only where English puts it', () => {
  const THE = new Set(['United Kingdom', 'United States', 'Bahamas', 'Dominican Republic', 'Netherlands', 'Soviet Union', 'Federal Republic of Yugoslavia', 'Irish Free State']);
  const names = new Set();
  for (const [key, c] of Object.entries(data.countries)) for (let y = data.firstYear; y <= data.lastYear; y++) names.add(displayName(key, c.name, `${y}-12-31`));
  assert.ok(names.has('Federal Republic of Yugoslavia') && names.has('Irish Free State'));
  for (const n of names) assert.equal(inProse(n), THE.has(n) ? `the ${n}` : n, n);
});

test('the previous holder is the bar this term follows within a month; else it is not drawn and no link is spoken of', () => {
  // Slovakia's presidency was vacant from 3 March 1998 to 14 June 1999, so none is drawn: Rudolf Schuster's previous holder is not Michal Kováč, and the lane
  // says which years have no term drawn.
  const sk = model('Q214');
  const schuster = sk.lanes.state.terms.find(t => t.full === 'Rudolf Schuster');
  assert.equal(schuster.prev, null);
  assert.equal(schuster.prevGap, true);
  assert.equal(laneLabel(sk.lanes.state, 'state'), `Head of state: ${sk.lanes.state.terms.length} terms drawn; none drawn for 1998–1999`);
  // Where the term before is drawn within a month, it is the previous holder (Clinton follows George H. W. Bush, drawn
  // as head of state of the United States since 27 November 2026).
  const us = model('Q30');
  const clinton = us.lanes.state.terms.find(t => t.full === 'Bill Clinton');
  assert.equal(clinton.prev, us.lanes.state.terms.find(t => t.full === 'George H. W. Bush').id);
  assert.equal(clinton.prevGap, false);
  // A co-holder in another row is not the previous holder: each row follows its own.
  const co = buildModel(fake([], [O('hos', 'A One', '1950-01-01', '1950-07-01'), O('hos', 'B Two', '1950-01-01', '1950-07-01'),
    O('hos', 'C Three', '1950-07-01', '1951-01-01'), O('hos', 'D Four', '1950-07-01', '1951-01-01')]), 'QTEST', opts());
  const by = Object.fromEntries(co.lanes.state.terms.map(t => [t.full, t]));
  assert.equal(by['C Three'].prev, by['A One'].id);
  assert.equal(by['D Four'].prev, by['B Two'].id);
  // Andorra: Doumergue, the French Co-Prince, has no previous holder in his row, and Guitart, the other Co-Prince, is not it.
  const doumergue = model('Q228').lanes.state.terms.find(t => t.full === 'Gaston Doumergue');
  assert.equal(doumergue.prev, null);
  assert.equal(doumergue.prevGap, false);
});

test('a succession link is drawn only between the two terms it names (Nicaragua, Belgium)', () => {
  const links = read('data/succession.json').links;
  // Somoza García's link to his son is from his term of 1947 (Archigos, not drawn): Luis Somoza's bar has none.
  const ni = buildModel(data.countries.Q811, 'Q811', opts(links));
  assert.equal(ni.lanes.state.terms.find(t => t.full === 'Luis Somoza Debayle').relation, undefined);
  // Baudouin's reign is two statements; the link to Albert II, from the first, is still his previous holder's.
  const be = buildModel(data.countries.Q31, 'Q31', opts(links));
  assert.match(describeTerm(be.lanes.state.terms.find(t => t.full === 'Albert II of Belgium')), /; brother of the previous holder$/);
});

test('Liechtenstein: the reign is drawn from the office holders, the list\'s deputyships beside it, and one family link', () => {
  const links = read('data/succession.json').links;
  const m = buildModel(data.countries.Q347, 'Q347', opts(links));
  const st = m.lanes.state.terms;
  const ha = st.filter(t => t.full === 'Hans-Adam II');
  const reign = ha.find(t => !t.role);
  assert.deepEqual([reign.start, reign.end, reign.kind], ['1989-11-13', null, 'office']);
  const deputy = ha.find(t => t.role);
  assert.deepEqual([deputy.start, deputy.end, deputy.role], ['1984-08-26', '1989-11-13', 'exercising the reigning Prince’s powers']);
  assert.match(describeTerm(deputy), /^Head of state: Hans-Adam II, 26 Aug 1984 to 13 Nov 1989, exercising the reigning Prince’s powers, /);
  assert.ok(st.find(t => /^Alois/.test(t.full)).role, 'Alois acts for his father');
  assert.ok(st.find(t => t.full === 'Franz Joseph II' && t.start === '1938-03-30').role, 'Franz Joseph II acted for Franz I in 1938');
  // Only Hans-Adam II's reign carries a link to his father; no deputy has a previous holder or a link.
  assert.equal(relationWords(reign.relation), 'son of the previous holder');
  assert.ok(st.filter(t => t.role).every(t => !t.relation && !t.prev));
  assert.deepEqual(st.filter(t => t.relation).map(t => t.full), ['Franz I', 'Hans-Adam II']);
});

test('parties: "independent politician" is no party, and a membership a later one supersedes does not colour the term', () => {
  const t0 = dayOf('1950-01-01'), t1 = dayOf('1960-01-01');
  const ind = partyOf({ parties: [{ name: 'independent politician', url: 'https://en.wikipedia.org/wiki/Independent_politician', s: '1940-01-01', e: null }] }, t0, t1);
  assert.equal(ind.status, 'independent');
  const m = buildModel(fake([], [O('hog', 'A One', '1950-01-01', '1960-01-01', { parties: [{ name: 'independent politician', url: 'https://en.wikipedia.org/wiki/Independent_politician', s: '1940-01-01', e: null }] })]), 'QTEST', opts());
  assert.equal(describeTerm(m.lanes.government.terms[0]), 'Head of government: A One, 1 Jan 1950 to 1 Jan 1960, independent (no party)');
  assert.match(renderSvg(m, { px: 4, shown: { a: 1955, b: 1955, ref: '1955-12-31' } }).svg, /class="lane-bar party-independent/);
  // Liu Shaoqi: Wikidata's "independent politician" begins on the day his term as Chairman ended, so it is not his term's.
  const liu = model('Q13426199').lanes.state.terms.find(t => t.full === 'Liu Shaoqi');
  assert.notEqual(liu.party.status, 'independent');
  // Chen Gongbo: the Kuomintang of 1925 (no end) gives way to Wang Jingwei's Kuomintang of 1940.
  const chen = partyOf({ parties: [{ name: 'Kuomintang', url: 'k', s: '1925-01-01', e: null }, { name: 'Wang Jingwei regime Kuomintang', url: 'w', s: '1940-03-30', e: null }] }, dayOf('1944-11-20'), dayOf('1945-08-16'));
  assert.equal(chen.main.name, 'Wang Jingwei regime Kuomintang');
  assert.deepEqual(chen.dated.map(p => p.name), ['Wang Jingwei regime Kuomintang']);
  // An open membership begun long before the term still colours it where nothing follows (Xi Jinping, a member since 1974).
  assert.equal(partyOf({ parties: [{ name: 'Chinese Communist Party', url: 'c', s: '1974-01-01', e: null }] }, dayOf('2013-03-14'), dayOf('2026-11-26')).status, 'dated');
});

test('a lane names its years with no term drawn, and a lane that holds the same people as the other', () => {
  // The same people, where a head of government's term runs well past the same person's as head of state, so the
  // lane is drawn and says so (where the terms match, the lane is folded: the test after this one).
  const sp = buildModel(fake([], [O('hos', 'A One', '1926-01-01', '1950-01-01'), O('hos', 'B Two', '1950-01-01', null), O('hog', 'A One', '1940-01-01', '1952-01-01')]), 'QTEST', opts());
  assert.equal(sp.lanes.government.samePeople, true);
  assert.equal(sp.lanes.government.folded, null);
  assert.match(laneLabel(sp.lanes.government, 'government'), /; the same people as head of state; none drawn for 1926–1939, 1952–2026$/);
  assert.equal(model('Q145').lanes.government.samePeople, false);
  const m = buildModel(fake([], [O('hos', 'A One', '1926-01-01', '1950-01-01'), O('hos', 'B Two', '1950-02-15', null)]), 'QTEST', opts());
  assert.deepEqual(m.lanes.state.holes, [], 'a gap of six weeks is a hand-over');
  const n = buildModel(fake([], [O('hos', 'A One', '1926-01-01', '1950-01-01'), O('hos', 'B Two', '1951-01-01', null)]), 'QTEST', opts());
  assert.equal(n.lanes.state.holes.length, 1);
  assert.match(renderSvg(n, { px: 4, shown: { a: 1990, b: 1990, ref: '1990-12-31' } }).svg, /<rect class="lane-hole" data-lane="state"/);
});

// The fixer's pass (26 November 2026): Ireland's head of state's lane was hatched from 1926 to 2025, as Wikidata's head
// of state (P35) names only Catherine Connolly; the kings and the presidents before her are added from VM's list
// (scripts/leader-corrections.mjs, REIGNS), so no stretch of the lane is left with no term drawn.
test('Ireland: the kings to 1949 and the presidents from 1938 fill the head of state\'s lane', () => {
  const m = model('Q27');
  assert.deepEqual(m.lanes.state.holes, []);
  const st = m.lanes.state.terms;
  for (const [full, start] of [['George V', '1922-12-06'], ['Edward VIII', '1936-01-20'], ['George VI', '1936-12-12'], ['Douglas Hyde', '1938-06-25'], ['Michael D. Higgins', '2011-11-11']]) {
    assert.ok(st.some(t => t.full === full && t.start === start), `${full} from ${start}`);
  }
  // George VI and the President overlap from 1938 to 1949, in two rows.
  const g6 = st.find(t => t.full === 'George VI'), hyde = st.find(t => t.full === 'Douglas Hyde');
  assert.notEqual(g6.row, hyde.row);
});

// P1 (26 November 2026, the lanes verifier's note): Mexico's head of government's lane read "same people as head of
// state" over hatching from 1926 to 2024, as Wikidata names a head of government only from 2024, the President.
test('one person in both offices: no second lane of hatching, the words say so, and each term keeps its dates as head of government (P1)', () => {
  const c = fake([], [O('hos', 'A One', '1926-01-01', '1990-01-01'), O('hos', 'B Two', '1990-01-01', null), O('hog', 'B Two', '2020-03-01', null)]);
  const m = buildModel(c, 'QTEST', opts());
  assert.ok(m.lanes.government.folded, 'folded');
  assert.equal(m.lanes.government.terms.length, 0);
  assert.deepEqual(m.lanes.government.holes, []);
  const b = m.lanes.state.terms.find(t => t.full === 'B Two');
  assert.equal(b.alsoGovernment.length, 1);
  assert.equal(b.alsoGovernment[0].start, '2020-03-01');
  assert.match(describeTerm(b), /^Head of state and of government: B Two, 1 Jan 1990 to the present/);
  assert.match(describeTerm(m.lanes.state.terms.find(t => t.full === 'A One')), /^Head of state: A One/);
  assert.equal(oneOfficeWords(m, 'Testland'), 'One lane stands for both offices: the only head of government Wikidata records for Testland (from 2020) is the same person as the head of state of the time.');
  assert.match(laneLabel(m.lanes.state, 'state'), /so this lane stands for both offices/);
  const { svg, laneLabels } = renderSvg(m, { px: 4, shown: { a: 2021, b: 2021, ref: '2021-12-31' } });
  assert.equal([...svg.matchAll(/role="list"/g)].length, 1);
  assert.doesNotMatch(svg, /data-lane="government"/);
  assert.deepEqual(laneLabels.map(l => l.lane), ['state']);
  // Someone else as head of government: two lanes, as before.
  const two = buildModel(fake([], [O('hos', 'A One', '1926-01-01', null), O('hog', 'C Three', '2020-03-01', null)]), 'QTEST', opts());
  assert.equal(two.lanes.government.folded, null);
  assert.equal(oneOfficeWords(two, 'Testland'), '');
  assert.equal([...renderSvg(two, { px: 4, shown: { a: 2021, b: 2021, ref: '2021-12-31' } }).svg.matchAll(/role="list"/g)].length, 2);
  // In the data: Mexico (Wikidata's head of government from 2024 is its President), Cyprus and the Dominican Republic
  // are drawn in one lane; the United Kingdom, with Prime Ministers, in two; and Saudi Arabia in two, as its Prime
  // Minister has been Mohammed bin Salman, not the King, since 27 September 2022, and was Faisal, not King Saud, in
  // 1954-60 and from 1962 (VM's list, the fixer's pass of 26 November 2026; until then Wikidata's kings filled both).
  for (const key of ['Q96', 'Q229', 'Q786']) {
    const x = model(key);
    assert.ok(x.lanes.government.folded, data.countries[key].name);
    assert.deepEqual(x.lanes.government.holes, []);
    assert.ok(x.lanes.state.terms.some(t => t.alsoGovernment?.length), data.countries[key].name);
    assert.doesNotMatch(renderSvg(x, { px: 4, shown: { a: 2025, b: 2025, ref: '2025-12-31' } }).svg, /data-lane="government"/);
  }
  assert.match(oneOfficeWords(model('Q96'), 'Mexico'), /^One lane stands for both offices: (the only|every) head of government Wikidata records for Mexico \(from \d{4}\) is the same person as the head of state of the time\.$/);
  assert.equal(model('Q145').lanes.government.folded, null);
  const sa = model('Q851');
  assert.equal(sa.lanes.government.folded, null);
  assert.deepEqual(sa.lanes.government.terms.filter(t => t.start >= '2022-01-01').map(t => [t.full, t.start, t.open]), [['Mohammed bin Salman', '2022-09-27', true]]);
  assert.deepEqual(sa.lanes.government.terms.filter(t => /Faisal/.test(t.full)).map(t => [t.start, t.end]), [['1954-08-16', '1960-12-21'], ['1962-10-31', '1975-03-25']]);
  // The office dates from 9 October 1953: no head of government is drawn before it, and the lane says so.
  assert.ok(sa.lanes.government.terms.every(t => t.start >= '1953-10-09'));
  assert.match(laneLabel(sa.lanes.government, 'government'), /none drawn for 1926–1953/);
});

// P3 (26 November 2026): HANDOFF.md said nothing of the lanes; README.md named the wrong lane for the United States.
test('HANDOFF.md and README.md name the lanes\' files, and README\'s example of a lane with none drawn is the lane the model gives', () => {
  const text = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const handoff = text('HANDOFF.md'), readme = text('README.md');
  for (const f of ['lanes.js', 'data/succession.json', 'scripts/wikidata-succession.mjs', 'tests/lanes.test.mjs', 'tests/succession.test.mjs', 'npm run build-succession']) {
    assert.ok(handoff.includes(`\`${f}\``), `HANDOFF.md names ${f}`);
    assert.ok(readme.includes(`\`${f}\``), `README.md names ${f}`);
  }
  const m = model('Q214');
  const lane = LANES.find(l => laneLabel(m.lanes[l], l).includes('none drawn for 1998–1999'));
  assert.ok(lane, 'a lane of Slovakia has none drawn for 1998–1999');
  assert.ok(readme.includes(`Slovakia's head of ${lane}, "none drawn for 1998–1999"`), `README names the ${lane} lane`);
  // The United States is no longer the example: since 27 November 2026 its lanes are one (George H. W. Bush drawn).
  assert.ok(!readme.includes('"none drawn for 1989–1993"'));
  assert.ok(!LANES.some(l => laneLabel(model('Q30').lanes[l], l).includes('none drawn')));
});

test('short bars are painted over the long ones, and the list keeps date order; San Marino draws in under 100 ms', () => {
  const m = model('Q238');
  const px = pxPerYear(m, 343, false);
  renderSvg(m, { px, shown: { a: 1990, b: 1990, ref: '1990-12-31' } }); // warm
  // The quickest of five drawings, so that a machine busy with other work does not fail the test (the drawing took a
  // third of a second before the date formatters were made once).
  const times = [];
  for (let i = 0; i < 5; i++) { const t0 = performance.now(); renderSvg(m, { px, shown: { a: 1990, b: 1990, ref: '1990-12-31' } }); times.push(performance.now() - t0); }
  assert.ok(Math.min(...times) < 100, `${Math.min(...times).toFixed(0)} ms`);
  const { svg } = renderSvg(model('Q145'), { px: 4, shown: { a: 1990, b: 1990, ref: '1990-12-31' } });
  for (const [, lane, owns, body] of svg.matchAll(/<g role="list" class="lane" data-lane="(\w+)" aria-label="[^"]*" aria-owns="([^"]*)">(.*?)<\/g><\/g>(?=<g (?:role="list"|class="successions"|class="axis"))/gs)) {
    const ids = model('Q145').lanes[lane].terms.map(t => `li-${t.id}`);
    assert.deepEqual(owns.split(' '), ids, `${lane}: the list is read in date order`);
    assert.ok(body.includes(`id="${ids[0]}"`));
  }
  assert.equal([...svg.matchAll(/aria-owns=/g)].length, 2);
});

test('the closer view is where the lanes open when the whole span gives under 8 px a year', () => {
  const m = model('Q145');
  assert.equal(fitsWhole(m, 343), false);
  assert.equal(fitsWhole(m, 1000), true);
  // Hatched hues: slots 1 and 2 solid, the others hatched or cross-hatched.
  assert.deepEqual(Object.values(SLOT_PATTERN), ['', '', 'a', 'a', 'b', 'b', 'a', 'c']);
});

/* ------------------------------------------------------------------ page tests */

// As tests/e2e.test.mjs: the page tests run against RETRO_URL, else a server on port 8095.
const BASE = (process.env.RETRO_URL || 'http://localhost:8095').replace(/\/$/, '');
const pageTest = test;
let browser;
const errors = [];
before(async () => {
  const { chromium } = await import('playwright-core');
  browser = await chromium.launch({ channel: 'msedge', args: ['--mute-audio'] }); // test browsers stay silent
});
after(async () => { await Promise.race([browser?.close(), new Promise(r => setTimeout(r, 10000))]); });

// A page opened at `hash`, with data/succession.json served from `succession` (an object; null for a missing file;
// undefined for the real file) and data/countries.json from `countries` where given.
async function open(hash, { succession, countries, viewport = { width: 1440, height: 1000 }, colorScheme = 'light' } = {}) {
  const ctx = await browser.newContext({ viewport, colorScheme });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(new Date(`${TODAY}T12:00:00Z`));
  if (succession !== undefined) await page.route('**/data/succession.json', r => (succession === null ? r.fulfill({ status: 404, body: 'not here' }) : r.fulfill({ json: succession })));
  if (countries) await page.route('**/data/countries.json', r => r.fulfill({ json: countries }));
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#lanes', { timeout: 30000 });
  return page;
}
const close = page => page.context().close();
const n0 = x => x.toLocaleString('en-GB');
// The closer view (true) or the whole span (false), whichever the page opened in.
async function view(page, closer) {
  if (await page.getAttribute('#lanes-zoom', 'data-close') !== String(closer)) await page.click('#lanes-zoom');
  await page.waitForFunction(c => document.querySelector('#lanes-zoom')?.dataset.close === c, String(closer));
}
const detailOf = async (page, label) => {
  await page.locator(`#lanes .lane-bar[aria-label^="${label}"]`).first().click();
  return (await page.textContent('#lanes-detail')).replace(/\s+/g, ' ');
};

pageTest('the United Kingdom\'s panel draws two labelled lanes of terms, and keeps its list of leaders below', async () => {
  const page = await open('#y=1990&c=Q145');
  assert.equal(await page.textContent('#lanes-title'), `Heads of state and government, 1926–${data.lastYear}`);
  const lanes = await page.$$eval('#lanes [role="list"]', els => els.map(e => e.getAttribute('aria-label')));
  assert.equal(lanes.length, 2);
  assert.match(lanes[0], /^Head of state: \d+ terms? drawn/);
  assert.match(lanes[1], /^Head of government: \d+ terms drawn/);
  const labels = await page.$$eval('#lanes [data-lane="government"] .lane-bar', els => els.map(e => e.getAttribute('aria-label')));
  assert.ok(labels.some(l => /^Head of government: Margaret Thatcher, 4 May 1979 to 28 Nov 1990, /.test(l)), labels.join('\n'));
  // The list stays under the lanes: the text alternative, as before; the notes on what is drawn come after it.
  assert.ok(await page.locator('#panel h3', { hasText: 'In charge during 1990' }).count());
  const order = await page.evaluate(() => {
    const l = document.querySelector('#lanes'), h = [...document.querySelectorAll('#panel h3')].find(x => /In charge during/.test(x.textContent)), n = document.querySelector('#lanes-left-out');
    return !!(l.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(h.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  assert.ok(order, 'the list comes after the lanes, and the notes after the list');
  assert.ok(await page.locator('#panel .leader .who a', { hasText: 'Margaret Thatcher' }).count());
  assert.match(await page.textContent('#lanes-left-out'), /^Every leader VM’s list holds for the United Kingdom is drawn\./);
  // The caveats, near the lanes.
  const caveat = await page.textContent('#lanes-caveat');
  for (const words of ['time in office, not power', 'irregular entry (coups)', 'known only to the year', 'party not dated', 'no direct family link recorded', 'independent (no party)', 'hatched']) assert.ok(caveat.includes(words), words);
  assert.equal(await page.getAttribute('#lanes .lanes-svg', 'aria-describedby'), 'lanes-keys');
  await close(page);
  assert.deepEqual(errors, []);
});

pageTest('the line marks the year shown and moves with the period control', async () => {
  const page = await open('#y=1990&c=Q145');
  const at = () => page.$eval('#lanes .shown-line', e => +e.getAttribute('d').match(/^M([\d.]+)/)[1]);
  const x1990 = await at();
  assert.equal(await page.textContent('#lanes .shown-label'), '1990');
  await page.click('#next');
  await page.waitForFunction(() => document.querySelector('#lanes .shown-label')?.textContent === '1991');
  const x1991 = await at();
  const px = await page.evaluate(() => +document.querySelector('.lanes-svg').getAttribute('width') / (document.querySelectorAll('.lanes-svg .tick').length));
  assert.ok(Math.abs(x1991 - x1990 - px) < 0.5, `${x1990} → ${x1991}, ${px} px a year`);
  // A period: the band covers the years shown.
  await page.evaluate(() => { location.hash = '#y=1990&f=1980&c=Q145'; });
  await page.waitForFunction(() => document.querySelector('#lanes .shown-label')?.textContent === '1980–1990');
  await close(page);
});

pageTest('a bar keeps the focus when the year changes beneath it', async () => {
  const page = await open('#y=1990&c=Q145');
  const stop = page.locator('#lanes [data-lane="government"] .lane-bar[tabindex="0"]');
  await stop.focus();
  const id = await page.evaluate(() => document.activeElement.dataset.id);
  // The period control steps on (a click that does not take the focus, as Play does).
  await page.evaluate(() => document.querySelector('#next').click());
  await page.waitForFunction(() => document.querySelector('#lanes .shown-label')?.textContent === '1991');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('#lanes-scroll .lane-bar')?.dataset.id || null), id);
  assert.equal(await page.getAttribute(`#lanes .lane-bar[data-id="${id}"]`, 'tabindex'), '0');
  await close(page);
});

pageTest('each bar is reached by keyboard in date order, shows a focus ring, and Enter or Space opens its term', async () => {
  const page = await open('#y=1990&c=Q145');
  // The government lane's tab stop is the term at the date shown (Thatcher, to 28 November 1990, is followed by Major).
  const stop = page.locator('#lanes [data-lane="government"] .lane-bar[tabindex="0"]');
  assert.equal(await stop.count(), 1);
  await stop.focus();
  const first = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  assert.match(first, /^Head of government: John Major, /);
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).strokeWidth);
  await page.keyboard.press('ArrowLeft');
  assert.match(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), /^Head of government: Margaret Thatcher, /);
  assert.equal(ring, '3px', 'a visible focus ring');
  assert.equal(await page.getAttribute('#lanes-detail', 'aria-live'), 'off', 'nothing announced before a choice');
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('#lanes-detail', 'aria-live'), 'polite');
  const detail = (await page.textContent('#lanes-detail')).replace(/\s+/g, ' ');
  assert.match(detail, /Margaret Thatcher/);
  assert.match(detail, /Head of government \(Prime Minister of the United Kingdom\) · 4 May 1979 to 28 Nov 1990/);
  assert.match(detail, /Party not dated: Wikidata names Conservative Party/);
  assert.match(detail, /Source: Wikidata \(CC0\)/);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press(' ');
  assert.match(await page.textContent('#lanes-detail'), /John Major/);
  // Up to the other lane: the head of state at that time.
  await page.keyboard.press('ArrowUp');
  assert.match(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), /^Head of state: Elizabeth II, /);
  // Home and End: the first and last terms of the lane, in date order.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  const last = await page.evaluate(() => document.activeElement.dataset.index);
  const count = await page.locator('#lanes [data-lane="government"] .lane-bar').count();
  assert.equal(+last, count - 1);
  await close(page);
});

pageTest('a term\'s source is its own record: VM\'s own list in Monaco, Wikidata\'s head of state (P35) in the United Kingdom', async () => {
  const mc = await open('#y=2025&c=Q235');
  // Since 27 November 2026 the lists name only free sources (rulers.org allows not-for-profit use only).
  // Since the fixer's pass of 27 November 2026 it says "most entries", as not every entry has two sources.
  assert.match(await detailOf(mc, 'Head of government: Christophe Mirmand'), /Source: VM’s own list, built from Wikidata, Wikipedia’s lists and articles and the state’s official acts and records: most entries are read from two or more of them, and an entry that rests on one, or on sources that disagree, says so in scripts\/leader-lists\.mjs\./);
  assert.match(await mc.textContent('#lanes-source'), /and from VM’s own list/);
  assert.doesNotMatch(await mc.textContent('#lanes-source'), /rulers\.org/);
  await close(mc);
  const uk = await open('#y=1990&c=Q145');
  assert.match(await detailOf(uk, 'Head of state: Elizabeth II'), /Source: Wikidata \(CC0\): the state’s head of state \(P35\)\./);
  assert.doesNotMatch(await uk.textContent('#lanes-source'), /VM’s own list/);
  await close(uk);
  // George V is one of the heads of state Wikidata's P35 leaves out: his term names VM's list and his "position held"
  // (P39), never P35 as its source (fixer, 26 November 2026), and the note under the lanes says such terms are added.
  const g5 = await open('#y=1930&c=Q145');
  const d = await detailOf(g5, 'Head of state: George V');
  assert.doesNotMatch(d, /Source: Wikidata \(CC0\): the state’s head of state \(P35\)/);
  assert.match(d, /Source: VM’s list of heads of state that Wikidata’s head of state \(P35\) leaves out \(scripts\/leader-corrections\.mjs\): the person’s “position held” \(P39\)/);
  assert.match(await g5.textContent('#lanes-source'), /heads of state that Wikidata’s head of state \(P35\) leaves out, added in scripts\/leader-corrections\.mjs/);
  await close(g5);
  // France had no head of state drawn from 1926 to 1946 until 27 November 2026 (HOS_GAPS): Lebrun's term is drawn and
  // names its source.
  const fr = await open('#y=1935&c=Q142');
  assert.match(await detailOf(fr, 'Head of state: Albert Lebrun'), /Source: VM’s list of heads of state that Wikidata’s head of state \(P35\) leaves out \(scripts\/leader-corrections\.mjs\): the person’s “position held” \(P39\) in Wikidata \(CC0\)/);
  assert.match(await fr.textContent('#lanes-source'), /Wikipedia’s lists and articles or the state’s official pages/);
  await close(fr);
});

pageTest('Andorra: a Co-Prince\'s term does not name the other Co-Prince as the previous holder', async () => {
  const page = await open('#y=1928&c=Q228');
  const d = await detailOf(page, 'Head of state: Gaston Doumergue');
  assert.match(d, /Gaston Doumergue/);
  assert.doesNotMatch(d, /Guitart|previous holder/);
  await close(page);
});

pageTest('the page says how many leaders are left out, counted from the data, for the state and in all', async () => {
  const c = leftOut(data, 'Q851');
  const page = await open('#y=1990&c=Q851');
  const text = (await page.textContent('#lanes-left-out')).replace(/\s+/g, ' ');
  assert.ok(text.startsWith(`Archigos 4.1, whose page states no licence for reuse, gives the names and dates of ${n0(c.here)} of the ${n0(c.hereTotal)} leaders in VM’s list for Saudi Arabia, so those records are not drawn (${n0(c.all)} of the ${n0(c.allTotal)} leaders in VM’s lists in all).`), text);
  assert.match(text, /in the lanes anyway, from Wikidata’s own list of the office|stay in the list|only in the list/);
  // Two lanes, as the head of government was not always the King (VM's list, the fixer's pass of 26 November 2026):
  // Mohammed bin Salman in the government lane from 2022, with VM's list named as the source.
  assert.equal(await page.locator('#lanes [role="list"]').count(), 2);
  assert.equal(await page.locator('#lanes-one-office').count(), 0);
  assert.doesNotMatch(await page.getAttribute('#lanes [role="list"][data-lane="state"]', 'aria-label'), /stands for both offices/);
  const mbs = await detailOf(page, 'Head of government: Mohammed bin Salman');
  assert.match(mbs, /27 Sept? 2022 to the present/);
  assert.match(mbs, /Source: VM’s list \(scripts\/leader-corrections\.mjs\): English Wikipedia’s list “Prime Minister of Saudi Arabia”/);
  assert.match(await page.textContent('#lanes-source'), /terms put right in scripts\/leader-corrections\.mjs/);
  await close(page);
  // At phone width the lane names stay inside the frame, and the page does not scroll sideways.
  const phone = await open('#y=1990&c=Q851', { viewport: { width: 375, height: 800 } });
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on the page');
  assert.ok(await phone.evaluate(() => [...document.querySelectorAll('.lanes-names span')].every(s => s.getBoundingClientRect().right <= document.querySelector('.lanes-frame').getBoundingClientRect().right + 0.5)));
  await close(phone);
});

pageTest('a state whose leaders all come from Archigos, with no office holder held, shows the count and the reason, not an empty box', async () => {
  const copy = structuredClone(data);
  const key = Object.keys(copy.countries).find(k => copy.countries[k].leaders.every(l => l.source === 'Archigos')) || 'Q16957';
  copy.countries[key].offices = [];
  for (const l of copy.countries[key].leaders) l.source = 'Archigos';
  const page = await open(`#y=1980&c=${key}`, { countries: copy });
  assert.match(await page.textContent('#lanes-none'), /^No term can be drawn for .+: no head of state or government from Wikidata, and no leader from a source free to reuse, is held for it\.$/);
  const n = copy.countries[key].leaders.length;
  assert.match(await page.textContent('#lanes-left-out'), new RegExp(`gives the names and dates of ${n} of the ${n} leaders`));
  assert.equal(await page.locator('#lanes .lanes-svg').count(), 0);
  await close(page);
});

pageTest('succession labels from a fixture: "daughter of the previous holder" under the lane, and "no direct family link" otherwise', async () => {
  const fixture = { generated: TODAY, source: 'Wikidata (CC0)', query: 'test fixture', links: [
    { country: 'Q145', office: 'state', from: 'Q280856', to: 'Q9682', relation: 'daughter', property: 'P22', fromUrl: 'https://en.wikipedia.org/wiki/George_VI', toUrl: 'https://en.wikipedia.org/wiki/Elizabeth_II' }
  ] };
  const page = await open('#y=1990&c=Q145', { succession: fixture });
  await page.waitForFunction(() => document.querySelectorAll('#lanes .succession').length === 1);
  await view(page, true);
  const text = await page.textContent('#lanes .successions');
  assert.match(text, /daughter( of the previous holder)?/);
  const bar = page.locator('#lanes .lane-bar[aria-label^="Head of state: Elizabeth II"]');
  assert.match(await bar.getAttribute('aria-label'), /; daughter of the previous holder$/);
  await bar.focus();
  await page.keyboard.press('Enter');
  assert.match(await page.textContent('#lanes-detail'), /Daughter of the previous holder \(Wikidata, P22\)/);
  // The next holder has a previous holder and no link.
  await page.locator('#lanes .lane-bar[aria-label^="Head of state: Charles III"]').click();
  assert.match(await page.textContent('#lanes-detail'), /Relation to the previous holder, Elizabeth II: no direct family link between the two in Wikidata\./);
  assert.match(await page.textContent('#lanes-source'), /Family links between holders: Wikidata \(CC0\)/);
  await close(page);
});

pageTest('a name holding markup is shown as text, in the bar, the label under the lane and the detail', async () => {
  const copy = structuredClone(data);
  const george = copy.countries.Q145.offices.find(o => o.full === 'George VI');
  george.full = 'George <b>VI</b>';
  const fixture = { generated: TODAY, source: 'Wikidata (CC0)', query: 'test fixture', links: [
    { country: 'Q145', office: 'state', from: 'Q280856', to: 'Q43274', relation: 'grandson', property: 'P1038', between: 'Q9682', betweenUrl: 'https://en.wikipedia.org/wiki/Elizabeth_II', betweenName: 'Elizabeth II', fromUrl: 'https://en.wikipedia.org/wiki/George_VI', toUrl: 'https://en.wikipedia.org/wiki/Charles_III' }
  ] };
  const page = await open('#y=2023&c=Q145', { succession: fixture, countries: copy });
  await page.waitForFunction(() => document.querySelectorAll('#lanes .succession').length === 1);
  const d = await detailOf(page, 'Head of state: Charles III');
  assert.ok(d.includes('Grandson of George <b>VI</b>, who held the office before the previous holder (Wikidata, P1038).'), d);
  assert.equal(await page.locator('#lanes-detail b, #lanes .successions b, #lanes .lane b').count(), 0, 'no markup is made from a name');
  assert.ok(await page.locator('#lanes .lane-bar[aria-label^="Head of state: George <b>VI</b>"]').count());
  await close(page);
});

pageTest('with no succession file the lanes are drawn with no labels, no word on family links and no error', async () => {
  const before = errors.length;
  const page = await open('#y=1990&c=Q145', { succession: null });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#lanes .succession').count(), 0);
  await page.locator('#lanes .lane-bar[aria-label^="Head of state: Charles III"]').click();
  assert.doesNotMatch(await page.textContent('#lanes-detail'), /family link/);
  assert.doesNotMatch(await page.textContent('#lanes-source'), /Family links/);
  assert.ok(await page.locator('#lanes .lane-bar').count() > 10);
  await close(page);
  assert.equal(errors.length, before);
});

pageTest('the real succession file, where it exists, has the agreed shape and labels the United Kingdom\'s crown', async t => {
  if (!existsSync(new URL('../data/succession.json', import.meta.url))) { t.skip('data/succession.json is not built yet'); return; }
  const s = read('data/succession.json');
  assert.ok(s.generated && s.source && s.query && Array.isArray(s.links));
  for (const x of s.links) {
    assert.ok(data.countries[x.country], x.country);
    assert.ok(['state', 'government'].includes(x.office));
    assert.match(x.from, /^Q\d+$/); assert.match(x.to, /^Q\d+$/); assert.match(x.property, /^P\d+$/);
  }
  const uk = s.links.filter(x => x.country === 'Q145');
  if (!uk.length) { t.skip('no link for the United Kingdom'); return; }
  const page = await open('#y=1990&c=Q145');
  await page.waitForFunction(n => document.querySelectorAll('#lanes .succession').length >= n, uk.length);
  assert.match(await page.textContent('#lanes-source'), /Family links between holders: Wikidata \(CC0\)/);
  // A term whose previous holder is not drawn says so (Rudolf Schuster: Slovakia's presidency was vacant before him).
  await close(page);
  const sk = await open('#y=2000&c=Q214');
  await sk.waitForFunction(() => document.querySelector('#lanes-source'));
  assert.match(await detailOf(sk, 'Head of state: Rudolf Schuster'), /The previous holder is not drawn here, so no family link is shown\./);
  assert.match(await sk.getAttribute('#lanes [role="list"][data-lane="state"]', 'aria-label'), /; none drawn for 1998–1999/);
  assert.ok(await sk.locator('#lanes .lane-hole').count() >= 1);
  await close(sk);
});

pageTest('overlapping terms stack into rows, and the lane says how many: Bosnia and Herzegovina\'s Presidency', async () => {
  const page = await open('#y=2000&c=Q225');
  const rows = model('Q225').lanes.state.rows;
  assert.match(await page.textContent('.lanes-names'), new RegExp(`Head of state · ${rows} rows`));
  assert.match(await page.getAttribute('#lanes [role="list"][data-lane="state"]', 'aria-label'), new RegExp(`in ${rows} rows, as some overlap`));
  await close(page);
});

pageTest('at 1366 px the United Kingdom\'s lanes open where a name fits on the bars, one in each lane at least, and the United States\' one lane too', async () => {
  const page = await open('#y=1990&c=Q145', { viewport: { width: 1366, height: 900 } });
  for (const lane of LANES) {
    const names = await page.$$eval(`#lanes .lane[data-lane="${lane}"] .lane-text`, els => els.map(e => e.textContent).filter(Boolean));
    assert.ok(names.length >= 1, `${lane}: ${names.length} names`);
  }
  await close(page);
  // Since 27 November 2026 the United States has one lane for both offices (George H. W. Bush drawn as head of state).
  const us = await open('#y=1990&c=Q30', { viewport: { width: 1366, height: 900 } });
  assert.equal(await us.locator('#lanes [data-lane="government"]').count(), 0);
  const names = await us.$$eval('#lanes .lane[data-lane="state"] .lane-text', els => els.map(e => e.textContent).filter(Boolean));
  assert.ok(names.length >= 1, `state: ${names.length} names`);
  await close(us);
});

pageTest('Mexico: one lane for both offices, no hatched lane, the words under it, and the head of government\'s dates in the term (P1)', async () => {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 800 }]) {
    const page = await open('#y=2025&c=Q96', { viewport });
    assert.equal(await page.locator('#lanes [role="list"]').count(), 1);
    assert.equal(await page.locator('#lanes [data-lane="government"]').count(), 0, 'no lane and no hatching for the head of government');
    assert.doesNotMatch(await page.textContent('.lanes-names'), /Head of government/);
    const words = await page.textContent('#lanes-one-office');
    assert.match(words, /^One lane stands for both offices: (the only|every) head of government Wikidata records for Mexico \(from \d{4}\) is the same person as the head of state of the time\.$/);
    // The words come after the lanes and before the key.
    assert.ok(await page.evaluate(() => !!(document.querySelector('.lanes-frame').compareDocumentPosition(document.querySelector('#lanes-one-office')) & Node.DOCUMENT_POSITION_FOLLOWING)
      && !!(document.querySelector('#lanes-one-office').compareDocumentPosition(document.querySelector('#lanes-key')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on the page');
    const d = await detailOf(page, 'Head of state and of government: Claudia Sheinbaum');
    assert.match(d, /Head of state and of government/);
    assert.match(d, /As head of government: \d{1,2} \w+ 2024 to the present \(still in office\); source: Wikidata \(CC0\)/);
    await close(page);
  }
  // The United Kingdom keeps its two lanes.
  const uk = await open('#y=1990&c=Q145');
  assert.equal(await uk.locator('#lanes [role="list"]').count(), 2);
  assert.equal(await uk.locator('#lanes-one-office').count(), 0);
  await close(uk);
});

pageTest('Cuba: Manuel Marrero Cruz\'s bar is never labelled "Cruz", his mother\'s family name (P2)', async () => {
  const page = await open('#y=2025&c=Q241', { viewport: { width: 375, height: 800 } });
  for (const closer of [true, false]) {
    await view(page, closer);
    const names = await page.$$eval('#lanes .lane-text', els => els.map(e => e.textContent));
    assert.ok(!names.includes('Cruz'), names.join(' | '));
  }
  await close(page);
});

pageTest('at phone width (375 px) the lanes open in the closer view, scroll inside their own box, and the page does not', async () => {
  const hue = {};
  for (const colorScheme of ['light', 'dark']) {
    const page = await open('#y=1990&c=Q38', { viewport: { width: 375, height: 800 }, colorScheme });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on the page');
    assert.equal(await page.getAttribute('#lanes-zoom', 'data-close'), 'true', 'the closer view, as the whole span gives under 8 px a year');
    assert.equal(await page.textContent('#lanes-zoom'), 'Whole span');
    const box = await page.$eval('#lanes-scroll', e => ({ sw: e.scrollWidth, cw: e.clientWidth, left: e.scrollLeft }));
    assert.ok(box.sw > box.cw * 2, JSON.stringify(box));
    assert.ok(box.left > 0, 'scrolled to the year shown');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await page.locator('#lanes .tick-label').count() >= 9);
    await view(page, false);
    assert.equal(await page.textContent('#lanes-zoom'), 'Closer view');
    await view(page, true);
    // The party hues follow the theme: PRP's categorical token --prp-cat-1 (Italy has three parties or more).
    const edge = await page.$eval('#lanes .lane-bar.party-1', e => getComputedStyle(e).stroke);
    const token = await page.evaluate(() => { const s = document.createElement('span'); s.style.color = 'var(--prp-cat-1)'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; });
    assert.equal(edge, token);
    hue[colorScheme] = edge;
    await close(page);
  }
  assert.notEqual(hue.light, hue.dark, 'the hue differs by theme');
});

// Colour as a reader with deuteranopia or protanopia sees it (Machado, Oliveira and Fernandes 2009, severity 1), in
// OKLab; the bars' fills as the page mixes them (40% of the hue on the panel's surface; "party not dated" 19% of the
// text colour).
const MACHADO = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]
};
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const oklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
const seen = (rgb, mx) => { const v = rgb.map(lin); return oklab(mx.map(row => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])))); };
const deltaE = (a, b, mx) => { const p = seen(a, mx), q = seen(b, mx); return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

pageTest('no two party hues drawn alike are hard to tell apart, nor a solid hue from "party not dated", in either theme', async () => {
  const groups = {};
  for (const [s, p] of Object.entries(SLOT_PATTERN)) (groups[p || 'solid'] ||= []).push(+s);
  groups.solid.push('undated');
  for (const colorScheme of ['light', 'dark']) {
    const page = await open('#y=1990&c=Q38', { colorScheme });
    const tok = await page.evaluate(() => {
      const read = v => { const s = document.createElement('span'); s.style.color = `var(${v})`; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c.match(/[\d.]+/g).slice(0, 3).map(x => +x / 255); };
      return { surface: read('--prp-surface'), text: read('--prp-text'), cat: [1, 2, 3, 4, 5, 6, 7, 8].map(k => read(`--prp-cat-${k}`)) };
    });
    // The hatched hues are drawn hatched: each bar of such a slot is filled with its slot's pattern.
    const hatched = await page.$$eval('#lanes .lane-bar[class*=" pat-"]', els => els.map(e => { const slot = e.getAttribute('class').match(/party-(\d)/)[1]; return [slot, e.getAttribute('style'), !!document.getElementById(`lane-pat-${slot}`)]; }));
    assert.ok(hatched.length, 'Italy has hatched hues');
    for (const [slot, style, def] of hatched) { assert.ok(SLOT_PATTERN[slot], slot); assert.equal(style, `fill:url(#lane-pat-${slot})`); assert.ok(def); }
    await close(page);
    const mix = (a, p) => a.map((v, i) => v * p + tok.surface[i] * (1 - p));
    const fill = s => (s === 'undated' ? mix(tok.text, 0.19) : mix(tok.cat[s - 1], 0.4));
    for (const [name, mx] of Object.entries(MACHADO)) {
      for (const [g, slots] of Object.entries(groups)) {
        for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
          const d = deltaE(fill(slots[i]), fill(slots[j]), mx);
          assert.ok(d >= 5, `${colorScheme}, ${name}, ${g}: ${slots[i]} and ${slots[j]} differ by ${d.toFixed(1)}`);
        }
      }
    }
  }
});
