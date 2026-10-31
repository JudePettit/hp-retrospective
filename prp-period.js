/* A copy of jdpi's design/prp-period.js (https://jdpi.pages.dev/design/prp-period.js); styles.css copies its look, the
   "Period control" section of jdpi's design/prp.css. Keep them in step; tests/e2e.test.mjs checks that they are. */
/* PRP period: the time control of every map that moves through time. Two handles on one drawn track, the start of the
   period (hollow) and its end (filled), are two range inputs stacked on one track with the period filled between them;
   ‹ ▶ › buttons, an optional strip above (counts per stop, or a page's own chart) and labelled ticks below. Plain script,
   no build step, no dependencies, like design/prp-focus.js: a page loads it before its own script
   (<script src="../design/prp-period.js"></script>) and calls PRPPeriod.mount(); Node tests import it and read
   globalThis.PRPPeriod. The look is the "Period control" section of design/prp.css (tokens only, so light and dark
   follow by themselves, with no redraw). The Invention Timeline's two-handled slider was the model.

   Two kinds of page, told apart by `rest`, where the start sits until someone moves it:
     rest: 'first'  up-to pages (Invention Timeline, War Focus) show everything up to the end: the start rests on the
                    first stop, so a plain year still means "up to that year".
     rest: 'end'    snapshot pages (Retrospective Battlefield, Kardashev Tracker, Geopolitical Volatility, the Realtime
                    archive, the Political Retrospective) show one time: the start rides on the end handle, so a plain
                    year is that one year, as before.
   With the start at rest a page behaves exactly as it did with one handle, and writes no start parameter to its address.

   const period = PRPPeriod.mount(el, {
     stops,      ascending values: numbers (years) or ISO strings ('YYYY-MM', 'YYYY-MM-DD'); [] until the data loads
     from, to,   the first period; each sits on the last stop at or before it; to defaults to the last stop, and a
                 missing or null from is at rest
     rest,       'first' (the default) or 'end', as above
     labels,     value => text, for the handles' aria-valuetext ('3000 BC', 'July 1940'); default String
     onChange,   p => …, once per change, never from inside itself; p = { from, to, fromIndex, toIndex, atRest, single,
                 playing, source, stops }, source 'input' | 'track' | 'step' | 'play' | 'set'
     play,       false, or { interval: ms | () => ms (read when play starts), label: 'Play through history' }: draws ‹ ▶ ›
     steps,      draws ‹ › without ▶ (default: with play)
     ticks,      [{ at: value, text, kind }], kind 'key' | 'minor' (and 'start' | 'end', also given to a tick within 2% of
                 either end): minor ticks drop out under 900px, all but the key ones and the ends under 480px
     strip,      counts per stop (bars, the period's in the module accent, as the Invention Timeline's density), or
                 (svg, p) => draw (a page's own chart: War Focus's deaths), redrawn on every change and on resize
     ids,        { from, to, prev, play, next }: element ids, so each page's code and tests keep theirs
     names,      accessible names { group, from, to, prev, next } (Period, Start of the period, End of the period, …)
     titles,     tooltips { from, to, prev, play, next } (default: the names; a page with keys names them here)
     exact,      true: set() keeps values that fall between stops (the Invention Timeline's #y=1687 sits on 1684)
     onPlay,     playing => …, when play starts (after its first move) and when it stops
   });
   period.set(from, to, { silent })   values; from null = the start at rest; a start after the end becomes the end;
                                      to left out keeps the end; silent: no onChange. Returns p.
   period.get()                       p, as above (source 'get')
   period.update({ stops, ticks, strip, from, to })   another war's months, a reloaded file: never calls onChange
   period.strip(countsOrFn)   period.step(±1)   period.play()   period.stop()   period.toggle()

   Behaviour (PRPPeriod.rules: pure functions on stop indices, tested in tests/prp-period.test.mjs):
   - the start pushed past the end takes it along; the end pulled back past the start brings it along;
   - a click on the track moves the nearer handle there (a tie moves the end); ‹ › and a page's keys move the end, and a
     step back from a value between stops goes to that value's own stop first;
   - on a snapshot page a single time travels as one, as the one-handled slider did: the end handle (its keys too), ‹ ›,
     a track click and play move both handles, and only the start handle opens a period: dragged or keyed back, it opens
     one; forward, it carries both;
   - play runs from the start handle: from the last stop it begins again at the start of the period (on a snapshot page
     a single time begins again at the first stop) and stops at the last stop;
   - any handle input, track click or ‹ › click stops play; set() does not (pages stop it where they need to).
   The inputs take no pointer events, only their thumbs, so either handle can be dragged where the other isn't. When the
   handles meet, the one in front is the one that can move off: the start on a snapshot page (it wears a ring there, so
   both handles can be seen), else the start unless both sit on the first stop. Keys on a focused handle are the
   native ones (arrows, Page Up and Down, Home, End) with the same push and pull; the control installs no page-wide
   keys. When the stops are consecutive whole numbers (every year 1926–2025) the inputs' values are the stops
   themselves, otherwise stop indices, so each page's inputs keep the values its code and tests use; each input also
   carries data-value, the value it stands for. */
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const SVG = 'http://www.w3.org/2000/svg';

  /* ---------- rules: pure, on stop indices ---------- */
  const isNum = v => typeof v === 'number';
  // Numbers compare as numbers, ISO dates as strings ('2023-06' < '2023-06-15' < '2023-07').
  const cmp = (a, b) => (isNum(a) && isNum(b) ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
  // A value in the stops' own type (a year from an address arrives as text); null when there is none.
  const asStop = (stops, v) => (v == null || v === '' ? null : isNum(stops[0]) ? (Number.isFinite(+v) ? +v : null) : String(v));
  // The stop a value sits on: an exact match, else the last stop before it, and the first stop for anything earlier.
  function indexOf(stops, v) {
    v = asStop(stops, v);
    if (v == null || !stops.length || cmp(v, stops[0]) <= 0) return 0;
    let lo = 0, hi = stops.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cmp(stops[mid], v) <= 0) lo = mid; else hi = mid - 1; }
    return lo;
  }
  const clampIndex = (k, n) => Math.max(0, Math.min(n - 1, Math.round(+k) || 0));
  // s = { i, j, n, rest }: the start's and end's stop indices, the number of stops, and where the start rests.
  const atRest = s => (s.rest === 'end' ? s.i === s.j : s.i === 0);
  const travels = s => s.rest === 'end' && s.i === s.j; // a single time on a snapshot page moves as one
  const startTo = (s, k) => { k = clampIndex(k, s.n); return { ...s, i: k, j: Math.max(s.j, k) }; };
  const endTo = (s, k) => { k = clampIndex(k, s.n); return travels(s) ? { ...s, i: k, j: k } : { ...s, i: Math.min(s.i, k), j: k }; };
  const trackTo = (s, k) => { k = clampIndex(k, s.n); return travels(s) ? { ...s, i: k, j: k } : Math.abs(k - s.i) < Math.abs(k - s.j) ? startTo(s, k) : endTo(s, k); };
  const trackMoves = (s, k) => (!travels(s) && Math.abs(clampIndex(k, s.n) - s.i) < Math.abs(clampIndex(k, s.n) - s.j) ? 'from' : 'to');
  // ‹ › and a page's keys; between: the end's value lies between stops, so a step back first goes to its own stop.
  const stepBy = (s, d, between = false) => endTo(s, d < 0 && between ? s.j : s.j + d);
  // Play: travel (a single time on a snapshot page moves as one) or grow (the end runs on from the start). The mode is
  // fixed for the whole run; at the last stop play begins again at the start of the period.
  const playMode = s => (travels(s) ? 'travel' : 'grow');
  const playStart = (s, mode) => (s.j < s.n - 1 ? s : mode === 'travel' ? { ...s, i: 0, j: 0 } : { ...s, j: s.i });
  const playTick = (s, mode) => (s.j >= s.n - 1 ? null : mode === 'travel' ? { ...s, i: s.j + 1, j: s.j + 1 } : { ...s, j: s.j + 1 });
  // Which input is in front, and whether the handles sit together.
  const layering = s => ({ topFrom: s.rest === 'end' ? s.i >= s.j : s.i >= s.j && s.j > 0, joined: s.i === s.j });
  const consecutive = stops => stops.length > 1 && stops.every((v, k) => Number.isInteger(v) && (k === 0 || v === stops[k - 1] + 1));
  const fillOf = s => { const d = Math.max(1, s.n - 1); return { left: s.i / d, width: (s.j - s.i) / d }; };
  const tickAt = (stops, v) => indexOf(stops, v) / Math.max(1, stops.length - 1);
  const barHeight = (c, max) => (c > 0 ? 0.12 + 0.88 * Math.sqrt(c / Math.max(1, max)) : 0);
  // The address: a page writes its start parameter only away from rest, and reads one back to hand to set(): absent,
  // unreadable or at its rest (on or before the first stop; on a snapshot page, at or after the end) means at rest.
  const startParam = p => (p.atRest ? null : p.from);
  function readStart(stops, raw, to, rest = 'first') {
    const f = asStop(stops, raw);
    if (f == null || !stops.length) return null;
    if (rest === 'end' ? to != null && cmp(f, asStop(stops, to)) >= 0 : indexOf(stops, f) === 0) return null;
    return f;
  }

  /* ---------- the control ---------- */
  function mount(el, opts = {}) {
    const doc = el.ownerDocument;
    const o = { rest: 'first', labels: String, play: false, exact: false, ids: {}, ...opts };
    const names = { group: 'Period', from: 'Start of the period', to: 'End of the period', prev: 'Step back in time', next: 'Step forward in time', ...o.names };
    const titles = { from: names.from, to: names.to, prev: names.prev, next: names.next, play: 'Play or pause', ...o.titles };
    const label = v => (v == null ? '' : String(o.labels(v)));
    const make = (tag, cls, attrs = {}) => {
      const e = doc.createElement(tag);
      if (cls) e.className = cls;
      for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
      return e;
    };
    let stops = [], vmode = false, s = { i: 0, j: 0, n: 1, rest: o.rest === 'end' ? 'end' : 'first' }, fromV = null, toV = null;
    let timer = null, mode = 'grow', busy = false, stripData = o.strip ?? null, ticksList = o.ticks || [], raf = 0;

    el.classList.add('prp-period');
    el.setAttribute('role', 'group');
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) el.setAttribute('aria-label', names.group);
    el.dataset.rest = s.rest;
    el.replaceChildren();
    const button = (act, glyph, name, title, cls = '') => {
      const b = make('button', `prp-period-btn${cls}`, { type: 'button', 'data-act': act, 'aria-label': name, title, id: o.ids[act] });
      b.textContent = glyph; el.append(b); return b;
    };
    const withSteps = o.steps ?? !!o.play;
    const prevB = withSteps ? button('prev', '‹', names.prev, titles.prev) : null;
    const playB = o.play ? button('play', '▶', o.play.label || 'Play', titles.play, ' play') : null;
    const nextB = withSteps ? button('next', '›', names.next, titles.next) : null;
    const slider = make('div', 'prp-period-slider');
    const strip = doc.createElementNS(SVG, 'svg');
    for (const [k, v] of [['class', 'prp-period-strip'], ['aria-hidden', 'true'], ['focusable', 'false'], ['preserveAspectRatio', 'none']]) strip.setAttribute(k, v);
    const range = make('div', 'prp-period-range');
    const track = make('div', 'prp-period-track', { 'aria-hidden': 'true' }), fill = make('div', 'prp-period-fill');
    track.append(fill);
    const input = (cls, name, title, id) => make('input', cls, { type: 'range', step: '1', min: '0', max: '0', value: '0', 'aria-label': name, title, id });
    const fromI = input('from', names.from, titles.from, o.ids.from), toI = input('to', names.to, titles.to, o.ids.to);
    range.append(track, fromI, toI);
    const ticksBox = make('div', 'prp-period-ticks', { 'aria-hidden': 'true' });
    slider.append(strip, range, ticksBox);
    el.append(slider);

    const get = (source = 'get') => ({ from: fromV, to: toV, fromIndex: s.i, toIndex: s.j, atRest: atRest(s), single: fromV != null && cmp(fromV, toV) === 0, playing: !!timer, source, stops });
    function setStops(list) {
      stops = [...(list || [])];
      s = { ...s, n: Math.max(1, stops.length) };
      vmode = consecutive(stops);
      for (const inp of [fromI, toI]) { inp.min = String(vmode ? stops[0] : 0); inp.max = String(vmode ? stops.at(-1) : s.n - 1); }
    }
    // Values to stops: the end (left out: the last stop), then the start (null: at rest; after the end: the end).
    function place(from, to) {
      if (!stops.length) return { nx: { ...s, i: 0, j: 0 }, f: null, t: null };
      const first = stops[0], last = stops.at(-1), clampV = v => (cmp(v, first) < 0 ? first : cmp(v, last) > 0 ? last : v);
      let t = asStop(stops, to);
      if (t == null) t = last;
      const j = indexOf(stops, t);
      t = o.exact ? clampV(t) : stops[j];
      let f = asStop(stops, from), i;
      if (f == null) { i = s.rest === 'end' ? j : 0; f = s.rest === 'end' ? t : first; }
      else { i = indexOf(stops, f); f = o.exact ? clampV(f) : stops[i]; if (cmp(f, t) > 0) { f = t; i = j; } }
      return { nx: { ...s, i, j }, f, t };
    }
    function sync() {
      const { left, width } = fillOf(s);
      fill.style.left = `${left * 100}%`; fill.style.width = `${width * 100}%`;
      fromI.value = String(vmode ? stops[s.i] : s.i); toI.value = String(vmode ? stops[s.j] : s.j);
      const { topFrom, joined } = layering(s);
      range.classList.toggle('top-from', topFrom); range.classList.toggle('joined', joined);
      fromI.setAttribute('aria-valuetext', s.rest === 'end' && joined && stops.length ? `${label(fromV)} (the same as the end)` : label(fromV));
      toI.setAttribute('aria-valuetext', label(toV));
      fromI.dataset.value = fromV == null ? '' : String(fromV); toI.dataset.value = toV == null ? '' : String(toV);
      paintStrip();
    }
    function emit(source) {
      if (busy || !o.onChange) return;
      busy = true;
      try { o.onChange(get(source)); } finally { busy = false; }
    }
    // A move by the reader (moved: the handle that was moved, or 'to' for ‹ ›, play and a single time): a handle that
    // moves lands on its stop, the other keeps its value (a value between stops, too) unless the move carried it along.
    function commit(nx, source, moved) {
      if (!stops.length) return false;
      let f = moved === 'from' || nx.i !== s.i ? stops[nx.i] : fromV, t = moved === 'to' || nx.j !== s.j ? stops[nx.j] : toV;
      if (cmp(f, t) > 0) { if (moved === 'from') t = f; else f = t; }
      const changed = nx.i !== s.i || nx.j !== s.j || cmp(f, fromV) !== 0 || cmp(t, toV) !== 0;
      s = nx; fromV = f; toV = t;
      sync();
      if (changed) emit(source);
      return changed;
    }
    function set(from, to, { silent = false } = {}) {
      const { nx, f, t } = place(from, to === undefined ? toV : to);
      const changed = nx.i !== s.i || nx.j !== s.j || cmp(f, fromV) !== 0 || cmp(t, toV) !== 0;
      s = nx; fromV = f; toV = t;
      sync();
      if (changed && !silent) emit('set');
      return get('set');
    }

    /* the strip: bars of counts per stop, or the page's own drawing */
    function paintStrip() {
      if (typeof stripData === 'function') { if (stops.length) stripData(strip, get('strip')); return; }
      const bars = strip.children;
      for (let k = 0; k < bars.length; k++) bars[k].setAttribute('class', k >= s.i && k <= s.j ? 'in' : 'out');
    }
    function drawStrip() {
      slider.classList.toggle('has-strip', !!stripData);
      strip.style.display = stripData ? '' : 'none'; // no strip: no box at all, even before the stylesheet has loaded
      if (typeof stripData === 'function') return;
      const counts = Array.isArray(stripData) ? stripData : [], max = counts.reduce((m, c) => (c > m ? c : m), 1);
      strip.setAttribute('viewBox', `0 0 ${Math.max(1, counts.length)} 1`);
      while (strip.children.length > counts.length) strip.lastChild.remove();
      while (strip.children.length < counts.length) strip.append(doc.createElementNS(SVG, 'rect'));
      counts.forEach((c, k) => {
        const h = barHeight(c, max), r = strip.children[k];
        r.setAttribute('x', k + 0.1); r.setAttribute('width', 0.8); r.setAttribute('y', 1 - h); r.setAttribute('height', h);
      });
    }
    function drawTicks() {
      ticksBox.replaceChildren(...(stops.length ? ticksList : []).map(t => {
        const at = tickAt(stops, t.at), cls = new Set(String(t.kind || '').split(/\s+/).filter(Boolean));
        if (at < 0.02) cls.add('start'); else if (at > 0.98) cls.add('end');
        const span = make('span', [...cls].join(' ') || null);
        span.style.left = `${at * 100}%`; span.textContent = t.text ?? label(t.at);
        return span;
      }));
    }

    /* play */
    function setButton(on) { if (!playB) return; playB.textContent = on ? '❚❚' : '▶'; playB.setAttribute('aria-label', on ? 'Pause' : o.play.label || 'Play'); }
    function stop() {
      if (!timer) return;
      clearInterval(timer); timer = null; setButton(false);
      o.onPlay?.(false);
    }
    function play() {
      if (timer || !o.play || stops.length < 2) return;
      mode = playMode(s);
      commit(playStart(s, mode), 'play', 'to');
      setButton(true);
      const every = typeof o.play.interval === 'function' ? +o.play.interval() : +o.play.interval;
      timer = setInterval(() => { const nx = playTick(s, mode); if (!nx) stop(); else commit(nx, 'play', 'to'); }, every > 0 ? every : 900);
      o.onPlay?.(true);
    }
    const toggle = () => (timer ? stop() : play());
    function step(d) { stop(); return commit(stepBy(s, d, toV != null && cmp(toV, stops[s.j]) > 0), 'step', 'to'); }

    /* the reader's moves */
    const readK = inp => (vmode ? indexOf(stops, +inp.value) : clampIndex(inp.value, s.n));
    fromI.addEventListener('input', () => { stop(); commit(startTo(s, readK(fromI)), 'input', 'from'); });
    toI.addEventListener('input', () => { stop(); commit(endTo(s, readK(toI)), 'input', 'to'); });
    // A click on the track (the inputs answer only at their thumbs) moves the nearer handle there.
    track.addEventListener('click', ev => {
      if (!stops.length) return;
      const box = track.getBoundingClientRect(), k = Math.round(((ev.clientX - box.left) / Math.max(1, box.width)) * (s.n - 1));
      stop();
      commit(trackTo(s, k), 'track', trackMoves(s, k));
    });
    if (prevB) prevB.addEventListener('click', () => step(-1));
    if (nextB) nextB.addEventListener('click', () => step(1));
    if (playB) playB.addEventListener('click', toggle);
    // A drawn strip follows the control's width (one observer, one redraw a frame).
    if (root.ResizeObserver) new ResizeObserver(() => { if (typeof stripData !== 'function') return; cancelAnimationFrame(raf); raf = requestAnimationFrame(paintStrip); }).observe(slider);

    function update(u = {}) {
      const keepFrom = atRest(s) ? null : fromV;
      if (u.stops) setStops(u.stops);
      if (u.ticks) ticksList = u.ticks;
      if ('strip' in u) stripData = u.strip ?? null;
      const { nx, f, t } = place('from' in u ? u.from : keepFrom, 'to' in u ? u.to : toV);
      s = nx; fromV = f; toV = t;
      drawTicks(); drawStrip(); sync();
      return get('update');
    }
    setStops(o.stops);
    update({ from: o.from ?? null, to: o.to ?? null });
    return {
      el, inputs: { from: fromI, to: toI }, set, get: () => get('get'), update, step, play, stop, toggle,
      strip(d) { stripData = d ?? null; drawStrip(); paintStrip(); },
    };
  }

  root.PRPPeriod = {
    mount,
    rules: { indexOf, atRest, travels, startTo, endTo, trackTo, trackMoves, stepBy, playMode, playStart, playTick, layering, consecutive, fillOf, tickAt, barHeight, startParam, readStart, compare: cmp },
  };
})();
