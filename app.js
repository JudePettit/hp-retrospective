/* Political Retrospective (PRP · Retrospective Intelligence): who led each country, and which political events happened,
   year by year. Borders: CShapes 2.0. Leaders: Archigos 4.1 + Wikidata. Events: derived + Wikidata elections.
   Map colours are CSS custom properties over PRP tokens (styles.css), written into SVG fills as var(...), so the map
   follows the light/dark theme without redrawing; the GIF export reads the same tokens when it draws.
   The years shown follow the timeline (prp-period.js, a copy of jdpi's design/prp-period.js): its start rests on the
   end, so one year is shown, as before; pulled back, it opens a period of years, and the map, panels, table, overview,
   border animation and GIF cover every year of it. URL: #y=<year, or the period's last>[&f=<its first year>][&c=<gw>] */
import { GIFEncoder, quantize, applyPalette } from 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js';
import { displayName } from './names.mjs';

const W = 1000, H = 600;
const TODAY = new Date().toISOString().slice(0, 10);
// year: the year shown (the end of the period); from: the period's first year (the same year while the start rests).
const state = { year: 2026, from: 2026, selected: null, data: null, features: [], animating: false, view: 'map', sort: { key: 'name', dir: 1 } };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { leader: 'leader', coup: 'irregular', election: 'election', referendum: 'referendum', border: 'border', statehood: 'statehood' };

let svg, g, projection, path, zoom;

/* ---------------------------------------------------------------- data helpers */
const dateFor = y => (y >= new Date().getUTCFullYear() ? TODAY : `${y}-12-31`);
const activeOn = date => state.features.filter(f => f.properties.s <= date && date <= f.properties.e);
const country = gw => state.data.countries[gw];
// The years shown: one year (a === b) or a period [a, b]; every helper takes the period, b defaulting to a.
const single = () => state.from === state.year;
const span = (a = state.from, b = state.year) => (a === b ? String(b) : `${a}–${b}`);
const inYears = (start, end, a, b = a) => start <= `${b}-12-31` && (!end || end >= `${a}-01-01`);

function leadersIn(gw, a, b = a) {
  return (country(gw)?.leaders || []).filter(l => inYears(l.start, l.end, a, b));
}
function officesIn(gw, a, b, leaders) {
  const names = new Set(leaders.map(l => (l.full || l.name).toLowerCase()));
  return (country(gw)?.offices || []).filter(o => inYears(o.start, o.end, a, b) && !names.has((o.full || '').toLowerCase()));
}
function eventsIn(gw, a, b = a) {
  return (country(gw)?.events || []).filter(e => e.date >= `${a}-01-01` && e.date <= `${b}-12-31`);
}
// Dates when this country's borders changed in the years shown (new shapes starting after 1 January of the first).
function borderChanges(gw, a, b = a) {
  return state.features.filter(f => f.properties.gw === +gw && f.properties.s > `${a}-01-01` && f.properties.s <= `${b}-12-31`)
    .map(f => f.properties.s).filter((d, i, l) => l.indexOf(d) === i).sort();
}
// The most significant thing that happened to a state in the years shown: an irregular seizure of power, else a new
// leader, else a change of borders or status.
function statusFor(gw, a, b = a) {
  if (!country(gw)) return 'none';
  const ev = eventsIn(gw, a, b);
  if (ev.some(e => e.type === 'coup')) return 'irregular';
  if (ev.some(e => e.type === 'leader')) return 'change';
  if (borderChanges(gw, a, b).length || ev.some(e => e.type === 'statehood')) return 'border';
  return 'steady';
}
const FILL = { irregular: 'var(--c-irregular)', change: 'var(--c-change)', border: 'var(--c-border)', steady: 'var(--c-steady)' };
const STATUS_LABEL = { irregular: 'Irregular seizure of power', change: 'New leader', border: 'Border or status change', steady: 'No change' };
const fmt = d => {
  if (!d) return 'present';
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
// Party memberships (from Wikidata) that applied during the years shown; undated memberships always apply.
function partiesAt(p, a, b = a) {
  const all = p.parties || [];
  const now = all.filter(m => (!m.s || m.s <= `${b}-12-31`) && (!m.e || m.e >= `${a}-01-01`));
  return (now.length ? now : all.filter(m => !m.s && !m.e)).slice(0, 2);
}
const partyChips = (p, a, b = a) => partiesAt(p, a, b).map(m => `<a class="party" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>`).join('');
const wiki = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const leaderLink = (l, gw) => l.url || `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(`${l.full || l.name} ${country(gw).name}`)}`;
// Covered states active on a date, one per state, under the name they had then.
function statesOn(date) {
  const seen = new Map();
  for (const f of activeOn(date)) {
    const gw = f.properties.gw;
    if (country(gw) && !seen.has(gw)) seen.set(gw, { gw, name: displayName(gw, f.properties.name, date) });
  }
  return [...seen.values()];
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
  projection = d3.geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'FeatureCollection', features: activeOn(TODAY) });
  path = d3.geoPath(projection);
  g = svg.append('g');
  zoom = d3.zoom().scaleExtent([1, 40]).interpolate(d3.interpolate).on('zoom', ev => g.attr('transform', ev.transform));
  svg.call(zoom);
  $('#zoom-in').onclick = () => svg.transition().call(zoom.scaleBy, 1.6);
  $('#zoom-out').onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.6);
  $('#zoom-reset').onclick = () => focusBounds([[-170, 5], [150, 72]]);
  focusBounds([[-170, 5], [150, 72]], 0);
}

