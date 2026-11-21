// Prints the structure of Archigos's file so the build script can map its fields.
//   node scripts/inspect.mjs   (needs raw/Archigos_4.1_stata14.dta)
// Since 20 November 2026 the borders come from Cliopatria, whose fields scripts/build-borders.mjs names; CShapes is no
// longer read.
import { readDta } from './read-dta.mjs';

const { names, formats, rows } = readDta(new URL('../raw/Archigos_4.1_stata14.dta', import.meta.url));
console.log('Archigos fields:', names.map((n, i) => `${n}(${formats[i]})`).join(' '));
console.log('rows:', rows.length);
console.log(rows.filter(r => r.idacr === 'UKG').slice(-3));
console.log(rows.filter(r => r.ccode === 365 && r.startdate > '1920').slice(0, 3));
