/* Heads of state and government as lanes (Political Retrospective, VM): pure functions, with no DOM, so that the
   layout can be tested in Node (tests/lanes.test.mjs) as well as drawn in the state panel (app.js).

   What is drawn. Each term of office in data/countries.json that comes from a source free to reuse:
   - the state's heads of state and government (`offices`, Wikidata's P35 and P6 statements on the state; for the
     eleven states whose lists VM built by hand, scripts/leader-lists.mjs), and
   - the leaders whose `source` is "Wikidata" (CC0) or "leader-lists" (VM's own lists, which name their sources).
   A leader whose source is "Archigos" is never drawn: Archigos 4.1's page states no licence. Such leaders are counted,
   from the data, and stay in the panel's list. A leader who is also one of Wikidata's office holders for the same
   term is drawn once, as the leader; except in VM's hand-built lists where the two disagree by more than 31 days
   (Liechtenstein's list follows the member of the house who exercises the Prince's powers): there the reign is drawn as
   the office holders' list gives it, and the list's term only where it lies outside the reign, marked as such.

   The lanes. Head of state above, head of government below. A leader's lane is read, in this order, from: the office
   Wikidata names for the term (`position`, or each office of `positions`); the office holders' list, where the same
   person holds the same term there; and, for the hand-built lists, the office the list follows (README, "Known
   limits": the six Caribbean states, Montenegro and Andorra follow the head of government; Monaco, Liechtenstein and
   San Marino the head of state). Terms that overlap in one lane (two Captains Regent, a regent beside a reigning
   prince, the members of a collective presidency) are stacked into rows.

   The scale. One year is one equal step, as on the period control (prp-period.js), from the state's first year in
   the data (1926, or the year its statehood begins) to the present, or to the year it ended. Each bar starts at its
   own date; a term too short to see is widened to MIN_BAR and drawn over its neighbour, never moved. */

export const DRAWN_SOURCES = new Set(['Wikidata', 'leader-lists']);
export const LANES = ['state', 'government'];
export const LANE_NAME = { state: 'Head of state', government: 'Head of government' };
const OFFICE_LANE = { hos: 'state', hog: 'government' };
// The office each hand-built list follows (scripts/leader-lists.mjs and README, "Known limits"), used only for a
// leader whose office no field of the data names.
export const LIST_LANE = {
  Q236: 'government', // Montenegro: the Prime Minister
  Q784: 'government', Q769: 'government', Q760: 'government', Q757: 'government', Q781: 'government', Q763: 'government', // the six Caribbean states: the Prime Minister
  Q228: 'government', // Andorra: the General Syndic, then the Head of Government
  Q235: 'state', // Monaco: the Sovereign Prince
  Q347: 'state', // Liechtenstein: the Prince, or the member of his house who exercises his powers
  Q238: 'state' // San Marino: the two Captains Regent
};
// What a hand-built list's term is, where it runs beside another person's reign in the same lane (README, "Known
// limits", and scripts/leader-lists.mjs: Franz Joseph as regent for Franz I from 30 March 1938, Hans-Adam as his
// father's deputy from 26 August 1984, Hereditary Prince Alois for Hans-Adam II since 15 August 2004).
export const DEPUTY_WORDS = { Q347: 'exercising the reigning Prince’s powers' };
// Words a reader sees for each relation (succession.json's "relation": what the later holder is to the earlier one).
export const RELATIONS = ['son', 'daughter', 'brother', 'sister', 'father', 'mother', 'spouse', 'grandson', 'granddaughter', 'nephew', 'niece', 'other relative'];

const DAY = 864e5;
export const dayOf = d => Math.round(Date.parse(`${d}T00:00:00Z`) / DAY);
export const dateOfDay = n => new Date(n * DAY).toISOString().slice(0, 10);
const yearStart = y => dayOf(`${y}-01-01`);
const yearEnd = y => dayOf(`${y + 1}-01-01`); // the first day after the year, so a year is [start, end)
const yearOfDay = n => +dateOfDay(n).slice(0, 4);
// Two terms count as overlapping only where they share more than a fortnight, or more than half of the shorter one: a
// hand-over that Wikidata dates a day or two apart is no overlap, while a term of days inside another is.
export const HANDOVER = 14;
// The window of the succession build (scripts/wikidata-succession.mjs): a later holder who starts within 31 days of the
// earlier one's end followed that holder; two records of one person 31 days apart or less are one term.
export const WINDOW = 31;
// A stretch of a lane longer than this, inside the statehood, with no term drawn, is marked "no term drawn here".
export const HOLE_DAYS = 60;
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A state's name inside a sentence ("for the United Kingdom"): the names data/countries.json and names.mjs hold that
// take "the" (the United States, the Bahamas, the Netherlands, the Soviet Union, the Irish Free State, the Federal
// Republic of Yugoslavia, …), and others of that kind should the data grow.
const THE = /^(United |Bahamas|Dominican Republic|Netherlands|Soviet Union|Czech Republic|Kingdom of |Irish Free State|Republic of |Federal Republic|Philippines|Gambia|Maldives|Central African Republic|Comoros|Seychelles|Solomon Islands|Marshall Islands|Federated States|Democratic Republic|Congo$|Ivory Coast|Vatican)/;
export const inProse = n => (THE.test(n) ? `the ${n}` : n);

// The lane an office's name places it in, or null. Government first: "President of the Council of Ministers" and
// "President of the Government" lead a government, as do prime ministers, chancellors and the Taoiseach.
export function laneOfPosition(label) {
  if (!label) return null;
  const s = label.toLowerCase();
  if (/prime minister|chancellor|taoiseach|premier|minister of state|head of government|council of ministers|president of the government|general syndic/.test(s)) return 'government';
  if (/president|king|queen|emperor|empress|prince|monarch|captain regent|regent|sultan|emir|shah|head of state|governor-general|grand duke/.test(s)) return 'state';
  return null;
}

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
// One person: by Wikidata item, else by English Wikipedia article, else by name.
// Two different items are two people; otherwise one shared article or one name is enough (Wikidata's office holders
// spell some articles' addresses differently from the leaders' records).
const plainUrl = u => { try { return decodeURIComponent(u); } catch { return u; } };
export function samePerson(a, b) {
  if (a.qid && b.qid) return a.qid === b.qid;
  if (a.url && b.url && plainUrl(a.url) === plainUrl(b.url)) return true;
  return !!a.full && norm(a.full) === norm(b.full);
}
const daysOverlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
// Whether two spans of days [a0, a1) and [b0, b1) overlap in the sense above.
export function overlaps(a0, a1, b0, b1) {
  const o = daysOverlap(a0, a1, b0, b1);
  return o > Math.min(HANDOVER, Math.min(a1 - a0, b1 - b0) / 2);
}

