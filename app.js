/* Political Retrospective (VM · Retrospective Intelligence): who led each country, and which political events happened,
   year by year. Borders: Cliopatria v0.2.1 (CC BY 4.0), by the year, to 2024. Statehood: Wikidata. Leaders: Wikidata
   names and dates where they agree with Archigos 4.1 within 31 days, else Archigos; how each took and left office,
   Archigos. Events: derived + Wikidata elections and statehood. States are keyed by their Wikidata item
   (data/countries.json, retro-countries/2).
   Map colours are CSS custom properties over PRP tokens (styles.css), written into SVG fills as var(...), so the map
   follows the light/dark theme without redrawing; the GIF export reads the same tokens when it draws.
   The years shown follow the timeline (prp-period.js, a copy of jdpi's design/prp-period.js): its start rests on the
   end, so one year is shown, as before; pulled back, it opens a period of years, and the map, panels, table, overview,
   border animation and GIF cover every year of it. URL: #y=<year, or the period's last>[&f=<its first year>][&c=<key>];
   an old c=<Gleditsch and Ward number> opens the same state and is rewritten to its key (the data's oldKeys). */
import { GIFEncoder, quantize, applyPalette } from 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js';
import { displayName } from './names.mjs';
import { buildModel, renderSvg, pxPerYear, fitsWhole, leftOut, LANES, LANE_NAME, GEOM, SLOT_PATTERN, describe, termWords, relationWords, samePerson, overlaps, dayOf, inProse, oneOfficeWords } from './lanes.js';

const W = 1000, H = 600;
const TODAY = new Date().toISOString().slice(0, 10);
// year: the year shown (the end of the period); from: the period's first year (the same year while the start rests).
const state = { year: 2026, from: 2026, selected: null, data: null, features: [], animating: false, view: 'map', sort: { key: 'name', dir: 1 },
  // The lanes of heads of state and government in the state panel (lanes.js): the closer view or the whole span (null
  // until the reader chooses: the closer view where the whole span gives under 8 px a year), the term whose detail is
  // open, the box's scroll, the bar to give the focus back to after a redraw, and Wikidata's family links between
  // holders (data/succession.json; null until read, and where the file is missing or unreadable; its links, perhaps
  // none, once read).
  lanes: { key: null, close: null, chosen: null, scroll: null, focus: null }, succession: null };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { leader: 'leader', coup: 'irregular', election: 'election', referendum: 'referendum', border: 'border', statehood: 'statehood' };

let svg, g, projection, path, zoom;

/* ---------------------------------------------------------------- data helpers */
const dateFor = y => (y >= new Date().getUTCFullYear() ? TODAY : `${y}-12-31`);
// A key is looked up among the object's own entries only: an address's #c=constructor or #c=__proto__ names no state
// (review X1, 21 November 2026), and opens the year with none selected, as an unknown key always has.
const own = (o, k) => (o != null && Object.hasOwn(o, k) ? o[k] : undefined);
const country = key => own(state.data.countries, key);
// Cliopatria's rows are by the year and end in 2024 (bordersTo): a later year is drawn on 2024's rows.
const held = y => Math.min(y, state.data.bordersTo);
const rowsIn = y => state.features.filter(f => f.properties.f <= held(y) && held(y) <= f.properties.t);
// The state a row stands for in a year (VM's crosswalk, written into the row as c, cf and ct), if any.
const keyIn = (p, y) => (p.f <= y && y <= p.t && p.c && (p.cf == null || y >= p.cf) && (p.ct == null || y <= p.ct) ? p.c : null);
// A state is covered on a date inside one of its spans: the spells of its statehood, from Wikidata (data/countries.json
// statehood; since 21 November 2026, no longer its leader list).
const coveredOn = (key, date) => (country(key)?.spans || []).some(([s, e]) => s <= date && (!e || date <= e));
// The covered state a drawn row stands for in year y: its state, while that state is covered.
const stateOfRow = (f, y) => { const k = keyIn(f.properties, held(y)); return k && coveredOn(k, dateFor(y)) ? k : null; };
const nameOf = (key, date) => displayName(key, country(key).name, date);
// The years shown: one year (a === b) or a period [a, b]; every helper takes the period, b defaulting to a.
const single = () => state.from === state.year;
const span = (a = state.from, b = state.year) => (a === b ? String(b) : `${a}–${b}`);
const inYears = (start, end, a, b = a) => start <= `${b}-12-31` && (!end || end >= `${a}-01-01`);

// Inside the state's statehood (review D3 and R1, 21 November 2026). A leader list can start before the statehood
// (Archigos starts Ukraine's Kravchuk on 18 July 1990, before its independence on 24 August 1991) or run past its end;
// such leaders and their arrivals are listed apart in the state's panel ("While not an independent state") and left
// out of the leaders, the overview, the counts, the colours and the year's list of key events.
const covers = (key, lo, hi) => (country(key)?.spans || []).some(([s, e]) => s <= hi && (!e || e >= lo));
const coversYears = (key, a, b = a) => covers(key, `${a}-01-01`, `${b}-12-31`);
// Whether the statehood covers the whole of the years shown (a state that began or ended in them does not).
const coversAll = (key, a, b = a) => (country(key)?.spans || []).some(([s, e]) => s <= `${a}-01-01` && (!e || e >= `${b}-12-31`));
// A leader inside the statehood in the years shown: some day of its term within them is a day of the statehood.
const leaderInside = (key, l, a, b = a) => covers(key, l.start > `${a}-01-01` ? l.start : `${a}-01-01`, l.end && l.end < `${b}-12-31` ? l.end : `${b}-12-31`);
// An event inside the statehood: a statehood event always; one given to the year (a border) if the statehood touches
// that year; any other on its day.
const eventInside = (key, e) => e.type === 'statehood' || (e.precision === 'year' ? coversYears(key, +e.date.slice(0, 4)) : coveredOn(key, e.date));
function leadersIn(key, a, b = a) {
  return (country(key)?.leaders || []).filter(l => inYears(l.start, l.end, a, b) && leaderInside(key, l, a, b));
}
const leadersOutside = (key, a, b = a) => (country(key)?.leaders || []).filter(l => inYears(l.start, l.end, a, b) && !leaderInside(key, l, a, b));
// Whether VM holds a leader in office for the state on a date. A state that exists then may have none: Archigos's list
// for the Netherlands runs from de Geer, to 14 May 1940, to Schermerhorn, from 24 June 1945.
const inOffice = (key, date) => (country(key)?.leaders || []).some(l => l.start <= date && (!l.end || l.end >= date));
// Leaders in groups that took office together (the same first day, neither for a single day), in order: San Marino's
// two Captains Regent, even when one leaves early (1930).
function coLeaders(leaders) {
  const groups = [];
  const lasting = l => l.end !== l.start;
  for (const l of leaders) { const g = groups.at(-1); if (g && g[0].start === l.start && lasting(g[0]) && lasting(l)) g.push(l); else groups.push([l]); }
  return groups;
}
const lastEnd = g => g.map(l => l.end || '9999-12-31').sort().at(-1);
const andList = l => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} and ${l.at(-1)}`);
// Other office holders inside the statehood (outside it, an office belongs to no state of this record: Germany's
// Q41304 after 1945 carries Q183's office holders for the elections only).
function officesIn(key, a, b, leaders) {
  // The leader is left out by name or by article: an office holder's name is Wikidata's English label, a leader's the
  // article's title ("Isaac Shamir" and "Yitzhak Shamir" are one person: review D1, fixer).
  const names = new Set(leaders.map(l => (l.full || l.name).toLowerCase())), urls = new Set(leaders.map(l => l.url).filter(Boolean));
  // One row for a person in one office: Wikidata gives Wilhelmina's reign twice (from 1890 and from her coming of age
  // in 1898), and the first is kept (review R6).
  const once = new Set();
  return (country(key)?.offices || []).filter(o => inYears(o.start, o.end, a, b) && leaderInside(key, o, a, b) && !names.has((o.full || '').toLowerCase()) && !(o.url && urls.has(o.url)))
    .filter(o => { const k = `${o.office}|${o.url || o.full}`; if (once.has(k)) return false; once.add(k); return true; });
}
const eventsAll = (key, a, b = a) => (country(key)?.events || []).filter(e => e.date >= `${a}-01-01` && e.date <= `${b}-12-31`);
// An event dated after today has not happened yet (review front-pages-3, 25 November 2026): the data keeps the votes
// Wikidata schedules (Spain's general election of 29 November 2026), because the Historical Calendar and the lake and
// National Analysis refreshes read them, so the page holds them back on the day it is read. They are listed apart,
// marked "scheduled", and left out of the counts, the colours, the overview and the table. "Today" here is the date in
// the reader's own time zone (second reading, 25 November 2026: TODAY is the date in UTC, so west of Greenwich a vote
// showed as held on the evening before its day, and east of it as still to come on the morning of it). TODAY itself
// stays the UTC date for dateFor and the captions.
const LOCAL_TODAY = (d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(new Date());
const scheduled = e => e.date > LOCAL_TODAY;
function eventsIn(key, a, b = a) {
  return eventsAll(key, a, b).filter(e => eventInside(key, e) && !scheduled(e));
}
const scheduledIn = (key, a, b = a) => eventsAll(key, a, b).filter(e => eventInside(key, e) && scheduled(e));
const eventsOutside = (key, a, b = a) => eventsAll(key, a, b).filter(e => !eventInside(key, e) && !scheduled(e));
// How leaders took office comes from Archigos 4.1, which ends in 2015 (data.sources.leaders: "entry, exit and exitHow:
// Archigos 4.1, to 2015"). All 216 leaders who took office after 2015 (data of 25 November 2026) carry no entry, so for the states Archigos covers
// no irregular seizure of power can be counted or coloured after 2015, and a 0 there would be read as none happening
// (review retrospective-8, 25 November 2026). VM's own lists for Montenegro and the ten microstates
// (scripts/leader-lists.mjs) give the entry wherever a source says it, in any year.
const ENTRY_TO = 2015;
function entryNote(a, b = a) {
  if (b <= ENTRY_TO) return '';
  const why = `how leaders took office comes from Archigos 4.1, which ends in ${ENTRY_TO}, so for the states it covers no irregular seizure of power is counted or coloured after ${ENTRY_TO} (VM’s own lists for Montenegro and the ten microstates give one wherever a source records it)`;
  return a > ENTRY_TO ? `Irregular seizures of power are not recorded after ${ENTRY_TO}: ${why}.`
    : `The count of irregular seizures of power runs only to ${ENTRY_TO}: ${why}.`;
}
// The years after the first of those shown in which this state's border in Cliopatria differs from the year before's
// (its border events, by the year): the frames of the border animation.
function borderChanges(key, a, b = a) {
  return eventsIn(key, a, b).filter(e => e.type === 'border').map(e => +e.date.slice(0, 4)).filter((y, i, l) => y > a && l.indexOf(y) === i).sort((p, q) => p - q);
}
// The most significant thing that happened to a state in the years shown: its independence, union or end as a state
// (Wikidata's statehood events), else an irregular seizure of power, else a new leader, else a year in which its border
// in Cliopatria differs from the year before's (which may be a redrawing of Cliopatria's rows, #border-limit, so every
// label says the border differs, never that it changed: review X3).
function statusFor(key, a, b = a) {
  if (!country(key)) return 'none';
  const ev = eventsIn(key, a, b);
  if (ev.some(e => e.type === 'statehood')) return 'statehood';
  if (ev.some(e => e.type === 'coup')) return 'irregular';
  if (ev.some(e => e.type === 'leader')) return 'change';
  if (ev.some(e => e.type === 'border')) return 'border';
  return 'steady';
}
const FILL = { statehood: 'var(--c-statehood)', irregular: 'var(--c-irregular)', change: 'var(--c-change)', border: 'var(--c-border)', steady: 'var(--c-steady)' };
const STATUS_LABEL = { statehood: 'Independence, union or end of a state', irregular: 'Irregular seizure of power', change: 'New leader', border: 'Cliopatria’s border differs', steady: 'No change' };
const poss = n => (/s$/.test(n) ? `${n}’` : `${n}’s`); // "United States’ border", "Germany’s border"
// A date at its precision (review D7, 21 November 2026): Wikidata gives some office holders' dates only to the year or
// the month (Robert Abela's start, "2020"), shown as the year or "Jan 2020", never as 1 January.
const fmt = (d, precision = 'day') => {
  if (!d) return 'present';
  const [y, m, dd] = d.split('-').map(Number);
  if (precision === 'year') return String(y);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-GB', { ...(precision === 'month' ? {} : { day: 'numeric' }), month: 'short', year: 'numeric', timeZone: 'UTC' });
};
// A leader's or office holder's term, each end at its precision.
const term = p => `${fmt(p.start, p.startPrecision)} – ${fmt(p.end, p.endPrecision)}`;
// A dated event at the precision its source gives: a year-only date as the year, a month as "Aug 1991". Wikidata often
// records only the year of an election, and Cliopatria's borders are by the year.
const whenOf = e => (e.precision === 'year' || (!e.precision && /^(election|referendum)$/.test(e.type) && e.date.endsWith('-01-01')) ? e.date.slice(0, 4)
  : e.precision === 'month' ? new Date(`${e.date.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : fmt(e.date));
