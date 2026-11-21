// Builds the Political Retrospective's borders from Cliopatria v0.2.1 (CC BY 4.0), and rewrites the border parts of
// data/countries.json in its second shape (scripts/retro-shape.mjs). Written on 20 November 2026, when the borders
// moved from CShapes 2.0 (CC BY-NC-SA 4.0, non-commercial only) to Cliopatria under the free-data rule (MP-11).
//   node --max-old-space-size=6000 scripts/build-borders.mjs --zip <cliopatria.geojson.zip>
// --zip is the release's archive, downloaded by hand from the tag (below) to a folder outside the repository. It is
// the same file jdpi's Omni-Map reads (jdpi omni/scripts/build-borders.mjs at commit 5746f73), and a row's id here is
// made the same way, so a row has one id across VM.
//
// The inputs: the archive; data/countries.json as it stands (either shape: keyed by Gleditsch and Ward number, as
// until 20 November 2026, or by Wikidata key); scripts/countries.mjs (the states, OLD_KEYS); scripts/cliopatria-states.mjs
// (VM's crosswalk from Cliopatria's rows to the states); mapshaper 0.7.98, run through npx, as the CShapes build ran it.
//
// The order of steps; it writes nothing to data/ until every step has worked:
// 1. Checks the archive's sha256 against v0.2.1's (RELEASE below) and stops if it differs; unpacks its one GeoJSON
//    file in memory, checking its CRC. Stops unless the rows end in 2024 (BORDERS_TO), the last year the page draws;
//    the years after it (2025, 2026) are drawn on 2024's rows, and the page says so.
// 2. Takes the rows that overlap 1926–2024, leaving out those whose Name is in brackets (Cliopatria's unions of other
//    rows, such as "(British Empire)", which would draw the same land twice). Each row keeps: id (cl- and the first ten
//    hex digits of sha256 of "<Name>|<FromYear>|<ToYear>|<Type>"), n (its Name), f and t (its first and last year,
//    Cliopatria's integers), a (its Area, km², rounded), and c, the covered state it stands for by VM's crosswalk, with
//    cf and ct where it stands for that state in only some of its years. Stops if a row would stand for two states,
//    or for one in years that are not one stretch, or if a crosswalk name matches no row (the crosswalk is stale).
// 3. Writes those rows to build/borders.geojson and runs mapshaper on them: weighted simplification to 6% of the
//    points, keeping every shape, and TopoJSON quantised to 1/100,000 of the extent (the CShapes build's settings), to
//    build/borders.topo.json. Stops if the file is over 1.5 MB gzipped (LIMIT_GZ), or lacks the object "borders".
// 4. Reads data/countries.json; re-keys it by Wikidata key if it is in the old shape (retro-shape.mjs rekey); gives
//    each state its spans from its statehood (build-statehood.mjs spansOf; since 21 November 2026, Wikidata's, and the
//    build stops if a state has none); drops every border event and any statehood event that is not Wikidata's (the
//    CShapes ones); adds a border event for each year in which a covered state's rows hold an area more than 1% different
//    from the year before (borderEvents: dated 1 January of that year, precision "year", src "cliopatria"; its text
//    says Cliopatria's border differs from the year before's). `built` (the leaders' build) stays as it is;
//    `bordersBuilt` is today, or stays as it was when the borders file comes out byte for byte the same.
// 5. Writes data/borders.topo.json and data/countries.json (retro-shape.mjs document) and prints rows, bytes, the
//    gzipped bytes, and each state's border events and the years VM cannot place it on a row.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync, inflateRawSync, crc32 } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { COUNTRIES, FIRST_YEAR } from './countries.mjs';
import { CLIO, stateOf } from './cliopatria-states.mjs';
import { borderEvents, keyIn, rekey, document, FORMAT, byDay } from './retro-shape.mjs';
import { spansOf } from './build-statehood.mjs';
import { displayName } from '../names.mjs';

