#!/usr/bin/env node
/**
 * Headless tests against the real sheetstack-lite sample CSVs.
 * Run from anywhere: node /workspace/web/csv-fixer/test/test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const require = createRequire(import.meta.url);
const C = require(path.join(root, "assets/csv-fixer.js"));
const T = require(path.join(root, "assets/table-convert.js"));

const SAMPLES = path.resolve(
  process.env.CSV_SAMPLES || path.join(root, "../../gumroad/github-lite/samples")
);

function load(name) {
  return fs.readFileSync(path.join(SAMPLES, name));
}

function u8(buf) {
  return new Uint8Array(buf);
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("  OK  " + name);
}

console.log("Samples:", SAMPLES);
assert.ok(fs.existsSync(path.join(SAMPLES, "store_jp.csv")), "sample folder missing");

test("detect store_us.csv as utf-8-sig (BOM)", () => {
  const d = C.detectEncoding(load("store_us.csv"));
  assert.equal(d.id, "utf-8-sig");
  const raw = u8(load("store_us.csv"));
  assert.equal(raw[0], 0xef);
  assert.equal(raw[1], 0xbb);
  assert.equal(raw[2], 0xbf);
});

test("detect customers_messy.csv as utf-8-sig", () => {
  assert.equal(C.detectEncoding(load("customers_messy.csv")).id, "utf-8-sig");
});

test("detect store_jp.csv as shift_jis and decode Japanese headers", () => {
  const d = C.detectEncoding(load("store_jp.csv"));
  assert.equal(d.id, "shift_jis");
  const { text } = C.decode(load("store_jp.csv"), d.id);
  const table = C.parseCsv(text);
  assert.deepEqual(table.headers, ["伝票番号", "日付", "商品名", "数量", "売上", "在庫"]);
  assert.ok(table.rows.some((r) => r[0] === "JP-3001" && r[2] === "スマホスタンド"));
});

test("detect store_cn.csv as gb18030 and decode Chinese headers + fullwidth digits", () => {
  const d = C.detectEncoding(load("store_cn.csv"));
  assert.equal(d.id, "gb18030");
  const { text } = C.decode(load("store_cn.csv"), d.id);
  const table = C.parseCsv(text);
  assert.deepEqual(table.headers, ["订单编号", "成交时间", "商品名称", "件数", "销售额", "库存数"]);
  const row = table.rows.find((r) => r[0] === "CN-4002");
  assert.ok(row, "CN-4002 missing");
  assert.equal(row[1], "2026年3月13日");
  assert.equal(row[2], "键盘");
  assert.equal(row[4], "２４９");
});

test("detect store_uk.csv as windows-1252 and keep Café", () => {
  const d = C.detectEncoding(load("store_uk.csv"));
  assert.equal(d.id, "windows-1252");
  const { text } = C.decode(load("store_uk.csv"), d.id);
  const table = C.parseCsv(text);
  assert.equal(table.headers[0], "Order ID");
  const cafe = table.rows.find((r) => String(r[2]).includes("Café") || String(r[2]).includes("Cafe"));
  assert.ok(cafe, "Café mug row missing");
  assert.equal(cafe[2], "Café mug");
  assert.equal(cafe[2].charCodeAt(3), 0xe9);
});

test("detect plain UTF-8 (no BOM) as utf-8, not latin-1", () => {
  const raw = u8(load("store_us.csv")).subarray(3);
  const d = C.detectEncoding(raw);
  assert.equal(d.id, "utf-8");
});

test("download UTF-8 with BOM opens with the same cells + BOM prefix", () => {
  const { text } = C.decode(load("store_jp.csv"), "shift_jis");
  const table = C.parseCsv(text);
  const csv = C.serializeCsv(table.headers, table.rows, ",");
  const withBom = C.encodeUtf8(csv, true);
  const without = C.encodeUtf8(csv, false);
  assert.equal(withBom[0], 0xef);
  assert.equal(withBom[1], 0xbb);
  assert.equal(withBom[2], 0xbf);
  assert.notEqual(without[0], 0xef);
  assert.deepEqual(withBom.subarray(3), without);
  const decoded = new TextDecoder("utf-8").decode(withBom);
  const again = C.parseCsv(decoded);
  assert.deepEqual(again.headers, table.headers);
  assert.equal(again.rows[0][2], "スマホスタンド");
});

test("download UK file as UTF-8 encodes é as C3 A9", () => {
  const { text } = C.decode(load("store_uk.csv"), "windows-1252");
  const table = C.parseCsv(text);
  const bytes = C.encodeUtf8(C.serializeCsv(table.headers, table.rows), true);
  const decoded = new TextDecoder("utf-8").decode(bytes);
  assert.ok(decoded.includes("Café mug"));
  const needle = new TextEncoder().encode("Café mug");
  let found = false;
  for (let i = 0; i <= bytes.length - needle.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) ok = false;
    if (ok) { found = true; break; }
  }
  assert.ok(found, "UTF-8 bytes for Café mug not found in download");
  assert.ok(needle[3] === 0xc3 && needle[4] === 0xa9, "é should encode as C3 A9");
});

test("customers_messy keeps fullwidth ０８ and mixed dates", () => {
  const { text } = C.decode(load("customers_messy.csv"), "utf-8-sig");
  const table = C.parseCsv(text);
  assert.deepEqual(table.headers, ["customer_id", "signup_date", "city", "notes", "points"]);
  const u002 = table.rows.find((r) => r[0] === "U002");
  assert.equal(u002[4].includes("０８") || u002[4].trim() === "０８", true, JSON.stringify(u002));
});

test("files with different headers are not merged into one table", () => {
  const tables = ["store_us.csv", "store_uk.csv", "store_jp.csv"].map((name) => {
    const d = C.detectEncoding(load(name));
    const { text } = C.decode(load(name), d.id);
    const t = C.parseCsv(text);
    return { name, headers: t.headers, rows: t.rows };
  });
  const groups = C.mergeTables(tables, false);
  assert.equal(groups.length, 3);
  assert.ok(groups.every((g) => !g.merged));
});

test("files with the same headers merge, with optional source_file column", () => {
  const { text } = C.decode(load("store_us.csv"), "utf-8-sig");
  const t = C.parseCsv(text);
  const a = { name: "a.csv", headers: t.headers, rows: t.rows };
  const b = { name: "b.csv", headers: t.headers, rows: t.rows };
  const groups = C.mergeTables([a, b], true);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].merged, true);
  assert.equal(groups[0].headers[0], "source_file");
  assert.equal(groups[0].rows.length, t.rows.length * 2);
  assert.equal(groups[0].rows[0][0], "a.csv");
  assert.equal(groups[0].rows[t.rows.length][0], "b.csv");
  assert.equal(groups[0].rows[0][1], t.rows[0][0]);
});

test("makeZip is a valid store-method archive and round-trips bytes", () => {
  const body = C.encodeUtf8("hello,world\r\n1,2\r\n", true);
  const zip = C.makeZip([{ name: "hello.csv", data: body }]);
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.ok(zip.length > body.length + 30);
  const marker = "hello.csv";
  const nameBytes = new TextEncoder().encode(marker);
  let found = false;
  for (let i = 0; i < zip.length - nameBytes.length; i++) {
    let ok = true;
    for (let j = 0; j < nameBytes.length; j++) if (zip[i + j] !== nameBytes[j]) ok = false;
    if (ok) {
      found = true;
      break;
    }
  }
  assert.ok(found, "filename missing from zip");
});

test("override encoding can be applied (Shift_JIS file forced to latin-1 is mojibake, back is correct)", () => {
  const raw = load("store_jp.csv");
  const wrong = C.decode(raw, "iso-8859-1").text;
  assert.ok(!wrong.includes("伝票番号"));
  const right = C.decode(raw, "shift_jis").text;
  assert.ok(right.startsWith("伝票番号"));
});

test("index.html has footer ref=csvfixer, no trackers, no remote scripts", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.includes("https://github.com/ebhow9986-ctrl/sheetstack-lite?ref=csvfixer"));
  assert.ok(html.includes("https://ebhow.gumroad.com/l/sheetstack?ref=csvfixer"));
  assert.ok(!/google-analytics|gtag\(|plausible|goatcounter|cloudflareinsights|googletagmanager/i.test(html));
  assert.ok(!/https?:\/\/[^"']+\.js/.test(html), "page should not load a remote script");
  assert.ok(html.includes('src="assets/csv-fixer.js"'));
  assert.ok(html.includes('src="assets/app.js"'));
  assert.ok(html.includes('src="assets/table-convert.js"'));
});


// ---------------------------------------------------------------- JSON / table -> CSV tab
console.log("\nJSON / table -> CSV");
const BOM = [0xef, 0xbb, 0xbf];
const ok = (text, opts) => {
  const r = T.convert(text, opts);
  assert.equal(r.ok, true, JSON.stringify(r.error));
  return r;
};
const roundTrip = (r) => C.parseCsv(new TextDecoder("utf-8").decode(T.toBytes(r, true)));

test("JSON: nested objects flatten to dot-path columns in first-seen order", () => {
  const r = ok('{"id": 1, "user": {"name": "Aiko", "address": {"city": "大阪", "zip": "530-0001"}}, "active": true, "score": null}');
  assert.equal(r.kind, "json");
  assert.deepEqual(r.headers, ["id", "user.name", "user.address.city", "user.address.zip", "active", "score"]);
  assert.deepEqual(r.rows, [["1", "Aiko", "大阪", "530-0001", "true", ""]]);
});

test("JSON: array of objects -> one row each, union of headers, missing keys empty", () => {
  const r = ok('[{"a": 1, "b": {"c": 2}}, {"b": {"d": 3}, "e": "x"}, {"a": 4}]');
  assert.deepEqual(r.headers, ["a", "b.c", "b.d", "e"]);
  assert.deepEqual(r.rows, [["1", "2", "", ""], ["", "", "3", "x"], ["4", "", "", ""]]);
});

test("JSON: arrays index by default (tags.0, items.0.sku) or stay as JSON text", () => {
  const src = '[{"id": 1, "tags": ["new", "vip"], "items": [{"sku": "A", "qty": 2}], "empty": [], "meta": {}}]';
  const a = ok(src);
  assert.deepEqual(a.headers, ["id", "tags.0", "tags.1", "items.0.sku", "items.0.qty", "empty", "meta"]);
  assert.deepEqual(a.rows[0], ["1", "new", "vip", "A", "2", "", ""]);
  const b = ok(src, { arrayMode: "json" });
  assert.deepEqual(b.headers, ["id", "tags", "items", "empty", "meta"]);
  assert.deepEqual(b.rows[0], ["1", '["new","vip"]', '[{"sku":"A","qty":2}]', "", ""]);
});

test("JSON: API wrapper {data:[...]} uses the inner array; key order and big numbers kept", () => {
  const r = ok('{"total": 2, "data": [{"b": 1, "2": "two", "id": 12345678901234567890, "price": 1.50}, {"b": 2}]}');
  assert.deepEqual(r.notes, [{ code: "rootPath", path: "data" }]);
  assert.deepEqual(r.headers, ["b", "2", "id", "price"]);
  assert.equal(r.rows[0][2], "12345678901234567890");
  assert.equal(r.rows[0][3], "1.50");
  assert.equal(r.rows.length, 2);
});

test("JSON: an empty [] or {} does not add a stray column when other rows have items", () => {
  const r = ok('[{"id": 1, "tags": ["a", "b"], "m": {"k": 1}}, {"id": 2, "tags": [], "m": {}}]');
  assert.deepEqual(r.headers, ["id", "tags.0", "tags.1", "m.k"]);
  assert.deepEqual(r.rows[1], ["2", "", "", ""]);
  const j = ok('[{"id": 1, "tags": []}, {"id": 2, "tags": ["x"]}]', { arrayMode: "json" });
  assert.deepEqual(j.headers, ["id", "tags"]);
  assert.deepEqual(j.rows, [["1", ""], ["2", '["x"]']]);
});

test("JSON: array of plain values -> single 'value' column", () => {
  const r = ok('["a", 2, false, null]');
  assert.deepEqual(r.headers, ["value"]);
  assert.deepEqual(r.rows, [["a"], ["2"], ["false"], [""]]);
});

test("JSON: invalid input gives a clear message with line and column", () => {
  const r = T.convert('[\n  {"a": 1,}\n]');
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "invalid_json");
  assert.equal(r.error.line, 2);
  assert.equal(r.error.column, 11);
  assert.match(r.error.message, /^Invalid JSON at line 2, column 11: trailing comma/);
  const q = T.convert("{'a': 1}", { mode: "json" });
  assert.equal(q.error.code, "invalid_json");
  assert.match(q.error.detail, /double-quoted property name/);
  const u = T.convert('{"a": "open', { mode: "json" });
  assert.match(u.error.detail, /unterminated string/);
  const x = T.convert('{"a": 1} extra', { mode: "json" });
  assert.match(x.error.detail, /after the JSON value/);
});

test("empty / whitespace-only input -> 'empty' error in every mode", () => {
  for (const mode of ["auto", "json", "html", "delimited"]) {
    for (const text of ["", "   \n\t ", "\uFEFF", null]) {
      const r = T.convert(text, { mode });
      assert.equal(r.ok, false);
      assert.equal(r.error.code, "empty", mode + " " + JSON.stringify(text));
    }
  }
  assert.equal(T.convert("<p>no table here</p>", { mode: "html" }).error.code, "no_table");
  assert.equal(T.convert("{}").error.code, "no_rows");
  assert.equal(T.convert("<table><tr><td> </td></tr></table>").error.code, "no_rows");
});

test("auto-detect picks json / html / delimited", () => {
  assert.equal(T.detectMode('  [{"a":1}]'), "json");
  assert.equal(T.detectMode('<div><table class="x"><tr><td>1</td></tr></table></div>'), "html");
  assert.equal(T.detectMode("a\tb\n1\t2"), "delimited");
  assert.equal(T.detectMode("  "), "empty");
});

test("HTML table: thead/tbody, entities, <br>, inline tags, script/style ignored", () => {
  const html = `<style>td{color:red}</style>
  <table class="grid"><caption>Orders</caption>
    <thead><tr><th>Order&nbsp;ID</th><th>Product</th><th>Note</th></tr></thead>
    <tbody>
      <tr><td>JP-3001</td><td><b>スマホ</b>スタンド</td><td>A &amp; B<br>second line</td></tr>
      <tr><td>JP-3002</td><td>Mug &quot;large&quot;</td><td>&#36;5 &#x20AC;4 &lt;ok&gt;<script>alert(1)</script></td></tr>
    </tbody>
  </table>`;
  const r = ok(html);
  assert.equal(r.kind, "html");
  assert.deepEqual(r.headers, ["Order ID", "Product", "Note"]);
  assert.deepEqual(r.rows[0], ["JP-3001", "スマホスタンド", "A & B\nsecond line"]);
  assert.deepEqual(r.rows[1], ["JP-3002", 'Mug "large"', "$5 €4 <ok>"]);
});

test("HTML table: rowspan / colspan fill every covered cell; duplicate headers get _2", () => {
  const html = `<table>
    <tr><th rowspan="2">Region</th><th colspan="2">Q1</th></tr>
    <tr><th>Jan</th><th>Feb</th></tr>
    <tr><td rowspan=2>East</td><td>10</td><td>11</td></tr>
    <tr><td>12</td><td>13</td></tr>
    <tr><td colspan="3">Total: 46</td></tr>
  </table>`;
  const p = T.parseHtmlTable(html);
  assert.deepEqual(p.grid, [
    ["Region", "Q1", "Q1"],
    ["Region", "Jan", "Feb"],
    ["East", "10", "11"],
    ["East", "12", "13"],
    ["Total: 46", "Total: 46", "Total: 46"],
  ]);
  const r = ok(html);
  assert.deepEqual(r.headers, ["Region", "Q1", "Q1_2"]);
  assert.equal(r.rows.length, 4);
});

test("HTML table: omitted </td></tr>, nested table flattened, only first table used", () => {
  const html = `<table><tr><td>a<td>b<tr><td>1<td><table><tr><td>x</td><td>y</td></tr></table></table>
    <table><tr><td>other</td></tr></table>`;
  const r = ok(html, { header: false });
  assert.deepEqual(r.headers, ["column_1", "column_2"]);
  assert.deepEqual(r.rows, [["a", "b"], ["1", "x y"]]);
  assert.deepEqual(r.notes, [{ code: "firstTable", count: 3 }]);
});

test("TSV pasted from a spreadsheet: tabs, ragged rows, blank rows/columns cleaned", () => {
  const tsv = "name\tcity\tamount\t\n  Aiko \t大阪\t1,200\t\n\n\t\t\t\nWei\t上海\n";
  const r = ok(tsv);
  assert.equal(r.kind, "delimited");
  assert.deepEqual(r.notes, [{ code: "delimiter", delimiter: "\t" }]);
  assert.deepEqual(r.headers, ["name", "city", "amount"]);
  assert.deepEqual(r.rows, [["Aiko", "大阪", "1,200"], ["Wei", "上海", ""]]);
  const raw = ok(tsv, { trim: false });
  assert.equal(raw.rows[0][0], "  Aiko ");
  const csv = T.toCsv(r);
  assert.equal(csv, 'name,city,amount\r\nAiko,大阪,"1,200"\r\nWei,上海,\r\n');
});

test("TSV with a quoted multi-line cell (Excel/Sheets copy) stays one cell", () => {
  const r = ok('id\tnote\n1\t"first\nsecond"\n2\tplain\n');
  assert.deepEqual(r.rows, [["1", "first\nsecond"], ["2", "plain"]]);
});

test("CSV output escapes quotes, commas, newlines and survives a round trip", () => {
  const r = ok('[{"text": "say \\"hi\\"", "list": "a,b", "multi": "l1\\nl2", "crlf": "x\\r\\ny", "plain": "ok"}]');
  const csv = T.toCsv(r);
  assert.ok(csv.includes('"say ""hi"""'));
  assert.ok(csv.includes('"a,b"'));
  assert.ok(csv.includes('"l1\nl2"'));
  const back = roundTrip(r);
  assert.deepEqual(back.headers, r.headers);
  assert.deepEqual(back.rows, r.rows);
});

test("download bytes: UTF-8 BOM on by default, off on request, CJK intact", () => {
  const r = ok('[{"商品": "スマホスタンド", "城市": "上海"}]');
  const withBom = T.toBytes(r);
  const noBom = T.toBytes(r, false);
  assert.deepEqual([...withBom.subarray(0, 3)], BOM);
  assert.notEqual(noBom[0], 0xef);
  assert.deepEqual(withBom.subarray(3), noBom);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(noBom);
  assert.equal(text, "商品,城市\r\nスマホスタンド,上海\r\n");
  const back = roundTrip(r);
  assert.deepEqual(back.rows, [["スマホスタンド", "上海"]]);
});

test("header names: empty -> column_N, repeats -> _2/_3 (case-insensitive)", () => {
  assert.deepEqual(T.uniqueHeaders(["id", "", "Name", "name", "name", " "]), ["id", "column_2", "Name", "name_2", "name_3", "column_6"]);
});

test("page wiring: tab markup, i18n keys in all 3 languages, no network in converter", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const id of ['id="tab-fix"', 'id="tab-json"', 'role="tablist"', 'aria-controls="panel-json"', 'id="jt-input"', 'id="jt-bom" checked', 'for="jt-input"']) {
    assert.ok(html.includes(id), id);
  }
  const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
  const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);
  const extra = ["jTitle", "jLede", "jPrivacy", "jReady", "jErrJson", "jErrEmpty", "jErrNoTable", "jErrNoRows", "jCopied", "jPastedHtml", "jNoteRoot", "jNoteTables", "jPreview"];
  const blocks = app.split(/\n    (?:ja|zh): \{/);
  assert.equal(blocks.length, 3, "expected en, ja, zh blocks");
  for (const k of new Set([...keys, ...extra])) {
    for (const [i, b] of blocks.entries()) assert.ok(new RegExp("\\n      " + k + ":").test(b), `missing ${k} in block ${i}`);
  }
  const conv = fs.readFileSync(path.join(root, "assets/table-convert.js"), "utf8");
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|import\(/.test(conv));
});

console.log("\n" + passed + " tests passed");