// Party memberships (from Wikidata) that applied during the years shown; undated memberships always apply. With a
// state's key, only those that applied on a day of its statehood in those years: what is said of the state (its
// overview, "Parties in power") counts nothing from before it was a state. Kravchuk's membership of the Communist
// Party of the Soviet Union ends in 1991 before Ukraine's independence on 24 August, so that party is not said to
// have held power in Ukraine in 1991 (second review, X2).
function partiesAt(p, a, b = a, key = null) {
  const all = p.parties || [];
  const lo = `${a}-01-01`, hi = `${b}-12-31`;
  const wins = key ? (country(key)?.spans || []).map(([s, e]) => [s > lo ? s : lo, e && e < hi ? e : hi]).filter(([s, e]) => s <= e) : [[lo, hi]];
  const now = all.filter(m => wins.some(([s, e]) => (!m.s || m.s <= e) && (!m.e || m.e >= s)));
  return (now.length ? now : all.filter(m => !m.s && !m.e)).slice(0, 2);
}
const partyChips = (p, a, b = a) => partiesAt(p, a, b).map(m => `<a class="party" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>`).join('');
const wiki = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const leaderLink = (l, key) => l.url || `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(`${l.full || l.name} ${country(key).name}`)}`;
// Covered states on the map on a date, one per state, under the name they had then.
function statesOn(date) {
  const y = +date.slice(0, 4), seen = new Map();
  for (const f of rowsIn(y)) {
    const key = stateOfRow(f, y);
    if (key && !seen.has(key)) seen.set(key, { key, name: nameOf(key, date) });
  }
  return [...seen.values()];
}
// Why a year's count is smaller than the coverage in the status line, worked out per country. A covered country is
// counted in a year while it is covered (its spans, from its statehood in Wikidata) and Cliopatria has a row for it. One that is
// covered but has no row that year (San Marino and Liechtenstein in every year, Poland from 1944 to 1952…) is named:
// VM cannot place it on a free border. The rest were not states then: before (not yet), after (no longer), or between
// two spells of independence (the Baltic states, 1940–91).
// The covered states VM cannot place on a free border in year y (covered then, but no row of Cliopatria's stands for
// them), and the one sentence that names them: in the panel's count, in a state's own panel, and beside the map
// (#unplaced), which keeps them named whether or not a state is selected (review X2, 21 November 2026).
function unplacedIn(y) {
  const date = dateFor(y), counted = new Set(statesOn(date).map(s => s.key));
  return Object.keys(state.data.countries).filter(key => !counted.has(key) && coveredOn(key, date)).map(key => nameOf(key, date));
}
const cannotPlace = (names, y) => `VM cannot place ${andList(names)} on a free border for ${y}`;
function renderUnplaced(y) {
  const names = unplacedIn(y), box = $('#unplaced');
  box.textContent = names.length ? `${cannotPlace(names, y)}.` : '';
  box.hidden = !names.length;
}
function coverageNote(y) {
  const date = dateFor(y), now = date === TODAY, when = now ? 'today' : `at the end of ${y}`;
  const all = Object.keys(state.data.countries), total = all.length;
  const counted = new Set(statesOn(date).map(s => s.key));
  const later = [], earlier = [], between = [], unplaced = unplacedIn(y);
  for (const key of all) {
    if (counted.has(key) || coveredOn(key, date)) continue;
    const spans = country(key).spans || [];
    if (spans.every(([s]) => s > date)) later.push(key);
    else if (spans.every(([, e]) => e && e < date)) earlier.push(key);
    else between.push(key);
  }
  const n = counted.size, m = later.length + earlier.length + between.length, k = unplaced.length;
  if (n === total) return `All ${total} countries covered over the years are on the map ${when}.`;
  let out = `${n} of the ${total} countries covered over the years are on the map ${when}.`;
  if (k) out += ` ${k} ${k === 1 ? 'is' : 'are'} covered in ${y} but not drawn: ${cannotPlace(unplaced, y)}.`;
  if (m) {
    const verb = now ? (m === 1 ? 'is' : 'are') : (m === 1 ? 'was' : 'were'), what = m === 1 ? 'an independent state' : 'independent states';
    const kinds = [[later, 'not yet'], [earlier, 'no longer'], [between, 'between two spells of independence']].filter(([l]) => l.length);
    const head = `The other ${m === 1 ? 'one' : m} ${verb}`, then = now ? '' : ' then';
    out += kinds.length > 1 ? ` ${head} not ${what}${then}: ${andList(kinds.map(([l, w]) => `${l.length} ${w}`))}.`
      : kinds[0][1] === 'between two spells of independence' ? ` ${head} not ${what}${then}, between two spells of independence.`
        : ` ${head} ${kinds[0][1]} ${what}${then}.`;
  }
  return out;
}
// The years drawn on the last year of Cliopatria's rows (2025 and 2026), said where the map is described.
function heldNote() {
  const { bordersTo, lastYear } = state.data;
  const after = Array.from({ length: Math.max(0, lastYear - bordersTo) }, (_, i) => bordersTo + 1 + i);
  return after.length ? ` Cliopatria’s borders end in ${bordersTo}, so ${andList(after.map(String))} ${after.length > 1 ? 'are' : 'is'} drawn on the borders of ${bordersTo}.` : '';
}
// Resolve a colour (a token, var() or color-mix()) to rgb() for drawing on a canvas.
function cssColor(value) {
  const probe = document.createElement('i');
  probe.style.color = value;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return rgb;
}

/* ---------------------------------------------------------------- map */
function drawMap() {
  svg = d3.select('#map').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');
  projection = d3.geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'FeatureCollection', features: rowsIn(state.data.bordersTo) });
  path = d3.geoPath(projection);
  g = svg.append('g');
  zoom = d3.zoom().scaleExtent([1, 40]).interpolate(d3.interpolate).on('zoom', ev => g.attr('transform', ev.transform));
  svg.call(zoom);
  $('#zoom-in').onclick = () => svg.transition().call(zoom.scaleBy, 1.6);
  $('#zoom-out').onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.6);
  $('#zoom-reset').onclick = () => focusBounds([[-170, 5], [150, 72]]);
  focusBounds([[-170, 5], [150, 72]], 0);
}

// `edges`: bound the box by points along its four edges, not by two corners. The meridians bend on this projection and
// the pole is a short line, so a box that reaches far north (Russia, Canada) has corners well inside its true outline,
// and its two corners would centre the view on the wrong place. The opening view keeps its corners.
function focusBounds([[x0, y0], [x1, y1]], duration = 700, edges = false) {
  let [[px0, py0], [px1, py1]] = [projection([x0, y1]), projection([x1, y0])];
  if (edges) {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const x = x0 + (x1 - x0) * i / 24, y = y0 + (y1 - y0) * i / 24; pts.push([x, y0], [x, y1], [x0, y], [x1, y]); }
    const ps = pts.map(p => projection(p)).filter(Boolean);
    [px0, px1, py0, py1] = [d3.min(ps, p => p[0]), d3.max(ps, p => p[0]), d3.min(ps, p => p[1]), d3.max(ps, p => p[1])];
  }
  const k = Math.min(40, 0.9 / Math.max((px1 - px0) / W, (py1 - py0) / H));
  const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(px0 + px1) / 2, -(py0 + py1) / 2);
  if (duration) svg.transition().duration(duration).call(zoom.transform, t); else svg.call(zoom.transform, t);
}