const ROOT = new URL('..', import.meta.url);
const path = p => new URL(p, ROOT).pathname.replace(/^\/([A-Z]:)/, '$1');
// The release: https://github.com/Seshat-Global-History-Databank/cliopatria/tree/v0.2.1 (the file
// cliopatria.geojson.zip in the tag). Licence CC BY 4.0 (LICENSE.md at the tag), read 20 November 2026.
export const RELEASE = {
  version: 'v0.2.1',
  url: 'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.1/cliopatria.geojson.zip',
  bytes: 46005176,
  sha256: 'e10a4e429fca708788ff9e7572a95fce801fae55852d217cffabc1c59cd4eed4',
  entry: 'cliopatria_polities_only_v021.geojson'
};
export const BORDERS_TO = 2024;
export const LIMIT_GZ = 1.5 * 1024 * 1024;
const sha256 = b => createHash('sha256').update(b).digest('hex');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
/** The row id, made as jdpi's Omni-Map makes it: cl- and ten hex digits of sha256 of Name|FromYear|ToYear|Type. */
export const rowId = p => `cl-${sha256(Buffer.from(`${p.Name}|${p.FromYear}|${p.ToYear}|${p.Type}`, 'utf8')).slice(0, 10)}`;

/** One file out of a zip archive (stored or deflated, no zip64), its CRC checked. */
export function unzipEntry(buf, name) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip archive');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const entry = buf.toString('utf8', p + 46, p + 46 + nlen);
    p += 46 + nlen + xlen + clen;
    if (entry !== name) continue;
    if (csize === 0xffffffff || usize === 0xffffffff) throw new Error('zip64 is not read here');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    const out = method === 0 ? Buffer.from(data) : method === 8 ? inflateRawSync(data) : null;
    if (!out) throw new Error(`compression method ${method} is not read here`);
    if (out.length !== usize || crc32(out) !== crc) throw new Error(`${name}: size or CRC does not match the archive's record`);
    return out;
  }
  throw new Error(`${name} is not in the archive`);
}

