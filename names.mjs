// Common English names for the covered states, by date, keyed by each state's Wikidata item (scripts/countries.mjs).
// Shared by the data build and the page. A state named here keeps its rule; any other covered state takes the name
// it is given (the page passes its own name from countries.json, never a border source's, so Cliopatria's formal names
// such as "French Fifth Republic" are not shown as the state's name).
const BY_DATE = {
  Q713750: [['1990-10-03', 'Germany'], ['0000', 'West Germany']],
  Q15180: [['1991-12-26', 'Russia'], ['0000', 'Soviet Union']],
  Q191077: [['2006-06-05', 'Serbia'], ['2003-02-04', 'Serbia and Montenegro'], ['1992-04-27', 'Federal Republic of Yugoslavia'], ['0000', 'Yugoslavia']],
  // Three more states that changed their names after 1926 (review retrospective-7, 25 November 2026; dates from English
  // Wikipedia, read that day): Abdulaziz proclaimed the Kingdom of Saudi Arabia on 23 September 1932, before which it
  // was the Kingdom of Hejaz and Nejd ("Kingdom of Hejaz and Nejd"); the Prespa Agreement came into force on 12 February
  // 2019, when the Republic of Macedonia became North Macedonia ("Prespa Agreement"); and the Irish Free State ended
  // when the Constitution of Ireland came into force on 29 December 1937 and the state took the name Ireland ("Irish
  // Free State").
  Q851: [['1932-09-23', 'Saudi Arabia'], ['0000', 'Hejaz and Nejd']],
  Q221: [['2019-02-12', 'North Macedonia'], ['0000', 'Macedonia']],
  Q27: [['1937-12-29', 'Ireland'], ['0000', 'Irish Free State']]
};

export function displayName(key, name, date) {
  const rules = BY_DATE[key];
  if (rules) return rules.find(([from]) => date >= from)[1];
  return name;
}