// The map in year y (the end of the years shown, or a frame of the border animation), each covered state coloured by
// what happened to it in the years shown. Cliopatria's rows can overlap (its French Fifth Republic takes in Algeria,
// which has a row of its own), so the larger are drawn first and the smaller sit on top; the selected state last.
function renderMap(y = state.year) {
  const a = state.from, b = state.year, date = dateFor(y);
  const key = d => stateOfRow(d, y);
  const on = d => key(d) && key(d) === state.selected;
  const shapes = rowsIn(y).sort((p, q) => on(p) - on(q) || q.properties.a - p.properties.a);
  const tip = $('#tooltip');
  renderUnplaced(y); // the covered states this map does not draw, for the year it draws
  g.selectAll('path.shape')
    .data(shapes, d => d.properties.id)
    .join('path')
    .attr('d', path)
    .attr('class', d => `shape ${key(d) ? 'active' : 'inactive'}${on(d) ? ' selected' : ''}`)
    .attr('data-key', d => key(d))
    .attr('fill', d => (key(d) ? FILL[statusFor(key(d), a, b)] : null))
    .on('mousemove', (ev, d) => {
      const box = $('.map-stage').getBoundingClientRect();
      const k = key(d);
      const ls = k ? leadersIn(k, a, b) : [], l = ls.at(-1);
      const st = k ? statusFor(k, a, b) : null;
      tip.innerHTML = `<strong>${esc(k ? nameOf(k, date) : d.properties.n)}</strong>${k ? (l ? esc(a === b || ls.length < 2 ? l.full || l.name : `${ls.length} leaders, last ${l.full || l.name}`) : 'Leader unknown') : 'Not covered'}` +
        (k ? `<span class="tip-sub"><span class="swatch" style="background:${FILL[st]}"></span>${STATUS_LABEL[st]} in ${span(a, b)}</span>` : '');
      tip.hidden = false;
      tip.style.left = `${Math.max(8, Math.min(ev.clientX - box.left + 14, box.width - tip.offsetWidth - 8))}px`;
      tip.style.top = `${Math.max(8, Math.min(ev.clientY - box.top + 14, box.height - tip.offsetHeight - 8))}px`;
    })
    .on('mouseleave', () => { tip.hidden = true; })
    .on('click', (ev, d) => { if (key(d)) select(key(d)); })
    .order();
}

/* ---------------------------------------------------------------- panel */
function renderPanel() {
  const a = state.from, y = state.year, when = span(a, y), one = a === y;
  const panel = $('#panel');
  if (!state.selected) {
    const all = Object.entries(state.data.countries)
      .flatMap(([key, c]) => eventsIn(key, a, y).map(e => ({ ...e, key, cname: c.name })))
      // On one day a statehood event comes first, as in each state's own list (scripts/retro-shape.mjs byDay): on
      // 1 January 1993 Czechia's and Slovakia's independence stand before the leaders who took office that day
      // (second review, X5).
      .sort((p, q) => p.date.localeCompare(q.date) || (q.type === 'statehood') - (p.type === 'statehood'));
    const count = (...types) => all.filter(e => types.includes(e.type)).length;
    // Votes dated after today, listed after the year's events and marked "scheduled"; never counted (front-pages-3).
    const ahead = Object.entries(state.data.countries).flatMap(([key, c]) => scheduledIn(key, a, y).map(e => ({ ...e, key, cname: c.name })))
      .sort((p, q) => p.date.localeCompare(q.date));
    const shown = [...all, ...ahead];
    // Irregular seizures after 2015 are not recorded for the states Archigos covers (retrospective-8): a period after
    // 2015 says so in place of a 0, and one that crosses 2015 says its count runs only to 2015.
    const coups = count('coup'), after = a > ENTRY_TO, crosses = !after && y > ENTRY_TO;
    panel.innerHTML = `<h2>${when}</h2>
      <p class="sub">${esc(coverageNote(y))}</p>
      <div class="prp-kpis">
        <div class="prp-kpi"><span>Leader changes</span><b>${count('leader', 'coup')}</b></div>
        <div class="prp-kpi" id="kpi-irregular"><span>Irregular seizures${crosses ? `, to ${ENTRY_TO}` : ''}</span>${after && !coups ? `<b style="font-size:var(--prp-fs-sm)">Not recorded after ${ENTRY_TO}</b>` : `<b>${coups}</b>`}</div>
        <div class="prp-kpi"><span>Elections, referendums</span><b>${count('election', 'referendum')}</b></div>
        <div class="prp-kpi"><span>Borders that differ in Cliopatria</span><b>${count('border')}</b></div>
        <div class="prp-kpi"><span>Independence, union or end</span><b>${count('statehood')}</b></div>
      </div>
      ${entryNote(a, y) ? `<p class="note" id="entry-note">${esc(entryNote(a, y))}</p>` : ''}
      <p class="note">${one ? 'Select a country to see who was in charge and its key events. Drag the slider or press ▶ to move through the years; drag its hollow start handle back to cover a period of years.' : `Everything recorded from ${a} to ${y}. Select a country to see who was in charge and its key events; bring the hollow start handle back onto the end for a single year.`}</p>
      <h3>Key events ${one ? `in ${y}` : when}${shown.length > 120 ? ` · the first 120 of ${shown.length}` : ''}</h3>
      ${shown.length ? `<ul class="events">${shown.slice(0, 120).map(e => eventItem(e, e.cname, e.key)).join('')}</ul>` : '<p class="empty">No recorded events.</p>'}
      ${ahead.length ? `<p class="note">${scheduledNote(ahead.length)}</p>` : ''}`;
    panel.querySelectorAll('[data-open]').forEach(a => a.onclick = ev => { ev.preventDefault(); select(a.dataset.open); });
    return;
  }
  const key = state.selected;
  const c = country(key);
  const date = dateFor(y);
  const placed = statesOn(date).some(s => s.key === key);
  const leaders = leadersIn(key, a, y);
  const offices = officesIn(key, a, y, leaders);
  const events = eventsIn(key, a, y);
  const ahead = scheduledIn(key, a, y); // dated after today: listed, marked "scheduled", never counted (front-pages-3)
  // What VM's lists hold for the state at times in these years when it was not an independent state (D3, R1).
  const outside = { leaders: leadersOutside(key, a, y), events: eventsOutside(key, a, y) };
  const existed = coversYears(key, a, y);
  const changes = borderChanges(key, a, y);
  // Wikipedia's "<year> in <country>" events are read for one year; over a period, its year pages are linked instead.
  const page = one && c.yearPages.includes(y) ? `${y} in ${c.yearPage}` : null;
  const pages = one ? [] : c.yearPages.filter(p => p >= a && p <= y).map(p => `${p} in ${c.yearPage}`);
  const ruling = new Map();
  for (const p of [...leaders, ...offices]) for (const m of partiesAt(p, a, y, key)) ruling.set(m.url, m);
  const name = nameOf(key, date);
  // Cliopatria gives one border a year, so a change within a single year cannot be played; over a period, the years
  // in which the border differs from the year before are played one after another.
  const changedInYear = one && events.some(e => e.type === 'border');
  // A bar of the lanes that has the focus gets it back after the panel is drawn again (drawLanes).
  state.lanes.focus = document.activeElement?.closest?.('#lanes-scroll .lane-bar')?.dataset.id || null;

  // The lanes come straight after the heading, so nothing above them changes length from year to year and they stay
  // in place while the year moves; their notes on what is left out and their sources follow the list.
  panel.innerHTML = `<button class="close" type="button" id="close" aria-label="Close">✕</button>
    <h2>${esc(name)}</h2>
    <p class="sub">${placed ? when : coveredOn(key, date) ? `${when} · ${esc(cannotPlace([name], y))}, so the map does not draw it` : `Not an independent state at the end of ${y}`}</p>
    ${lanesSection(key, name)}
    <h3>Political overview of ${when}</h3>
    <p class="overview">${esc(overviewText(name, a, y, leaders, offices, events, [...ruling.values()], { existed, whole: coversAll(key, a, y), outside: outside.leaders, key }))}</p>
    <div id="wiki-events" class="wiki-events">${page ? '<p class="empty">Loading events from Wikipedia…</p>' : pages.length ? `<p class="note">Wikipedia, year by year: ${pages.map(p => `<a href="${wiki(p)}" target="_blank" rel="noopener">${esc(p.slice(0, 4))}</a>`).join(' · ')}</p>` : ''}</div>
    ${ruling.size ? `<h3>Parties in power ${one ? `in ${y}` : when}</h3><div class="parties">${[...ruling.values()].map(m => `<a class="party" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>`).join('')}</div><p class="note" style="margin-top:6px">Party of each leader in office, from Wikidata. Where Wikidata has no membership dates, every party the person belonged to is shown.</p>` : ''}
    ${existed ? `<h3>In charge during ${when}</h3>
    ${leaders.length ? leaders.map(l => leaderItem(l, key, a, y)).join('')
    // One line where VM holds no leader (review R6): the date's, when the state exists then with nobody in office.
    : `<p class="empty">${coveredOn(key, date) && !inOffice(key, date) ? `VM holds no leader for ${fmt(date)}.` : `No leader recorded for ${one ? 'this year' : 'these years'}.`}</p>`}
    ${leaders.length && coveredOn(key, date) && !inOffice(key, date) ? `<p class="note">VM holds no leader for ${fmt(date)}.</p>` : ''}` : ''}
    <div id="lanes-notes">${lanesNotes(key, name)}</div>
    ${offices.length ? `<h3>Also in office</h3>${offices.map(o => `<div class="leader">
        <div class="who"><a href="${esc(o.url || wiki(o.full))}" target="_blank" rel="noopener">${esc(o.full)}</a><span class="tag office">${o.office === 'hos' ? 'Head of state' : 'Head of government'}</span></div>
        <div class="meta">${term(o)}</div>
        ${partyChips(o, a, y) ? `<div class="parties">${partyChips(o, a, y)}</div>` : ''}</div>`).join('')}` : ''}
    ${existed || events.length || ahead.length ? `<h3>Key events ${one ? `in ${y}` : when}</h3>
    ${events.length || ahead.length ? `<ul class="events">${[...events, ...ahead].map(e => eventItem(e)).join('')}</ul>` : `<p class="empty">No recorded events ${one ? 'this year' : 'in these years'}.</p>`}
    ${ahead.length ? `<p class="note">${scheduledNote(ahead.length)}</p>` : ''}` : ''}
    ${outside.leaders.length || outside.events.length ? `<div class="outside">
      <h3>While not an independent state</h3>
      <p class="note">VM’s lists hold these for ${esc(name)} at times ${one ? `in ${y}` : `from ${a} to ${y}`} when it was not an independent state. They are not counted in the year’s figures.</p>
      ${outside.leaders.map(l => leaderItem(l, key, a, y)).join('')}
      ${outside.events.length ? `<ul class="events">${outside.events.map(e => eventItem(e)).join('')}</ul>` : ''}
    </div>` : ''}
    ${changedInYear ? `<h3>Cliopatria’s border in ${y}</h3>
      <p class="note">Cliopatria gives borders by the year: the map shows ${esc(poss(name))} border for ${y}, which differs in Cliopatria from ${y - 1}’s by more than 1% of its area. That may be a redrawing of Cliopatria’s rows rather than a change of border, and a change within ${y} cannot be shown.</p>` : ''}
    ${changes.length ? `<h3>Cliopatria’s borders, ${when}</h3>
      <p class="sub">${changes.length} year${changes.length > 1 ? 's' : ''} in which Cliopatria’s border differs from the year before’s: ${changes.join(', ')}</p>
      <div class="actions"><button class="prp-btn sm primary" id="animate" type="button">▶ Play ${when} borders</button>
      <button class="prp-btn sm" id="gif" type="button">⤓ Download GIF</button></div>
      <p class="note">Year by year: Cliopatria gives borders by the year, so a change within a year is not shown.</p>` : ''}
    ${page ? `<p class="note">More: <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a> on Wikipedia</p>` : ''}
    ${c.iso3 ? `<p class="note">Today: <a href="https://political-atlas.pages.dev/#${c.iso3}" target="_blank" rel="noopener">${esc(c.name)} in Political Atlas</a></p>` : ''}`;
  $('#close').onclick = () => select(null);
  drawLanes();
  if (page) loadWikiEvents(page, key, y);
  if (changes.length) {
    $('#animate').onclick = () => animateYears(key, a, y, changes);
    $('#gif').onclick = () => downloadGif(key, a, y, changes);
  }
}