/** Step 2: a row's covered state, and the years it stands for it (cf, ct where not all its years). */
export function stateOfRow(p) {
  const from = Math.max(p.FromYear, FIRST_YEAR), to = Math.min(p.ToYear, BORDERS_TO);
  const years = [];
  for (let y = from; y <= to; y++) { const k = stateOf(p.Name, y); if (k) years.push([y, k]); }
  if (!years.length) return {};
  const keys = new Set(years.map(([, k]) => k));
  if (keys.size > 1) throw new Error(`${p.Name} ${p.FromYear}–${p.ToYear} stands for ${[...keys].join(' and ')}`);
  const ys = years.map(([y]) => y);
  if (ys.at(-1) - ys[0] + 1 !== ys.length) throw new Error(`${p.Name} ${p.FromYear}–${p.ToYear} stands for ${years[0][1]} in years that are not one stretch`);
  const c = years[0][1];
  return { c, ...(ys[0] > from ? { cf: ys[0] } : {}), ...(ys.at(-1) < to ? { ct: ys.at(-1) } : {}) };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  // 1. The archive.
  const zipPath = arg('--zip');
  if (!zipPath || !existsSync(zipPath)) throw new Error('give --zip <cliopatria.geojson.zip> (Cliopatria v0.2.1)');
  const zip = readFileSync(zipPath);
  if (sha256(zip) !== RELEASE.sha256) throw new Error(`${zipPath} is not Cliopatria ${RELEASE.version} (sha256 ${sha256(zip)})`);
  const all = JSON.parse(unzipEntry(zip, RELEASE.entry).toString('utf8')).features.filter(f => f.geometry);
  const lastYear = Math.max(...all.map(f => f.properties.ToYear));
  if (lastYear !== BORDERS_TO) throw new Error(`the rows end in ${lastYear}, not ${BORDERS_TO}: the page's last drawn year must be changed with it`);

  // 2. The rows.
  const features = all.filter(f => f.properties.ToYear >= FIRST_YEAR && f.properties.FromYear <= BORDERS_TO && !/^\(/.test(f.properties.Name))
    .map(f => {
      const p = f.properties;
      return { type: 'Feature', geometry: f.geometry, properties: { id: rowId(p), n: p.Name, f: p.FromYear, t: p.ToYear, a: Math.round(p.Area || 0), ...stateOfRow(p) } };
    });
  const ids = new Set(features.map(f => f.properties.id));
  if (ids.size !== features.length) throw new Error('two rows share an id');
  const names = new Set(features.map(f => f.properties.n));
  const stale = Object.entries(CLIO).flatMap(([k, list]) => list.filter(([n]) => !names.has(n)).map(([n]) => `${k} ${n}`));
  if (stale.length) throw new Error(`crosswalk names that match no row: ${stale.join('; ')}`);
  for (const k of Object.keys(CLIO)) if (!COUNTRIES[k]) throw new Error(`crosswalk key ${k} is not a covered state`);

  // 3. mapshaper.
  mkdirSync(path('build'), { recursive: true });
  writeFileSync(path('build/borders.geojson'), JSON.stringify({ type: 'FeatureCollection', features }));
  execFileSync('npx', ['--yes', 'mapshaper@0.7.98', path('build/borders.geojson'),
    '-simplify', 'weighted', '6%', 'keep-shapes',
    '-o', 'format=topojson', 'quantization=100000', 'precision=0.001', path('build/borders.topo.json')],
    { stdio: 'inherit', shell: process.platform === 'win32' });
  const topoText = readFileSync(path('build/borders.topo.json'), 'utf8');
  const topo = JSON.parse(topoText);
  if (!topo.objects?.borders || topo.objects.borders.geometries.length !== features.length) throw new Error('mapshaper\'s file lacks the object "borders" or some of its rows');
  const gz = gzipSync(Buffer.from(topoText)).length;
  if (gz > LIMIT_GZ) throw new Error(`borders.topo.json is ${gz} bytes gzipped, over the limit of ${LIMIT_GZ}`);

  // 4. countries.json.
  const doc = JSON.parse(readFileSync(path('data/countries.json'), 'utf8'));
  const countries = doc.format === FORMAT ? doc.countries : rekey(doc.countries);
  for (const [k, c] of Object.entries(countries)) {
    // The spans are the statehood's (build-statehood.mjs, Wikidata), which this build does not change.
    if (!Array.isArray(c.statehood)) throw new Error(`${k} has no statehood: run scripts/build-statehood.mjs (or npm run build-data) first`);
    c.spans = spansOf(c.statehood);
    // The border events are this build's; the statehood events (Wikidata's) stay. Any statehood event without
    // src "wikidata" is the CShapes data's, from before 20 November 2026, and goes.
    c.events = (c.events || []).filter(e => e.type !== 'border' && (e.type !== 'statehood' || e.src === 'wikidata'));
  }
  const rows = features.map(f => f.properties);
  const name = (k, date) => displayName(k, countries[k].name, date);
  const added = borderEvents(rows, countries, name, FIRST_YEAR, BORDERS_TO);
  for (const [k, list] of Object.entries(added)) countries[k].events = [...countries[k].events, ...list].sort(byDay);
  const same = existsSync(path('data/borders.topo.json')) && readFileSync(path('data/borders.topo.json'), 'utf8') === topoText;
  const bordersBuilt = same && doc.bordersBuilt ? doc.bordersBuilt : new Date().toISOString().slice(0, 10);
  const out = document({ built: doc.built, bordersBuilt, firstYear: doc.firstYear, lastYear: doc.lastYear, bordersTo: BORDERS_TO, parties: doc.sources?.parties, countries });
  const outText = JSON.stringify(out);
  const outGz = gzipSync(Buffer.from(outText)).length;
  if (outGz > LIMIT_GZ) throw new Error(`countries.json is ${outGz} bytes gzipped, over the limit`);

  // 5. Write and report.
  writeFileSync(path('data/borders.topo.json'), topoText);
  writeFileSync(path('data/countries.json'), outText);
  console.log(`borders: ${features.length} rows (${rows.filter(r => r.c).length} for covered states), ${topoText.length} bytes, ${gz} gzipped`);
  console.log(`countries: ${Object.keys(out.countries).length} states, ${outText.length} bytes, ${outGz} gzipped`);
  const span = ys => { const o = []; for (const y of ys) { const l = o.at(-1); if (l && y === l[1] + 1) l[1] = y; else o.push([y, y]); } return o.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', '); };
  for (const [k, c] of Object.entries(out.countries)) {
    const missing = [];
    for (let y = FIRST_YEAR; y <= BORDERS_TO; y++) {
      if (!c.spans.some(([s, e]) => s <= `${y}-12-31` && (!e || e >= `${y}-12-31`))) continue;
      if (!rows.some(r => keyIn(r, y) === k)) missing.push(y);
    }
    const ev = (added[k] || []).map(e => e.date.slice(0, 4));
    console.log(`  ${k} ${c.name}: border events ${ev.join(' ') || 'none'}${missing.length ? `; cannot place ${span(missing)}` : ''}`);
  }
}