/* ------------------------------------------------------------------ parties */
// Wikidata's "independent politician" (Q327591) is no party: a term it covers is drawn neutral, "independent (no
// party)", and takes no hue.
export const isIndependent = m => /\/wiki\/Independent_politician$/i.test(m?.url || '') || norm(m?.name) === 'independent politician';
// The party a term is coloured by: a membership whose dates (Wikidata's start and end of membership) overlap the term
// by more than a hand-over (Liu Shaoqi's membership that Wikidata starts on the last day of his term does not). A
// membership with no end that began before the term covers it only while no later membership of the person has begun
// (Chen Gongbo's Kuomintang of 1925, followed by Wang Jingwei's Kuomintang in 1940). A membership with no dates says
// only that the person belonged to the party at some time, so the term is drawn neutral, "party not dated", and the
// party is still named in words.
export function partyOf(rec, t0, t1) {
  const all = rec.parties || [];
  const none = { status: 'none', main: null, dated: [], undated: [], outside: [] };
  if (!all.length || rec.noParties) return none;
  const lo = dateOfDay(t0), hi = dateOfDay(t1 - 1);
  const from = m => (m.s ? dayOf(m.s) : -Infinity), to = m => (m.e ? dayOf(m.e) + 1 : Infinity);
  const superseded = m => m.s && !m.e && m.s < lo && all.some(n => n !== m && n.s && n.s > m.s && n.s <= hi);
  const fits = m => (m.s || m.e) && overlaps(t0, t1, from(m), to(m)) && !superseded(m);
  const undated = all.filter(m => !m.s && !m.e && !isIndependent(m));
  const fitting = all.filter(fits);
  const dated = fitting.filter(m => !isIndependent(m));
  const outside = all.filter(m => (m.s || m.e) && !fits(m) && !isIndependent(m));
  if (!dated.length) {
    if (fitting.length) return { status: 'independent', main: null, dated: [], undated, outside };
    return { status: undated.length || outside.length ? 'undated' : 'none', main: null, dated: [], undated, outside };
  }
  // The colour goes to the membership the dates tie most closely to the term: first one dated at both ends, then one
  // with a date inside the term (Honecker's Socialist Unity Party, which Wikidata ends on 18 Oct 1989, over his
  // Communist Party of Germany, which it starts in 1930 and never ends), then the longest overlap.
  const inside = m => [m.s, m.e].filter(d => d && d >= lo && d <= hi).length;
  const both = m => (m.s && m.e ? 1 : 0);
  const span = m => daysOverlap(t0, t1, m.s ? dayOf(m.s) : t0, m.e ? dayOf(m.e) : t1);
  const main = [...dated].sort((p, q) => both(q) - both(p) || inside(q) - inside(p) || span(q) - span(p))[0];
  return { status: 'dated', main, dated, undated, outside };
}
export const partyWords = p => (p.status === 'dated' ? p.dated.map(m => m.name).join(' and ')
  : p.status === 'independent' ? 'independent (no party)' : p.status === 'undated' ? 'party not dated' : 'no party recorded');

/* ------------------------------------------------------------------ dates in words */
// One formatter of each kind, made once (a new one for every date cost a third of a second for San Marino's 411 terms).
const DAY_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const MONTH_FMT = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export function fmt(d, precision = 'day') {
  if (!d) return 'the present';
  const [y, m, dd] = d.split('-').map(Number);
  if (precision === 'year') return String(y);
  return (precision === 'month' ? MONTH_FMT : DAY_FMT).format(new Date(Date.UTC(y, m - 1, dd)));
}
export const termWords = t => `${fmt(t.start, t.startPrecision)} to ${t.noEnd ? 'an end not recorded' : fmt(t.end, t.endPrecision)}`;
// A family link in words. "of the previous holder" only where the earlier holder's bar is the one this term follows in
// its row, within 31 days (`kind` 'previous'); the next but one past a regent or an acting holder ('beforePrevious');
// otherwise the earlier holder is named ('earlier').
export function relationWords(r, { short = false } = {}) {
  const word = r.relation === 'other relative' ? (short ? 'relative' : 'a relative') : r.relation;
  if (short) return word;
  return r.kind === 'previous' ? `${word} of the previous holder`
    : r.kind === 'beforePrevious' ? `${word} of ${r.fromName}, who held the office before the previous holder`
      : `${word} of ${r.fromName}`;
}
// A tenure in words, for its bar's accessible name: "Head of state: <name>, <from> to <to>, <party or 'party not dated'>".
export function describe(t) {
  return `${t.alsoGovernment ? 'Head of state and of government' : LANE_NAME[t.lane]}: ${t.full}, ${termWords(t)}${t.role ? `, ${t.role}` : ''}, ${partyWords(t.party)}${t.relation ? `; ${relationWords(t.relation)}` : ''}`;
}

/* ------------------------------------------------------------------ the model */
// The years the lanes cover for a state: its first year in the data (the first year of its statehood, or the data's
// first year) to the present (the data's last year) or to the year its statehood ended.
export function axisYears(c, firstYear, lastYear) {
  const spans = c.spans?.length ? c.spans : [[`${firstYear}-01-01`, null]];
  const from = Math.max(firstYear, +spans[0][0].slice(0, 4));
  const last = spans.at(-1)[1];
  const to = last ? Math.min(lastYear, +last.slice(0, 4)) : lastYear;
  return { from, to: Math.max(from, to) };
}

// The leaders left out because their source is Archigos, counted from the data.
export function leftOut(data, key) {
  const all = Object.values(data.countries).flatMap(c => c.leaders || []);
  const here = key ? (data.countries[key]?.leaders || []) : [];
  const out = l => l.source === 'Archigos';
  return { all: all.filter(out).length, allTotal: all.length, here: here.filter(out).length, hereTotal: here.length };
}

/* Every drawable term of state `key` (record `c`), in its lane and row, with its party, its dates as drawn and its
   succession label. `today` is an ISO date; `links` is succession.json's links (any country; may be empty). */