/* ---------------------------------------------------------------- yearly overview */
// A short plain-English summary built from the leaders, parties and events of the year, or of the period a..y.
// `st`: whether the state existed at some time in the years shown, whether throughout them, and the leaders VM's lists
// hold for it while it was not an independent state (D3, R1): none of them is said to have led it.
function overviewText(name, a, y, leaders, offices, events, ruling, st = { existed: true, whole: true, outside: [] }) {
  const who = p => `${p.full || p.name}${partiesAt(p, a, y, st.key).length ? ` (${partiesAt(p, a, y, st.key).map(m => m.name).join(', ')})` : ''}`;
  const parts = [], one = a === y;
  // Leaders who ruled together (San Marino's two Captains Regent) are joined with "and"; one who left before the other
  // is marked "until", and one who came while the other was still in office "joined by … from".
  const groups = coLeaders(leaders);
  const together = groups.map(g => andList(g.map(l => `${who(l)}${g.length > 1 && (l.end || '9999-12-31') < lastEnd(g) ? ` (until ${fmt(l.end, l.endPrecision)})` : ''}`)));
  const sequence = together.map((t, i) => (!i ? t : groups[i - 1].length > 1 && groups[i][0].start < lastEnd(groups[i - 1]) ? `, joined by ${t} (from ${fmt(groups[i][0].start, groups[i][0].startPrecision)})` : `, then ${t}`)).join('');
  // "Throughout" only where the state existed throughout the years shown; else "in" them (Ukraine in 1991).
  const through = st.whole ? `throughout ${one ? y : `${a}–${y}`}` : one ? `in ${y}` : `in ${a}–${y}`;
  if (!st.existed) parts.push(`${name} was not an independent state ${one ? `in ${y}` : `at any time from ${a} to ${y}`}${st.outside.length ? `; VM’s list names ${andList(st.outside.map(who))} for that time` : ''}.`);
  if (leaders.length === 1) parts.push(`${who(leaders[0])} led ${name} ${through}.`);
  else if (together.length === 1) parts.push(`${together[0]} led ${name} together ${through}.`);
  else if (leaders.length > 1) parts.push(`${name} had ${leaders.length} leaders ${one ? `in ${y}` : `between ${a} and ${y}`}: ${sequence}.`);
  if (st.existed && st.outside.length) parts.push(`For the time it was not an independent state, VM’s list also names ${andList(st.outside.map(who))}.`);
  if (offices.length) parts.push(`Also in office: ${offices.map(o => `${who(o)} as ${o.office === 'hos' ? 'head of state' : 'head of government'}`).join('; ')}.`);
  if (ruling.length === 1) parts.push(`The ${ruling[0].name} held power.`);
  const count = t => events.filter(e => e.type === t).length;
  // Its independence, union or end as a state, from Wikidata, each at the precision Wikidata gives (whenOf).
  const stately = events.filter(e => e.type === 'statehood');
  // The cause and the date in one bracket (review R8): "… (German reunification, 3 Oct 1990)".
  const dated = e => { const t = e.text.replace(/^(.)/, (_, c) => c.toUpperCase()); return /\)$/.test(t) ? `${t.slice(0, -1)}, ${whenOf(e)})` : `${t} (${whenOf(e)})`; };
  if (stately.length) parts.push(`${stately.map(dated).join('; ')}.`);
  const ev = [];
  if (count('coup')) ev.push(`${count('coup')} irregular seizure${count('coup') > 1 ? 's' : ''} of power`);
  if (count('election')) ev.push(`${count('election')} election${count('election') > 1 ? 's' : ''}`);
  if (count('referendum')) ev.push(`${count('referendum')} referendum${count('referendum') > 1 ? 's' : ''}`);
  if (ev.length) parts.push(`The ${one ? 'year' : 'period'} saw ${ev.join(', ')}.`);
  // A border event says Cliopatria's border differs from the year before's, which may be a redrawing (#border-limit).
  const differ = new Set(events.filter(e => e.type === 'border').map(e => e.date.slice(0, 4))).size;
  if (differ) parts.push(one ? `${poss(name)} border in Cliopatria differs from ${y - 1}’s.` : `${poss(name)} border in Cliopatria differs from the year before’s in ${differ} of the years ${a}–${y}.`);
  return parts.join(' ') || `No leadership data is recorded for ${name} in ${one ? y : `${a}–${y}`}.`;
}

// The first few items of the "Events" section of Wikipedia's "<year> in <country>" article.
const wikiCache = new Map(), wikiPending = new Map();
async function loadWikiEvents(page, key, y) {
  // The box is looked up after the wait: the panel may have been drawn again meanwhile.
  const box = () => $('#wiki-events');
  try {
    if (!wikiCache.has(page)) {
      // A second call for the same page while the first request is out waits for it, rather than asking again.
      if (!wikiPending.has(page)) {
        const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', prop: 'extracts', explaintext: '1', exsectionformat: 'wiki', redirects: '1', titles: page, format: 'json', origin: '*' });
        wikiPending.set(page, fetch(url).then(res => res.json()).then(json => {
          wikiCache.set(page, eventsFromExtract(Object.values(json.query?.pages || {})[0]?.extract || ''));
        }).finally(() => wikiPending.delete(page)));
      }
      await wikiPending.get(page);
    }
    if (state.selected !== key || state.year !== y || !single() || !$('#wiki-events')) return;
    const items = wikiCache.get(page);
    box().innerHTML = items.length
      ? `<ul class="wiki-list">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="note">From <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a>, Wikipedia (CC BY-SA)</p>`
      : `<p class="note">More in <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a> on Wikipedia.</p>`;
  } catch {
    if (box()) box().innerHTML = `<p class="note">More in <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a> on Wikipedia.</p>`;
  }
}
function eventsFromExtract(text) {
  const m = text.match(/\n== Events ==\n([\s\S]*?)(?=\n== (?!=)|$)/);
  if (!m) return [];
  return m[1].split('\n').map(l => l.trim())
    .filter(l => l && !/^=+/.test(l) && l.length > 25)
    .map(l => l.length > 220 ? l.slice(0, 217).replace(/\s+\S*$/, '') + '…' : l)
    .slice(0, 6);
}

