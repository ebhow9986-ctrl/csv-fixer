/**
 * CSV Encoding Fixer — core (browser and Node).
 * Files are processed in memory only; this module never fetches or uploads them.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CsvFixer = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ENCODINGS = [
    { id: "utf-8-sig", label: "UTF-8 with BOM", td: "utf-8" },
    { id: "utf-8", label: "UTF-8", td: "utf-8" },
    { id: "utf-16le", label: "UTF-16 LE", td: "utf-16le" },
    { id: "utf-16be", label: "UTF-16 BE", td: "utf-16be" },
    { id: "shift_jis", label: "Shift_JIS", td: "shift_jis" },
    { id: "windows-31j", label: "Windows-31J (CP932)", td: "windows-31j" },
    { id: "gb18030", label: "GB18030", td: "gb18030" },
    { id: "gbk", label: "GBK", td: "gbk" },
    { id: "big5", label: "Big5", td: "big5" },
    { id: "euc-jp", label: "EUC-JP", td: "euc-jp" },
    { id: "windows-1252", label: "Windows-1252 (CP1252)", td: "windows-1252" },
    { id: "iso-8859-1", label: "ISO-8859-1 (Latin-1)", td: "iso-8859-1" },
  ];

  var BY_ID = {};
  ENCODINGS.forEach(function (e) {
    BY_ID[e.id] = e;
  });

  function toU8(buf) {
    if (buf instanceof Uint8Array) return buf;
    if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
    if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(buf)) return new Uint8Array(buf);
    throw new TypeError("Expected a Uint8Array or ArrayBuffer");
  }

  function startsWith(u8, bytes) {
    if (u8.length < bytes.length) return false;
    for (var i = 0; i < bytes.length; i++) if (u8[i] !== bytes[i]) return false;
    return true;
  }

  function scoreText(text) {
    if (text.indexOf("\uFFFD") !== -1) return -1000;
    var control = 0,
      pua = 0,
      kana = 0,
      hangul = 0,
      cjk = 0,
      latin = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) control++;
      else if (c >= 0xe000 && c <= 0xf8ff) pua++;
      else if (c >= 0x3040 && c <= 0x30ff) kana++;
      else if (c >= 0xac00 && c <= 0xd7af) hangul++;
      else if (c >= 0x4e00 && c <= 0x9fff) cjk++;
      else if (c < 128 && ((c >= 65 && c <= 90) || (c >= 97 && c <= 122))) latin++;
    }
    return kana * 8 + hangul * 8 + cjk * 2 + latin * 0.5 - control * 50 - pua * 20;
  }

  function tryDecode(u8, tdLabel, fatal) {
    try {
      return { ok: true, text: new TextDecoder(tdLabel, { fatal: !!fatal }).decode(u8) };
    } catch (err) {
      return { ok: false, text: "", error: err };
    }
  }

  /**
   * Detect a likely encoding for a CSV (or other text) byte buffer.
   * UTF-8 (with or without BOM) wins if the bytes are valid UTF-8.
   * Otherwise encodings are scored: kana/Hangul/CJK are preferred; U+FFFD is rejected.
   */
  function detectEncoding(buf) {
    var u8 = toU8(buf);
    if (startsWith(u8, [0xef, 0xbb, 0xbf])) {
      return { id: "utf-8-sig", label: BY_ID["utf-8-sig"].label, td: "utf-8", score: 1e9, bom: "utf-8" };
    }
    if (startsWith(u8, [0xff, 0xfe])) {
      return { id: "utf-16le", label: BY_ID["utf-16le"].label, td: "utf-16le", score: 1e9, bom: "utf-16le" };
    }
    if (startsWith(u8, [0xfe, 0xff])) {
      return { id: "utf-16be", label: BY_ID["utf-16be"].label, td: "utf-16be", score: 1e9, bom: "utf-16be" };
    }

    var utf8 = tryDecode(u8, "utf-8", true);
    if (utf8.ok) {
      return { id: "utf-8", label: BY_ID["utf-8"].label, td: "utf-8", score: scoreText(utf8.text), bom: null };
    }

    var ranked = [];
    var skip = { "utf-8": 1, "utf-8-sig": 1, "utf-16le": 1, "utf-16be": 1, "iso-8859-1": 1 };
    ENCODINGS.forEach(function (enc) {
      if (skip[enc.id]) return;
      var fatal = tryDecode(u8, enc.td, true);
      if (fatal.ok) {
        ranked.push({ id: enc.id, label: enc.label, td: enc.td, score: scoreText(fatal.text), bom: null });
        return;
      }
      var soft = tryDecode(u8, enc.td, false);
      if (soft.ok) {
        ranked.push({
          id: enc.id,
          label: enc.label,
          td: enc.td,
          score: scoreText(soft.text),
          bom: null,
          replacement: soft.text.indexOf("\uFFFD") !== -1,
        });
      }
    });
    ranked.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return 0;
    });
    if (ranked.length && ranked[0].score > -1000) return ranked[0];

    var latin = tryDecode(u8, "iso-8859-1", true);
    return {
      id: "iso-8859-1",
      label: BY_ID["iso-8859-1"].label,
      td: "iso-8859-1",
      score: latin.ok ? scoreText(latin.text) : -1e9,
      bom: null,
      fallback: true,
    };
  }

  function decode(buf, encodingId) {
    var u8 = toU8(buf);
    var enc = BY_ID[encodingId] || BY_ID[detectEncoding(u8).id];
    var text = new TextDecoder(enc.td, { fatal: false }).decode(u8);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return { id: enc.id, label: enc.label, text: text };
  }

  function sniffDelimiter(headerLine) {
    var counts = { ",": 0, ";": 0, "\t": 0, "|": 0 };
    var inQuotes = false;
    for (var i = 0; i < headerLine.length; i++) {
      var ch = headerLine[i];
      if (ch === '"') {
        if (inQuotes && headerLine[i + 1] === '"') {
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && Object.prototype.hasOwnProperty.call(counts, ch)) counts[ch]++;
    }
    var best = ",",
      n = -1;
    Object.keys(counts).forEach(function (k) {
      if (counts[k] > n) {
        n = counts[k];
        best = k;
      }
    });
    return n > 0 ? best : ",";
  }

  function parseRow(line, delim) {
    var out = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQuotes = false;
        } else cur += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === delim) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function splitRecords(text) {
    var records = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '"') {
        cur += ch;
        if (inQuotes && text[i + 1] === '"') {
          cur += text[i + 1];
          i++;
        } else inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && (ch === "\n" || ch === "\r")) {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        records.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    if (cur.length || text.length === 0) records.push(cur);
    if (records.length && records[records.length - 1] === "") records.pop();
    return records;
  }

  function parseCsv(text) {
    var records = splitRecords(text.replace(/^\uFEFF/, ""));
    if (!records.length) return { delimiter: ",", headers: [], rows: [] };
    var delimiter = sniffDelimiter(records[0]);
    var headers = parseRow(records[0], delimiter).map(function (h) {
      return h.trim();
    });
    var rows = [];
    for (var i = 1; i < records.length; i++) {
      rows.push(parseRow(records[i], delimiter));
    }
    return { delimiter: delimiter, headers: headers, rows: rows };
  }

  function needsQuotes(value, delim) {
    return /[\r\n"]/.test(value) || value.indexOf(delim) !== -1;
  }

  function escapeField(value, delim) {
    var s = value == null ? "" : String(value);
    if (needsQuotes(s, delim)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function serializeCsv(headers, rows, delim) {
    delim = delim || ",";
    var lines = [];
    lines.push(
      headers
        .map(function (h) {
          return escapeField(h, delim);
        })
        .join(delim)
    );
    rows.forEach(function (row) {
      var cells = [];
      for (var i = 0; i < headers.length; i++) cells.push(escapeField(row[i] == null ? "" : row[i], delim));
      lines.push(cells.join(delim));
    });
    return lines.join("\r\n") + "\r\n";
  }

  function encodeUtf8(text, withBom) {
    var body = new TextEncoder().encode(text);
    if (!withBom) return body;
    var out = new Uint8Array(body.length + 3);
    out[0] = 0xef;
    out[1] = 0xbb;
    out[2] = 0xbf;
    out.set(body, 3);
    return out;
  }

  function headerKey(headers) {
    return headers
      .map(function (h) {
        return String(h).trim();
      })
      .join("\u0001");
  }

  function headersEqual(a, b) {
    if (!a || !b || a.length !== b.length || a.length === 0) return false;
    for (var i = 0; i < a.length; i++) {
      if (String(a[i]).trim() !== String(b[i]).trim()) return false;
    }
    return true;
  }

  /**
   * Group tables by identical header lists. Groups of 2+ are concatenated.
   * When addSource is true, a source_file column is prepended.
   */
  function mergeTables(tables, addSource) {
    var groups = [];
    var index = {};
    tables.forEach(function (t) {
      var key = headerKey(t.headers);
      if (!index[key]) {
        index[key] = { headers: t.headers.slice(), items: [] };
        groups.push(index[key]);
      }
      index[key].items.push(t);
    });
    return groups.map(function (g) {
      if (g.items.length === 1 && !addSource) {
        return {
          headers: g.headers,
          rows: g.items[0].rows,
          sources: [g.items[0].name],
          merged: false,
        };
      }
      var headers = addSource ? ["source_file"].concat(g.headers) : g.headers;
      var rows = [];
      g.items.forEach(function (t) {
        t.rows.forEach(function (row) {
          rows.push(addSource ? [t.name || ""].concat(row) : row.slice());
        });
      });
      return {
        headers: headers,
        rows: rows,
        sources: g.items.map(function (t) {
          return t.name;
        }),
        merged: g.items.length > 1,
      };
    });
  }

  function crc32(u8) {
    var table = crc32.table;
    if (!table) {
      table = crc32.table = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
    }
    var crc = 0xffffffff;
    for (var i = 0; i < u8.length; i++) crc = table[(crc ^ u8[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(n) {
    return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  }
  function u32(n) {
    return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
  }
  function concatBytes(parts) {
    var len = 0;
    parts.forEach(function (p) {
      len += p.length;
    });
    var out = new Uint8Array(len);
    var o = 0;
    parts.forEach(function (p) {
      out.set(p, o);
      o += p.length;
    });
    return out;
  }

  /** Uncompressed ZIP (STORE). Filenames are UTF-8. */
  function makeZip(files) {
    var locals = [];
    var centrals = [];
    var offset = 0;
    var encoder = new TextEncoder();
    files.forEach(function (f) {
      var name = encoder.encode(f.name);
      var data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
      var crc = crc32(data);
      var local = concatBytes([
        u32(0x04034b50),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        name,
        data,
      ]);
      var central = concatBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]);
      locals.push(local);
      centrals.push(central);
      offset += local.length;
    });
    var localBlob = concatBytes(locals);
    var centralBlob = concatBytes(centrals);
    var end = concatBytes([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(files.length),
      u16(files.length),
      u32(centralBlob.length),
      u32(localBlob.length),
      u16(0),
    ]);
    return concatBytes([localBlob, centralBlob, end]);
  }

  function utf8Filename(name, withBom) {
    var base = String(name || "file.csv").replace(/[\\/:*?"<>|]+/g, "_");
    if (!/\.csv$/i.test(base)) base += ".csv";
    var stem = base.replace(/\.csv$/i, "");
    stem = stem.replace(/(_utf8|_utf-8|_fixed)+$/i, "");
    return stem + (withBom ? "_utf8_bom.csv" : "_utf8.csv");
  }

  return {
    ENCODINGS: ENCODINGS,
    detectEncoding: detectEncoding,
    decode: decode,
    parseCsv: parseCsv,
    serializeCsv: serializeCsv,
    encodeUtf8: encodeUtf8,
    headersEqual: headersEqual,
    headerKey: headerKey,
    mergeTables: mergeTables,
    makeZip: makeZip,
    utf8Filename: utf8Filename,
    sniffDelimiter: sniffDelimiter,
    scoreText: scoreText,
  };
});