export function buildModel(c, key, { firstYear, lastYear, today, links = [] }) {
  const { from, to } = axisYears(c, firstYear, lastYear);
  const a0 = yearStart(from), a1 = Math.min(yearEnd(to), dayOf(today) + 1);
  const axisEnd = yearEnd(to);
  const spans = (c.spans?.length ? c.spans : [[`${firstYear}-01-01`, null]]).map(([s, e]) => [dayOf(s), e ? dayOf(e) + 1 : axisEnd]);
  const listed = (c.leaders || []).some(l => l.source === 'leader-lists');
  // A person's Wikidata item, where one record of the state holds it and another (an office holder) only the article.
  const qidByUrl = new Map();
  for (const p of [...(c.leaders || []), ...(c.offices || [])]) if (p.qid && p.url && !qidByUrl.has(p.url)) qidByUrl.set(p.url, p.qid);
  const qidOf = p => p.qid || (p.url && qidByUrl.get(p.url)) || null;
  const endDay = (end, open) => (open ? dayOf(today) + 1 : dayOf(end) + 1);

  const offices = (c.offices || []).filter(o => o.start && OFFICE_LANE[o.office]).map((o, i) => ({
    kind: 'office', rec: o, lane: OFFICE_LANE[o.office], i, full: o.full || o.name, url: o.url || null, qid: qidOf(o),
    start: o.start, end: o.end, startPrecision: o.startPrecision, endPrecision: o.endPrecision, dropped: false
  }));
  const terms = [], unplaced = [];
  // Where one office is both head of state and head of government (the President of the United States, whom
  // Wikidata gives as head of government, P6, for 1981 to 2025 and as head of state, P35, only from 2025), the leader
  // before a leader with no office named holds the list's office and also appears among the other lane's office
  // holders: the leader then keeps the list's lane, and the other lane's office holder is drawn there as well.
  const holdsBoth = (l, lane) => offices.some(o => o.lane !== lane && samePerson(o, { full: l.full || l.name, url: l.url || null, qid: qidOf(l) })
    && overlaps(dayOf(l.start), endDay(l.end, !l.end), dayOf(o.start), endDay(o.end, !o.end)));
  const before = l => (c.leaders || []).filter(m => DRAWN_SOURCES.has(m.source) && m.start < l.start && laneOfPosition(m.position))
    .sort((p, q) => (p.start < q.start ? 1 : -1))[0];
  // Leaders from the free sources, each term in its lane.
  (c.leaders || []).forEach((l, i) => {
    if (!DRAWN_SOURCES.has(l.source)) return;
    const parts = l.positions?.length > 1
      ? l.positions.map((p, k, ps) => ({ start: p.start, end: p.end, position: p.label, startPrecision: k === 0 ? l.startPrecision : undefined, endPrecision: k === ps.length - 1 ? l.endPrecision : undefined }))
      : [{ start: l.start, end: l.end, position: l.position || null, startPrecision: l.startPrecision, endPrecision: l.endPrecision }];
    parts.forEach((p, k) => {
      const person = { full: l.full || l.name, url: l.url || null, qid: qidOf(l) };
      const s = dayOf(p.start), e = endDay(p.end, !p.end);
      let lane = laneOfPosition(p.position);
      const same = offices.filter(o => samePerson(o, person) && overlaps(s, e, dayOf(o.start), endDay(o.end, !o.end)));
      // No office named: the office holders' term of the same person that starts nearest (Rumen Radev, President of
      // Bulgaria from 2017, is its leader as Prime Minister from 8 May 2026), else the office the hand-built list follows.
      if (!lane && same.length) {
        lane = [...same].sort((p, q) => Math.abs(dayOf(p.start) - s) - Math.abs(dayOf(q.start) - s))[0].lane;
        const prior = l.positions?.length > 1 ? null : before(l), priorLane = prior && laneOfPosition(prior.position);
        if (priorLane && priorLane !== lane && holdsBoth(prior, priorLane)) lane = priorLane;
      }
      if (!lane && listed) lane = LIST_LANE[key] || null;
      const t = { kind: 'leader', rec: l, i, part: k, lane, ...person, start: p.start, end: p.end, startPrecision: p.startPrecision === 'day' ? undefined : p.startPrecision, endPrecision: p.endPrecision === 'day' ? undefined : p.endPrecision, position: p.position };
      if (!lane) { unplaced.push(t); return; }
      const mine = same.filter(o => o.lane === lane);
      // VM's hand-built list and Wikidata's office holders disagree by more than 31 days at either end (Liechtenstein:
      // the list's Hans-Adam II from 1984, as his father's deputy, to 2004; his reign from 1989 to the present): the
      // reign is drawn from the office holders, and the list's term only for the days outside it.
      // The same where the office holder is one of VM's heads of state added by hand (`reigns`: REIGNS and HOS_GAPS in
      // scripts/leader-corrections.mjs): its dates win over a Wikidata leader's (the fixer, 27 November 2026: Georges
      // Bidault's "position held" splits at 14 October 1946, where he became Prime Minister, and the lane cut his term
      // as head of state there, though he held it to 16 December).
      const differs = o => Math.abs(dayOf(o.start) - s) > WINDOW || Math.abs(endDay(o.end, !o.end) - e) > WINDOW;
      const apart = mine.filter(o => (l.source === 'leader-lists' || o.rec.source === 'reigns') && differs(o));
      if (apart.length) {
        const o = apart[0], os = dayOf(o.start), oe = endDay(o.end, !o.end);
        if (s < os - HANDOVER) terms.push({ ...t, part: `${k}a`, end: o.start, endPrecision: undefined });
        if (e > oe + HANDOVER && o.end) terms.push({ ...t, part: `${k}b`, start: o.end, startPrecision: undefined });
        for (const x of mine) if (!apart.includes(x)) x.dropped = true;
        return;
      }
      for (const o of mine) o.dropped = true; // drawn once, as the leader
      terms.push(t);
    });
  });
  // A leader whom no field places (Switzerland's Presidents of the Confederation after 2015, Andrew Holness of
  // Jamaica): each state's list follows one office, the one Archigos tracked (README, "Known limits": after 2015 each
  // country follows the same office), so the leader takes the lane most of the state's placed leaders take.
  if (unplaced.length) {
    const count = { state: 0, government: 0 };
    for (const t of terms) if (t.kind === 'leader') count[t.lane]++;
    const lane = count.state > count.government ? 'state' : count.government > count.state ? 'government' : null;
    if (lane) for (const t of unplaced.splice(0)) {
      t.lane = lane; t.laneFrom = 'list';
      const s = dayOf(t.start), e = endDay(t.end, !t.end);
      for (const o of offices) if (o.lane === lane && samePerson(o, t) && overlaps(s, e, dayOf(o.start), endDay(o.end, !o.end))) o.dropped = true;
      terms.push(t);
    }
  }
  // Office holders not drawn already; one bar for one person's term in one lane (Wikidata gives Wilhelmina's reign twice).
  for (const o of offices) {
    if (o.dropped) continue;
    const s = dayOf(o.start), e = endDay(o.end, !o.end);
    if (terms.some(t => t.lane === o.lane && samePerson(t, o) && overlaps(s, e, dayOf(t.start), endDay(t.end, !t.end)))) continue;
    terms.push({ ...o, position: null });
  }
  // A hand-built list's term beside another person's reign in the same lane is that list's deputy or regent.
  if (DEPUTY_WORDS[key]) {
    for (const t of terms) {
      if (t.kind !== 'leader' || t.rec.source !== 'leader-lists') continue;
      const s = dayOf(t.start), e = endDay(t.end, !t.end);
      if (terms.some(u => u.kind === 'office' && u.lane === t.lane && !samePerson(u, t) && overlaps(s, e, dayOf(u.start), endDay(u.end, !u.end)))) t.role = DEPUTY_WORDS[key];
    }
  }

  // An open term followed in its lane by someone else's, who succeeds it (no other term in the lane ends within a
  // fortnight of that start), has no end in the data: it is drawn to that start, faded, and said to have no end
  // recorded (Wikidata gives Kiril Petkov's term as Prime Minister of Bulgaria no end, and five more follow it).
  for (const t of terms) {
    if (t.end || t.role) continue;
    const s = dayOf(t.start);
    const next = terms.filter(u => u !== t && u.lane === t.lane && !u.role && !samePerson(u, t) && dayOf(u.start) > s + HANDOVER)
      .sort((p, q) => dayOf(p.start) - dayOf(q.start))
      .find(u => !terms.some(v => v !== t && v !== u && v.lane === t.lane && v.end && Math.abs(dayOf(v.end) - dayOf(u.start)) <= HANDOVER));
    if (next) { t.noEnd = true; t.drawnTo = dayOf(next.start); }
  }

  // Days as drawn: inside the statehood and the axis; an end known only to the year (or month) runs to that year's
  // (month's) end and fades across it, and so does a start.
  const out = [];
  for (const t of terms) {
    let s = dayOf(t.start), e = t.noEnd ? t.drawnTo : endDay(t.end, !t.end), fadeIn = 0, fadeOut = 0;
    if (t.startPrecision === 'year') fadeIn = yearEnd(+t.start.slice(0, 4)) - s;
    else if (t.startPrecision === 'month') fadeIn = dayOf(nextMonth(t.start)) - s;
    if (t.end && !t.noEnd && t.endPrecision === 'year') { e = yearEnd(+t.end.slice(0, 4)); fadeOut = e - dayOf(t.end); }
    else if (t.end && !t.noEnd && t.endPrecision === 'month') { e = dayOf(nextMonth(t.end)); fadeOut = e - dayOf(t.end); }
    else if (t.noEnd) fadeOut = Math.min(365, Math.max(1, (e - s) / 3));
    const inside = spans.filter(([p, q]) => p < e && q > s);
    if (!inside.length) continue; // outside its statehood: listed apart in the panel, not drawn
    const ds = Math.max(s, inside[0][0], a0), de = Math.min(e, inside.at(-1)[1], a1);
    if (de <= ds) continue;
    out.push({ ...t, s, e, ds, de, softStart: fadeIn > 0 && ds === s, softEnd: fadeOut > 0 && de === e, fadeIn, fadeOut, open: !t.end && !t.noEnd, cutStart: ds > s, cutEnd: de < e });
  }

  // One person in both offices. Where every head of government drawn is the head of state of the time, within 31 days
  // at each end of the same person's term in the head of state's lane (Mexico, whose head of government in Wikidata is
  // Claudia Sheinbaum, from 2024, as she is its head of state; Cyprus; the Dominican Republic; the United States since
  // George H. W. Bush was drawn as head of state on 27 November 2026; until the fixer's pass of
  // 26 November 2026 Saudi Arabia, whose heads of government Wikidata gave as its kings),
  // a second lane would repeat the first and show only hatching for the years Wikidata names no head of government.
  // So no second lane is drawn: each such term goes with the same person's term as head of state (`alsoGovernment`,
  // with its own dates and record), and the page says in words that one lane stands for both offices, and for which
  // years Wikidata records a head of government (oneOfficeWords).
  const stOut = out.filter(t => t.lane === 'state'), govOut = out.filter(t => t.lane === 'government');
  const twinsOf = g => stOut.filter(s => samePerson(s, g) && overlaps(g.ds, g.de, s.ds, s.de));
  const within = g => { const ts = twinsOf(g); return ts.length > 0 && Math.min(...ts.map(s => s.ds)) <= g.ds + WINDOW && Math.max(...ts.map(s => s.de)) >= g.de - WINDOW; };
  const oneOffice = govOut.length > 0 && govOut.every(within);
  let foldedCover = [];
  if (oneOffice) {
    for (const g of govOut) {
      const twin = twinsOf(g).sort((p, q) => daysOverlap(g.ds, g.de, q.ds, q.de) - daysOverlap(g.ds, g.de, p.ds, p.de))[0];
      (twin.alsoGovernment ||= []).push(g);
    }
    // The stretches the heads of government cover, a hand-over of up to 60 days joined, for the words on the page.
    for (const [p, q] of govOut.map(g => [g.ds, g.de]).sort((x, y) => x[0] - y[0])) {
      const last = foldedCover.at(-1);
      if (last && p <= last[1] + HOLE_DAYS) last[1] = Math.max(last[1], q); else foldedCover.push([p, q]);
    }
    out.splice(0, out.length, ...out.filter(t => t.lane !== 'government'));
  }

  // Order, rows and ids, lane by lane.
  const lanes = {};
  for (const lane of LANES) {
    const list = out.filter(t => t.lane === lane).sort((p, q) => p.s - q.s || p.e - q.e || norm(p.full).localeCompare(norm(q.full)));
    // Rows: a term goes in the first row where it overlaps no term for certain. A start or end known only to the year
    // (or month) is certain only from the end of that year (or month): Wikidata gives Luis Echeverría's term as
    // President of Mexico from "1970", and Gustavo Díaz Ordaz's to 30 November 1970, which is no overlap.
    const sure = t => [t.s + t.fadeIn, Math.max(t.s + t.fadeIn + 1, t.e - t.fadeOut)];
    const ends = [];
    for (const t of list) {
      const [p, q] = sure(t);
      let r = ends.findIndex((end, k) => !list.some(u => u.row === k && overlaps(p, q, ...sure(u))));
      if (r < 0) { r = ends.length; ends.push(0); }
      t.row = r; ends[r] = Math.max(ends[r], t.e);
    }
    // In one row, a faded start or end stops where its neighbour's term begins or ends, so no fade lies over a bar.
    for (let r = 0; r < ends.length; r++) {
      const row = list.filter(t => t.row === r);
      for (let k = 1; k < row.length; k++) {
        const p = row[k - 1], t = row[k];
        if (p.de <= t.ds) continue;
        if (t.softStart && p.de < t.de) t.ds = p.de; else if (p.softEnd && t.ds > p.ds) p.de = t.ds;
      }
    }
    list.forEach((t, k) => { t.id = `${lane}-${k}`; t.index = k; });
    lanes[lane] = { terms: list, rows: ends.length };
  }

  // Parties: each dated party of the state takes one of eight hues, the party with the most years drawn first; a ninth
  // and later share one neutral marked "other dated party" and are named in words.
  const years = new Map();
  for (const lane of LANES) for (const t of lanes[lane].terms) {
    t.party = partyOf(t.rec, t.s, t.e);
    if (t.party.main) years.set(t.party.main.name, (years.get(t.party.main.name) || 0) + (t.de - t.ds));
  }
  const ranked = [...years.entries()].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).map(([name]) => name);
  const slot = new Map(ranked.map((name, k) => [name, k < 8 ? k + 1 : 0]));
  for (const lane of LANES) for (const t of lanes[lane].terms) t.slot = t.party.main ? slot.get(t.party.main.name) : null;
  const parties = ranked.map(name => ({ name, slot: slot.get(name) }));

  // The previous holder of a term: in its own row (a co-holder in another row is not it), the last other person's term
  // before it, if that term ends within 31 days of this one's start. Otherwise the previous holder is not drawn
  // (Ronald Reagan's term is the bar before Bill Clinton's in the United States' lane, but George H. W. Bush, from
  // Archigos, held the office between them), and no family link can be shown.
  for (const lane of LANES) {
    const list = lanes[lane].terms;
    for (const t of list) {
      t.prev = null; t.prevGap = false;
      // The terms before it in its row, by their ends (the succession labels below use the same).
      t.before = t.role ? [] : list.filter(u => u !== t && u.row === t.row && !u.role && u.s < t.s && u.de <= t.ds + HANDOVER).sort((p, q) => p.e - q.e || p.s - q.s).map(u => u.id);
      if (t.role) continue;
      const p = t.before.length ? list.find(u => u.id === t.before.at(-1)) : null;
      const near = p && Math.abs(p.e - t.s) <= WINDOW;
      if (near && samePerson(p, t)) continue; // the same person's next record: no previous holder to speak of
      if (near) t.prev = p.id;
      // Not drawn: a term that begins inside the statehood and the axis, more than 31 days after their start.
      else t.prevGap = !t.cutStart && spans.some(([a, b]) => a + WINDOW < t.s && t.s < b) && t.s > a0 + WINDOW;
    }
  }

  // Succession labels: where succession.json links the later holder to the earlier one, in the same state and lane,
  // and the two bars are those terms (the link's starts are the bars' starts), the earlier being the previous holder in
  // the later one's row, or the one before where the link names the regent or acting holder between and that is the
  // bar between (Anastasio Somoza García's link to his son is from his term of 1947, from Archigos, which is not drawn,
  // so his drawn term of 1937 to 1947 carries none).
  const mine = (links || []).filter(x => x && x.country === key && LANES.includes(x.office) && RELATIONS.includes(x.relation) && x.from && x.to);
  const is = (t, qid, url) => (t.qid && t.qid === qid) || (!!url && !!t.url && plainUrl(t.url) === plainUrl(url));
  for (const lane of LANES) {
    const list = lanes[lane].terms, byId = new Map(list.map(t => [t.id, t]));
    for (const x of mine.filter(x => x.office === lane)) {
      for (let k = 0; k < list.length; k++) {
        const t = list[k];
        if (t.role || t.relation || !is(t, x.to, x.toUrl) || (x.toStart && t.start !== x.toStart)) continue;
        const [p1, p2] = [byId.get(t.before.at(-1)), byId.get(t.before.at(-2))];
        // The link's earlier term may be the first of one person's records that follow one another (Wikidata gives
        // Baudouin's reign as two statements, from 1950 and 1951; the link to Albert II is from the first).
        const run = p => { const out = [p.start]; let q = p; for (;;) { const r = byId.get(q.before.at(-1)); if (!r || !samePerson(r, q) || Math.abs(r.e - q.s) > WINDOW) return out; out.push(r.start); q = r; } };
        const isFrom = p => p && is(p, x.from, x.fromUrl) && (!x.fromStart || run(p).includes(x.fromStart));
        let earlier = null, kind = null;
        if (isFrom(p1)) { earlier = p1; kind = t.prev === p1.id ? 'previous' : 'earlier'; }
        else if (x.between && isFrom(p2) && is(p1, x.between, x.betweenUrl)) { earlier = p2; kind = t.prev === p1.id ? 'beforePrevious' : 'earlier'; }
        if (!earlier) continue;
        t.relation = { relation: x.relation, property: x.property || null, kind, immediate: kind === 'previous', fromName: earlier.full, fromId: earlier.id };
        break;
      }
    }
  }

  // The days of the axis outside the statehood (the Baltic states from 1940 to 1990-91, Germany after May 1945).
  const gaps = [];
  let cur = a0;
  for (const [p, q] of spans) { if (p > cur) gaps.push([cur, Math.min(p, axisEnd)]); cur = Math.max(cur, q); }
  if (cur < axisEnd) gaps.push([cur, axisEnd]);
  // In each lane, the stretches of the statehood (to today) longer than 60 days with no term drawn: a holder who is
  // left out (Archigos) or whom the data does not hold, never a vacancy the data records.
  for (const lane of LANES) {
    const cover = lanes[lane].terms.map(t => [t.ds, t.de]).sort((p, q) => p[0] - q[0]);
    const holes = [];
    for (const [p0, q0] of spans) {
      const p = Math.max(p0, a0), q = Math.min(q0, a1);
      let at = p;
      for (const [s, e] of cover) { if (e <= at || s >= q) continue; if (s > at) holes.push([at, s]); at = Math.max(at, e); }
      if (at < q) holes.push([at, q]);
    }
    lanes[lane].holes = holes.filter(([p, q]) => q - p > HOLE_DAYS);
  }
  // Where every term drawn in the head of government's lane is a term of the same person in the head of state's
  // (the United States from 1981), the lane says so.
  const st = lanes.state.terms, gov = lanes.government.terms;
  lanes.government.samePeople = gov.length > 0 && st.length > 0 && gov.every(g => st.some(s => samePerson(s, g) && overlaps(g.ds, g.de, s.ds, s.de)));
  lanes.state.samePeople = false;
  // Folded into the head of state's lane (above): no lane, no hatching; `cover` is the stretches Wikidata names a head
  // of government for, each [first day, day after the last], the last open where it runs to today.
  lanes.government.folded = oneOffice ? { cover: foldedCover, count: govOut.length } : null;
  lanes.state.alsoGovernment = oneOffice;
  if (oneOffice) lanes.government.holes = [];
  return { key, from, to, a0, a1: axisEnd, today: dayOf(today), lanes, parties, unplaced, gaps: gaps.filter(([p, q]) => q > p), listed, drawn: out.length };
}
function nextMonth(d) {
  const [y, m] = d.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}