function leaderItem(l, key, a, y) {
  return `<div class="leader">
        <div class="who"><a href="${esc(leaderLink(l, key))}" target="_blank" rel="noopener">${esc(l.full || l.name)}</a>${l.entry === 'Irregular' ? '<span class="tag irregular">irregular entry</span>' : ''}</div>
        <div class="meta">${term(l)}${l.entry && l.entry !== 'Regular' && l.entry !== 'Irregular' ? ` · entry: ${esc(l.entry)}` : ''}${l.exit && l.exit !== 'Regular' ? ` · exit: ${esc(l.exit)}` : ''}</div>
        ${partyChips(l, a, y) ? `<div class="parties">${partyChips(l, a, y)}</div>` : ''}
      </div>`;
}
/* ---------------------------------------------------------------- heads of state and government as lanes */
// Two lanes on the period control's scale of years (lanes.js): head of state above, head of government below, each
// bar one term, coloured by a party Wikidata dates for it, a line at the date the panel describes. Only terms from
// free sources are drawn (Wikidata, CC0, and VM's own lists); the leaders whose names and dates are Archigos 4.1's are
// counted from the data and stay in the list under the lanes, which remains the text alternative.
const lanesCache = new Map();
function lanesModel(key) {
  const id = `${key}|${TODAY}|${state.succession ? state.succession.length : 'none'}`;
  if (!lanesCache.has(id)) lanesCache.set(id, buildModel(country(key), key, { firstYear: state.data.firstYear, lastYear: state.data.lastYear, today: TODAY, links: state.succession || [] }));
  return lanesCache.get(id);
}
const n0 = x => x.toLocaleString('en-GB');
// How many leaders are left out because their source is Archigos, for this state and in all, counted from the data;
// and how many of those people are in the lanes all the same, from Wikidata's own list of the office.
function leftOutNote(key, name0, model) {
  const c = leftOut(state.data, key), name = inProse(name0);
  const terms = LANES.flatMap(l => model.lanes[l].terms);
  const anyway = (country(key).leaders || []).filter(l => l.source === 'Archigos' && terms.some(t => t.kind === 'office' && samePerson(t, { full: l.full || l.name, url: l.url, qid: l.qid })
    && overlaps(dayOf(t.start), t.end ? dayOf(t.end) : dayOf(TODAY), dayOf(l.start), l.end ? dayOf(l.end) : dayOf(TODAY)))).length;
  const why = 'Archigos 4.1, whose page states no licence for reuse';
  const all = `${n0(c.all)} of the ${n0(c.allTotal)} leaders in VM’s lists`;
  if (!c.here) return `Every leader VM’s list holds for ${name} is drawn. In all, ${all} take their names and dates from ${why}; those records are not drawn (where Wikidata lists the same person in the office, that term is drawn from Wikidata), and they stay in each state’s list.`;
  const one = c.here === 1;
  return `${why.replace(/^./, s => s.toUpperCase())}, gives the names and dates of ${n0(c.here)} of the ${n0(c.hereTotal)} leaders in VM’s list for ${name}, so ${one ? 'that record is' : 'those records are'} not drawn (${all} in all).` +
    (!anyway ? ` ${one ? 'It stays' : 'They stay'} in the list.`
      : anyway === c.here ? ` ${one ? 'That person is' : `All ${n0(anyway)} people are`} in the lanes anyway, from Wikidata’s own list of the office.`
        : ` ${n0(anyway)} of them ${anyway === 1 ? 'is' : 'are'} in the lanes anyway, from Wikidata’s own list of the office; the others are only in the list.`);
}
// The sources of the lanes for the state shown (the file names are in the footer and the README).
// The source of the eleven hand-built lists (scripts/leader-lists.mjs). Until 27 November 2026 it said every entry
// was read from two of these, which some entries do not meet (Dominica's Presidents rest on Wikipedia's list;
// a few days rest on one source and say so), so it now says "most" (fixer, 27 November 2026).
const OWN_LIST = 'VM’s own list, built from Wikidata, Wikipedia’s lists and articles and the state’s official acts and records: most entries are read from two or more of them, and an entry that rests on one, or on sources that disagree, says so in scripts/leader-lists.mjs';
function lanesSourceNote(key, name0, model) {
  const links = state.succession && state.succession.some(x => x.country === key);
  // Terms whose record names its own source (scripts/leader-corrections.mjs): heads of state that Wikidata's P35 leaves
  // out, and offices VM lists or dates by hand (fixer, 26 November 2026).
  const own = LANES.flatMap(l => [...model.lanes[l].terms, ...model.lanes[l].terms.flatMap(t => t.alsoGovernment || [])]).filter(t => t.rec?.sourceNote);
  const reigns = own.some(t => t.rec.source === 'reigns'), byHand = own.some(t => t.rec.source !== 'reigns');
  return `The lanes are drawn from Wikidata (CC0): the heads of state and government of ${inProse(name0)} and its leaders’ offices` +
    `${model.listed ? `; and from ${OWN_LIST}` : ''}` +
    `${reigns ? '; with the heads of state that Wikidata’s head of state (P35) leaves out, added in scripts/leader-corrections.mjs from their “position held” (P39) in Wikidata, Wikipedia’s lists and articles or the state’s official pages, as each term’s source names them' : ''}` +
    `${byHand ? '; with the terms put right in scripts/leader-corrections.mjs, each naming its source' : ''}.` +
    `${links ? ' Family links between holders: Wikidata (CC0).' : ''}`;
}
// The two notes that go after the list of who was in charge, so the lanes keep to their bars, key and caveats.
function lanesNotes(key, name) {
  const model = lanesModel(key);
  if (!model.drawn) return '';
  return `<p class="note lanes-left-out" id="lanes-left-out">${esc(leftOutNote(key, name, model))}</p>
    <p class="note lanes-source" id="lanes-source">${esc(lanesSourceNote(key, name, model))}</p>`;
}
function lanesSection(key, name) {
  const model = lanesModel(key);
  if (state.lanes.key !== key) state.lanes = { key, close: state.lanes.close, chosen: null, scroll: null, focus: state.lanes.focus };
  const span2 = `${model.from}–${model.to}`;
  const head = `<div class="lanes-head"><h3 id="lanes-title">Heads of state and government, ${span2}</h3>${model.drawn ? '<button type="button" class="prp-btn sm" id="lanes-zoom">Closer view</button>' : ''}</div>`;
  if (!model.drawn) {
    return `<section class="lanes" id="lanes" aria-labelledby="lanes-title" aria-live="off">${head}
      <p class="empty" id="lanes-none">No term can be drawn for ${esc(inProse(name))}: no head of state or government from Wikidata, and no leader from a source free to reuse, is held for it.</p>
      <p class="note lanes-left-out" id="lanes-left-out">${esc(leftOutNote(key, name, model))}</p></section>`;
  }
  return `<section class="lanes" id="lanes" aria-labelledby="lanes-title" aria-live="off">${head}
    <ul class="lanes-caveat" id="lanes-caveat">
      <li>A bar’s length is time in office, not power. In a one-party state the party’s leader may hold neither office; the list below names who held power.</li>
      <li>No marks for irregular entry (coups): the list below says how each leader came and went.</li>
      <li>A faded start or end is a date known only to the year or month; a faded end with a dotted edge, “end not recorded”, is an open term in Wikidata that another holder follows.</li>
      <li>Grey: party not dated in Wikidata. Grey with a dotted edge: a dated party beyond the eighth colour, named in the term. Light fill with a dashed edge: no party recorded; with a solid edge: independent (no party). Some party colours are hatched as well, so that no two look alike.</li>
      <li>A label under a lane is a family link Wikidata records between two holders; with none, a term says “no direct family link recorded”.</li>
    </ul>
    <div class="lanes-frame"><div class="lanes-names" aria-hidden="true"></div><div class="lanes-scroll" id="lanes-scroll"></div><div class="lanes-tip" hidden></div></div>
    ${model.lanes.government.folded ? `<p class="lanes-one-office" id="lanes-one-office">${esc(oneOfficeWords(model, name))}</p>` : ''}
    <ul class="lanes-key" id="lanes-key" aria-label="Key to the lanes"></ul>
    <p class="lanes-keys" id="lanes-keys">Choose a bar for its term; by keyboard, Tab to a lane, then the arrow keys, Enter or Space.</p>
    <div class="lanes-detail" id="lanes-detail" aria-live="off"></div>
  </section>`;
}
const swatchKey = (cls, text) => `<li><span class="lane-swatch ${cls}" aria-hidden="true"></span>${esc(text)}</li>`;
// The box's width when the lanes were last drawn: a resize that keeps it (a phone's address bar hiding) draws nothing.
let lanesW = 0;
function drawLanes() {
  const key = state.selected, box = $('#lanes-scroll');
  if (!key || !box) return;
  const model = lanesModel(key), L = state.lanes;
  // The bar that has the focus, to give it back after the redraw (a year step, Play, a resize).
  const had = document.activeElement?.closest?.('#lanes-scroll .lane-bar')?.dataset.id || L.focus;
  L.focus = null;
  const bw = box.clientWidth || 340;
  lanesW = box.clientWidth;
  // The closer view where the whole span gives under 8 px a year, until the reader chooses.
  const close = L.close ?? !fitsWhole(model, bw);
  const px = pxPerYear(model, bw, close);
  const shown = { a: state.from, b: state.year, ref: dateFor(state.year) };
  const out = renderSvg(model, { px, shown, chosen: L.chosen });
  box.innerHTML = out.svg;
  box.querySelector('.lanes-svg')?.setAttribute('aria-describedby', 'lanes-keys');
  // The lanes' names stay at the left while the bars scroll beneath them.
  $('.lanes-names').innerHTML = out.laneLabels.map(l => `<span style="top:${l.y}px">${esc(LANE_NAME[l.lane])}${l.rows > 1 ? ` · ${l.rows} rows` : ''}${l.count ? '' : ' · none drawn'}${l.samePeople ? ' · same people as head of state' : ''}</span>`).join('');
  const terms = LANES.flatMap(l => model.lanes[l].terms);
  const has = f => terms.some(f);
  const yearPx = days => (days / 365.2425) * px;
  const pat = s => (SLOT_PATTERN[s] ? ` pat-${SLOT_PATTERN[s]}` : '');
  $('#lanes-key').innerHTML = [
    ...model.parties.filter(p => p.slot).map(p => swatchKey(`party-${p.slot}${pat(p.slot)}`, p.name)),
    has(t => t.slot === 0) ? swatchKey('party-other', 'Other parties dated in Wikidata (named in each term)') : '',
    has(t => t.party.status === 'undated') ? swatchKey('party-undated', 'Party not dated') : '',
    has(t => t.party.status === 'independent') ? swatchKey('party-independent', 'Independent (no party)') : '',
    has(t => t.party.status === 'none') ? swatchKey('party-none', 'No party recorded') : '',
    has(t => t.softStart || t.softEnd) ? swatchKey('soft', 'Faded: date known only to the year or month') : '',
    has(t => t.noEnd) ? swatchKey('no-end', 'End not recorded (drawn to the next term)') : '',
    LANES.some(l => model.lanes[l].holes.length) ? swatchKey('hole', 'No term drawn here: see the list below') : '',
    model.gaps.some(([p, q]) => yearPx(q - p) >= 4) ? swatchKey('gap', 'Not an independent state') : '',
    swatchKey('shown', single() ? `The year shown, ${state.year}` : `The years shown, ${state.from}–${state.year}`)
  ].join('');
  // The box keeps the year shown in view: where it was already in view, the scroll stays; else it is centred.
  const w = box.clientWidth, keep = L.scroll != null && out.refX >= L.scroll + 16 && out.refX <= L.scroll + w - 16;
  box.scrollLeft = out.width <= w ? 0 : keep ? L.scroll : Math.max(0, out.refX - w / 2);
  // A long bar's name stays in sight while the box scrolls: it slides within its bar to the box's left edge.
  const names = [...box.querySelectorAll('.lane-text')];
  const slide = () => {
    const left = box.scrollLeft + 4;
    for (const el of names) {
      const x0 = +el.dataset.x0, x1 = +el.dataset.x1, tw = +el.dataset.w;
      el.setAttribute('x', Math.max(x0, Math.min(left, x1 - tw)).toFixed(2));
    }
  };
  slide();
  box.onscroll = () => { L.scroll = box.scrollLeft; slide(); };
  // One tab stop a lane (the bar that had the focus, else the term open in the detail, else the one at the date shown,
  // else the first); the arrow keys move along the lane in date order, up and down to the other lane.
  const ref = dayOf(shown.ref);
  for (const lane of LANES) {
    const list = model.lanes[lane].terms;
    if (!list.length) continue;
    const stop = list.find(t => t.id === had) || list.find(t => t.id === L.chosen) || list.find(t => t.ds <= ref && ref < t.de) || list.filter(t => t.ds <= ref).at(-1) || list[0];
    box.querySelector(`.lane-bar[data-id="${stop.id}"]`)?.setAttribute('tabindex', '0');
  }
  const byId = new Map(terms.map(t => [t.id, t]));
  const tip = $('.lanes-tip'), frame = $('.lanes-frame');
  box.querySelectorAll('.lane-bar').forEach(el => {
    const t = byId.get(el.dataset.id);
    el.onclick = () => chooseTerm(t.id, { focus: true });
    el.onkeydown = ev => laneKey(ev, t, model);
    el.onmouseenter = () => {
      tip.textContent = describe(t);
      tip.hidden = false;
      const r = el.getBoundingClientRect(), f = frame.getBoundingClientRect();
      tip.style.left = `${Math.max(0, Math.min(r.left - f.left, f.width - tip.offsetWidth))}px`;
      tip.style.top = `${r.bottom - f.top + 4}px`;
    };
    el.onmouseleave = () => { tip.hidden = true; };
  });
  // A tap beside a thin bar: the bar nearest the tap in that lane, within 12 px, is chosen (a bar of 3 px is too narrow
  // a target for a finger).
  const svgEl = box.querySelector('.lanes-svg');
  if (svgEl) svgEl.onclick = ev => {
    if (ev.target.closest('.lane-bar')) return;
    const r = svgEl.getBoundingClientRect(), px0 = ev.clientX - r.left, py = ev.clientY - r.top;
    let best = null, bestD = 12;
    for (const lab of out.laneLabels) for (const t of model.lanes[lab.lane].terms) {
      const [x0, bw0] = out.at.get(t.id), y0 = lab.y + GEOM.title + t.row * (GEOM.row + GEOM.rowGap);
      const dx = Math.max(0, x0 - px0, px0 - (x0 + bw0)), dy = Math.max(0, y0 - py, py - (y0 + GEOM.row));
      const d = Math.hypot(dx, dy);
      if (d <= bestD) { bestD = d; best = t; }
    }
    if (best) chooseTerm(best.id, { focus: true });
  };
  const zoom = $('#lanes-zoom');
  if (zoom) {
    zoom.textContent = close ? 'Whole span' : 'Closer view';
    zoom.dataset.close = String(close);
    zoom.onclick = () => { L.close = !close; L.scroll = null; drawLanes(); };
  }
  // The open term's words: written again only where they changed, and not announced (only a choice is).
  const detail = $('#lanes-detail');
  if (L.chosen && byId.has(L.chosen)) { if (detail?.firstElementChild?.dataset.id !== L.chosen) showTerm(byId.get(L.chosen), model); }
  else if (detail) detail.innerHTML = '';
  const el = had && byId.has(had) ? box.querySelector(`.lane-bar[data-id="${had}"]`) : null;
  if (el) {
    box.querySelectorAll(`.lane-bar[data-lane="${el.dataset.lane}"]`).forEach(b => b.setAttribute('tabindex', b === el ? '0' : '-1'));
    el.focus({ preventScroll: true });
  }
}
function laneKey(ev, t, model) {
  const list = model.lanes[t.lane].terms;
  let to = null;
  if (ev.key === 'ArrowRight') to = list[Math.min(list.length - 1, t.index + 1)];
  else if (ev.key === 'ArrowLeft') to = list[Math.max(0, t.index - 1)];
  else if (ev.key === 'Home') to = list[0];
  else if (ev.key === 'End') to = list.at(-1);
  else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
    const other = model.lanes[t.lane === 'state' ? 'government' : 'state'].terms;
    const mid = (t.ds + t.de) / 2;
    to = other.find(u => u.ds <= mid && mid < u.de) || [...other].sort((p, q) => Math.abs(p.ds - mid) - Math.abs(q.ds - mid))[0] || null;
  } else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); chooseTerm(t.id, { focus: true }); return; }
  else return;
  ev.preventDefault();
  if (!to) return;
  moveStop(to);
}
// The lane's single tab stop moves to the term, which takes the focus.
function moveStop(t) {
  const box = $('#lanes-scroll');
  box.querySelectorAll(`.lane-bar[data-lane="${t.lane}"]`).forEach(el => el.setAttribute('tabindex', el.dataset.id === t.id ? '0' : '-1'));
  const el = box.querySelector(`.lane-bar[data-id="${t.id}"]`);
  el.focus();
  const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
  if (r.right > b.right || r.left < b.left) box.scrollLeft += r.left - b.left - b.width / 2 + r.width / 2;
}
function chooseTerm(id, { focus = false } = {}) {
  const model = lanesModel(state.selected), t = LANES.flatMap(l => model.lanes[l].terms).find(u => u.id === id);
  if (!t) return;
  state.lanes.chosen = id;
  $('#lanes-scroll').querySelectorAll('.lane-bar').forEach(el => el.classList.toggle('chosen', el.dataset.id === id));
  // A choice is announced; the same words written again after a redraw are not (drawLanes).
  $('#lanes-detail')?.setAttribute('aria-live', 'polite');
  showTerm(t, model);
  if (focus) moveStop(t);
}
// The source of a term, from its own record: in the eleven states with hand-built lists both the leaders and the
// office holders are VM's own (scripts/leader-lists.mjs: its `offices` replace Wikidata's P35 and P6 for them).
function termSource(t, model) {
  // A record that names its own source (scripts/leader-corrections.mjs: REIGNS, and offices listed or dated by hand).
  if (t.rec?.sourceNote) return t.rec.sourceNote;
  if (t.kind === 'office') return model.listed ? OWN_LIST
    : `Wikidata (CC0): the state’s ${t.lane === 'state' ? 'head of state (P35)' : 'head of government (P6)'}`;
  if (t.rec.source === 'leader-lists') return OWN_LIST;
  return t.rec.archigos ? 'Wikidata (CC0): the person’s “position held” (P39), whose dates agree with Archigos 4.1’s within 31 days' : 'Wikidata (CC0)';
}
// The chosen term in words: name, office, dates, party and source, as the list gives them, and its family link.
function showTerm(t, model) {
  const box = $('#lanes-detail');
  if (!box) return;
  const office = `${t.alsoGovernment ? 'Head of state and of government' : LANE_NAME[t.lane]}${t.position ? ` (${t.position})` : ''}${t.role ? `, ${t.role}` : ''}`;
  // One person in both offices (lanes.js, `folded`): the same person's term as head of government, with its own dates
  // and source, as the second lane would have shown it.
  const asGov = (t.alsoGovernment || []).map(g => `<div class="meta lanes-as-gov">As head of government: ${esc(termWords(g))}${g.open ? ' (still in office)' : ''}; source: ${esc(termSource(g, model))}.</div>`).join('');
  const p = t.party;
  const names = list => list.map(m => m.name).join(' and ');
  const party = p.status === 'dated' ? `${p.dated.map(m => `<a class="party" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>`).join('')}<span class="lanes-why">membership dated in Wikidata</span>`
    : p.status === 'independent' ? '<span class="lanes-why">Independent (no party): Wikidata gives “independent politician” for the term.</span>'
      : p.status === 'undated' ? `<span class="lanes-why">Party not dated: ${[p.undated.length ? `Wikidata names ${esc(names(p.undated))} for this person, with no dates of membership` : '', p.outside.length ? `Wikidata dates the membership of ${esc(names(p.outside))}, but not for this term` : ''].filter(Boolean).join('; ')}.</span>`
        : '<span class="lanes-why">No party recorded.</span>';
  const prevT = t.prev && LANES.flatMap(l => model.lanes[l].terms).find(u => u.id === t.prev);
  // The family link, or the lack of one, only where the previous holder is the bar this term follows (lanes.js).
  const relation = t.role ? ''
    : t.relation ? `${esc(relationWords(t.relation).replace(/^./, c => c.toUpperCase()))} (Wikidata${t.relation.property ? `, ${esc(t.relation.property)}` : ''}).`
      : !state.succession ? ''
        : prevT ? `Relation to the previous holder, ${esc(prevT.full)}: no direct family link between the two in Wikidata.`
          : t.prevGap ? 'The previous holder is not drawn here, so no family link is shown.' : '';
  const url = t.url || `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(`${t.full} ${country(state.selected).name}`)}`;
  box.innerHTML = `<div class="leader lanes-term" data-id="${esc(t.id)}">
      <div class="who"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(t.full)}</a></div>
      <div class="meta">${esc(office)} · ${esc(termWords(t))}${t.open ? ' (still in office)' : ''}${t.noEnd ? ' (Wikidata gives no end; drawn to the start of the next term in this lane)' : ''}</div>
      <div class="parties">${party}</div>
      ${asGov}
      ${relation ? `<div class="meta lanes-relation">${relation}</div>` : ''}
      <div class="meta">Source: ${esc(termSource(t, model))}.</div>
    </div>`;
}
window.addEventListener('resize', () => {
  const w = $('#lanes-scroll')?.clientWidth;
  if (state.selected && w && w !== lanesW) drawLanes();
});
// Wikidata's family links between holders of one office (data/succession.json, written by the build). The page works
// without it: a missing, empty or unreadable file gives no labels and no error.
async function loadSuccession() {
  try {
    const res = await fetch('data/succession.json');
    const json = res.ok ? await res.json() : null;
    // Read: its links (perhaps none). Missing or unreadable: null, and no term speaks of a family link.
    state.succession = Array.isArray(json?.links) ? json.links : null;
  } catch { state.succession = null; }
  // Only the lanes and their notes are drawn again, not the whole panel (which would fetch Wikipedia's events twice).
  if (state.succession && state.selected && $('#lanes')) {
    const key = state.selected, name = nameOf(key, dateFor(state.year));
    state.lanes.focus = document.activeElement?.closest?.('#lanes-scroll .lane-bar')?.dataset.id || null;
    $('#lanes').outerHTML = lanesSection(key, name);
    const notes = $('#lanes-notes');
    if (notes) notes.innerHTML = lanesNotes(key, name);
    drawLanes();
  }
}

