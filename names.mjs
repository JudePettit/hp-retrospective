// Common English names for CShapes states, by date. Shared by the data build and the page.
const BY_DATE = {
  260: [['1990-10-03', 'Germany'], ['0000', 'West Germany']],
  365: [['1991-12-26', 'Russia'], ['0000', 'Soviet Union']],
  345: [['2006-06-05', 'Serbia'], ['2003-02-04', 'Serbia and Montenegro'], ['1992-04-27', 'Federal Republic of Yugoslavia'], ['0000', 'Yugoslavia']]
};
const FIXED = {
  2: 'United States', 255: 'Germany', 265: 'East Germany', 325: 'Italy', 343: 'North Macedonia',
  346: 'Bosnia and Herzegovina', 360: 'Romania', 370: 'Belarus', 640: 'Turkey', 316: 'Czechia'
};

export function displayName(gw, cshapesName, date) {
  const rules = BY_DATE[gw];
  if (rules) return rules.find(([from]) => date >= from)[1];
  return FIXED[gw] || cshapesName;
}
