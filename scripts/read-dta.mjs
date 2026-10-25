// Minimal reader for Stata 14/15 .dta files (format 118, little-endian).
// Supports numeric types, fixed-width strings and strLs; enough for Archigos 4.1.
import { readFileSync } from 'node:fs';

export function readDta(path) {
  const buf = readFileSync(path);
  const ascii = (start, end) => buf.toString('latin1', start, end);
  const tagEnd = tag => buf.indexOf(tag, 0, 'latin1') + tag.length;

  const release = ascii(tagEnd('<release>'), tagEnd('<release>') + 3);
  if (release !== '118') throw new Error(`Unsupported .dta release ${release}`);
  const K = buf.readUInt16LE(tagEnd('<K>'));
  const N = Number(buf.readBigUInt64LE(tagEnd('<N>')));

  const mapStart = tagEnd('<map>');
  const map = Array.from({ length: 14 }, (_, i) => Number(buf.readBigUInt64LE(mapStart + i * 8)));

  let p = map[2] + '<variable_types>'.length;
  const types = Array.from({ length: K }, (_, i) => buf.readUInt16LE(p + i * 2));
  p = map[3] + '<varnames>'.length;
  const names = Array.from({ length: K }, (_, i) => ascii(p + i * 129, p + (i + 1) * 129).replace(/\0.*$/s, ''));
  p = map[5] + '<formats>'.length;
  const formats = Array.from({ length: K }, (_, i) => ascii(p + i * 57, p + (i + 1) * 57).replace(/\0.*$/s, ''));

  const width = t => t <= 2045 ? t : ({ 32768: 8, 65526: 8, 65527: 4, 65528: 4, 65529: 2, 65530: 1 })[t];
  const rowWidth = types.reduce((s, t) => s + width(t), 0);

  // strL store: GSO records keyed by "v,o"
  const strls = new Map();
  let q = map[10] + '<strls>'.length;
  while (ascii(q, q + 3) === 'GSO') {
    const v = buf.readUInt32LE(q + 3);
    const o = Number(buf.readBigUInt64LE(q + 7));
    const t = buf.readUInt8(q + 15);
    const len = buf.readUInt32LE(q + 16);
    let s = buf.toString('utf8', q + 20, q + 20 + len);
    if (t === 130) s = s.replace(/\0$/, '');
    strls.set(`${v},${o}`, s);
    q += 20 + len;
  }

  const stataDate = days => {
    const d = new Date(Date.UTC(1960, 0, 1) + days * 86400000);
    return d.toISOString().slice(0, 10);
  };

  const rows = [];
  let r = map[9] + '<data>'.length;
  for (let n = 0; n < N; n++, r += rowWidth) {
    const row = {};
    let off = r;
    for (let k = 0; k < K; k++) {
      const t = types[k];
      let val;
      if (t <= 2045) val = buf.toString('utf8', off, off + t).replace(/\0.*$/s, '');
      else if (t === 32768) {
        const v = buf.readUInt16LE(off);
        const o = buf.readUIntLE(off + 2, 6);
        val = v === 0 && o === 0 ? '' : (strls.get(`${v},${o}`) ?? '');
      } else if (t === 65526) { val = buf.readDoubleLE(off); if (val > 8.988e307) val = null; }
      else if (t === 65527) { val = buf.readFloatLE(off); if (val > 1.701e38) val = null; }
      else if (t === 65528) { val = buf.readInt32LE(off); if (val > 2147483620) val = null; }
      else if (t === 65529) { val = buf.readInt16LE(off); if (val > 32740) val = null; }
      else if (t === 65530) { val = buf.readInt8(off); if (val > 100) val = null; }
      if (val != null && /^%t?d/.test(formats[k]) && typeof val === 'number') val = stataDate(val);
      row[names[k]] = val;
      off += width(t);
    }
    rows.push(row);
  }
  return { names, formats, rows };
}