// The day before a date (an ending state is named by the name it had until that day: the Soviet Union, review R8).
const dayBefore = d => new Date(Date.parse(`${d}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);
function eventItem(e, cname, key) {
  const on = e.type === 'statehood' && e.kind !== 'independence' ? dayBefore(e.date) : e.date;
  const label = cname ? `<a href="#" data-open="${esc(key)}">${esc(displayName(key, cname, on))}</a>: ` : '';
  const text = e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.text)}</a>` : esc(e.text);
  const ahead = scheduled(e); // dated after today (front-pages-3)
  return `<li data-type="${e.type}"${ahead ? ' data-scheduled=""' : ''}><time>${whenOf(e)}<span class="kind">${ahead ? 'scheduled ' : ''}${KIND[e.type] || e.type}</span></time>${label}${text}</li>`;
}
const scheduledNote = n => `${n === 1 ? 'The one marked “scheduled” is' : `The ${n} marked “scheduled” are`} dated after today and ${n === 1 ? 'has' : 'have'} not taken place yet, so ${n === 1 ? 'it is' : 'they are'} not counted.`;

/* ---------------------------------------------------------------- border animation: the period's, year by year */
async function animateYears(key, a, y, changes) {
  if (state.animating) return;
  state.animating = true;
  period.stop();
  const frames = [a, ...changes];
  const label = $('#anim-label');
  label.hidden = false;
  zoomToCountry(key, frames);
  for (let round = 0; round < 2; round++) {
    for (const f of frames) {
      label.textContent = f > state.data.bordersTo ? `${f} (borders of ${state.data.bordersTo})` : String(f);
      renderMap(f);
      await new Promise(r => setTimeout(r, 1300));
    }
  }
  label.hidden = true;
  renderMap();
  state.animating = false;
}

// The rows that stand for a state in any of the years given.
function countryShapes(key, years) {
  return state.features.filter(f => years.some(y => keyIn(f.properties, held(y)) === key));
}
// The state's main body: its largest pieces, together nine tenths of its area. Cliopatria's rows carry far-off
// fragments (its United States row of 1967–2005 holds pieces in Indochina, Micronesia and Berlin), which would stretch
// the box round the world.
function mainBody(shapes) {
  const parts = shapes.flatMap(f => (f.geometry?.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry?.type === 'MultiPolygon' ? f.geometry.coordinates : []))
    .map(coordinates => ({ type: 'Polygon', coordinates })).map(g => [d3.geoArea(g), g]).sort((p, q) => q[0] - p[0]);
  const total = d3.sum(parts, p => p[0]), kept = [];
  let sum = 0;
  for (const [a, g] of parts) { if (kept.length && sum >= total * 0.9) break; kept.push(g); sum += a; }
  return { type: 'GeometryCollection', geometries: kept };
}
function zoomToCountry(key, years) {
  const shapes = countryShapes(key, years);
  if (!shapes.length) return;
  let [[x0, y0], [x1, y1]] = d3.geoBounds(mainBody(shapes));
  // The map is not rotated, so a box must stay between -180 and 180 or its corner projects on the far side of the
  // map. A state across the 180th meridian has its west edge east of its east edge: the wider side is framed (for the
  // Soviet Union / Russia, by Chukotka, its west edge to 180). The padding stops at the map's edges (Alaska, Canada).
  if (x0 > x1) { if (180 - x0 >= x1 + 180) x1 = 180; else x0 = -180; }
  // North and south, at most half the state's own height: a state far wider than tall (Russia) is not pulled south.
  const pad = Math.max(6, (x1 - x0) * 0.5), padY = Math.min(pad / 2, Math.max(3, (y1 - y0) * 0.5));
  if (x1 - x0 < 180) focusBounds([[Math.max(-180, x0 - pad), Math.max(-90, y0 - padY)], [Math.min(180, x1 + pad), Math.min(90, y1 + padY)]], 700, true);
}

async function downloadGif(key, a, y, changes) {
  const btn = $('#gif');
  btn.disabled = true; btn.textContent = 'Rendering…';
  try {
    const w = 720, h = 480;
    const frames = [a, ...changes];
    const shapes = countryShapes(key, frames);
    const proj = d3.geoMercator().fitExtent([[40, 64], [w - 40, h - 40]], { type: 'FeatureCollection', features: shapes });
    const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const p = d3.geoPath(proj, ctx);
    const gif = GIFEncoder();
    // Colours and type come from the PRP tokens at draw time, so the GIF matches the theme on screen.
    const col = v => cssColor(`var(${v})`);
    const C = {
      water: col('--prp-map-water'), land: col('--c-none'), covered: col('--c-steady'), focus: col('--c-change'),
      halo: col('--prp-map-halo'), border: col('--prp-map-border'), band: col('--prp-surface'), line: col('--prp-line'), text: col('--prp-text'), muted: col('--prp-muted')
    };
    const css = getComputedStyle(document.documentElement);
    const serif = css.getPropertyValue('--prp-font-serif').trim() || 'serif';
    const mono = css.getPropertyValue('--prp-font-mono').trim() || 'monospace';
    for (const yr of frames) {
      ctx.fillStyle = C.water; ctx.fillRect(0, 0, w, h);
      for (const f of rowsIn(yr).sort((p, q) => q.properties.a - p.properties.a)) {
        const k = stateOfRow(f, yr);
        ctx.beginPath(); p(f);
        ctx.fillStyle = k === key ? C.focus : k ? C.covered : C.land;
        ctx.fill(); ctx.strokeStyle = k ? C.halo : C.border; ctx.lineWidth = 1; ctx.stroke();
      }
      // Title band and source line, set like a figure.
      ctx.fillStyle = C.band; ctx.fillRect(0, 0, w, 48); ctx.fillRect(0, h - 28, w, 28);
      ctx.fillStyle = C.line; ctx.fillRect(0, 48, w, 1); ctx.fillRect(0, h - 29, w, 1);
      ctx.fillStyle = C.text; ctx.font = `600 22px ${serif}`;
      ctx.fillText(`${nameOf(key, dateFor(yr))} · ${yr}`, 20, 33);
      ctx.fillStyle = C.muted; ctx.font = `12px ${mono}`;
      ctx.fillText('Political Retrospective · VM · borders: Cliopatria v0.2.1 (CC BY 4.0), by the year', 20, h - 10);
      const { data } = ctx.getImageData(0, 0, w, h);
      const palette = quantize(data, 64);
      gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay: 1500 });
    }
    gif.finish();
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([gif.bytes()], { type: 'image/gif' })),
      download: `${country(key).name.replace(/\W+/g, '-')}-${a === y ? y : `${a}-${y}`}-borders.gif`
    });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  } finally {
    btn.disabled = false; btn.textContent = '⤓ Download GIF';
  }
}

