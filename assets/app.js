(function () {
  "use strict";

  var C = window.CsvFixer;
  var files = []; // { name, size, bytes, detected, encoding, table, error }
  var lang = "en";

  var I18N = {
    en: {
      brand: "CSV Encoding Fixer",
      title: "Fix CSV encoding without leaving your computer",
      lede:
        "Drop one or more CSV files. This page guesses Shift_JIS, GB18030/GBK, Windows-1252, UTF-8 and UTF-8 with a BOM, shows a preview, and lets you download clean UTF-8. Files never leave the browser — there is no server and no tracking script.",
      privacy: "Files stay in your browser. Nothing is uploaded.",
      dropTitle: "Drop CSV files here, or click to choose",
      dropHint: "Several files are fine. Detection runs on this page only.",
      choose: "Choose files",
      optBom: "Add a UTF-8 BOM (recommended for Excel on Windows)",
      optMerge: "Merge files that share the same headers",
      optSource: "Add a source_file column when merging",
      clear: "Clear",
      download: "Download UTF-8",
      encoding: "Encoding",
      detected: "Detected",
      rows: "rows",
      preview: "Preview (first 10 rows)",
      empty: "No rows to preview.",
      statusOne: "Ready to download 1 UTF-8 file.",
      statusMany: "Ready to download {n} UTF-8 files as a zip.",
      statusMerge: "Ready to download 1 merged UTF-8 file from {n} inputs.",
      statusMixed: "Ready to download a zip: {merged} merged file(s) and {single} unchanged file(s).",
      noMerge: "Those files do not share the same headers, so they will be downloaded separately.",
      footer:
        'Need to merge mixed headers, clean dates, or handle files that are too large to open in Excel? The free <a href="https://github.com/ebhow9986-ctrl/sheetstack-lite?ref=csvfixer">sheetstack-lite</a> command-line tool covers merge and clean, and the paid <a href="https://ebhow.gumroad.com/l/sheetstack?ref=csvfixer">Sheetstack</a> toolkit adds chunked reads and an Excel summary.',
    },
    ja: {
      brand: "CSV 文字コード修正",
      title: "ファイルを送らずに、CSV の文字コードを直す",
      lede:
        "CSV をドロップすると、Shift_JIS、GB18030/GBK、Windows-1252、UTF-8、UTF-8 BOM を判定し、プレビューのあと UTF-8 で保存できます。処理はこのページの中だけで終わります。サーバーへは送らず、追跡用のスクリプトもありません。",
      privacy: "ファイルはブラウザ内に留まります。アップロードしません。",
      dropTitle: "CSV をここにドロップ、またはクリックして選択",
      dropHint: "複数ファイルに対応しています。判定はこのページだけで行います。",
      choose: "ファイルを選ぶ",
      optBom: "UTF-8 の BOM を付ける（Windows の Excel 向け）",
      optMerge: "見出しが同じファイルを結合する",
      optSource: "結合時に source_file 列を付ける",
      clear: "クリア",
      download: "UTF-8 でダウンロード",
      encoding: "文字コード",
      detected: "判定",
      rows: "行",
      preview: "プレビュー（先頭 10 行）",
      empty: "表示する行がありません。",
      statusOne: "UTF-8 ファイルを 1 つダウンロードできます。",
      statusMany: "UTF-8 ファイル {n} 件を zip でダウンロードできます。",
      statusMerge: "入力 {n} 件を結合した UTF-8 ファイルを 1 つダウンロードできます。",
      statusMixed: "zip でダウンロードします：結合ファイル {merged} 件、単独ファイル {single} 件。",
      noMerge: "見出しが揃っていないため、結合せず個別に保存します。",
      footer:
        '見出しの違うファイルの結合、日付の整形、Excel で開けない大きさのファイルには、無料のコマンドラインツール <a href="https://github.com/ebhow9986-ctrl/sheetstack-lite?ref=csvfixer">sheetstack-lite</a> と、分割読み込みや Excel サマリーのある有料の <a href="https://ebhow.gumroad.com/l/sheetstack?ref=csvfixer">Sheetstack</a> があります。',
    },
    zh: {
      brand: "CSV 编码修复",
      title: "不用把文件传走，也能修好 CSV 编码",
      lede:
        "拖入一个或多个 CSV。本页会尝试识别 Shift_JIS、GB18030/GBK、Windows-1252、UTF-8 以及带 BOM 的 UTF-8，显示预览，并下载整洁的 UTF-8。文件始终留在浏览器里：没有服务器，也没有跟踪脚本。",
      privacy: "文件只留在你的浏览器里，不会被上传。",
      dropTitle: "把 CSV 拖到这里，或点击选择",
      dropHint: "可以一次选多个文件。识别只在本页进行。",
      choose: "选择文件",
      optBom: "添加 UTF-8 BOM（便于 Windows 上的 Excel 打开）",
      optMerge: "合并表头相同的文件",
      optSource: "合并时加上 source_file 列",
      clear: "清除",
      download: "下载 UTF-8",
      encoding: "编码",
      detected: "识别结果",
      rows: "行",
      preview: "预览（前 10 行）",
      empty: "没有可预览的行。",
      statusOne: "可以下载 1 个 UTF-8 文件。",
      statusMany: "将把 {n} 个 UTF-8 文件打包成 zip 下载。",
      statusMerge: "将把 {n} 个输入合并为 1 个 UTF-8 文件下载。",
      statusMixed: "将下载 zip：合并文件 {merged} 个，单独文件 {single} 个。",
      noMerge: "这些文件的表头不一致，将分别下载。",
      footer:
        '如果要合并不同表头、整理日期，或处理 Excel 打不开的大文件，可以用免费的命令行工具 <a href="https://github.com/ebhow9986-ctrl/sheetstack-lite?ref=csvfixer">sheetstack-lite</a>，以及提供分块读取和 Excel 汇总的付费版 <a href="https://ebhow.gumroad.com/l/sheetstack?ref=csvfixer">Sheetstack</a>。',
    },
  };

  var $ = function (id) {
    return document.getElementById(id);
  };

  function t(key) {
    return (I18N[lang] || I18N.en)[key] || I18N.en[key] || key;
  }

  function applyLang() {
    document.documentElement.lang = lang === "ja" ? "ja" : lang === "zh" ? "zh-Hans" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var value = t(key);
      if (el.tagName === "INPUT" || el.tagName === "BUTTON") {
        if (el.tagName === "BUTTON") el.innerHTML = value;
      } else {
        el.innerHTML = value;
      }
    });
    document.querySelectorAll(".lang button").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
    });
    document.title =
      lang === "ja" ? "CSV 文字コード修正 — ブラウザ内で処理" : lang === "zh" ? "CSV 编码修复 — 在浏览器中完成" : "CSV Encoding Fixer — in your browser";
    try {
      localStorage.setItem("csvfixer-lang", lang);
    } catch (e) {}
    render();
  }

  function formatSize(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function ingest(fileList) {
    Array.prototype.forEach.call(fileList, function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        var bytes = new Uint8Array(reader.result);
        var item = { name: file.name, size: file.size, bytes: bytes, encoding: "", detected: null, table: null, error: "" };
        try {
          item.detected = C.detectEncoding(bytes);
          item.encoding = item.detected.id;
          rebuildTable(item);
        } catch (err) {
          item.error = String(err && err.message ? err.message : err);
        }
        files.push(item);
        $("workspace").classList.remove("is-hidden");
        render();
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function rebuildTable(item) {
    var decoded = C.decode(item.bytes, item.encoding);
    item.table = C.parseCsv(decoded.text);
  }

  function render() {
    var wrap = $("files");
    wrap.innerHTML = "";
    files.forEach(function (item, idx) {
      var card = document.createElement("article");
      card.className = "card";
      var head = document.createElement("div");
      head.className = "card-head";
      var title = document.createElement("h2");
      title.textContent = item.name;
      var meta = document.createElement("div");
      meta.className = "meta";
      var rowCount = item.table ? item.table.rows.length : 0;
      var det = item.detected ? item.detected.label : "—";
      meta.textContent = formatSize(item.size) + " · " + t("detected") + ": " + det + " · " + rowCount + " " + t("rows");
      head.appendChild(title);
      head.appendChild(meta);
      card.appendChild(head);

      var controls = document.createElement("div");
      controls.className = "controls";
      var lab = document.createElement("label");
      lab.textContent = t("encoding");
      var sel = document.createElement("select");
      C.ENCODINGS.forEach(function (enc) {
        var opt = document.createElement("option");
        opt.value = enc.id;
        opt.textContent = enc.label;
        if (enc.id === item.encoding) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () {
        item.encoding = sel.value;
        rebuildTable(item);
        render();
      });
      lab.appendChild(document.createTextNode(" "));
      controls.appendChild(lab);
      controls.appendChild(sel);
      card.appendChild(controls);

      if (item.error) {
        var err = document.createElement("p");
        err.className = "status is-warn";
        err.textContent = item.error;
        card.appendChild(err);
      } else if (!item.table || (!item.table.headers.length && !item.table.rows.length)) {
        var empty = document.createElement("p");
        empty.className = "meta";
        empty.textContent = t("empty");
        card.appendChild(empty);
      } else {
        var caption = document.createElement("p");
        caption.className = "meta";
        caption.textContent = t("preview");
        card.appendChild(caption);
        card.appendChild(previewTable(item.table));
      }
      wrap.appendChild(card);
      sel.setAttribute("data-index", String(idx));
    });
    updateStatus();
  }

  function previewTable(table) {
    var el = document.createElement("table");
    el.className = "preview";
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    table.headers.forEach(function (h) {
      var th = document.createElement("th");
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    el.appendChild(thead);
    var tb = document.createElement("tbody");
    table.rows.slice(0, 10).forEach(function (row) {
      var tr = document.createElement("tr");
      for (var i = 0; i < table.headers.length; i++) {
        var td = document.createElement("td");
        td.textContent = row[i] == null ? "" : String(row[i]);
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    });
    el.appendChild(tb);
    return el;
  }

  function outputs() {
    var withBom = $("opt-bom").checked;
    var doMerge = $("opt-merge").checked;
    var addSource = $("opt-source").checked;
    var tables = files
      .filter(function (f) {
        return f.table;
      })
      .map(function (f) {
        return { name: f.name, headers: f.table.headers, rows: f.table.rows, delimiter: f.table.delimiter };
      });
    if (!tables.length) return [];
    var groups = doMerge ? C.mergeTables(tables, addSource) : tables.map(function (t) {
      return { headers: t.headers, rows: t.rows, sources: [t.name], merged: false, delimiter: t.delimiter };
    });
    return groups.map(function (g, i) {
      var delim = g.delimiter || ",";
      var csv = C.serializeCsv(g.headers, g.rows, delim);
      var data = C.encodeUtf8(csv, withBom);
      var name;
      if (g.merged) {
        name = C.utf8Filename(g.sources.length === 2 ? "merged" : "merged", withBom);
        if (groups.length > 1) name = "merged_" + (i + 1) + (withBom ? "_utf8_bom.csv" : "_utf8.csv");
      } else {
        name = C.utf8Filename(g.sources[0] || "file.csv", withBom);
      }
      return { name: name, data: data, merged: g.merged, sources: g.sources };
    });
  }

  function updateStatus() {
    var box = $("status");
    if (!files.length) {
      box.hidden = true;
      $("download").disabled = true;
      return;
    }
    $("download").disabled = false;
    var outs = outputs();
    var merged = outs.filter(function (o) {
      return o.merged;
    }).length;
    var single = outs.length - merged;
    var msg;
    var warn = false;
    if ($("opt-merge").checked && merged === 0 && files.length > 1) {
      msg = t("noMerge") + " ";
      warn = true;
    } else msg = "";
    if (outs.length === 1 && merged) msg += t("statusMerge").replace("{n}", String(files.length));
    else if (outs.length === 1) msg += t("statusOne");
    else if (merged && single) msg += t("statusMixed").replace("{merged}", String(merged)).replace("{single}", String(single));
    else msg += t("statusMany").replace("{n}", String(outs.length));
    box.hidden = false;
    box.textContent = msg.trim();
    box.classList.toggle("is-warn", warn);
    $("source-wrap").style.opacity = $("opt-merge").checked ? "1" : "0.5";
  }

  function saveBlob(name, bytes, type) {
    var blob = new Blob([bytes], { type: type || "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function onDownload() {
    var outs = outputs();
    if (!outs.length) return;
    var withBom = $("opt-bom").checked;
    if (outs.length === 1) {
      saveBlob(outs[0].name, outs[0].data, "text/csv;charset=utf-8");
      return;
    }
    saveBlob(withBom ? "csv-utf8-bom.zip" : "csv-utf8.zip", C.makeZip(outs), "application/zip");
  }

  var drop = $("drop");
  var input = $("file-input");
  $("pick").addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    input.click();
  });
  drop.addEventListener("click", function (e) {
    if (e.target === $("pick")) return;
    input.click();
  });
  drop.addEventListener("dragover", function (e) {
    e.preventDefault();
    drop.classList.add("is-over");
  });
  drop.addEventListener("dragleave", function () {
    drop.classList.remove("is-over");
  });
  drop.addEventListener("drop", function (e) {
    e.preventDefault();
    drop.classList.remove("is-over");
    if (e.dataTransfer && e.dataTransfer.files) ingest(e.dataTransfer.files);
  });
  input.addEventListener("change", function () {
    ingest(input.files);
    input.value = "";
  });
  $("clear").addEventListener("click", function () {
    files = [];
    $("workspace").classList.add("is-hidden");
    render();
  });
  $("download").addEventListener("click", onDownload);
  $("opt-bom").addEventListener("change", updateStatus);
  $("opt-merge").addEventListener("change", updateStatus);
  $("opt-source").addEventListener("change", updateStatus);

  document.querySelectorAll(".lang button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      lang = btn.getAttribute("data-lang");
      applyLang();
    });
  });

  try {
    var saved = localStorage.getItem("csvfixer-lang");
    if (saved && I18N[saved]) lang = saved;
  } catch (e) {}
  applyLang();
})();
