// Succession inside a family (25 November 2026, rank 2 of VM-VISUALISATION-STUDY.md: heads of state and government as
// lanes). data/succession.json, built by scripts/wikidata-succession.mjs from Wikidata (CC0), says where the later of two
// holders of one office in one state is the son, daughter, brother, sister, spouse or other relative of the earlier one.
// These tests read the files only (no browser):
//   node --test tests/succession.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RELATIONS, relationOf, nextOf, successions, linkOf, leaderOffices, lanesOf, stillHolds, BATCH } from '../scripts/wikidata-succession.mjs';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const succession = read('succession.json');
const { countries } = read('countries.json');
const day = d => Date.parse(`${d}T00:00:00Z`) / 864e5;
// Every record of a person holding an office in a state: its leaders and its heads of state and government.
const recordsOf = key => [...countries[key].leaders, ...(countries[key].offices || [])];

test('data/succession.json has the agreed shape', () => {
  assert.match(succession.generated, /^\d{4}-\d\d-\d\d$/);
  assert.equal(succession.source, 'Wikidata (CC0)');
  assert.ok(typeof succession.query === 'string' && /P22/.test(succession.query) && /P1039/.test(succession.query), 'the query is named');
  assert.ok(Array.isArray(succession.links) && succession.links.length > 0);
  for (const l of succession.links) {
    assert.ok(countries[l.country], `${l.country} is a key of data/countries.json`);
    assert.ok(['state', 'government'].includes(l.office), l.office);
    assert.match(l.from, /^Q\d+$/); assert.match(l.to, /^Q\d+$/);
    assert.ok(['P22', 'P25', 'P3373', 'P26', 'P40', 'P1038'].includes(l.property), l.property);
    assert.match(l.fromStart, /^\d{4}-\d\d-\d\d$/); assert.match(l.toStart, /^\d{4}-\d\d-\d\d$/);
  }
});

test('the relation words come from the list', () => {
  const words = ['son', 'daughter', 'brother', 'sister', 'father', 'mother', 'spouse', 'grandson', 'granddaughter', 'nephew', 'niece', 'other relative'];
  assert.deepEqual(RELATIONS, words);
  for (const l of succession.links) assert.ok(words.includes(l.relation), `${l.relation} (${l.fromName} to ${l.toName})`);
});

test('no link joins a person to themself, and each pair is listed once', () => {
  const seen = new Set();
  for (const l of succession.links) {
    assert.notEqual(l.from, l.to, `${l.fromName} in ${l.country}`);
    const k = `${l.country}|${l.office}|${l.from}|${l.to}`;
    assert.ok(!seen.has(k), `${k} twice`); seen.add(k);
  }
});

test('every id in a link belongs to a leader or office holder of that state in data/countries.json', () => {
  for (const l of succession.links) {
    for (const [qid, url, start, name] of [[l.from, l.fromUrl, l.fromStart, l.fromName], [l.to, l.toUrl, l.toStart, l.toName]]) {
      const records = recordsOf(l.country).filter(r => r.qid === qid || (url && r.url === url));
      assert.ok(records.length, `${name} (${qid}) holds no office of ${countries[l.country].name} in the data`);
      // Where the data gives the person's item, it is the link's (the article stands for the person otherwise).
      for (const r of records) if (r.qid && r.url === url) assert.equal(r.qid, qid, `${name}: the data's item is ${r.qid}`);
      assert.ok(records.some(r => r.start === start), `${name}'s term from ${start} is in the data`);
      assert.equal(succession.people[qid], url, `people names ${qid}'s article`);
    }
  }
  // The file holds no one but the people its links join: never a wider family tree.
  const inLinks = new Set(succession.links.flatMap(l => [l.from, l.to]));
  assert.deepEqual(Object.keys(succession.people).sort(), [...inLinks].sort());
});

test('the later holder of each link followed the earlier one in that office', () => {
  for (const l of succession.links) {
    const from = recordsOf(l.country).find(r => (r.qid === l.from || r.url === l.fromUrl) && r.start === l.fromStart);
    assert.ok(l.toStart > l.fromStart, `${l.toName} starts after ${l.fromName}`);
    assert.ok(from.end, `${l.fromName}'s term from ${l.fromStart} has ended`);
    assert.ok(day(l.toStart) >= day(from.end) - 31, `${l.toName} (${l.toStart}) starts no earlier than 31 days before ${l.fromName} leaves (${from.end})`);
    if (l.between) assert.match(l.between, /^Q\d+$/);
  }
});