function focusBounds([[x0, y0], [x1, y1]], duration = 700) {
  const [[px0, py0], [px1, py1]] = [projection([x0, y1]), projection([x1, y0])];
  const k = Math.min(40, 0.9 / Math.max((px1 - px0) / W, (py1 - py0) / H));
  const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(px0 + px1) / 2, -(py0 + py1) / 2);
  if (duration) svg.transition().duration(duration).call(zoom.transform, t); else svg.call(zoom.transform, t);
}

// The map on a date (the end of the years shown, or a frame of the border animation), each covered state coloured by
// what happened to it in the years shown.
function renderMap(date = dateFor(state.year)) {
  const a = state.from, b = state.year;
  // Covered states after the rest, so their outlines sit above their neighbours'; the selected state on top.
  const rank = d => (country(d.properties.gw) ? (d.properties.gw === state.selected ? 2 : 1) : 0);
  const shapes = activeOn(date).sort((a, b) => rank(a) - rank(b));
  const tip = $('#tooltip');
  g.selectAll('path.shape')
    .data(shapes, d => `${d.properties.gw}|${d.properties.s}`)
    .join('path')
    .attr('d', path)
    .attr('class', d => `shape ${country(d.properties.gw) ? 'active' : 'inactive'}${d.properties.gw === state.selected ? ' selected' : ''}`)
    .attr('data-gw', d => d.properties.gw)
    .attr('fill', d => FILL[statusFor(d.properties.gw, a, b)] || null)
    .on('mousemove', (ev, d) => {
      const box = $('.map-stage').getBoundingClientRect();
      const covered = country(d.properties.gw);
      const ls = leadersIn(d.properties.gw, a, b), l = ls.at(-1);
      const st = statusFor(d.properties.gw, a, b);
      tip.innerHTML = `<strong>${esc(displayName(d.properties.gw, d.properties.name, date))}</strong>${covered ? (l ? esc(a === b || ls.length < 2 ? l.full || l.name : `${ls.length} leaders, last ${l.full || l.name}`) : 'Leader unknown') : 'Not covered'}` +
        (covered ? `<span class="tip-sub"><span class="swatch" style="background:${FILL[st]}"></span>${STATUS_LABEL[st]} in ${span(a, b)}</span>` : '');
      tip.hidden = false;
      tip.style.left = `${Math.max(8, Math.min(ev.clientX - box.left + 14, box.width - tip.offsetWidth - 8))}px`;
      tip.style.top = `${Math.max(8, Math.min(ev.clientY - box.top + 14, box.height - tip.offsetHeight - 8))}px`;
    })
    .on('mouseleave', () => { tip.hidden = true; })
    .on('click', (ev, d) => { if (country(d.properties.gw)) select(d.properties.gw); })
    .order();
}

