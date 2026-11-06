Profitability Cockpit · public edition
======================================

A browser-only profitability cockpit: forecast overview, scenario comparison, market and brand health, monthly phasing,
SKU profitability, pricing, an AI insights engine and a What-If scenario builder with a formula-driven Excel export.

This edition ships with SYNTHETIC demo data for a fictional company (Brightfield Toys). All names and numbers are made up
by tools/gen_demo.py from a seeded random model; nothing is derived from real data.

Use your own numbers
  In the page: Data → Download template (an Excel data pack filled with what is showing) → replace the numbers → Load data pack.
  The file is read in the browser only and never uploaded; a loaded pack is remembered in that browser (IndexedDB) until
  "Back to demo data".

Build
  python -I tools/gen_demo.py .     regenerate data/*.js (synthetic)
  perl build.pl                     writes dist/profitability_cockpit.html
  manifest.txt lists the files; app code between @wrap / @endwrap is wrapped in __app() so a loaded pack can restart it.

Files
  data/            synthetic datasets (var globals) + META settings (company, title, markets, FX)
  src/js/05_pack.js   data packs: template writer / reader (SheetJS from cdnjs), IndexedDB, restart
  src/js/99_start.js  start-up and the Data dialog
  src/js/*            the cockpit views (see the comments at the top of each file)
