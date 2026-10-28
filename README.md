# Political Retrospective

A submodule of **Retrospective Intelligence** in **PRP** (Personal Resource Planner, by JDP-Iq): https://hp-retrospective.pages.dev (also inside PRP at https://jdpi.pages.dev/#/rs/retrospective). It uses the shared PRP stylesheet and connector (`https://jdpi.pages.dev/design/prp.css`, `prp-bar.js`), light by default with a dark theme.

Move the slider from **1926 to the present**:
- **The map redraws each state's borders** as they stood at the end of that year, or today for the current year. Each country is coloured by what happened that year: new leader, irregular seizure of power, border change, or no change.
- **Clicking a country** shows who was in charge that year, how they took and left power, other office-holders, and that year's key events (elections, referendums, leadership changes, statehood and border changes). Each one links to Wikipedia, plus a "Year in [country]" page where Wikipedia has one.
- **Border changes:** if a country's borders changed during a year, **Play border changes** animates them on the map, and **Download GIF** saves the sequence as an animated GIF.
- **With no country selected,** the panel lists every key event that year across all covered countries.
- **Map and Table** are tabs: the table lists every covered state in the selected year, who was in charge and what happened, and sorts by any column. `?view=table` links straight to it; the `#y=…&c=…` hash still sets the year and country.
- **Search** finds countries, historical state names and leaders. Picking a leader jumps to their first year in office.

Coverage: the same 78 countries as Political Atlas, plus predecessor states (Weimar and Nazi Germany, West and East Germany, the Soviet Union, Czechoslovakia, Yugoslavia, the Republic of China). Colonies and mandates (for example Mandatory Palestine before 1948) weren't independent states, so they appear uncoloured.

## Data sources

| Source | Used for | Licence |
|---|---|---|
| [CShapes 2.0](https://icr.ethz.ch/data/cshapes/) (ETH Zürich) | Dated state borders, 1886–2019 (borders unchanged since 2019 are treated as current) | CC BY-NC-SA 4.0, **non-commercial use only** |
| [Archigos 4.1](https://www.rochester.edu/college/faculty/hgoemans/data.htm) (Goemans, Gleditsch & Chiozza) | Each country's effective leader to 2015, and how they entered and left office | Academic dataset; please cite Goemans, Gleditsch & Chiozza (2009) |
| [Wikidata](https://www.wikidata.org) | Leaders after 2015, heads of state and government, national elections and referendums, Wikipedia links | CC0 |
| Wikipedia | "Year in [country]" pages and article links | CC BY-SA (links only) |

## Rebuild the data

```bash
npm run build-data
```

You need `raw/CShapes-2.0.geojson` and `raw/Archigos_4.1_stata14.dta`; see the sources above. Wikidata results are cached in `build/`. The script writes `data/borders.topo.json` (about 300 KB) and `data/countries.json`.

## Test

```bash
npm test
```

This runs end-to-end tests in your installed Edge. Set `RETRO_URL` to test the live site.

## Known limits

- Archigos gives some leaders by surname only. Where Wikidata has no match, the leader links to a Wikipedia search instead of a specific article.
- After 2015, each country follows the same office Archigos tracked (head of state or head of government), so a strong leader in the other office appears under "Also in office". Example: Serbia's President Vučić since 2017.
- Election coverage depends on Wikidata. A few elections that Wikidata doesn't link to the country are missing, for example Germany's March 1933 election.