/* ---------------------------------------------------------------- panel */
function renderPanel() {
  const a = state.from, y = state.year, when = span(a, y), one = a === y;
  const panel = $('#panel');
  if (!state.selected) {
    const all = Object.entries(state.data.countries)
      .flatMap(([gw, c]) => eventsIn(gw, a, y).map(e => ({ ...e, gw, cname: c.name })))
      .sort((p, q) => p.date.localeCompare(q.date));
    const count = (...types) => all.filter(e => types.includes(e.type)).length;
    const states = statesOn(dateFor(y)).length;
    panel.innerHTML = `<h2>${when}</h2>
      <p class="sub">${states} covered states ${dateFor(y) === TODAY ? 'today' : `at the end of ${y}`}</p>
      <div class="prp-kpis">
        <div class="prp-kpi"><span>Leader changes</span><b>${count('leader', 'coup')}</b></div>
        <div class="prp-kpi"><span>Irregular seizures</span><b>${count('coup')}</b></div>
        <div class="prp-kpi"><span>Elections, referendums</span><b>${count('election', 'referendum')}</b></div>
        <div class="prp-kpi"><span>Border or status changes</span><b>${count('border', 'statehood')}</b></div>
      </div>
      <p class="note">${one ? 'Select a country to see who was in charge and its key events. Drag the slider or press ▶ to move through the years; drag its hollow start handle back to cover a period of years.' : `Everything recorded from ${a} to ${y}. Select a country to see who was in charge and its key events; bring the hollow start handle back onto the end for a single year.`}</p>
      <h3>Key events ${one ? `in ${y}` : when}${all.length > 120 ? ` · the first 120 of ${all.length}` : ''}</h3>
      ${all.length ? `<ul class="events">${all.slice(0, 120).map(e => eventItem(e, e.cname, e.gw)).join('')}</ul>` : '<p class="empty">No recorded events.</p>'}`;
    panel.querySelectorAll('[data-open]').forEach(a => a.onclick = ev => { ev.preventDefault(); select(+a.dataset.open); });
    return;
  }
  const gw = state.selected;
  const c = country(gw);
  const shape = activeOn(dateFor(y)).find(f => f.properties.gw === gw);
  const leaders = leadersIn(gw, a, y);
  const offices = officesIn(gw, a, y, leaders);
  const events = eventsIn(gw, a, y);
  const changes = borderChanges(gw, a, y);
  // Wikipedia's "<year> in <country>" events are read for one year; over a period, its year pages are linked instead.
  const page = one && c.yearPages.includes(y) ? `${y} in ${c.yearPage}` : null;
  const pages = one ? [] : c.yearPages.filter(p => p >= a && p <= y).map(p => `${p} in ${c.yearPage}`);
  const ruling = new Map();
  for (const p of [...leaders, ...offices]) for (const m of partiesAt(p, a, y)) ruling.set(m.url, m);
  const name = shape ? displayName(gw, shape.properties.name, dateFor(y)) : c.name;

  panel.innerHTML = `<button class="close" type="button" id="close" aria-label="Close">✕</button>
    <h2>${esc(name)}</h2>
    <p class="sub">${shape ? when : `Not an independent state at the end of ${y}`}</p>
    <h3>Political overview of ${when}</h3>
    <p class="overview">${esc(overviewText(name, a, y, leaders, offices, events, [...ruling.values()]))}</p>
    <div id="wiki-events" class="wiki-events">${page ? '<p class="empty">Loading events from Wikipedia…</p>' : pages.length ? `<p class="note">Wikipedia, year by year: ${pages.map(p => `<a href="${wiki(p)}" target="_blank" rel="noopener">${esc(p.slice(0, 4))}</a>`).join(' · ')}</p>` : ''}</div>
    ${ruling.size ? `<h3>Parties in power ${one ? `in ${y}` : when}</h3><div class="parties">${[...ruling.values()].map(m => `<a class="party" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>`).join('')}</div><p class="note" style="margin-top:6px">Party of each leader in office, from Wikidata. Where Wikidata has no membership dates, every party the person belonged to is shown.</p>` : ''}
    <h3>In charge during ${when}</h3>
    ${leaders.length ? leaders.map(l => `<div class="leader">
        <div class="who"><a href="${esc(leaderLink(l, gw))}" target="_blank" rel="noopener">${esc(l.full || l.name)}</a>${l.entry === 'Irregular' ? '<span class="tag irregular">irregular entry</span>' : ''}</div>
        <div class="meta">${fmt(l.start)} – ${fmt(l.end)}${l.entry && l.entry !== 'Regular' && l.entry !== 'Irregular' ? ` · entry: ${esc(l.entry)}` : ''}${l.exit && l.exit !== 'Regular' ? ` · exit: ${esc(l.exit)}` : ''}</div>
        ${partyChips(l, a, y) ? `<div class="parties">${partyChips(l, a, y)}</div>` : ''}
      </div>`).join('') : `<p class="empty">No leader recorded for ${one ? 'this year' : 'these years'}.</p>`}
    ${offices.length ? `<h3>Also in office</h3>${offices.map(o => `<div class="leader">
        <div class="who"><a href="${esc(o.url || wiki(o.full))}" target="_blank" rel="noopener">${esc(o.full)}</a><span class="tag office">${o.office === 'hos' ? 'Head of state' : 'Head of government'}</span></div>
        <div class="meta">${fmt(o.start)} – ${fmt(o.end)}</div>
        ${partyChips(o, a, y) ? `<div class="parties">${partyChips(o, a, y)}</div>` : ''}</div>`).join('')}` : ''}
    <h3>Key events ${one ? `in ${y}` : when}</h3>
    ${events.length ? `<ul class="events">${events.map(e => eventItem(e)).join('')}</ul>` : `<p class="empty">No recorded events ${one ? 'this year' : 'in these years'}.</p>`}
    ${changes.length ? `<h3>Border changes ${one ? `in ${y}` : when}</h3>
      <p class="sub">${changes.length} change${changes.length > 1 ? 's' : ''}: ${changes.map(fmt).join(', ')}</p>
      <div class="actions"><button class="prp-btn sm primary" id="animate" type="button">▶ Play ${when} border changes</button>
      <button class="prp-btn sm" id="gif" type="button">⤓ Download GIF</button></div>` : ''}
    ${page ? `<p class="note">More: <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a> on Wikipedia</p>` : ''}
    ${c.iso3 ? `<p class="note">Today: <a href="https://political-atlas.pages.dev/#${c.iso3}" target="_blank" rel="noopener">${esc(c.name)} in Political Atlas</a></p>` : ''}`;
  $('#close').onclick = () => select(null);
  if (page) loadWikiEvents(page, gw, y);
  if (changes.length) {
    $('#animate').onclick = () => animateYear(gw, a, y, changes);
    $('#gif').onclick = () => downloadGif(gw, a, y, changes);
  }
}