// A stretch of days in years: "1989–1993", or "1936" for one within a year.
export const yearsWords = ([p, q]) => { const a = yearOfDay(p), b = yearOfDay(q - 1); return a === b ? String(a) : `${a}–${b}`; };

/* ------------------------------------------------------------------ the drawing */
export const GEOM = { title: 16, row: 18, rowGap: 3, succession: 14, laneGap: 10, axis: 20, top: 20 };
export const MIN_BAR = 3; // px: a term of a few days stays visible and can be pointed at
// Pixels per year: the whole span fitted to the box (at least 3 px a year, else the box scrolls), or the closer view.
export const CLOSE_PX = 16;
// Below this many pixels a year the names do not fit on the bars and a finger cannot pick one, so the closer view is
// where the lanes open, until the reader chooses the whole span.
export const CLOSE_BELOW = 8;
export function pxPerYear(model, boxWidth, close) {
  const years = model.to - model.from + 1;
  return close ? CLOSE_PX : Math.max(3, boxWidth / years);
}
export const fitsWhole = (model, boxWidth) => pxPerYear(model, boxWidth, false) >= CLOSE_BELOW;
// The hue slots drawn with a pattern as well as a tint, so that no two slots drawn alike are hard to tell apart under
// deuteranopia or protanopia, in either theme (measured on PRP's tokens, OKLab ΔE ≥ 5 between any two slots of one
// treatment and against "party not dated"; tests/lanes.test.mjs checks it on the page): slots 1 and 2 solid, 3, 4 and
// 7 hatched one way, 5 and 6 the other, 8 cross-hatched.
export const SLOT_PATTERN = { 1: '', 2: '', 3: 'a', 4: 'a', 5: 'b', 6: 'b', 7: 'a', 8: 'c' };
export const PATTERN_WORDS = { a: 'hatched ⁄', b: 'hatched ⁄ the other way', c: 'cross-hatched' };
const textWidth = (s, size = 11) => String(s).length * size * 0.56;
// States whose leaders' names English writes family name first (China); in Japan the order varies, so a name that does
// not fit is cut short rather than guessed.
const FAMILY_FIRST = new Set(['Q13426199']);
const ORDER_VARIES = new Set(['Q17']);
// States whose people carry two family names in the Spanish way, the father's and then the mother's (Catalan in
// Andorra the same): Spain, Andorra, Mexico, Cuba, the Dominican Republic and the six Central American states
// (Guatemala, Honduras, El Salvador, Nicaragua, Costa Rica, Panama). There the last word is the mother's family name
// ("Cruz" of Manuel Marrero Cruz, "Nieto" of Enrique Peña Nieto), so it is never the short name. (In Portugal the
// father's family name comes last, so the last word stands.)
const TWO_SURNAMES = new Set(['Q29', 'Q228', 'Q96', 'Q241', 'Q786', 'Q774', 'Q783', 'Q792', 'Q811', 'Q800', 'Q804']);
// Words that belong to the family name after them ("de la Madrid", "de Gaulle", "de Valera", "Salinas de Gortari").
// Irish "Ó" and "Ní" the same ("Ó Dálaigh", fixer, 26 November 2026).
const PARTICLE = /^(de|del|della|di|da|das|do|dos|du|la|las|los|y|i|Ó|Ní)$/;
// Portugal, where a family name with a particle follows another family name ("Rebelo de Sousa", "Gomes da Costa"). In
// the Netherlands the same shape is as often given names and one family name ("Dirk Jan de Geer", "Jan Eduard de
// Quay"), so there the last family name stands ("de Geer").
const COMPOUND_PARTICLE = new Set(['Q45']);
function nameParts(words) {
  const out = [];
  let pre = [];
  for (const w of words) {
    if (PARTICLE.test(w) && out.length) { pre.push(w); continue; }
    out.push([...pre, w].join(' '));
    pre = [];
  }
  if (pre.length) out.push(pre.join(' '));
  return out;
}
// The record's own short name in the full name's spelling, where the full name holds it with the accents a source
// left out ("Díaz Ordaz" for Archigos's "Diaz Ordaz", "López Portillo" for "Lopez Portillo"); null where no run of the
// full name's words is the short name, as with Archigos's misspellings and initials ("Chamberlin", "Thorn G.",
// "G.W. Bush"), so that the rule on the full name decides (fixer, 26 November 2026; until then the bar showed them).
function spelt(own, full) {
  const plain = s => norm(s).replace(/[-‐]/g, ' ');
  const words = full.replace(/,/g, '').split(' '), want = plain(own);
  for (let i = 0; i < words.length; i++) for (let j = i + 1; j <= words.length; j++) if (plain(words.slice(i, j).join(' ')) === want) return words.slice(i, j).join(' ');
  return null;
}
// A shorter name for a narrow bar: the record's own short name (the family name, "Saito" for Archigos's "Saito, M."),
// "Saud" for "Saud of Saudi Arabia", "Fahd" for "Fahd bin Abdulaziz Al Saud", a monarch's whole name ("Elizabeth II"),
// the first word where the family name comes first ("Mao" for Mao Zedong), both family names where they are two in the
// Spanish way ("López Obrador"), else the last word with its particles ("de Valera"); null where the order is not
// known (a name in Japan with no short name of its own; three names in the Spanish way, which may be one given name
// and two family names, "Manuel Marrero Cruz", or two given names and one, "Luis Alberto Monge"), so that the name is
// cut short rather than guessed. Two family names joined by "y" or "i" are both given ("Martí i Alanis"). Where the
// family names are two in the Spanish way, a record's short name that is only the full name's last word is no source of
// its own when the build made it: it gives an office holder, and a leader Wikidata alone holds, its last word
// (scripts/build-data.mjs), so the rule here decides; Archigos's and VM's own lists' short names stand, where the full
// name holds them. A monarch's name before " of " is the short name, never the country after it ("William Alexander"
// of the Netherlands, "Guillaume V" for "Guillaume V, Grand Duke of Luxembourg"), and "Ibn Saud" is his whole name,
// not "Saud", his son's (fixer, 26 November 2026). In Portugal a family name with a particle keeps the family name
// before it ("Rebelo de Sousa"); a name of two parts keeps its particle alone ("de Gaulle").
const GIVEN_BY_BUILD = t => t.kind === 'office' || (t.rec?.source === 'Wikidata' && !t.rec.archigos);
export function shortName(t, key = null) {
  const whole = String(t.full || '');
  const own = t.rec?.name && t.rec.name !== t.full ? t.rec.name.replace(/,.*$/, '').trim() : '';
  const guessed = (TWO_SURNAMES.has(key) || COMPOUND_PARTICLE.has(key)) && GIVEN_BY_BUILD(t) && norm(own) === norm(whole.split(' ').at(-1));
  const sp = own && !guessed ? spelt(own, whole) : null;
  if (sp) return sp;
  const full = whole.replace(/^(King|Queen|Emperor|Empress|Prince|Princess|Sultan|Emir|Sheikh|Patriarch) /, '');
  // "Saud" for "Saud of Saudi Arabia", "Juan Carlos I" for "Juan Carlos I of Spain", "Charlotte" for "Charlotte, Grand
  // Duchess of Luxembourg".
  const of = full.match(/^([^,]+?)(?:, [^,]+?)? of /);
  if (of && of[1].split(' ').length <= 3) return of[1];
  const w = full.split(' ');
  if (/^(ibn|bin) /i.test(full)) return full;
  if (/ (bin|ibn|bint) /i.test(full)) return w[0];
  if (/^[IVX]+$/.test(w.at(-1)) || w.length < 2) return full;
  if (FAMILY_FIRST.has(key)) return w[0];
  if (ORDER_VARIES.has(key)) return null;
  const parts = nameParts(w);
  if (TWO_SURNAMES.has(key)) {
    const joined = parts.findIndex((p, k) => k > 1 && /^(y|i) /.test(p));
    if (joined > 0) return parts.slice(joined - 1, joined + 1).join(' ');
    return parts.length >= 4 ? parts.slice(-2).join(' ') : parts.length === 3 ? null : parts.at(-1);
  }
  if (COMPOUND_PARTICLE.has(key) && parts.length >= 3 && PARTICLE.test(parts.at(-1).split(' ')[0])) return parts.slice(-2).join(' ');
  return parts.at(-1);
}
// The words on a bar of `w` px: the name with the party where both fit, the name, the short name, or the name cut short.
export function barLabel(t, w, key = null) {
  const party = t.party?.status === 'dated' && t.party.main ? t.party.main.name : null;
  const fits = s => s && textWidth(s) + 8 <= w;
  if (party && fits(`${t.full} · ${party}`)) return `${t.full} · ${party}`;
  if (fits(t.full)) return t.full;
  const short = shortName(t, key);
  if (fits(short)) return short;
  if (short === null) {
    const n = Math.floor((w - 8) / (11 * 0.56)) - 1;
    if (n >= 3) return `${t.full.slice(0, n).trimEnd()}…`;
  }
  return '';
}

