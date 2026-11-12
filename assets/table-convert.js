/*
 * JSON / HTML table / pasted TSV-CSV -> clean CSV.
 * Pure functions, no DOM and no network: the same file runs in the page and in Node tests.
 * Depends on CsvFixer (assets/csv-fixer.js) for CSV parsing, serializing and UTF-8 encoding.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./csv-fixer.js"));
  else root.TableConvert = factory(root.CsvFixer);
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";

  var MAX_SPAN = 1000;

  // ---------------------------------------------------------------- JSON
  // A small strict JSON parser. Compared with JSON.parse it
  //  - keeps object key order exactly as written (JS objects move "2" before "b"),
  //  - keeps numbers as their source text, so 12345678901234567890 and 1.50 are not rounded,
  //  - reports the same line/column in every browser.

  function JObj() {
    this.keys = [];
    this.map = Object.create(null);
  }
  JObj.prototype.set = function (k, v) {
    if (!(k in this.map)) this.keys.push(k);
    this.map[k] = v;
  };

  function JNum(raw) {
    this.raw = raw;
  }

  function JsonError(message, index, text) {
    var line = 1;
    var col = 1;
    for (var i = 0; i < index && i < text.length; i++) {
      if (text[i] === "\n") {
        line++;
        col = 1;
      } else col++;
    }
    this.code = "invalid_json";
    this.detail = message;
    this.line = line;
    this.column = col;
    this.index = index;
    this.message = "Invalid JSON at line " + line + ", column " + col + ": " + message;
  }

  function parseJson(text) {
    var i = 0;
    var n = text.length;
    if (text.charCodeAt(0) === 0xfeff) i = 1;

    function fail(msg) {
      throw new JsonError(msg, i, text);
    }
    function ws() {
      while (i < n) {
        var c = text[i];
        if (c === " " || c === "\t" || c === "\n" || c === "\r") i++;
        else break;
      }
    }
    function describe() {
      return i >= n ? "end of input" : "'" + text[i] + "'";
    }
    function value() {
      ws();
      if (i >= n) fail("unexpected end of input");
      var c = text[i];
      if (c === "{") return object();
      if (c === "[") return array();
      if (c === '"') return string();
      if (c === "-" || (c >= "0" && c <= "9")) return number();
      if (text.startsWith("true", i)) {
        i += 4;
        return true;
      }
      if (text.startsWith("false", i)) {
        i += 5;
        return false;
      }
      if (text.startsWith("null", i)) {
        i += 4;
        return null;
      }
      if (c === "'") fail("strings must use double quotes");
      fail("unexpected " + describe());
    }
    function object() {
      var o = new JObj();
      i++;
      ws();
      if (text[i] === "}") {
        i++;
        return o;
      }
      for (;;) {
        ws();
        if (text[i] !== '"') {
          if (text[i] === "}") fail("trailing comma before '}'");
          fail("expected a double-quoted property name, found " + describe());
        }
        var k = string();
        ws();
        if (text[i] !== ":") fail("expected ':' after property name, found " + describe());
        i++;
        o.set(k, value());
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return o;
        }
        fail("expected ',' or '}', found " + describe());
      }
    }
    function array() {
      var a = [];
      i++;
      ws();
      if (text[i] === "]") {
        i++;
        return a;
      }
      for (;;) {
        ws();
        if (text[i] === "]") fail("trailing comma before ']'");
        a.push(value());
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return a;
        }
        fail("expected ',' or ']', found " + describe());
      }
    }
    function string() {
      var start = i;
      i++;
      var out = "";
      while (i < n) {
        var c = text[i];
        if (c === '"') {
          i++;
          return out;
        }
        if (c === "\\") {
          var e = text[i + 1];
          if (e === "u") {
            var hex = text.substr(i + 2, 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("bad \\u escape");
            out += String.fromCharCode(parseInt(hex, 16));
            i += 6;
            continue;
          }
          var map = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
          if (!(e in map)) fail("bad escape \\" + (e || ""));
          out += map[e];
          i += 2;
          continue;
        }
        if (c < " ") fail("control character inside a string (use \\n for a newline)");
        out += c;
        i++;
      }
      i = start;
      fail("unterminated string");
    }
    function number() {
      var m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
      if (!m) fail("bad number");
      i += m[0].length;
      return new JNum(m[0]);
    }

    ws();
    if (i >= n) fail("empty input");
    var v = value();
    ws();
    if (i < n) fail("unexpected " + describe() + " after the JSON value");
    return v;
  }

  function isObj(v) {
    return v instanceof JObj;
  }

  function scalar(v) {
    if (v === null || v === undefined) return "";
    if (v instanceof JNum) return v.raw;
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v);
  }

  function stringify(v) {
    if (isObj(v))
      return (
        "{" +
        v.keys
          .map(function (k) {
            return JSON.stringify(k) + ":" + stringify(v.map[k]);
          })
          .join(",") +
        "}"
      );
    if (Array.isArray(v)) return "[" + v.map(stringify).join(",") + "]";
    if (v instanceof JNum) return v.raw;
    return JSON.stringify(v);
  }

  /*
   * Flatten rule (stable, documented in README):
   *  - nested object keys are joined with "." : {"a":{"b":1}} -> a.b
   *  - arrays, arrayMode "index" (default): tags.0, tags.1, items.0.sku ...
   *    arrayMode "json": the whole array is kept as compact JSON text in one cell
   *  - empty object / empty array -> one empty cell under its own key, unless other rows
   *    have children under that key (then the row just leaves those columns empty)
   *  - null -> empty cell, true/false -> "true"/"false", numbers keep their source text
   */
  function flatten(v, prefix, out, arrayMode) {
    if (isObj(v)) {
      if (!v.keys.length) {
        if (prefix) out.push([prefix, "", true]);
        return;
      }
      v.keys.forEach(function (k) {
        flatten(v.map[k], prefix ? prefix + "." + k : k, out, arrayMode);
      });
      return;
    }
    if (Array.isArray(v)) {
      if (!v.length) {
        out.push([prefix || "value", "", true]);
        return;
      }
      if (arrayMode === "json") {
        out.push([prefix || "value", stringify(v)]);
        return;
      }
      v.forEach(function (item, idx) {
        flatten(item, prefix ? prefix + "." + idx : String(idx), out, arrayMode);
      });
      return;
    }
    out.push([prefix || "value", scalar(v)]);
  }

  function pickRows(data) {
    // Top level array: one row per item. Top level object: one row, unless it is an
    // API-style wrapper with exactly one property holding an array of objects
    // ({"data":[...]}, {"items":[...], "total":3}) - then those objects are the rows.
    if (Array.isArray(data)) return { items: data, rootPath: "" };
    if (isObj(data)) {
      var candidates = data.keys.filter(function (k) {
        var v = data.map[k];
        return Array.isArray(v) && v.length && v.every(isObj);
      });
      if (candidates.length === 1) return { items: data.map[candidates[0]], rootPath: candidates[0] };
    }
    return { items: [data], rootPath: "" };
  }

  function jsonToTable(text, opts) {
    opts = opts || {};
    var arrayMode = opts.arrayMode === "json" ? "json" : "index";
    var data = parseJson(text);
    var picked = pickRows(data);
    var headers = [];
    var seen = Object.create(null);
    var emptyOnly = Object.create(null);
    var records = picked.items.map(function (item) {
      var pairs = [];
      flatten(item, "", pairs, arrayMode);
      var rec = Object.create(null);
      pairs.forEach(function (p) {
        if (!(p[0] in seen)) {
          seen[p[0]] = true;
          headers.push(p[0]);
          emptyOnly[p[0]] = !!p[2];
        } else if (!p[2]) emptyOnly[p[0]] = false;
        rec[p[0]] = p[1];
      });
      return rec;
    });
    // An empty [] or {} only gets its own column when no other row has children under that key
    // (so "tags": [] next to "tags": ["a"] does not add a stray "tags" column).
    headers = headers.filter(function (h) {
      if (!emptyOnly[h]) return true;
      var pre = h + ".";
      return !headers.some(function (o) {
        return o.slice(0, pre.length) === pre;
      });
    });
    var rows = records.map(function (rec) {
      return headers.map(function (h) {
        return h in rec ? rec[h] : "";
      });
    });
    return { kind: "json", headers: headers, rows: rows, rootPath: picked.rootPath };
  }

  // ---------------------------------------------------------------- HTML table

  var ENTITIES = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ensp: " ", emsp: " ", thinsp: " ",
    copy: "©", reg: "®", trade: "™", yen: "¥", euro: "€", pound: "£", cent: "¢", sect: "§",
    deg: "°", plusmn: "±", times: "×", divide: "÷", middot: "·", hellip: "…", ndash: "–", mdash: "—",
    lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", bull: "•", shy: "",
    zwj: "", zwnj: "",
  };

  function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);?/g, function (m, body) {
      if (body[0] === "#") {
        var code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        if (!isFinite(code) || code < 0 || code > 0x10ffff) return m;
        if (code === 0xa0) return " ";
        return String.fromCodePoint(code);
      }
      var key = body;
      if (key in ENTITIES) return ENTITIES[key];
      var lower = key.toLowerCase();
      if (lower in ENTITIES && /^(amp|lt|gt|quot|nbsp)$/.test(lower)) return ENTITIES[lower];
      return m;
    });
  }

  function attr(attrs, name) {
    var re = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
    var m = re.exec(attrs || "");
    if (!m) return null;
    return m[1] != null ? m[1] : m[2] != null ? m[2] : m[3];
  }

  function spanValue(attrs, name) {
    var v = parseInt(attr(attrs, name), 10);
    if (!isFinite(v) || v < 1) return 1;
    return Math.min(v, MAX_SPAN);
  }

  function hasTable(text) {
    return /<table[\s>]/i.test(text);
  }

  /*
   * Parse the first top-level <table> into a grid of strings.
   * Tolerates omitted </td>, </th>, </tr> (allowed in HTML). A table nested inside a cell is
   * flattened into that cell's text. Spans: the cell text is repeated into every grid slot it
   * covers (rowspan="0" is treated as 1; spans are capped at 1000).
   */
  function parseHtmlTable(html) {
    var src = String(html)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|template)[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<caption[\s\S]*?<\/caption\s*>/gi, "");
    var tableCount = (src.match(/<table[\s>]/gi) || []).length;
    var re = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)([^>]*)>/g;
    var depth = 0;
    var started = false;
    var done = false;
    var rows = []; // [{cells:[{text, colspan, rowspan, th}]}]
    var row = null;
    var cell = null;
    var last = 0;
    var m;
    var thead = false;
    var headRows = 0;

    function text(chunk) {
      if (!cell) return;
      cell.text += decodeEntities(chunk.replace(/[ \t\r\n\f]+/g, " "));
    }
    function closeCell() {
      if (cell && row) row.cells.push(cell);
      cell = null;
    }
    function closeRow() {
      closeCell();
      if (row) {
        rows.push(row);
        if (row.head) headRows++;
      }
      row = null;
    }

    while (!done && (m = re.exec(src))) {
      if (started) text(src.slice(last, m.index));
      last = re.lastIndex;
      var closing = m[1] === "/";
      var tag = m[2].toLowerCase();
      var attrs = m[3];
      if (tag === "table") {
        if (!closing) {
          depth++;
          if (depth === 1) started = true;
          else if (cell) cell.text += " ";
        } else if (depth > 0) {
          depth--;
          if (depth === 0) {
            closeRow();
            done = true;
          }
        }
        continue;
      }
      if (!started) continue;
      if (depth > 1) {
        if (tag === "td" || tag === "th") text(" ");
        else if (tag === "tr" || tag === "br") text(" ");
        continue;
      }
      if (tag === "thead") {
        thead = !closing;
        continue;
      }
      if (tag === "tbody" || tag === "tfoot") {
        closeRow();
        thead = false;
        continue;
      }
      if (tag === "tr") {
        if (closing) closeRow();
        else {
          closeRow();
          row = { cells: [], head: thead };
        }
        continue;
      }
      if (tag === "td" || tag === "th") {
        if (closing) {
          closeCell();
          continue;
        }
        closeCell();
        if (!row) row = { cells: [], head: thead };
        cell = { text: "", colspan: spanValue(attrs, "colspan"), rowspan: spanValue(attrs, "rowspan"), th: tag === "th" };
        continue;
      }
      if (!cell) continue;
      if (tag === "br" && !closing) cell.text += "\n";
      else if (closing && /^(p|div|li|h[1-6])$/.test(tag)) cell.text += "\n";
      else if (!closing && /^(p|div|li|h[1-6])$/.test(tag) && cell.text.replace(/\s+/g, "")) cell.text += "\n";
    }
    if (!done) closeRow();

    // Lay the cells out on a grid, honouring rowspan / colspan.
    var grid = [];
    var occupied = []; // occupied[r][c] = true
    rows.forEach(function (r, ri) {
      grid[ri] = grid[ri] || [];
      occupied[ri] = occupied[ri] || [];
      var col = 0;
      r.cells.forEach(function (c) {
        while (occupied[ri][col]) col++;
        var value = c.text
          .split("\n")
          .map(function (s) {
            return s.replace(/ {2,}/g, " ").trim();
          })
          .join("\n")
          .replace(/^\n+|\n+$/g, "")
          .replace(/\n{2,}/g, "\n");
        var rs = Math.min(c.rowspan, rows.length - ri);
        for (var dr = 0; dr < rs; dr++) {
          var rr = ri + dr;
          grid[rr] = grid[rr] || [];
          occupied[rr] = occupied[rr] || [];
          for (var dc = 0; dc < c.colspan; dc++) {
            grid[rr][col + dc] = value;
            occupied[rr][col + dc] = true;
          }
        }
        col += c.colspan;
      });
    });
    var width = 0;
    grid.forEach(function (g) {
      if (g.length > width) width = g.length;
    });
    grid = grid.map(function (g) {
      var out = [];
      for (var i = 0; i < width; i++) out.push(g[i] == null ? "" : g[i]);
      return out;
    });
    var firstAllTh = rows.length > 0 && rows[0].cells.length > 0 && rows[0].cells.every(function (c) {
      return c.th;
    });
    return { grid: grid, tableCount: tableCount, headRows: headRows, firstRowIsTh: firstAllTh };
  }

  // ---------------------------------------------------------------- helpers

  function isBlankRow(r) {
    return r.every(function (v) {
      return String(v == null ? "" : v).trim() === "";
    });
  }

  function cleanGrid(grid, trim) {
    var g = grid.map(function (r) {
      return r.map(function (v) {
        var s = v == null ? "" : String(v);
        return trim ? s.trim() : s;
      });
    });
    g = g.filter(function (r) {
      return !isBlankRow(r);
    });
    var width = 0;
    g.forEach(function (r) {
      if (r.length > width) width = r.length;
    });
    // drop trailing columns that are empty in every row (common in spreadsheet copies)
    while (width > 0 && g.every(function (r) {
      return (r[width - 1] || "") === "";
    })) width--;
    return g.map(function (r) {
      var out = [];
      for (var i = 0; i < width; i++) out.push(r[i] == null ? "" : r[i]);
      return out;
    });
  }

  // Empty headers become column_N; repeated headers get _2, _3 ...
  function uniqueHeaders(headers) {
    var used = Object.create(null);
    return headers.map(function (h, i) {
      var base = String(h == null ? "" : h).replace(/\s*\n\s*/g, " ").trim() || "column_" + (i + 1);
      var name = base;
      var k = 2;
      while (name.toLowerCase() in used) name = base + "_" + k++;
      used[name.toLowerCase()] = true;
      return name;
    });
  }

  function gridToTable(grid, header, kind) {
    if (!grid.length) return { kind: kind, headers: [], rows: [] };
    var width = grid[0].length;
    if (header) return { kind: kind, headers: uniqueHeaders(grid[0]), rows: grid.slice(1) };
    var hs = [];
    for (var i = 0; i < width; i++) hs.push("column_" + (i + 1));
    return { kind: kind, headers: hs, rows: grid };
  }

  function detectMode(text) {
    var s = String(text || "").replace(/^\uFEFF/, "").trim();
    if (!s) return "empty";
    if (s[0] === "{" || s[0] === "[") return "json";
    if (hasTable(s)) return "html";
    return "delimited";
  }

  function err(code, extra) {
    var e = { code: code };
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }

  /*
   * convert(text, { mode: "auto"|"json"|"html"|"delimited", arrayMode: "index"|"json",
   *                 header: true, trim: true })
   * -> { ok: true, kind, headers, rows, notes: [...] }   or   { ok: false, error: { code, ... } }
   */
  function convert(text, opts) {
    opts = opts || {};
    var header = opts.header !== false;
    var trim = opts.trim !== false;
    var mode = opts.mode && opts.mode !== "auto" ? opts.mode : detectMode(text);
    var src = String(text == null ? "" : text);
    if (!src.replace(/^\uFEFF/, "").trim()) return { ok: false, error: err("empty") };
    var notes = [];
    try {
      if (mode === "json") {
        var j = jsonToTable(src, opts);
        if (j.rootPath) notes.push({ code: "rootPath", path: j.rootPath });
        if (!j.headers.length) return { ok: false, error: err("no_rows") };
        return { ok: true, kind: "json", headers: j.headers, rows: j.rows, notes: notes };
      }
      if (mode === "html") {
        if (!hasTable(src)) return { ok: false, error: err("no_table") };
        var p = parseHtmlTable(src);
        if (p.tableCount > 1) notes.push({ code: "firstTable", count: p.tableCount });
        var g = cleanGrid(p.grid, trim);
        if (!g.length) return { ok: false, error: err("no_rows") };
        var t = gridToTable(g, header, "html");
        return { ok: true, kind: "html", headers: t.headers, rows: t.rows, notes: notes };
      }
      // delimited: spreadsheet copy (TSV) or CSV / semicolon / pipe text
      var parsed = C.parseCsv(src);
      var all = [parsed.headers].concat(parsed.rows);
      var g2 = cleanGrid(all, trim);
      if (!g2.length) return { ok: false, error: err("no_rows") };
      notes.push({ code: "delimiter", delimiter: parsed.delimiter });
      var t2 = gridToTable(g2, header, "delimited");
      return { ok: true, kind: "delimited", headers: t2.headers, rows: t2.rows, notes: notes };
    } catch (e) {
      if (e instanceof JsonError)
        return { ok: false, error: err("invalid_json", { line: e.line, column: e.column, detail: e.detail, message: e.message }) };
      throw e;
    }
  }

  function toCsv(result) {
    return C.serializeCsv(result.headers, result.rows, ",");
  }

  function toBytes(result, withBom) {
    return C.encodeUtf8(toCsv(result), withBom !== false);
  }

  return {
    convert: convert,
    detectMode: detectMode,
    parseJson: parseJson,
    jsonToTable: jsonToTable,
    parseHtmlTable: parseHtmlTable,
    decodeEntities: decodeEntities,
    uniqueHeaders: uniqueHeaders,
    toCsv: toCsv,
    toBytes: toBytes,
    JsonError: JsonError,
  };
});
