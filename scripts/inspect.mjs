// Prints the structure of the raw datasets so the build script can map their fields.
import { readDta } from './read-dta.mjs';
import { readFileSync } from 'node:fs';

const { names, formats, rows } = readDta(new URL('../raw/Archigos_4.1_stata14.dta', import.meta.url));
console.log('Archigos fields:', names.map((n, i) => `${n}(${formats[i]})`).join(' '));
console.log('rows:', rows.length);
console.log(rows.filter(r => r.idacr === 'UKG').slice(-3));
console.log(rows.filter(r => r.ccode === 365 && r.startdate > '1920').slice(0, 3));

const geo = JSON.parse(readFileSync(new URL('../raw/CShapes-2.0.geojson', import.meta.url)));
console.log('CShapes features:', geo.features.length);
console.log('props:', Object.keys(geo.features[0].properties));
console.log(geo.features.filter(f => f.properties.gwcode === 255 || f.properties.gwcode === 260 || f.properties.gwcode === 265).map(f => f.properties));
