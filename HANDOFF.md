# H&P Retrospective — handoff (25 Oct 2026, 19:40 UTC)

## Goal (from the user)
Second module in the JDP-I H&P suite, "H&P Retrospective": same map layout as Political Atlas
(C:\Users\judep\OneDrive\political-atlas — copy its index.html/styles.css/app.js patterns and JDP-I styling,
H&P cyan accent). Add a year slider along the bottom from 1926 to the present. Changing the year redraws
each country's borders for that year and updates the leadership panel. If a country's borders change more
than once within a year, offer an animation/GIF of that year's changes. Content is lightweight plain text
with links to Wikipedia for key events. Core goal: who was in charge of each country, and the key political
events, for each year. (If 100 years proves too hard, start with a decade — but the data below covers 100.)

## Done
- `scripts/countries.mjs`: 78 covered states by Gleditsch–Ward code, with Wikidata QIDs.
- `scripts/read-dta.mjs`: reader for the Archigos Stata file (works).
- `raw/CShapes-2.0.geojson` (borders 1886–2019, dated; CC BY-NC-SA 4.0) and `raw/Archigos_4.1_stata14.dta`
  (effective leaders to 2015, entry/exit manner) downloaded.
- `data/borders.topo.json` (295 KB, 434 dated shapes, properties gw/name/s/e; e=9999-12-31 means current) — built OK.
- `scripts/build-data.mjs`: full pipeline. Borders + Archigos + Wikidata P35/P6 offices work.

## Additional requests from Jude (25 Oct 2026, ~19:50 UTC). Do these after Retrospective is deployed and tested
- **Retrospective must live inside the JDP-I platform**: register it in jdpi/registry.json under the H&P suite,
  open it in the shell at https://jdpi.pages.dev/#/hp/retrospective, use jdpi-bar.js, and verify it there.
- **Country Headlines (Q suite, C:\Users\judep\OneDrive\jdpi\q\headlines.html + its Supabase/GDELT pipeline)**:
  redesign so that, for the selected country, it shows the top 3 stories from that country's 5 most popular
  newspapers/news websites (where data allows). Translate every headline into English before it is stored or shown,
  but link to the original-language article URL. Redesign the decade/archive views to compile the most popular
  stories for each year. First inspect how headlines are currently fetched (q/research-workspace.js,
  q/supabase-client.js, Supabase project rpatomxgobrljilgbmub); propose the data approach (e.g. curated top-5
  outlet list per country + RSS/GDELT + translation with the Claude API) in a short note before building.
