# CSV Encoding Fixer

A single static page that repairs CSV files with mixed encodings (UTF-8, UTF-8 BOM, Shift_JIS, GB18030/GBK, Windows-1252 / CP1252, and a few relatives). You drop one or more files, check a preview, override the encoding if the guess is wrong, optionally merge files that already share the same headers, and download UTF-8 — with or without a BOM for Excel on Windows.

**Files never leave the browser.** There is no server, no account, and no tracking or analytics script. Detection and conversion run in JavaScript with `TextDecoder`.

This is a free companion to [sheetstack-lite](https://github.com/ebhow9986-ctrl/sheetstack-lite) (command-line merge and clean) and the paid [Sheetstack](https://ebhow.gumroad.com/l/sheetstack) toolkit (chunked reads, split, Excel summary). The page itself does not claim Google Sheets or WPS compatibility.

## Use it locally

Open `index.html` in a current desktop browser (Chrome, Firefox, Edge, or Safari). You do not need to build anything.

1. Drop or choose one or more `.csv` files.
2. Confirm the detected encoding, or pick another one and watch the preview.
3. Optional: turn on “Merge files that share the same headers.” Different headers are not forced together (that is what sheetstack-lite’s `--normalize-headers` is for).
4. Download UTF-8. A BOM is on by default so Excel on Windows does not mojibake CJK text. Several outputs are packed into an uncompressed zip, still built in the browser.

The interface is English by default, with a 日本語 / 中文 toggle (stored only in `localStorage` on your machine).

## Folder

```
index.html
README.md
assets/style.css
assets/csv-fixer.js   # encoding, CSV, UTF-8, zip — used by the page and by tests
assets/app.js
assets/favicon.svg
test/test.mjs         # Node tests against the sheetstack-lite sample CSVs
```

## Tests

From this directory, with Node 18+ (no extra packages):

```bash
node test/test.mjs
```

The suite reads the real samples in `/workspace/gumroad/github-lite/samples` (or `../../gumroad/github-lite/samples` relative to this folder, or `$CSV_SAMPLES`). It checks:

- `store_us.csv` and `customers_messy.csv` → `utf-8-sig`
- `store_jp.csv` → `shift_jis`, headers `伝票番号,日付,…`, product `スマホスタンド`
- `store_cn.csv` → `gb18030`, headers `订单编号,…`, full-width `２４９`
- `store_uk.csv` → `windows-1252`, the word `Café` (`é` becomes UTF-8 `C3 A9` on download)
- UTF-8 with and without a BOM
- Merge only when headers match
- Zip packaging

## Deploy on GitHub Pages (free)

Do not publish until you mean to. This folder is ready to be the root of a GitHub Pages site.

1. Create a public repository (for example `csv-fixer` under the same GitHub account as sheetstack-lite).
2. Copy `index.html`, `assets/`, `README.md`, and `.nojekyll` to the default branch. You can include `test/` or leave it out.
3. GitHub → Settings → Pages → Build and deployment → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. The site will be at `https://<user>.github.io/csv-fixer/` (or `https://<user>.github.io/` if the repo is `<user>.github.io`).

No build step, no GitHub Actions, and no paid plan is required for a public repo. After it is live, add the URL to the sheetstack-lite README or the Gumroad description if you want a path back.

## Measuring use without a tracker

This page on purpose does **not** include Google Analytics, Plausible, GoatCounter, or any other third-party script.

Once it is on GitHub Pages, use:

- **GitHub repo Insights → Traffic** (free). It shows unique visitors and referrers for the Pages site, with no change to the HTML. Numbers can lag by a day and are only visible to people with repo access.
- **`?ref=csvfixer` on the footer links** (already applied). Gumroad records the `ref` query on the [Sheetstack](https://ebhow.gumroad.com/l/sheetstack?ref=csvfixer) product, so you can tell visits that came from this page. GitHub may ignore `ref` on the lite repo link; it is still harmless, and Traffic will show this site as a referrer if people click through.

Do not add a counter later without a clear decision: a privacy-friendly host such as GoatCounter would be a new third-party request.

## Limits

- Work happens in memory. Very large files belong in the paid toolkit, not here.
- Header names must already match before a merge. Aliases such as `伝票番号` vs `Order ID` are not renamed.
- Delimiters sniffed from the first line: comma, semicolon, tab, or pipe.
- Encoding detection is a heuristic. You can always override it.

## License

MIT, same spirit as sheetstack-lite. Sample CSVs used in tests are fictional and live in the sheetstack-lite repository.
