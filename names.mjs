// Common English names for the covered states, by date, keyed by each state's Wikidata item (scripts/countries.mjs).
// Shared by the data build and the page. A state named here keeps its rule; any other covered state takes the name
// it is given (the page passes its own name from countries.json, never a border source's, so Cliopatria's formal names
// such as "French Fifth Republic" are not shown as the state's name).
const BY_DATE = {
  Q713750: [['1990-10-03', 'Germany'], ['0000', 'West Germany']],
  Q15180: [['1991-12-26', 'Russia'], ['0000', 'Soviet Union']],
  Q191077: [['2006-06-05', 'Serbia'], ['2003-02-04', 'Serbia and Montenegro'], ['1992-04-27', 'Federal Republic of Yugoslavia'], ['0000', 'Yugoslavia']]
};

export function displayName(key, name, date) {
  const rules = BY_DATE[key];
  if (rules) return rules.find(([from]) => date >= from)[1];
  return name;
}
