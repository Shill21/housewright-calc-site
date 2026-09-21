# housewright.app

The published Housewright site, served by GitHub Pages: the suite home, `calc/` (with its
help pages and privacy policy — the App Store's marketing, support and privacy URLs), `desktop/`
and `companion/`. Static files, no build step, no external requests.

**Do not edit here.** The source is the private `Shill21/housewright-website` repo; a release is
`tools/publish.sh <this checkout>` there, then a commit and push here. Pages serves `main`
within about a minute. `CNAME` and `.nojekyll` are kept across releases.
