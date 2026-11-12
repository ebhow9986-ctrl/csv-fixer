# CSV Encoding Fixer

A single static page with two tools: **Fix encoding** and **JSON / table → CSV** (see below). The first tool repairs CSV files with mixed encodings (UTF-8, UTF-8 BOM, Shift_JIS, GB18030/GBK, Windows-1252 / CP1252, and a few relatives). You drop one or more files, check a preview, override the encoding if the guess is wrong, optionally merge files that already share the same headers, and download UTF-8 — with or without a BOM for Excel on Windows.

**Files never leave the browser.** There is no server, no account, and no tracking or analytics script. Detection and conversion run in JavaScript with `TextDecoder`.

This is a free companion to [sheetstack-lite](https://github.com/ebhow9986-ctrl/sheetstack-lite) (command-line merge and clean) and the paid [Sheetstack](https://ebhow.gumroad.com/l/sheetstack) toolkit (chunked reads, split, Excel summary). The page itself does not claim Google Sheets or WPS compatibility.

## Use it locally

Open `index.html` in a current desktop browser (Chrome, Firefox, Edge, or Safari). You do not need to build anything.

1. Drop or choose one or more `.csv` files.
2. Confirm the detected encoding, or pick another one and watch the preview.
3. Optional: turn on “Merge files that share the same headers.” Different headers are not forced together (that is what sheetstack-lite’s `--normalize-headers` is for).
4. Download UTF-8. A BOM is on by default so Excel on Windows does not mojibake CJK text. Several outputs are packed into an uncompressed zip, still built in the browser.

The interface is English by default, with a 日本語 / 中文 toggle (stored only in `localStorage` on your machine).

## Tab 2: JSON / table → CSV

The second tab (“JSON / table → CSV”, or open `index.html#json`) turns pasted text into a clean CSV. Nothing is uploaded; it is the same static page.

Paste one of:

- **JSON**: an object, an array of objects, or nested objects. An API wrapper with exactly one array of objects (`{"data": [...], "total": 3}`) uses that array as the rows.
- **An HTML `<table>`**: copied from a web page or admin screen. When you paste with Ctrl+V, the page uses the clipboard's HTML version if it contains a table, so merged cells are kept. Ctrl+Shift+V pastes plain text instead.
- **Cells copied from a spreadsheet** (tab-separated), or CSV / semicolon / pipe text.

Input type is auto-detected (`{`/`[` → JSON, `<table` → HTML, anything else → delimited text) and can be forced with the “Input type” menu.

Rules, kept stable so the same input always gives the same columns:

- Nested keys are joined with a dot: `{"user": {"name": "Aiko"}}` → `user.name`.
- Arrays, default: one column per item, `tags.0`, `tags.1`, `items.0.sku`. Option: keep the whole array as compact JSON text in one cell.
- Columns are in first-seen order across all rows. A row missing a key gets an empty cell.
- `null` → empty, `true`/`false` → `true`/`false`. Numbers keep their exact source text (`12345678901234567890` and `1.50` are not rounded), and object key order is kept as written. The page uses its own small JSON parser for this.
- An empty `[]` or `{}` gets an empty cell under its own key, unless other rows have values under that key.
- Invalid JSON shows the line, column, and reason (for example `trailing comma before '}'`). Single quotes, comments and trailing commas are rejected as in standard JSON.
- HTML: `rowspan` / `colspan` copy the cell text into every cell they cover. `<br>` and block tags become line breaks inside the cell; entities are decoded; `<script>`, `<style>` and `<caption>` are ignored.
- Tables and TSV: the first row is the header by default (switch off to get `column_1`, `column_2`…). Empty header names become `column_N` and repeats get `_2`, `_3`. With “Trim” on (default), cell spaces are trimmed, blank rows are removed, and trailing empty columns are dropped.

Output is comma-separated UTF-8 with CRLF line endings, quoting fields that contain quotes, commas or line breaks. The BOM setting is shared with the first tab and is on by default. You can also copy the CSV to the clipboard.

## Folder

```
index.html
README.md
assets/style.css
assets/csv-fixer.js   # encoding, CSV, UTF-8, zip — used by the page and by tests
assets/table-convert.js # JSON flatten, HTML table / TSV parse → CSV — used by the page and by tests
assets/app.js         # UI for both tabs (EN / 日本語 / 中文)
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

And for the JSON / table tab (no sample files needed): nested JSON flattening, arrays of objects, array modes, API wrappers, exact big numbers, invalid JSON messages with line/column, empty input, HTML tables with entities / `<br>` / omitted closing tags / nested tables, rowspan and colspan, TSV pasted from a spreadsheet, quote/comma/newline escaping with a round trip, BOM on/off bytes, header de-duplication, and that every UI string exists in EN / 日本語 / 中文.

All tests must print `OK`; the script exits non-zero on the first failure.

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
- JSON / table tab: everything is in memory in a text box, so it is meant for pasted snippets up to a few MB, not huge exports. Only the first `<table>` is converted (the status line says how many were found). A table nested inside a cell becomes plain text in that cell. Spans are capped at 1000 and `rowspan="0"` is treated as 1. Keys that already contain a dot are not escaped, so `{"a.b": 1}` and `{"a": {"b": 1}}` both give `a.b`. Very wide arrays produce many columns; use the “Keep as JSON text” option for those. Output is always comma-separated UTF-8; Shift_JIS export is not offered. Excel may still show long digit strings in scientific notation when it opens the file; the CSV itself keeps every digit.

## License

MIT, same spirit as sheetstack-lite. Sample CSVs used in tests are fictional and live in the sheetstack-lite repository.