// Each of these was read on Wikidata on 25 November 2026 from both items (Special:EntityData), both ways: the later
// holder's father (P22) or mother (P25) or sibling (P3373), and the earlier's child (P40) or sibling. Akihito, the son of
// Hirohito, is not here: Wikidata's head of state of Japan (P35, which data/countries.json holds) starts with Akihito, so
// Hirohito holds no office of Japan in the data and the lanes cannot draw that succession.
const KNOWN = [
  ['Q145', 'state', 'Q280856', 'Q9682', 'daughter', 'Elizabeth II is the daughter of George VI'],
  ['Q145', 'state', 'Q9682', 'Q43274', 'son', 'Charles III is the son of Elizabeth II'],
  ['Q145', 'state', 'Q590227', 'Q280856', 'brother', 'George VI is the brother of Edward VIII'],
  ['Q17', 'state', 'Q37979', 'Q217096', 'son', 'Naruhito is the son of Akihito'],
  ['Q851', 'state', 'Q151509', 'Q244206', 'son', 'Saud is the son of Ibn Saud'],
  ['Q851', 'state', 'Q244206', 'Q217167', 'brother', 'Faisal is the brother of Saud'],
  ['Q851', 'state', 'Q57298', 'Q367825', 'brother', 'Salman is the brother of Abdullah'],
  ['Q55', 'state', 'Q150747', 'Q154946', 'daughter', 'Juliana is the daughter of Wilhelmina'],
  ['Q35', 'state', 'Q151312', 'Q102139', 'daughter', 'Margrethe II is the daughter of Frederik IX'],
  ['Q31', 'state', 'Q12973', 'Q12976', 'son', 'Baudouin is the son of Leopold III'],
  ['Q235', 'state', 'Q185025', 'Q3910', 'son', 'Albert II of Monaco is the son of Rainier III'],
  ['Q218', 'state', 'Q930013', 'Q212897', 'father', 'Carol II of Romania is the father of Michael I, whom he followed in 1930'],
  ['Q241', 'state', 'Q11256', 'Q46809', 'brother', 'Raúl Castro is the brother of Fidel Castro'],
  ['Q781', 'government', 'Q561911', 'Q365451', 'son', 'Lester Bird is the son of Vere Bird']
];
test('well-known successions inside a family are present, each confirmed on Wikidata', () => {
  for (const [country, office, from, to, relation, what] of KNOWN) {
    const l = succession.links.find(x => x.country === country && x.office === office && x.from === from && x.to === to);
    assert.ok(l, `missing: ${what}`);
    assert.equal(l.relation, relation, what);
  }
});

test('relation words say what the later holder is to the earlier, from either side of the statement', () => {
  const M = 'Q6581097', F = 'Q6581072';
  // The later holder's father (P22) is the earlier: a son; the earlier's child (P40) is the later: a daughter.
  assert.equal(relationOf({ a: 'Qto', prop: 'P22', b: 'Qfrom' }, 'Qfrom', 'Qto', M), 'son');
  assert.equal(relationOf({ a: 'Qfrom', prop: 'P40', b: 'Qto' }, 'Qfrom', 'Qto', F), 'daughter');
  // The earlier holder's father is the later (Carol II after Michael I, 1930).
  assert.equal(relationOf({ a: 'Qfrom', prop: 'P22', b: 'Qto' }, 'Qfrom', 'Qto', M), 'father');
  assert.equal(relationOf({ a: 'Qto', prop: 'P3373', b: 'Qfrom' }, 'Qfrom', 'Qto', F), 'sister');
  assert.equal(relationOf({ a: 'Qfrom', prop: 'P26', b: 'Qto' }, 'Qfrom', 'Qto', F), 'spouse');
  // A relative (P1038) with its kinship (P1039, what the value is to the subject), turned round where it is the later's.
  assert.equal(relationOf({ a: 'Qto', prop: 'P1038', b: 'Qfrom', kin: 'paternal grandfather' }, 'Qfrom', 'Qto', M), 'grandson');
  assert.equal(relationOf({ a: 'Qto', prop: 'P1038', b: 'Qfrom', kin: 'uncle' }, 'Qfrom', 'Qto', F), 'niece');
  assert.equal(relationOf({ a: 'Qfrom', prop: 'P1038', b: 'Qto', kin: 'nephew' }, 'Qfrom', 'Qto', M), 'nephew');
  assert.equal(relationOf({ a: 'Qfrom', prop: 'P1038', b: 'Qto', kin: 'son-in-law' }, 'Qfrom', 'Qto', M), 'other relative');
  assert.equal(relationOf({ a: 'Qto', prop: 'P1038', b: 'Qfrom' }, 'Qfrom', 'Qto', M), 'other relative');
  // A son or daughter whose sex Wikidata does not give is only a relative.
  assert.equal(relationOf({ a: 'Qto', prop: 'P22', b: 'Qfrom' }, 'Qfrom', 'Qto', undefined), 'other relative');
  // Found both ways, the link is kept once and marked so.
  const both = linkOf([{ a: 'Qto', prop: 'P25', b: 'Qfrom' }, { a: 'Qfrom', prop: 'P40', b: 'Qto' }], 'Qfrom', 'Qto', M);
  assert.deepEqual([both.relation, both.property, both.bothWays], ['son', 'P25', true]);
  assert.equal(linkOf([{ a: 'Qx', prop: 'P22', b: 'Qy' }], 'Qfrom', 'Qto', M), null);
});