/* ---------------------------------------------------------------- table view */
const STATUS_ORDER = { statehood: 0, irregular: 1, change: 2, border: 3, steady: 4 };
const COLUMNS = [
  ['name', 'State', r => r.name, ''],
  ['leader', 'In charge', r => (r.leaders.at(-1)?.full || r.leaders.at(-1)?.name || null), ''],
  ['status', () => (single() ? 'This year' : 'In the period'), r => STATUS_ORDER[r.status], ''],
  ['events', 'Events', r => r.events, 'num']
];

function renderTable() {
  const a = state.from, y = state.year;
  const table = $('#year-table');
  const { key, dir } = state.sort;
  const value = COLUMNS.find(col => col[0] === key)[2];
  const cmp = (a, b) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : typeof a === 'number' ? a - b : String(a).localeCompare(String(b)));
  const rows = statesOn(dateFor(y))
    .map(r => ({ ...r, leaders: leadersIn(r.key, a, y), status: statusFor(r.key, a, y), events: eventsIn(r.key, a, y).length }))
    .sort((p, q) => cmp(value(p), value(q)) * dir || p.name.localeCompare(q.name));
  table.tHead.innerHTML = `<tr>${COLUMNS.map(([k, label, , cls]) => `<th scope="col"${cls ? ` class="${cls}"` : ''}${k === key ? ` aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}>` +
    `<button type="button" class="sort" data-sort="${k}">${typeof label === 'function' ? label() : label}<span class="arrow" aria-hidden="true">${k === key ? (dir > 0 ? '↑' : '↓') : '↕'}</span></button></th>`).join('')}</tr>`;
  table.tBodies[0].innerHTML = rows.map(r => `<tr data-key="${esc(r.key)}"${r.key === state.selected ? ' class="selected"' : ''}>
      <td><button type="button" class="row-link">${esc(r.name)}</button></td>
      <td>${r.leaders.length ? coLeaders(r.leaders).map(g => esc(andList(g.map(l => l.full || l.name)))).join(' → ') : '<span class="cell-sub">No leader recorded</span>'}</td>
      <td><span class="cell-status"><span class="swatch" style="background:${FILL[r.status]}"></span>${STATUS_LABEL[r.status]}</span></td>
      <td class="num">${r.events}</td></tr>`).join('');
  $('#table-caption').textContent = `${coverageNote(y)} For each of the ${rows.length} on the map: who was in charge during ${span(a, y)}, what happened, and how many key events were recorded. Select a column heading to sort, or a row to open the state.${entryNote(a, y) ? ` ${entryNote(a, y)}` : ''}`;
}

function markTableRow() {
  const wrap = $('.table-wrap');
  document.querySelectorAll('#year-table tbody tr').forEach(tr => {
    const on = tr.dataset.key === state.selected;
    tr.classList.toggle('selected', on);
    // Bring the selected row into view (below the sticky header) if it is scrolled out of sight.
    if (on && state.view === 'table') {
      const r = tr.getBoundingClientRect(), w = wrap.getBoundingClientRect(), head = wrap.querySelector('thead').offsetHeight;
      if (r.top < w.top + head || r.bottom > w.bottom) wrap.scrollTop += r.top - w.top - head - w.height / 3;
    }
  });
}

function setupTable() {
  const table = $('#year-table');
  table.tHead.onclick = ev => {
    const b = ev.target.closest('[data-sort]');
    if (!b) return;
    const k = b.dataset.sort;
    state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === 'events' ? -1 : 1) };
    renderTable();
    table.querySelector(`[data-sort="${k}"]`).focus();
  };
  table.tBodies[0].onclick = ev => { const tr = ev.target.closest('tr[data-key]'); if (tr) select(tr.dataset.key); };
}

/* ---------------------------------------------------------------- views (tabs) */
// Map and Table are tabs; ?view=table links straight to the table, and the #y=…&c=… hash still sets year and state.
function setupTabs() {
  const tabs = [...document.querySelectorAll('.prp-tabs [role="tab"]')];
  const show = (view, focus = false) => {
    state.view = view;
    for (const t of tabs) {
      const on = t.dataset.view === view;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    }
    if (view === 'table') { renderTable(); markTableRow(); }
    const params = new URLSearchParams(location.search);
    if (view === 'map') params.delete('view'); else params.set('view', view);
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  };
  tabs.forEach((t, i) => {
    t.onclick = () => show(t.dataset.view);
    t.onkeydown = ev => {
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[ev.key];
      if (to === undefined) return;
      ev.preventDefault();
      show(tabs[(to + tabs.length) % tabs.length].dataset.view, true);
    };
  });
  show(new URLSearchParams(location.search).get('view') === 'table' ? 'table' : 'map');
}

function renderCaption() {
  const a = state.from, y = state.year;
  $('#caption').textContent = `States and borders ${dateFor(y) === TODAY ? 'today' : `in ${y}`}, each covered state coloured by what happened to it in ${a === y ? y : `the years ${a}–${y}`}. ` +
    `Borders: Cliopatria v0.2.1, one border a year; statehood: Wikidata; leaders: Wikidata and Archigos 4.1.${y > state.data.bordersTo ? heldNote() : ''}${entryNote(a, y) ? ` ${entryNote(a, y)}` : ''}`;
  $('#legend-title').textContent = a === y ? 'This year' : 'In the period';
}

/* ---------------------------------------------------------------- the years shown */
// The timeline (prp-period.js): the start rests on the end, so one year is shown and ‹ ›, play, a click on the track and
// the end handle move it as before; the start handle pulled back opens a period. Every move by the reader lands in
// onChange; play travels year by year, or grows a period from its first year.
function render() {
  $('#year-label').textContent = single() ? 'Year' : 'Period';
  $('#year-big').textContent = span();
  renderMap();
  renderPanel();
  renderCaption();
  if (state.view === 'table') renderTable();
}
const period = PRPPeriod.mount($('#period'), {
  rest: 'end', ids: { from: 'from', to: 'year', prev: 'prev', play: 'play', next: 'next' },
  names: { from: 'First year of the period', to: 'Year shown, or the last of the period', prev: 'Previous year', next: 'Next year' },
  play: { interval: 900, label: 'Play through the years' }, open: () => openSteps(),
  onChange: p => { state.from = p.from; state.year = p.to; render(); writeHash(); },
});
// The years shown from code (the address, the search): a start of null is one year; a start after the end becomes the end.
function setPeriod(from, to, { push = true } = {}) {
  const p = period.set(from, to, { silent: true });
  state.from = p.from; state.year = p.to;
  render();
  if (push) writeHash();
}
function setupTimeline() {
  const { firstYear: a, lastYear: b } = state.data, years = Array.from({ length: b - a + 1 }, (_, k) => a + k);
  // Decade ticks from 1930; every other one drops out on narrow screens.
  const ticks = years.filter(y => (y - a - 4) % 10 === 0).map((y, k) => ({ at: y, text: String(y), kind: k % 2 ? 'minor' : 'key' }));
  period.update({ stops: years, ticks, from: null, to: b });
}

/* ---------------------------------------------------------------- selection, URL, search */
function select(key) {
  state.selected = key;
  renderMap();
  renderPanel();
  markTableRow();
  writeHash();
  if (key) zoomToCountry(key, [state.year]);
}
function writeHash() {
  const f = PRPPeriod.rules.startParam(period.get());
  const m = PRPPeriod.rules.movementParam(period.movement()); // MP-12: the movement, written only away from Independent
  const h = `#y=${state.year}${f != null ? `&f=${f}` : ''}${state.selected ? `&c=${state.selected}` : ''}${m ? `&${PRPPeriod.MOVE_PARAM}=${m}` : ''}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}
