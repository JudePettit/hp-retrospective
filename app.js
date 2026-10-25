/* H&P Retrospective — who led each country, and which political events happened, year by year.
   Borders: CShapes 2.0. Leaders: Archigos 4.1 + Wikidata. Events: derived + Wikidata elections. */
import { GIFEncoder, quantize, applyPalette } from 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js';
import { displayName } from './names.mjs';

const W = 1000, H = 600;
const TODAY = new Date().toISOString().slice(0, 10);
const state = { year: 2026, selected: null, data: null, features: [], playing: null, animating: false };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { leader: 'leader', coup: 'irregular', election: 'election', referendum: 'referendum', border: 'border', statehood: 'statehood' };

let svg, g, projection, path, zoom;

/* ---------------------------------------------------------------- data helpers */
const dateFor = y => (y >= new Date().getUTCFullYear() ? TODAY : `${y}-12-31`);
const activeOn = date => state.features.filter(f => f.properties.s <= date && date <= f.properties.e);
const country = gw => state.data.countries[gw];
const inYear = (start, end, y) => start <= `${y}-12-31` && (!end || end >= `${y}-01-01`);

function leadersIn(gw, y) {
  return (country(gw)?.leaders || []).filter(l => inYear(l.start, l.end, y));
}
function officesIn(gw, y, leaders) {
  const names = new Set(leaders.map(l => (l.full || l.name).toLowerCase()));
  return (country(gw)?.offices || []).filter(o => inYear(o.start, o.end, y) && !names.has((o.full || '').toLowerCase()));
}
function eventsIn(gw, y) {
  return (country(gw)?.events || []).filter(e => e.date.startsWith(`${y}-`));
}
// Dates within the year when this country's borders changed (new shapes starting mid-year).
function borderChanges(gw, y) {
  return state.features.filter(f => f.properties.gw === +gw && f.properties.s.startsWith(`${y}-`) && f.properties.s !== `${y}-01-01`)
    .map(f => f.properties.s).filter((d, i, a) => a.indexOf(d) === i).sort();
}
function statusFor(gw, y) {
  if (!country(gw)) return 'none';
  const ev = eventsIn(gw, y);
  if (ev.some(e => e.type === 'coup')) return 'irregular';
  if (ev.some(e => e.type === 'leader')) return 'change';
  if (borderChanges(gw, y).length || ev.some(e => e.type === 'statehood')) return 'border';
  return 'steady';
}
const FILL = { irregular: 'var(--c-irregular)', change: 'var(--c-change)', border: 'var(--c-border)', steady: 'var(--c-steady)' };
const fmt = d => {
  if (!d) return 'present';
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const wiki = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const leaderLink = (l, gw) => l.url || `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(`${l.full || l.name} ${country(gw).name}`)}`;

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

function renderMap(date = dateFor(state.year)) {
  const y = +date.slice(0, 4);
  const shapes = activeOn(date);
  const tip = $('#tooltip');
  g.selectAll('path.shape')
    .data(shapes, d => `${d.properties.gw}|${d.properties.s}`)
    .join('path')
    .attr('d', path)
    .attr('class', d => `shape ${country(d.properties.gw) ? 'active' : 'inactive'}${d.properties.gw === state.selected ? ' selected' : ''}`)
    .attr('data-gw', d => d.properties.gw)
    .attr('fill', d => FILL[statusFor(d.properties.gw, y)] || null)
    .on('mousemove', (ev, d) => {
      const box = $('.map-wrap').getBoundingClientRect();
      const l = leadersIn(d.properties.gw, y).at(-1);
      tip.innerHTML = `<strong>${esc(displayName(d.properties.gw, d.properties.name, date))}</strong>${country(d.properties.gw) ? (l ? esc(l.full || l.name) : 'Leader unknown') : 'Not covered'}`;
      tip.hidden = false;
      tip.style.left = `${Math.min(ev.clientX - box.left + 14, box.width - tip.offsetWidth - 8)}px`;
      tip.style.top = `${ev.clientY - box.top + 14}px`;
    })
    .on('mouseleave', () => { tip.hidden = true; })
    .on('click', (ev, d) => { if (country(d.properties.gw)) select(d.properties.gw); });
}

/* ---------------------------------------------------------------- panel */
function renderPanel() {
  const y = state.year;
  const panel = $('#panel');
  if (!state.selected) {
    const all = Object.entries(state.data.countries)
      .flatMap(([gw, c]) => eventsIn(gw, y).map(e => ({ ...e, gw, cname: c.name })))
      .sort((a, b) => a.date.localeCompare(b.date));
    const changes = all.filter(e => e.type === 'leader' || e.type === 'coup').length;
    panel.innerHTML = `<h2>${y}</h2>
      <p class="sub">${changes} change${changes === 1 ? '' : 's'} of leader · ${all.filter(e => e.type === 'election' || e.type === 'referendum').length} elections and referendums</p>
      <p class="note">Click a country to see who was in charge and its key events. Drag the slider or press ▶ to move through the years.</p>
      <h3>Key events in ${y}</h3>
      ${all.length ? `<ul class="events">${all.slice(0, 120).map(e => eventItem(e, e.cname, e.gw)).join('')}</ul>` : '<p class="empty">No recorded events.</p>'}`;
    panel.querySelectorAll('[data-open]').forEach(a => a.onclick = ev => { ev.preventDefault(); select(+a.dataset.open); });
    return;
  }
  const gw = state.selected;
  const c = country(gw);
  const shape = activeOn(dateFor(y)).find(f => f.properties.gw === gw);
  const leaders = leadersIn(gw, y);
  const offices = officesIn(gw, y, leaders);
  const events = eventsIn(gw, y);
  const changes = borderChanges(gw, y);
  const page = c.yearPages.includes(y) ? `${y} in ${c.yearPage}` : null;

  panel.innerHTML = `<button class="close" type="button" id="close" aria-label="Close">✕</button>
    <h2>${esc(shape ? displayName(gw, shape.properties.name, dateFor(y)) : c.name)}</h2>
    <p class="sub">${shape ? `${y}` : `Not an independent state at the end of ${y}`}</p>
    <h3>In charge during ${y}</h3>
    ${leaders.length ? leaders.map(l => `<div class="leader">
        <div class="who"><a href="${esc(leaderLink(l, gw))}" target="_blank" rel="noopener">${esc(l.full || l.name)}</a>${l.entry === 'Irregular' ? '<span class="tag irregular">irregular entry</span>' : ''}</div>
        <div class="meta">${fmt(l.start)} – ${fmt(l.end)}${l.entry && l.entry !== 'Regular' && l.entry !== 'Irregular' ? ` · entry: ${esc(l.entry)}` : ''}${l.exit && l.exit !== 'Regular' ? ` · exit: ${esc(l.exit)}` : ''}</div>
      </div>`).join('') : '<p class="empty">No leader recorded for this year.</p>'}
    ${offices.length ? `<h3>Also in office</h3>${offices.map(o => `<div class="leader">
        <div class="who"><a href="${esc(o.url || wiki(o.full))}" target="_blank" rel="noopener">${esc(o.full)}</a><span class="tag office">${o.office === 'hos' ? 'Head of state' : 'Head of government'}</span></div>
        <div class="meta">${fmt(o.start)} – ${fmt(o.end)}</div></div>`).join('')}` : ''}
    <h3>Key events in ${y}</h3>
    ${events.length ? `<ul class="events">${events.map(e => eventItem(e)).join('')}</ul>` : '<p class="empty">No recorded events this year.</p>'}
    ${changes.length ? `<h3>Border changes in ${y}</h3>
      <p class="sub">${changes.length} change${changes.length > 1 ? 's' : ''}: ${changes.map(fmt).join(', ')}</p>
      <button class="btn" id="animate" type="button">▶ Play ${y} border changes</button>
      <button class="btn" id="gif" type="button">⤓ Download GIF</button>` : ''}
    ${page ? `<p class="note">More: <a href="${wiki(page)}" target="_blank" rel="noopener">${esc(page)}</a> on Wikipedia</p>` : ''}
    ${c.iso3 ? `<p class="note">Today: <a href="https://political-atlas.pages.dev/#${c.iso3}" target="_blank" rel="noopener">${esc(c.name)} in Political Atlas</a></p>` : ''}`;
  $('#close').onclick = () => select(null);
  if (changes.length) {
    $('#animate').onclick = () => animateYear(gw, y, changes);
    $('#gif').onclick = () => downloadGif(gw, y, changes);
  }
}

function eventItem(e, cname, gw) {
  const label = cname ? `<a href="#" data-open="${gw}">${esc(displayName(+gw, cname, e.date))}</a>: ` : '';
  const text = e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.text)}</a>` : esc(e.text);
  // Wikidata often records only the year of an election; show just the year then.
  const when = /^(election|referendum)$/.test(e.type) && e.date.endsWith('-01-01') ? e.date.slice(0, 4) : fmt(e.date);
  return `<li data-type="${e.type}"><time>${when}<span class="kind">${KIND[e.type] || e.type}</span></time>${label}${text}</li>`;
}

/* ---------------------------------------------------------------- intra-year animation */
async function animateYear(gw, y, changes) {
  if (state.animating) return;
  state.animating = true;
  stopPlay();
  const frames = [`${y}-01-01`, ...changes];
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

async function downloadGif(gw, y, changes) {
  const btn = $('#gif');
  btn.disabled = true; btn.textContent = 'Rendering…';
  try {
    const w = 720, h = 480;
    const frames = [`${y}-01-01`, ...changes];
    const shapes = countryShapes(gw, frames);
    const proj = d3.geoMercator().fitExtent([[40, 50], [w - 40, h - 30]], { type: 'FeatureCollection', features: shapes });
    const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const p = d3.geoPath(proj, ctx);
    const gif = GIFEncoder();
    const css = getComputedStyle(document.documentElement);
    const col = v => css.getPropertyValue(v).trim();
    for (const d of frames) {
      ctx.fillStyle = '#0d1721'; ctx.fillRect(0, 0, w, h);
      for (const f of activeOn(d)) {
        ctx.beginPath(); p(f);
        ctx.fillStyle = f.properties.gw === gw ? col('--c-change') : country(f.properties.gw) ? '#2c4a52' : '#22323d';
        ctx.fill(); ctx.strokeStyle = '#0d1721'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.fillStyle = '#edf3f1'; ctx.font = '600 22px Manrope, sans-serif';
      ctx.fillText(`${displayName(gw, country(gw).name, d)} · ${fmt(d)}`, 20, 34);
      ctx.fillStyle = '#91a0aa'; ctx.font = '12px "DM Mono", monospace';
      ctx.fillText('JDP-I H&P Retrospective · borders: CShapes 2.0', 20, h - 12);
      const { data } = ctx.getImageData(0, 0, w, h);
      const palette = quantize(data, 64);
      gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay: 1500 });
    }
    gif.finish();
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([gif.bytes()], { type: 'image/gif' })),
      download: `${country(gw).name.replace(/\W+/g, '-')}-${y}-borders.gif`
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } finally {
    btn.disabled = false; btn.textContent = '⤓ Download GIF';
  }
}

/* ---------------------------------------------------------------- year control */
function setYear(y, { push = true } = {}) {
  state.year = Math.max(state.data.firstYear, Math.min(state.data.lastYear, y));
  $('#year').value = state.year;
  $('#year-big').textContent = state.year;
  renderMap();
  renderPanel();
  if (push) writeHash();
}
function stopPlay() {
  clearInterval(state.playing); state.playing = null;
  $('#play').textContent = '▶'; $('#play').setAttribute('aria-label', 'Play through the years');
}
function setupTimeline() {
  const { firstYear: a, lastYear: b } = state.data;
  const slider = $('#year');
  slider.min = a; slider.max = b;
  $('#ticks').innerHTML = Array.from({ length: Math.floor((b - a) / 10) + 1 }, (_, i) => a + 4 + i * 10)
    .filter(y => y <= b).map(y => `<span style="left:${((y - a) / (b - a)) * 100}%">${y}</span>`).join('');
  slider.addEventListener('input', () => setYear(+slider.value));
  $('#prev').onclick = () => { stopPlay(); setYear(state.year - 1); };
  $('#next').onclick = () => { stopPlay(); setYear(state.year + 1); };
  $('#play').onclick = () => {
    if (state.playing) return stopPlay();
    if (state.year >= b) setYear(a);
    $('#play').textContent = '❚❚'; $('#play').setAttribute('aria-label', 'Pause');
    state.playing = setInterval(() => { if (state.year >= b) stopPlay(); else setYear(state.year + 1); }, 900);
  };
}

/* ---------------------------------------------------------------- selection, URL, search */
function select(gw) {
  state.selected = gw;
  renderMap();
  renderPanel();
  writeHash();
  if (gw) zoomToCountry(gw, [dateFor(state.year)]);
}
function writeHash() {
  const h = `#y=${state.year}${state.selected ? `&c=${state.selected}` : ''}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const y = +p.get('y'); const c = +p.get('c');
  return { y: y || state.data.lastYear, c: country(c) ? c : null };
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
    if (r.year) setYear(r.year, { push: false });
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
    $('#status').textContent = `${Object.keys(data.countries).length} countries · ${data.firstYear}–present · borders, leaders and key events`;
    drawMap();
    setupTimeline();
    setupSearch();
    const { y, c } = readHash();
    state.selected = c;
    setYear(y, { push: false });
    if (c) zoomToCountry(c, [dateFor(y)]);
    window.addEventListener('hashchange', () => {
      const h = readHash();
      if (h.y !== state.year) setYear(h.y, { push: false });
      if (h.c !== state.selected) select(h.c);
    });
  } catch (err) {
    console.error(err);
    $('#status').textContent = 'Could not load historical data.';
  }
})();