/* ---------------------------------------------------------------- yearly overview */
// A short plain-English summary built from the leaders, parties and events of the year, or of the period a..y.
function overviewText(name, a, y, leaders, offices, events, ruling) {
  const who = p => `${p.full || p.name}${partiesAt(p, a, y).length ? ` (${partiesAt(p, a, y).map(m => m.name).join(', ')})` : ''}`;
  const parts = [], one = a === y;
  if (leaders.length === 1) parts.push(`${who(leaders[0])} led ${name} throughout ${one ? y : `${a}–${y}`}.`);
  else if (leaders.length > 1) parts.push(`${name} had ${leaders.length} leaders ${one ? `in ${y}` : `between ${a} and ${y}`}: ${leaders.map(who).join(', then ')}.`);
  if (offices.length) parts.push(`Also in office: ${offices.map(o => `${who(o)} as ${o.office === 'hos' ? 'head of state' : 'head of government'}`).join('; ')}.`);
  if (ruling.length === 1) parts.push(`The ${ruling[0].name} held power.`);
  const count = t => events.filter(e => e.type === t).length;
  const ev = [];
  if (count('coup')) ev.push(`${count('coup')} irregular seizure${count('coup') > 1 ? 's' : ''} of power`);
  if (count('election')) ev.push(`${count('election')} election${count('election') > 1 ? 's' : ''}`);
  if (count('referendum')) ev.push(`${count('referendum')} referendum${count('referendum') > 1 ? 's' : ''}`);
  if (count('statehood') || count('border')) ev.push('changes to its borders or status');
  if (ev.length) parts.push(`The ${one ? 'year' : 'period'} saw ${ev.join(', ')}.`);
  return parts.join(' ') || `No leadership data is recorded for ${name} in ${one ? y : `${a}–${y}`}.`;
}