test('who follows whom: the next holder, a regent passed over, and the same term under two names', () => {
  const t = (qid, start, end, position = null) => ({ qid, start, end, position });
  // Albert I, Leopold III, Baudouin: each is the next holder.
  const lane = [t('Qa', '1909-12-23', '1934-02-17'), t('Qb', '1934-02-23', '1951-07-16'), t('Qc', '1951-07-17', '1993-07-31')];
  assert.deepEqual(successions(lane, () => false).map(s => `${s.from.qid}>${s.to.qid}`), ['Qa>Qb', 'Qb>Qc']);
  // A regent between a king and his son: the son is taken as the next but one, with the regent named.
  const regency = [t('Qk', '1921-08-16', '1934-10-09'), t('Qr', '1934-10-09', '1941-03-27', 'Prince Regent of Yugoslavia'), t('Qs', '1941-03-27', '1945-11-29')];
  const s = successions(regency, x => /regent/i.test(x.position || ''));
  assert.ok(s.some(x => x.from.qid === 'Qk' && x.to.qid === 'Qs' && x.between.qid === 'Qr'));
  assert.ok(!successions(regency, () => false).some(x => x.from.qid === 'Qk' && x.to.qid === 'Qs'));
  // Norway, 1998: the list's "Erik Lahnstein" (30 August to 23 September) beside Anne Enger's acting term (31 August to
  // 24 September) is the same term under another name, not a succession.
  const norway = [t('Qbondevik', '1997-10-17', '1998-08-30'), t('Qerik', '1998-08-30', '1998-09-23'), t('Qanne', '1998-08-31', '1998-09-24'), t('Qbondevik2', '1998-09-24', '2000-03-17')];
  assert.deepEqual(nextOf(norway, 1).map(x => x.qid), ['Qbondevik2']);
  // A term still open has no successor.
  assert.deepEqual(nextOf([t('Qa', '2000-01-01', null), t('Qb', '2001-01-01', null)], 0), []);
});

test('each leader is placed in the lane of the office held', () => {
  // Monaco: the Prince is the leader and the Ministers of State the only offices, so the Prince is head of state.
  assert.deepEqual(leaderOffices(countries.Q235), countries.Q235.leaders.map(() => ['state']));
  // The United Kingdom: every Prime Minister in the leader list is head of government.
  assert.ok(leaderOffices(countries.Q145).every(x => x.length === 1 && x[0] === 'government'));
});

test('the query the file names says the batch size the build uses', () => {
  assert.ok(succession.query.includes(`batches of ${BATCH} `), succession.query.slice(0, 200));
});

test('a deputy acting while the holder still reigns is not read as the next holder (Liechtenstein)', () => {
  const links = succession.links.filter(l => l.country === 'Q347' && l.office === 'state');
  // Franz Joseph II to Hans-Adam II, his son, from the day Hans-Adam II became Prince (13 November 1989), and not from
  // his deputyship of 1984 (VM's list); none to Alois, the Hereditary Prince, who has acted for his father since 2004.
  const fj = links.find(l => l.from === 'Q165674' && l.to === 'Q57454');
  assert.ok(fj, 'Franz Joseph II to Hans-Adam II');
  assert.deepEqual([fj.relation, fj.fromStart, fj.toStart], ['son', '1938-07-25', '1989-11-13']);
  assert.equal(links.filter(l => l.to === 'Q57454').length, 1);
  assert.ok(!links.some(l => l.to === 'Q311308'), 'no link to Alois');
  // The rule itself: the earlier holder's office term runs on more than 31 days past the later one's start.
  const lane = [{ qid: 'Qp', start: '1938-07-25', end: '1989-11-13', kind: 'office' }, { qid: 'Qd', start: '1984-08-26', end: '2004-08-15', kind: 'leader' }];
  assert.equal(stillHolds(lane, lane[0], lane[1]), true);
  assert.equal(stillHolds(lane, lane[0], { qid: 'Qd', start: '1989-11-13' }), false);
});

test('Ilham Aliyev follows his father as President from 31 October 2003, not from his term as Prime Minister', () => {
  const l = succession.links.filter(x => x.country === 'Q227' && x.from === 'Q157451' && x.to === 'Q57371');
  assert.equal(l.length, 1);
  assert.deepEqual([l[0].office, l[0].toStart, l[0].relation], ['state', '2003-10-31', 'son']);
});

test('a leader whose record holds two offices is placed in each office\'s lane, by its own dates', () => {
  const lanes = lanesOf(countries.Q227);
  const ilham = lane => lanes[lane].filter(t => t.qid === 'Q57371' || t.full === 'Ilham Aliyev').map(t => t.start);
  assert.ok(ilham('government').includes('2003-08-04'), 'Prime Minister from 4 August 2003');
  assert.ok(ilham('state').includes('2003-10-31'), 'President from 31 October 2003');
  assert.ok(!ilham('state').includes('2003-08-04'), 'not head of state from 4 August 2003');
});