// MP-03 (15 Nov 2026): on a phone the opening's two handles sit at least about 24 px apart at the track's drawn
// width, the latest year still at the right handle; on wider screens they open one year apart, as before.
function openSteps() {
  if (!matchMedia('(max-width: 767px)').matches) return 1;
  // The track, not #year: the input's box takes in the thumb, while the track (inset half a thumb at each end) is
  // exactly the distance the handles travel, whatever sits beside it (the movement buttons, MP-12).
  const w = document.querySelector('#period .prp-period-track')?.getBoundingClientRect().width || $('#period').getBoundingClientRect().width;
  return PRPPeriod.rules.openSteps(period.get().stops.length, w);
}
// An f at or after the year, or unreadable, is a single year; an address with no year at all opens on the last two
// (more on a phone: openSteps). c is a state's Wikidata key; an old Gleditsch and Ward number (all digits) is read
// through the data's oldKeys, and `old` says the address is to be rewritten with the key.
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const y = +p.get('y') || state.data.lastYear;
  const raw = p.get('c'), old = /^\d+$/.test(raw || '');
  const c = old ? own(state.data.oldKeys, raw) ?? null : raw;
  return { y, f: PRPPeriod.rules.readStart(period.get().stops, p.get('f'), y, 'end', !p.get('y') && !p.get('f'), openSteps()), c: c && country(c) ? c : null,
    m: PRPPeriod.rules.readMovement(p.get(PRPPeriod.MOVE_PARAM)), old: old && !!(c && country(c)) };
}

function setupSearch() {
  const input = $('#search'), list = $('#search-results');
  const index = [];
  for (const [key, c] of Object.entries(state.data.countries)) {
    index.push({ label: c.name, sub: 'Country', key, year: null, find: c.name.toLowerCase() });
    for (const l of c.leaders) index.push({ label: l.full || l.name, sub: `${c.name} · from ${l.start.slice(0, 4)}`, key, year: Math.max(+l.start.slice(0, 4), state.data.firstYear), find: (l.full || l.name).toLowerCase() });
  }
  // Cliopatria's own name for a row that stands for a covered state, where it differs (Weimar Republic, Francoist Spain).
  for (const f of state.features) {
    const p = f.properties, c = p.c && country(p.c);
    const from = Math.max(p.f, p.cf ?? p.f, state.data.firstYear);
    if (c && p.n !== c.name) index.push({ label: p.n, sub: `Name in Cliopatria · from ${from}`, key: p.c, year: from, find: p.n.toLowerCase() });
  }
  let results = [], active = 0;
  const choose = r => {
    input.value = ''; list.hidden = true;
    if (r.year) setPeriod(null, r.year, { push: false });
    select(r.key);
  };
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const seen = new Set();
    results = q.length < 2 ? [] : index.filter(r => r.find.includes(q)).filter(r => { const k = r.label + r.sub; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
    active = 0;
    list.hidden = !results.length;
    list.innerHTML = results.map((r, i) => `<li role="option" aria-selected="${i === 0}">${esc(r.label)}<small>${esc(r.sub)}</small></li>`).join('');
    list.querySelectorAll('li').forEach((li, i) => li.onmousedown = () => choose(results[i]));
  });
  input.addEventListener('keydown', e => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      list.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', i === active));
    } else if (e.key === 'Enter' && results[active]) choose(results[active]);
    else if (e.key === 'Escape') list.hidden = true;
  });
  input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 150));
}

/* ---------------------------------------------------------------- init */
(async function init() {
  try {
    const [topo, data] = await Promise.all([
      fetch('data/borders.topo.json').then(r => r.json()),
      fetch('data/countries.json').then(r => r.json())
    ]);
    state.data = data;
    state.features = topojson.feature(topo, topo.objects.borders).features;
    $('#status').innerHTML = `<span>Coverage <b>${Object.keys(data.countries).length} countries</b> over all the years</span><span>Years <b>${data.firstYear}–present</b></span>` +
      '<span>Borders <b>Cliopatria v0.2.1</b></span><span>Statehood <b>Wikidata</b></span><span>Leaders <b>Wikidata, Archigos 4.1</b></span><span>Events <b>Wikidata, Wikipedia</b></span>';
    // For how many of Archigos's leaders the names and dates are Wikidata's (review R7), counted from the data: those
    // that carry Archigos's own dates beside Wikidata's, of those and the ones still on Archigos's.
    const all = Object.values(data.countries).flatMap(c => c.leaders), moved = all.filter(l => l.archigos).length;
    const n = x => x.toLocaleString('en-GB');
    $('#leader-count').textContent = `for ${n(moved)} of the ${n(moved + all.filter(l => l.source === 'Archigos').length)} leaders Archigos counts in office from 1926`;
    drawMap();
    setupTimeline();
    setupSearch();
    setupTable();
    const { y, f, c, m, old } = readHash();
    state.selected = c;
    state.year = y;
    setupTabs();
    period.setMovement(m, { silent: true }); // the address's movement first, so its period is placed by that rule
    setPeriod(f, y, { push: false });
    if (old) writeHash(); // an old #c=<number>: the same view, under the state's key
    if (c) zoomToCountry(c, [state.year]);
    loadSuccession();
    window.addEventListener('hashchange', () => {
      const h = readHash();
      const moved = h.m !== period.movement();
      if (moved) period.setMovement(h.m, { silent: true });
      if (moved || h.y !== state.year || (h.f ?? h.y) !== state.from) setPeriod(h.f, h.y, { push: false });
      if (h.c !== state.selected) select(h.c);
      else if (h.old) writeHash();
    });
  } catch (err) {
    console.error(err);
    $('#status').textContent = 'Could not load historical data.';
  }
})();
