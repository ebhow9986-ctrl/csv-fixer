(function () {
  "use strict";

  var C = window.CsvFixer;
  var files = []; // { name, size, bytes, detected, encoding, table, error }
  var lang = "en";
  var T = window.TableConvert;
  var activeTab = "fix";
  var jtResult = null;
  var jtNote = "";

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
      tabsLabel: "Tool",
      tabFix: "Fix encoding",
      tabJson: "JSON / table → CSV",
      jTitle: "Turn JSON or a copied table into a clean CSV",
      jLede:
        "Paste an API response, an HTML &lt;table&gt;, or cells copied from a spreadsheet. Nested JSON is flattened to dot-path columns (user.name, items.0.sku), merged cells are filled in, and you download UTF-8 CSV. Everything runs on this page — nothing is uploaded.",
      jPrivacy: "Pasted text stays in your browser. Nothing is uploaded.",
      jInputLabel: "Paste JSON, an HTML &lt;table&gt;, or cells copied from a spreadsheet",
      jMode: "Input type",
      jModeAuto: "Auto-detect",
      jModeHtml: "HTML table",
      jModeDelim: "TSV / CSV paste",
      jArrays: "JSON arrays",
      jArraysIndex: "One column per item (tags.0, tags.1)",
      jArraysJson: "Keep as JSON text in one cell",
      jPasteHint: "Tip: text is converted as you type. Copying from a web page keeps merged cells; press Ctrl+Shift+V to paste plain text instead.",
      jPastedHtml: "Pasted the copied HTML table, so merged cells are kept. Press Ctrl+Shift+V to paste plain text instead.",
      jHeader: "First row is the header (tables and TSV/CSV)",
      jTrim: "Trim spaces around cells and drop empty rows",
      jSample: "Try a sample",
      jCopy: "Copy CSV",
      jCopied: "CSV copied to the clipboard.",
      jReady: "{rows} rows × {cols} columns, read as {kind}. Ready to download UTF-8 CSV.",
      jKind_json: "JSON",
      jKind_html: "an HTML table",
      jKind_delimited: "{delim}-separated text",
      jDelim_tab: "tab",
      jDelim_comma: "comma",
      jDelim_semi: "semicolon",
      jDelim_pipe: "pipe",
      jNoteRoot: "Rows were taken from the “{path}” array.",
      jNoteTables: "Found {n} tables; converted the first one.",
      jErrEmpty: "Paste something to convert.",
      jErrJson: "Invalid JSON at line {line}, column {col}: {detail}",
      jErrNoTable: "No &lt;table&gt; found in the pasted HTML.",
      jErrNoRows: "Nothing to convert: no rows were found.",
      jPreview: "Preview (first 10 rows)",
      footer:
        'Need to merge mixed headers, clean dates, or handle files that are too large to open in Excel? The free <a href="https://github.com/ebhow9986-ctrl/sheetstack-lite?ref=csvfixer">sheetstack-lite</a> command-line tool covers merge and clean, and the paid <a href="https://ebhow.gumroad.com/l/sheetstack?ref=csvfixer">Sheetstack</a> toolkit adds chunked reads and an Excel summary. For batch jobs on your own machine, the <a href="https://ebhow.gumroad.com/l/csv-script-pack?ref=csvfixer">CSV/Excel script pack</a> (Python + PowerShell, pay what you want from $5) converts whole folders, merges mixed encodings, keeps leading zeros and flattens JSON. Buying it also supports this free page.',
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
      tabsLabel: "ツール",
      tabFix: "文字コード修正",
      tabJson: "JSON / 表 → CSV",
      jTitle: "JSON やコピーした表を、きれいな CSV に",
      jLede:
        "API のレスポンス、HTML の &lt;table&gt;、スプレッドシートからコピーしたセルを貼り付けてください。ネストした JSON はドット区切りの列（user.name、items.0.sku）に展開し、結合セルは埋めて、UTF-8 の CSV で保存できます。処理はこのページの中だけで、アップロードはしません。",
      jPrivacy: "貼り付けた内容はブラウザ内に留まります。アップロードしません。",
      jInputLabel: "JSON、HTML の &lt;table&gt;、またはスプレッドシートのセルを貼り付け",
      jMode: "入力の種類",
      jModeAuto: "自動判定",
      jModeHtml: "HTML の表",
      jModeDelim: "TSV / CSV の貼り付け",
      jArrays: "JSON の配列",
      jArraysIndex: "要素ごとに列を分ける（tags.0、tags.1）",
      jArraysJson: "JSON の文字列として 1 セルに入れる",
      jPasteHint: "入力するとすぐ変換されます。Web ページからコピーすると結合セルも保てます。プレーンテキストで貼るときは Ctrl+Shift+V。",
      jPastedHtml: "コピーした HTML の表を貼り付けたので、結合セルを保っています。プレーンテキストで貼るときは Ctrl+Shift+V。",
      jHeader: "1 行目を見出しにする（表と TSV/CSV）",
      jTrim: "セル前後の空白を削り、空行を除く",
      jSample: "サンプルで試す",
      jCopy: "CSV をコピー",
      jCopied: "CSV をクリップボードにコピーしました。",
      jReady: "{rows} 行 × {cols} 列（{kind}として読み込み）。UTF-8 の CSV で保存できます。",
      jKind_json: "JSON",
      jKind_html: "HTML の表",
      jKind_delimited: "{delim}区切りテキスト",
      jDelim_tab: "タブ",
      jDelim_comma: "カンマ",
      jDelim_semi: "セミコロン",
      jDelim_pipe: "パイプ",
      jNoteRoot: "「{path}」配列の要素を行にしました。",
      jNoteTables: "表が {n} 個あったため、最初の表を変換しました。",
      jErrEmpty: "変換する内容を貼り付けてください。",
      jErrJson: "JSON の誤り（{line} 行目 {col} 文字目）：{detail}",
      jErrNoTable: "貼り付けた HTML に &lt;table&gt; が見つかりません。",
      jErrNoRows: "変換できる行がありません。",
      jPreview: "プレビュー（先頭 10 行）",
      footer:
        '見出しの違うファイルの結合、日付の整形、Excel で開けない大きさのファイルには、無料のコマンドラインツール <a href="https://github.com/ebhow9986-ctrl/sheetstack-lite?ref=csvfixer">sheetstack-lite</a> と、分割読み込みや Excel サマリーのある有料の <a href="https://ebhow.gumroad.com/l/sheetstack?ref=csvfixer">Sheetstack</a> があります。フォルダ単位の一括変換や自動化には、Python と PowerShell の <a href="https://ebhow.gumroad.com/l/csv-script-pack?ref=csvfixer">CSV/Excel 文字化け・整形スクリプト集</a>（$5 から好きな金額）もあります。購入はこの無料ページの応援にもなります。',
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
      tabsLabel: "工具",
      tabFix: "修复编码",
      tabJson: "JSON / 表格 → CSV",
      jTitle: "把 JSON 或复制来的表格，变成整洁的 CSV",
      jLede:
        "粘贴 API 返回的 JSON、HTML 的 &lt;table&gt;，或从电子表格复制的单元格。嵌套 JSON 会展开成点号路径列（user.name、items.0.sku），合并单元格会被填满，然后下载 UTF-8 CSV。全部在本页完成，不会上传。",
      jPrivacy: "粘贴的内容只留在你的浏览器里，不会被上传。",
      jInputLabel: "粘贴 JSON、HTML &lt;table&gt;，或从电子表格复制的单元格",
      jMode: "输入类型",
      jModeAuto: "自动识别",
      jModeHtml: "HTML 表格",
      jModeDelim: "TSV / CSV 文本",
      jArrays: "JSON 数组",
      jArraysIndex: "每个元素一列（tags.0、tags.1）",
      jArraysJson: "作为 JSON 文本放在一个单元格",
      jPasteHint: "输入时会立即转换。从网页复制可以保留合并单元格；想粘贴纯文本请按 Ctrl+Shift+V。",
      jPastedHtml: "已粘贴复制来的 HTML 表格，合并单元格得以保留。想粘贴纯文本请按 Ctrl+Shift+V。",
      jHeader: "第一行是表头（表格和 TSV/CSV）",
      jTrim: "去掉单元格首尾空格，删除空行",
      jSample: "用示例试试",
      jCopy: "复制 CSV",
      jCopied: "CSV 已复制到剪贴板。",
      jReady: "{rows} 行 × {cols} 列（按{kind}读取）。可以下载 UTF-8 CSV。",
      jKind_json: "JSON",
      jKind_html: "HTML 表格",
      jKind_delimited: "{delim}分隔文本",
      jDelim_tab: "制表符",
      jDelim_comma: "逗号",
      jDelim_semi: "分号",
      jDelim_pipe: "竖线",
      jNoteRoot: "已把“{path}”数组中的元素作为行。",
      jNoteTables: "找到 {n} 个表格，已转换第一个。",
      jErrEmpty: "请先粘贴要转换的内容。",
      jErrJson: "JSON 有误（第 {line} 行第 {col} 列）：{detail}",
      jErrNoTable: "粘贴的 HTML 里没有找到 &lt;table&gt;。",
      jErrNoRows: "没有可转换的行。",
      jPreview: "预览（前 10 行）",
      footer:
        '如果要合并不同表头、整理日期，或处理 Excel 打不开的大文件，可以用免费的命令行工具 <a href="https://github.com/ebhow9986-ctrl/sheetstack-lite?ref=csvfixer">sheetstack-lite</a>，以及提供分块读取和 Excel 汇总的付费版 <a href="https://ebhow.gumroad.com/l/sheetstack?ref=csvfixer">Sheetstack</a>。如果要在自己电脑上批量处理整个文件夹，可以用 Python + PowerShell 的 <a href="https://ebhow.gumroad.com/l/csv-script-pack?ref=csvfixer">CSV/Excel 乱码与整理脚本包</a>（随意付费，$5 起），购买也是对这个免费页面的支持。',
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
    var onJson = activeTab === "json";
    $("hero-title").setAttribute("data-i18n", onJson ? "jTitle" : "title");
    $("hero-lede").setAttribute("data-i18n", onJson ? "jLede" : "lede");
    $("hero-privacy").setAttribute("data-i18n", onJson ? "jPrivacy" : "privacy");
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
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
    renderJson();
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


  // ------------------------------------------------------------ tabs
  var TABS = ["fix", "json"];

  function setTab(name, focus) {
    activeTab = name === "json" ? "json" : "fix";
    TABS.forEach(function (n) {
      var tab = $("tab-" + n);
      var on = n === activeTab;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      $("panel-" + n).hidden = !on;
      if (on && focus) tab.focus();
    });
    try {
      history.replaceState(null, "", activeTab === "json" ? "#json" : location.pathname + location.search);
    } catch (e) {}
    applyLang();
  }

  TABS.forEach(function (n, idx) {
    var tab = $("tab-" + n);
    tab.addEventListener("click", function () {
      setTab(n);
    });
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = TABS[(idx + 1) % TABS.length];
      else if (e.key === "ArrowLeft") next = TABS[(idx - 1 + TABS.length) % TABS.length];
      else if (e.key === "Home") next = TABS[0];
      else if (e.key === "End") next = TABS[TABS.length - 1];
      if (next) {
        e.preventDefault();
        setTab(next, true);
      }
    });
  });

  // ------------------------------------------------------------ JSON / table -> CSV
  var SAMPLE =
    '{\n  "data": [\n    {"id": 1001, "user": {"name": "Aiko", "city": "大阪"}, "tags": ["new", "vip"], "note": "says \\"hi\\", twice"},\n' +
    '    {"id": 1002, "user": {"name": "Wei", "city": "上海"}, "tags": [], "note": "line one\\nline two"},\n' +
    '    {"id": 12345678901234567890, "user": {"name": "Sam"}, "active": true}\n  ],\n  "total": 3\n}\n';

  function fmt(key, vars) {
    var s = t(key);
    Object.keys(vars || {}).forEach(function (k) {
      s = s.split("{" + k + "}").join(vars[k]);
    });
    return s;
  }

  function decodeHtml(s) {
    // i18n strings use &lt;table&gt;; status lines are set with textContent
    return String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }

  function jtOptions() {
    return {
      mode: $("jt-mode").value,
      arrayMode: $("jt-arrays").value,
      header: $("jt-header").checked,
      trim: $("jt-trim").checked,
    };
  }

  function runConvert() {
    var text = $("jt-input").value;
    if (!text.trim()) jtResult = null;
    else {
      try {
        jtResult = T.convert(text, jtOptions());
      } catch (e) {
        jtResult = { ok: false, error: { code: "internal", message: String(e && e.message ? e.message : e) } };
      }
    }
    renderJson();
  }

  var jtTimer = null;
  function scheduleConvert() {
    clearTimeout(jtTimer);
    jtTimer = setTimeout(runConvert, 150);
  }

  function errorText(e) {
    if (e.code === "empty") return t("jErrEmpty");
    if (e.code === "invalid_json") return fmt("jErrJson", { line: e.line, col: e.column, detail: e.detail });
    if (e.code === "no_table") return decodeHtml(t("jErrNoTable"));
    if (e.code === "no_rows") return t("jErrNoRows");
    return e.message || e.code;
  }

  function kindText(r) {
    if (r.kind !== "delimited") return t("jKind_" + r.kind);
    var d = "comma";
    r.notes.forEach(function (n) {
      if (n.code === "delimiter") d = { "\t": "tab", ",": "comma", ";": "semi", "|": "pipe" }[n.delimiter] || "comma";
    });
    return fmt("jKind_delimited", { delim: t("jDelim_" + d) });
  }

  function renderJson() {
    if (!T || !$("jt-status")) return;
    var box = $("jt-status");
    var wrap = $("jt-preview");
    var note = $("jt-paste-note");
    note.textContent = jtNote ? t(jtNote) : t("jPasteHint");
    wrap.innerHTML = "";
    var ok = !!(jtResult && jtResult.ok);
    $("jt-download").disabled = !ok;
    $("jt-copy").disabled = !ok;
    $("jt-arrays").disabled = jtResult ? jtResult.ok && jtResult.kind !== "json" : false;
    if (!jtResult) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    if (!ok) {
      box.textContent = errorText(jtResult.error);
      box.classList.add("is-warn");
      return;
    }
    var r = jtResult;
    var parts = [fmt("jReady", { rows: String(r.rows.length), cols: String(r.headers.length), kind: kindText(r) })];
    r.notes.forEach(function (n) {
      if (n.code === "rootPath") parts.push(fmt("jNoteRoot", { path: n.path }));
      if (n.code === "firstTable") parts.push(fmt("jNoteTables", { n: String(n.count) }));
    });
    box.textContent = parts.join(" ");
    box.classList.remove("is-warn");
    var card = document.createElement("article");
    card.className = "card";
    var caption = document.createElement("p");
    caption.className = "meta";
    caption.textContent = t("jPreview");
    card.appendChild(caption);
    var scroller = document.createElement("div");
    scroller.className = "scroll-x";
    scroller.appendChild(previewTable({ headers: r.headers, rows: r.rows }));
    card.appendChild(scroller);
    var pre = document.createElement("pre");
    pre.className = "csv-out";
    pre.setAttribute("aria-label", "CSV");
    var csv = T.toCsv({ headers: r.headers, rows: r.rows.slice(0, 10) });
    pre.textContent = csv + (r.rows.length > 10 ? "…\n" : "");
    card.appendChild(pre);
    wrap.appendChild(card);
  }

  function onJsonDownload() {
    if (!jtResult || !jtResult.ok) return;
    var withBom = $("jt-bom").checked;
    saveBlob(withBom ? "converted_utf8_bom.csv" : "converted_utf8.csv", T.toBytes(jtResult, withBom), "text/csv;charset=utf-8");
  }

  function onJsonCopy() {
    if (!jtResult || !jtResult.ok) return;
    var csv = T.toCsv(jtResult);
    var done = function () {
      $("jt-status").textContent = t("jCopied");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(csv).then(done, function () {});
  }

  if (T) {
    var jtInput = $("jt-input");
    jtInput.addEventListener("input", function () {
      jtNote = "";
      scheduleConvert();
    });
    jtInput.addEventListener("paste", function (e) {
      // Copying from a web page (or Excel) also puts an HTML version on the clipboard.
      // Prefer it when it holds a <table>, because it keeps rowspan/colspan.
      var cd = e.clipboardData;
      if (!cd) return;
      var html = cd.getData("text/html");
      if (!html || !/<table[\s>]/i.test(html)) return;
      var start = html.search(/<table[\s>]/i);
      var end = html.toLowerCase().lastIndexOf("</table>");
      var snippet = end > start ? html.slice(start, end + 8) : html.slice(start);
      e.preventDefault();
      jtInput.value = snippet;
      jtNote = "jPastedHtml";
      runConvert();
    });
    ["jt-mode", "jt-arrays", "jt-header", "jt-trim"].forEach(function (id) {
      $(id).addEventListener("change", runConvert);
    });
    // One BOM setting for both tabs (on by default).
    $("jt-bom").addEventListener("change", function () {
      $("opt-bom").checked = $("jt-bom").checked;
      updateStatus();
    });
    $("opt-bom").addEventListener("change", function () {
      $("jt-bom").checked = $("opt-bom").checked;
    });
    $("jt-sample").addEventListener("click", function () {
      jtInput.value = SAMPLE;
      jtNote = "";
      $("jt-mode").value = "auto";
      runConvert();
    });
    $("jt-clear").addEventListener("click", function () {
      jtInput.value = "";
      jtNote = "";
      jtResult = null;
      renderJson();
      jtInput.focus();
    });
    $("jt-download").addEventListener("click", onJsonDownload);
    $("jt-copy").addEventListener("click", onJsonCopy);
  }

  try {
    var saved = localStorage.getItem("csvfixer-lang");
    if (saved && I18N[saved]) lang = saved;
  } catch (e) {}
  if (location.hash === "#json") setTab("json");
  else applyLang();
})();