// The first few items of the "Events" section of Wikipedia's "<year> in <country>" article.
const wikiCache = new Map();
async function loadWikiEvents(page, gw, y) {
  const box = $('#wiki-events');
  try {
    if (!wikiCache.has(page)) {
      const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', prop: 'extracts', explaintext: '1', exsectionformat: 'wiki', redirects: '1', titles: page, format: 'json', origin: '*' });
      const res = await fetch(url);
      const pages = Object.values((await res.json()).query?.pages || {});
      wikiCache.set(page, eventsFromExtract(pages[0]?.extract || ''));
    }
    if (state.selected !== gw || state.year !== y || !single() || !$('#wiki-events')) return;
    const items = wikiCache.get(page);
    box.innerHTML = items.length
      ? `<ul class="wiki-list">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="note">From <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a>, Wikipedia (CC BY-SA)</p>`
      : `<p class="note">More in <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a> on Wikipedia.</p>`;
  } catch {
    if ($('#wiki-events')) box.innerHTML = `<p class="note">More in <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a> on Wikipedia.</p>`;
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

function eventItem(e, cname, gw) {
  const label = cname ? `<a href="#" data-open="${gw}">${esc(displayName(+gw, cname, e.date))}</a>: ` : '';
  const text = e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.text)}</a>` : esc(e.text);
  // Wikidata often records only the year of an election; show just the year then.
  const when = /^(election|referendum)$/.test(e.type) && e.date.endsWith('-01-01') ? e.date.slice(0, 4) : fmt(e.date);
  return `<li data-type="${e.type}"><time>${when}<span class="kind">${KIND[e.type] || e.type}</span></time>${label}${text}</li>`;
}

/* ---------------------------------------------------------------- border animation: the year's, or the period's */
async function animateYear(gw, a, y, changes) {
  if (state.animating) return;
  state.animating = true;
  period.stop();
  const frames = [`${a}-01-01`, ...changes];
  const label = $('#anim-label');
  label.hidden = false;
  zoomToCountry(gw, frames);
  for (let round = 0; round < 2; round++) {
    for (const d of frames) {
      label.textContent = fmt(d);
      renderMap(d);
      await new Promise(r => setTimeout(r, 1300));
    }
  }
  label.hidden = true;
  renderMap();
  state.animating = false;
}

function countryShapes(gw, dates) {
  return state.features.filter(f => f.properties.gw === gw && dates.some(d => f.properties.s <= d && d <= f.properties.e));
}
function zoomToCountry(gw, dates) {
  const shapes = countryShapes(gw, dates);
  if (!shapes.length) return;
  const [[x0, y0], [x1, y1]] = d3.geoBounds({ type: 'FeatureCollection', features: shapes });
  const pad = Math.max(6, (x1 - x0) * 0.5);
  if (x1 - x0 < 180) focusBounds([[x0 - pad, y0 - pad / 2], [x1 + pad, y1 + pad / 2]]);
}

async function downloadGif(gw, a, y, changes) {
  const btn = $('#gif');
  btn.disabled = true; btn.textContent = 'Rendering…';
  try {
    const w = 720, h = 480;
    const frames = [`${a}-01-01`, ...changes];
    const shapes = countryShapes(gw, frames);
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
    for (const d of frames) {
      ctx.fillStyle = C.water; ctx.fillRect(0, 0, w, h);
      for (const f of activeOn(d)) {
        const covered = country(f.properties.gw);
        ctx.beginPath(); p(f);
        ctx.fillStyle = f.properties.gw === gw ? C.focus : covered ? C.covered : C.land;
        ctx.fill(); ctx.strokeStyle = covered ? C.halo : C.border; ctx.lineWidth = 1; ctx.stroke();
      }
      // Title band and source line, set like a figure.
      ctx.fillStyle = C.band; ctx.fillRect(0, 0, w, 48); ctx.fillRect(0, h - 28, w, 28);
      ctx.fillStyle = C.line; ctx.fillRect(0, 48, w, 1); ctx.fillRect(0, h - 29, w, 1);
      ctx.fillStyle = C.text; ctx.font = `600 22px ${serif}`;
      ctx.fillText(`${displayName(gw, country(gw).name, d)} · ${fmt(d)}`, 20, 33);
      ctx.fillStyle = C.muted; ctx.font = `12px ${mono}`;
      ctx.fillText('Political Retrospective · PRP · borders: CShapes 2.0', 20, h - 10);
      const { data } = ctx.getImageData(0, 0, w, h);
      const palette = quantize(data, 64);
      gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay: 1500 });
    }
    gif.finish();
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([gif.bytes()], { type: 'image/gif' })),
      download: `${country(gw).name.replace(/\W+/g, '-')}-${a === y ? y : `${a}-${y}`}-borders.gif`
    });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  } finally {
    btn.disabled = false; btn.textContent = '⤓ Download GIF';
  }
}

/* ---------------------------------------------------------------- table view */
const STATUS_ORDER = { irregular: 0, change: 1, border: 2, steady: 3 };
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
    .map(r => ({ ...r, leaders: leadersIn(r.gw, a, y), status: statusFor(r.gw, a, y), events: eventsIn(r.gw, a, y).length }))
    .sort((p, q) => cmp(value(p), value(q)) * dir || p.name.localeCompare(q.name));
  table.tHead.innerHTML = `<tr>${COLUMNS.map(([k, label, , cls]) => `<th scope="col"${cls ? ` class="${cls}"` : ''}${k === key ? ` aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}>` +
    `<button type="button" class="sort" data-sort="${k}">${typeof label === 'function' ? label() : label}<span class="arrow" aria-hidden="true">${k === key ? (dir > 0 ? '↑' : '↓') : '↕'}</span></button></th>`).join('')}</tr>`;
  table.tBodies[0].innerHTML = rows.map(r => `<tr data-gw="${r.gw}"${r.gw === state.selected ? ' class="selected"' : ''}>
      <td><button type="button" class="row-link">${esc(r.name)}</button></td>
      <td>${r.leaders.length ? r.leaders.map(l => esc(l.full || l.name)).join(' → ') : '<span class="cell-sub">No leader recorded</span>'}</td>
      <td><span class="cell-status"><span class="swatch" style="background:${FILL[r.status]}"></span>${STATUS_LABEL[r.status]}</span></td>
      <td class="num">${r.events}</td></tr>`).join('');
  $('#table-caption').textContent = `The ${rows.length} covered states ${dateFor(y) === TODAY ? 'today' : `at the end of ${y}`}: who was in charge during ${span(a, y)}, what happened, and how many key events were recorded. Select a column heading to sort, or a row to open the state.`;
}

function markTableRow() {
  const wrap = $('.table-wrap');
  document.querySelectorAll('#year-table tbody tr').forEach(tr => {
    const on = +tr.dataset.gw === state.selected;
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
  table.tBodies[0].onclick = ev => { const tr = ev.target.closest('tr[data-gw]'); if (tr) select(+tr.dataset.gw); };
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
  $('#caption').textContent = `States and borders ${dateFor(y) === TODAY ? 'today' : `at the end of ${y}`}, each covered state coloured by what happened to it in ${a === y ? y : `the years ${a}–${y}`}. ` +
    'Borders: CShapes 2.0; leaders: Archigos 4.1 and Wikidata.';
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
  play: { interval: 900, label: 'Play through the years' },
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
function select(gw) {
  state.selected = gw;
  renderMap();
  renderPanel();
  markTableRow();
  writeHash();
  if (gw) zoomToCountry(gw, [dateFor(state.year)]);
}
function writeHash() {
  const f = PRPPeriod.rules.startParam(period.get());
  const h = `#y=${state.year}${f != null ? `&f=${f}` : ''}${state.selected ? `&c=${state.selected}` : ''}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}
// An f at or after the year, or unreadable, is a single year.
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const y = +p.get('y') || state.data.lastYear; const c = +p.get('c');
  return { y, f: PRPPeriod.rules.readStart(period.get().stops, p.get('f'), y, 'end'), c: country(c) ? c : null };
}

function setupSearch() {
  const input = $('#search'), list = $('#search-results');
  const index = [];
  for (const [gw, c] of Object.entries(state.data.countries)) {
    index.push({ label: c.name, sub: 'Country', gw: +gw, year: null, key: c.name.toLowerCase() });
    for (const l of c.leaders) index.push({ label: l.full || l.name, sub: `${c.name} · from ${l.start.slice(0, 4)}`, gw: +gw, year: Math.max(+l.start.slice(0, 4), state.data.firstYear), key: (l.full || l.name).toLowerCase() });
  }
  for (const f of state.features) {
    const c = country(f.properties.gw);
    if (c && f.properties.name !== c.name) index.push({ label: f.properties.name, sub: `Historical name · ${f.properties.s.slice(0, 4)}`, gw: f.properties.gw, year: Math.max(+f.properties.s.slice(0, 4), state.data.firstYear), key: f.properties.name.toLowerCase() });
  }
  let results = [], active = 0;
  const choose = r => {
    input.value = ''; list.hidden = true;
    if (r.year) setPeriod(null, r.year, { push: false });
    select(r.gw);
  };
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const seen = new Set();
    results = q.length < 2 ? [] : index.filter(r => r.key.includes(q)).filter(r => { const k = r.label + r.sub; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
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
    $('#status').innerHTML = `<span>Coverage <b>${Object.keys(data.countries).length} countries</b></span><span>Years <b>${data.firstYear}–present</b></span>` +
      '<span>Borders <b>CShapes 2.0</b></span><span>Leaders <b>Archigos 4.1, Wikidata</b></span><span>Events <b>Wikidata, Wikipedia</b></span>';
    drawMap();
    setupTimeline();
    setupSearch();
    setupTable();
    const { y, f, c } = readHash();
    state.selected = c;
    state.year = y;
    setupTabs();
    setPeriod(f, y, { push: false });
    if (c) zoomToCountry(c, [dateFor(state.year)]);
    window.addEventListener('hashchange', () => {
      const h = readHash();
      if (h.y !== state.year || (h.f ?? h.y) !== state.from) setPeriod(h.f, h.y, { push: false });
      if (h.c !== state.selected) select(h.c);
    });
  } catch (err) {
    console.error(err);
    $('#status').textContent = 'Could not load historical data.';
  }
})();