- **Bug: Country Headlines only works for Canada — CONFIRMED (25 Oct 23:20).** Supabase project
  rpatomxgobrljilgbmub ("JP-I Q Geopolitical Data", reachable via the Supabase connector) has saved rows only for
  CA and NO in country_headline_snapshots. source_status_history shows every other country failing in the edge
  function refresh-country-headlines with "GDELT rate limited this country query", and US failing with GDELT's
  "Invalid/Unsupported Country" (name sent as unitedstatesofamerica). Earlier notes: q/headlines.html queries the GDELT
  DOC API directly from the browser on each country click with `sourcecountry:<name with spaces removed>`
  (sourceCountryTerm). GDELT accepts names (`france`, `unitedstates` return results) but returned HTTP 429
  Too Many Requests after only two test calls, so browser calls after the first country likely fail. Also check:
  names that GDELT doesn't recognise (e.g. "unitedstatesofamerica" from the geo-countries dataset; prefer FIPS
  codes or a name map), the -99 ISO codes for France/Norway/Kosovo in the geo dataset, and whether Canada only
  works because Supabase already has saved snapshots. Fix as part of the redesign: fetch and translate headlines
  server-side on a schedule (one country at a time, respecting GDELT's ~1 request per 5 s), store them in
  Supabase, and have the page read only from Supabase.
- **Double Signal automated trading — exploration only. Do NOT place or enable any live trades.** Jude wants to
  explore using Double Signal alerts (C:\Users\judep\Documents\Codex\2026-10-25\use-posthog-to-answer-a-product\outputs\double-signal)
  to trade a €200 pot via Alpaca (or eToro): on each alert spend half the pot, split equally across the stocks
  in that alert; take profit at roughly +25%; stop loss at roughly 70% of entry; on take-profit of a stock that is
  still rising, reinvest only the profit amount in it and return the rest to the pot. Build at most a design note
  and a paper-trading/backtest prototype (Alpaca paper account) with live trading off by default. Jude must make
  the decision and the switch to real money himself. Note practical constraints (Alpaca availability for EU
  residents and EUR funding, pattern-day-trader rules, halts/slippage on such volatile stocks, fractional shares).
  **Jude's confirmed rules (25 Oct, ~23:00 UTC):**
  1. Take profit when the price reaches 25% above the price that triggered the alert (alert price × 1.25),
     not 25% above our fill price.
  2. Stop loss at 12.5% below the price that triggered the alert (confirmed by Jude).
  3. On take-profit of a still-rising stock: sell, return the original stake to the pot, and re-buy the same stock
     with only the profit amount; that reinvested position follows the same take-profit/stop-loss rules.
  4. Each alert spends half of the pot's current balance, split equally across that alert's stocks.
  5. Platform: Alpaca paper trading first. Live trading stays off; Jude enables it himself if ever.

## Next steps
1. Fix `elections()` in build-data.mjs: the Wikidata elections SPARQL still times out even in batches of 6.
   Try one country QID per query, drop the P279* FILTER EXISTS and instead filter labels with a regex
   (/election|referendum/i) plus the existing sub-national exclusion regex. Then run
   `node --max-old-space-size=4096 scripts/build-data.mjs` to produce data/countries.json.
2. Front end (index.html, styles.css, app.js in this folder): d3@7.9.0 + topojson-client@3.1.0 from jsDelivr,
   link https://jdpi.pages.dev/design/jdpi.css and jdpi-bar.js (data-suite="hp" data-module="retrospective").
   Bottom slider 1926–2026 with play button; filter shapes where s <= date <= e; side panel = leaders in office
   during the year (Wikipedia links), events that year (plain text + links), and a "<year> in <country>" link.
   "Play border changes" when a country has >1 shape starting within the year; "Download GIF" via gifenc.
3. Register in C:\Users\judep\OneDrive\jdpi\registry.json under suite "hp" (id "retrospective"), push jdpi.
4. Publish: `gh repo create hp-retrospective --public --source . --push` (gh at C:\Program Files\GitHub CLI\gh.exe,
   logged in as JudePettit; set git user.name JudePettit and noreply email). Deploy on Cloudflare Pages
   (account judep92@gmail.com, signed in in the Claude built-in browser): the Cloudflare GitHub app is limited to
   selected repos at https://github.com/settings/installations/175213131 — add hp-retrospective there, then
   Workers & Pages → Create → Pages → Import Git repo → hp-retrospective, no build command, output "/".
5. Then the user wants automated tests (Playwright) written and run against every JDP-I module:
   jdpi.pages.dev shell (all routes), political-atlas.pages.dev, the Retrospective, q/calendar and q/headlines,
   the three Lovable apps (gtts-briefing-preview / world-tension-atlas / country-signal-atlas .lovable.app),
   and Double Signal when published. Report results.

## Progress log
- 25 Oct ~22:55 UTC (scheduled session "Resume H&P Retrospective build"): rewrote `elections()` in
  build-data.mjs to run one country per query, filter on the en-wiki title regex /election|referendum/, drop the
  P279* walk, and warn-and-continue on failure. A standalone test for the UK (Q145) **still returned 504 after
  65 s**, so the join `?e wdt:P17 ?country ; wdt:P585 ?date` itself is too broad for big countries. Ideas:
  query `?e wdt:P31 ?kind . ?kind wdt:P279 wd:Q40231` (one hop) per country, or use the Wikipedia category
  "Elections in <country>" / list pages via the MediaWiki API instead of SPARQL. countries.json NOT built yet.
  Jude asked to merge this session into the "Political leadership app" chat, so work was handed back there.
  No front-end files, repos or deploys were created by this session.