// The lanes as one SVG string. `shown` is { a, b, ref } (the years shown and the reference date, the end of the last
// year shown or today), `px` the pixels per year, `chosen` the id of the bar whose detail is open.
export function renderSvg(model, { px, shown, chosen = null }) {
  const W = Math.round((model.to - model.from + 1) * px);
  const x = day => ((day - model.a0) / 365.2425) * px;
  const G = GEOM;
  let y = G.top;
  const parts = [], back = [], laneLabels = [], at = new Map();
  const defs = [
    // "No term drawn here": a light hatch over the lane's ground.
    '<pattern id="lane-hole" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect class="hole-line" width="1.5" height="6"/></pattern>'
  ];
  const usedSlots = new Set();
  for (const lane of LANES) {
    const L = model.lanes[lane];
    if (L.folded) continue; // one person in both offices: one lane is drawn, and the page says so in words
    const rows = Math.max(1, L.rows);
    const hasLinks = L.terms.some(t => t.relation);
    const h = G.title + rows * (G.row + G.rowGap) + (hasLinks ? G.succession : 0);
    laneLabels.push({ lane, y, rows: L.rows, count: L.terms.length, samePeople: !!L.samePeople });
    // The lane's ground, and its stretches with no term drawn.
    const gy = y + G.title - 2, gh = rows * (G.row + G.rowGap) + 1;
    back.push(`<rect class="lane-ground" x="0" y="${gy}" width="${W}" height="${gh}"/>`);
    for (const hole of L.holes || []) back.push(`<rect class="lane-hole" data-lane="${lane}" x="${x(hole[0]).toFixed(2)}" y="${gy}" width="${Math.max(1, x(hole[1]) - x(hole[0])).toFixed(2)}" height="${gh}" fill="url(#lane-hole)"/>`);
    // Each bar starts at its own date. A term too short to see is widened to MIN_BAR, never moved, and drawn after the
    // others so that it lies over its neighbour; the list (and the keyboard) keeps date order (aria-owns).
    const placed = L.terms.map(t => {
      const tw = x(t.de) - x(t.ds), w = Math.max(MIN_BAR, tw);
      const x0 = Math.max(0, Math.min(x(t.ds), W - w));
      at.set(t.id, [x0, w]);
      return { t, x0, w, short: tw < MIN_BAR };
    });
    const g = new Map();
    for (const { t, x0, w } of placed) {
      const x1 = x0 + w;
      const by = y + G.title + t.row * (G.row + G.rowGap);
      const fill = t.slot ? `party-${t.slot}` : t.slot === 0 ? 'party-other' : t.party.status === 'independent' ? 'party-independent' : t.party.status === 'none' ? 'party-none' : 'party-undated';
      const pat = t.slot ? SLOT_PATTERN[t.slot] : '';
      if (pat) usedSlots.add(t.slot);
      let mask = '';
      if (t.softStart || t.softEnd) {
        const fi = t.softStart ? Math.min(0.9, Math.max(0.1, (x(t.s + t.fadeIn) - x0) / w)) : 0;
        const fo = t.softEnd ? Math.min(0.9, Math.max(0.1, (x1 - x(t.e - t.fadeOut)) / w)) : 0;
        const id = `fade-${model.key}-${t.id}`;
        defs.push(`<linearGradient id="${id}-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="${t.softStart ? 0.08 : 1}"/><stop offset="${fi.toFixed(3)}" stop-color="#fff" stop-opacity="1"/><stop offset="${(1 - fo).toFixed(3)}" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="${t.softEnd ? 0.08 : 1}"/></linearGradient>` +
          `<mask id="${id}" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#${id}-g)"/></mask>`);
        mask = ` mask="url(#${id})"`;
      }
      const label = barLabel(t, w, model.key);
      g.set(t.id, `<g role="listitem" class="lane-item" id="li-${t.id}">` +
        `<rect class="lane-bar ${fill}${pat ? ` pat-${pat}` : ''}${t.softStart ? ' soft-start' : ''}${t.softEnd ? ' soft-end' : ''}${t.noEnd ? ' no-end' : ''}${t.role ? ' deputy' : ''}${t.id === chosen ? ' chosen' : ''}" data-id="${t.id}" data-lane="${lane}" data-index="${t.index}"` +
        ` x="${x0.toFixed(2)}" y="${by}" width="${w.toFixed(2)}" height="${G.row}" rx="2"${pat ? ` style="fill:url(#lane-pat-${t.slot})"` : ''}${mask} role="button" tabindex="-1" aria-label="${esc(describe(t))}"/>` +
        // An end not recorded: a dotted edge at the bar's right end, besides the fade.
        (t.noEnd ? `<path class="no-end-edge" d="M${(x1 - 0.5).toFixed(2)} ${by}v${G.row}" aria-hidden="true"/>` : '') +
        // The name keeps to the visible part of a long bar as the box scrolls (app.js moves it: data-x0, data-x1, data-w).
        (label ? `<text class="lane-text ${fill}" x="${(x0 + 4).toFixed(2)}" y="${by + G.row / 2 + 4}" data-x0="${(x0 + 4).toFixed(2)}" data-x1="${(x1 - 4).toFixed(2)}" data-w="${textWidth(label).toFixed(1)}" aria-hidden="true">${esc(label)}</text>` : '') + '</g>');
    }
    // Painted long bars first, then the widened short ones over them; read in date order.
    const order = [...placed.filter(p => !p.short), ...placed.filter(p => p.short)].map(p => g.get(p.t.id));
    parts.push(`<g role="list" class="lane" data-lane="${lane}" aria-label="${esc(laneLabel(L, lane))}" aria-owns="${L.terms.map(t => `li-${t.id}`).join(' ')}">${order.join('')}</g>`);
    // Succession labels under the lane, at the later term's start: the full words where they fit before the next
    // label, else the relation's word, else a mark; the full words are always in the bar's name and its detail.
    if (hasLinks) {
      const sy = y + G.title + rows * (G.row + G.rowGap) + 10;
      const marks = L.terms.filter(t => t.relation).map(t => ({ t, at: x(t.ds) })).sort((p, q) => p.at - q.at);
      const labs = marks.map((m, k) => {
        const room = (k + 1 < marks.length ? marks[k + 1].at : W) - m.at - 6;
        const long = relationWords(m.t.relation), short = relationWords(m.t.relation, { short: true });
        const text = textWidth(long, 10) <= room ? long : textWidth(short, 10) <= room ? short : '';
        return `<g class="succession" data-for="${m.t.id}"><path d="M${m.at.toFixed(2)} ${sy - 9}v5" aria-hidden="true"/>` +
          (text ? `<text x="${(m.at + 2).toFixed(2)}" y="${sy + 1}" aria-hidden="true">${esc(text)}</text>` : '') + '</g>';
      });
      parts.push(`<g class="successions" aria-hidden="true">${labs.join('')}</g>`);
    }
    y += h + G.laneGap;
  }
  // The patterns of the hatched party hues: the tint, with lines of the full hue.
  for (const s of [...usedSlots].sort()) {
    const p = SLOT_PATTERN[s], rot = p === 'b' ? -45 : 45;
    defs.push(`<pattern id="lane-pat-${s}" class="party-${s} lane-pat" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(${rot})"><rect class="pat-ground" width="5" height="5"/><rect class="pat-line" width="1.6" height="5"/>${p === 'c' ? '<rect class="pat-line" width="5" height="1.6"/>' : ''}</pattern>`);
  }
  const lanesBottom = y - G.laneGap;
  // Years outside the statehood, shaded behind the bars.
  const gaps = model.gaps.map(([p, q]) => `<rect class="lane-gap" x="${x(p).toFixed(2)}" y="${G.top}" width="${Math.max(1, x(q) - x(p)).toFixed(2)}" height="${lanesBottom - G.top}"/>`);
  // The axis: one tick a year, a labelled one each decade (every other decade where a decade is under 34 px), as on
  // the period control; the first year is labelled too where the next label is far enough off.
  const ticks = [], labels = [], grid = [];
  for (let yr = model.from; yr <= model.to; yr++) {
    const tx = x(yearStart(yr));
    const decade = yr % 10 === 0;
    if (decade && (px * 10 >= 34 || yr % 20 === 0)) labels.push([yr, tx]);
    ticks.push(`<path class="tick${decade ? ' decade' : ''}" d="M${tx.toFixed(2)} ${lanesBottom}v${decade ? 6 : 3}"/>`);
    if (decade) grid.push(`<path class="grid" d="M${tx.toFixed(2)} ${G.top}V${lanesBottom}"/>`);
  }
  if (model.from % 10 && (!labels.length || labels[0][1] >= 34)) labels.unshift([model.from, 0]);
  for (const [yr, tx] of labels) if (tx + 26 <= W) ticks.push(`<text class="tick-label" x="${(tx + 1).toFixed(2)}" y="${lanesBottom + 16}">${yr}</text>`);
  // The years shown, a band behind the bars, and a line at the date the panel describes (the end of the year shown,
  // or today) over them.
  const ma = Math.max(model.a0, yearStart(shown.a)), mb = Math.min(model.a1, yearEnd(shown.b));
  const ref = Math.min(Math.max(dayOf(shown.ref), model.a0), model.a1);
  const band = mb > ma ? `<rect class="shown-band" x="${x(ma).toFixed(2)}" y="${G.top - 4}" width="${Math.max(2, x(mb) - x(ma)).toFixed(2)}" height="${lanesBottom - G.top + 6}" aria-hidden="true"/>` : '';
  const marker = mb > ma ? `<g class="shown" aria-hidden="true">` +
    `<path class="shown-line" d="M${x(ref).toFixed(2)} ${G.top - 5}V${lanesBottom + 2}"/>` +
    `<text class="shown-label" x="${Math.min(W - 2, Math.max(2, x(ref))).toFixed(2)}" y="${G.top - 8}" text-anchor="${x(ref) < 30 ? 'start' : x(ref) > W - 30 ? 'end' : 'middle'}">${shown.a === shown.b ? shown.b : `${shown.a}–${shown.b}`}</text></g>` : '';
  const H = lanesBottom + G.axis;
  const svg = `<svg class="lanes-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" aria-label="Terms of office drawn on a scale of years, ${model.from} to ${model.to}">` +
    `<defs>${defs.join('')}</defs>${back.join('')}${gaps.join('')}${grid.join('')}${band}${parts.join('')}<g class="axis" aria-hidden="true"><path class="axis-line" d="M0 ${lanesBottom}H${W}"/>${ticks.join('')}</g>${marker}</svg>`;
  return { svg, width: W, height: H, laneLabels, refX: x(ref), at };
}
export function laneLabel(L, lane) {
  const n = L.terms.length, holes = L.holes || [];
  const none = holes.length ? `; none drawn for ${holes.slice(0, 5).map(yearsWords).join(', ')}${holes.length > 5 ? ` and ${holes.length - 5} more stretch${holes.length - 5 === 1 ? '' : 'es'}` : ''}` : '';
  return `${LANE_NAME[lane]}: ${n} term${n === 1 ? '' : 's'} drawn${L.rows > 1 ? `, in ${L.rows} rows, as some overlap` : ''}${L.samePeople ? '; the same people as head of state' : ''}${L.alsoGovernment ? '; every head of government Wikidata records is the head of state of the time, so this lane stands for both offices' : ''}${none}`;
}
// Where one person holds both offices (buildModel, `folded`), the words that stand in place of the head of
// government's lane: "One lane stands for both offices: the only head of government Wikidata records for Mexico (from
// 2024) is the same person as the head of state of the time." It says what the record holds and no more: a head of
// government Wikidata does not record is not claimed for the head of state.
export function oneOfficeWords(model, name) {
  const f = model.lanes.government.folded;
  if (!f) return '';
  const today = model.today + 1;
  const when = f.cover.map(([p, q]) => (q >= today ? `from ${yearOfDay(p)}` : yearsWords([p, q]))).join(', ');
  const who = f.count === 1 ? 'the only head of government Wikidata records' : 'every head of government Wikidata records';
  return `One lane stands for both offices: ${who} for ${inProse(name)} (${when}) is the same person as the head of state of the time.`;
}
