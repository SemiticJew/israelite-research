/* js/nt-chapter.js
 * New Testament chapter reader with:
 * - Per-verse commentary (localStorage)
 * - Lexicon lookups (Strong’s; primarily Greek but supports Hebrew too)
 * - Cross references panel
 * - Modern toolbar buttons (toggle panels)
 * - Resilient fetch (absolute+relative fallbacks with diagnostics)
 *
 * Expects chapter JSON array like:
 * [{ v:number, t:string, c?:string[]|string, s?:string[] }]
 */

(function () {
  const app = {
    els: { verses: null, headerTitle: null, debug: null },
    params: new URLSearchParams(window.location.search),
    bookPath: null,   // "newtestament/matthew" (normalized)
    chapterNum: null, // e.g., "1"
    lexicons: { hebrew: null, greek: null },
    lastAttempts: [],
  };

  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v, { passive: true });
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    for (const ch of children) el.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
    return el;
  }
  const cls = (...n) => n.filter(Boolean).join(" ");

  function stripStrongs(text) {
    if (!text) return text;
    return text
      .replace(/<w[^>]*>(.*?)<\/w>/gi, "$1")
      .replace(/\[(H|G)\d{1,5}\]/g, "")
      .replace(/\{(H|G)\d{1,5}\}/g, "")
      .replace(/\u2060/g, "")
      .trim();
  }

  const keyForComment = (bookPath, chapterNum, verseNum) => `ir:comment:${bookPath}:${chapterNum}:${verseNum}`;
  const saveComment = (bp, ch, v, t) => localStorage.setItem(keyForComment(bp, ch, v), t || "");
  const loadComment = (bp, ch, v) => localStorage.getItem(keyForComment(bp, ch, v)) || "";

  function getLexEntry(id) {
    if (!id) return null;
    const up = id.toUpperCase();
    const pool = up.startsWith("H") ? app.lexicons.hebrew : up.startsWith("G") ? app.lexicons.greek : null;

    if (pool && pool[up]) return pool[up];

    if (!pool) {
      if (app.lexicons.hebrew && app.lexicons.hebrew[`H${up}`]) return app.lexicons.hebrew[`H${up}`];
      if (app.lexicons.greek && app.lexicons.greek[`G${up}`]) return app.lexicons.greek[`G${up}`];
    }
    return null;
  }

  // ---------- Fetch with fallbacks ----------
  async function fetchWithFallbacks(paths) {
    app.lastAttempts.length = 0;
    for (const url of paths) {
      try {
        app.lastAttempts.push(`${url} — TRY`);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) { app.lastAttempts.push(`${url} — HTTP ${res.status}`); continue; }
        const data = await res.json();
        app.lastAttempts.push(`${url} — OK`);
        return { data, url };
      } catch (e) {
        app.lastAttempts.push(`${url} — ${e?.message || e}`);
      }
    }
    return { data: null, url: null };
  }

  // ---------- Panels & Toolbar ----------
  function makeToolbar(verseObj, onToggle) {
    return h(
      "div",
      { class: "verse-toolbar", role: "toolbar", "aria-label": "Verse tools" },
      h("button", { class: "tool btn-xref", type: "button", "aria-expanded": "false", onClick: () => onToggle("xref") }, "Cross Refs"),
      h("button", { class: "tool btn-comment", type: "button", "aria-expanded": "false", onClick: () => onToggle("comment") }, "Comment"),
      h("button", { class: "tool btn-lex", type: "button", "aria-expanded": "false", onClick: () => onToggle("lex") }, "Lexicon"),
    );
  }

  const makePanel = (kind, contentEl) => h("div", { class: cls("panel", `panel-${kind}`), hidden: true }, contentEl);

  function fillXrefs(el, verseObj) {
    el.innerHTML = "";
    const refs = verseObj.c;
    if (!refs || (Array.isArray(refs) && refs.length === 0)) {
      el.appendChild(h("div", { class: "muted" }, "No cross references yet."));
      return;
    }
    const list = Array.isArray(refs) ? refs : [refs];
    const ul = h("ul", { class: "xref-list" });
    list.forEach((r) => ul.appendChild(h("li", {}, r)));
    el.appendChild(ul);
  }

  function fillLexicon(el, verseObj) {
    el.innerHTML = "";
    const ids = verseObj.s || [];
    if (!ids.length) {
      el.appendChild(h("div", { class: "muted" }, "No Strong’s data yet."));
      return;
    }
    const wrap = h("div", { class: "lex-wrap" });
    ids.forEach((sid) => {
      const entry = getLexEntry(sid);
      if (!entry) {
        wrap.appendChild(h("div", { class: "lex-item missing" }, `${sid}: (not found)`));
      } else {
        const head = entry.headword || entry.translit || entry.lemma || sid;
        const gloss = entry.gloss || entry.definition || entry.short || "";
        const root = entry.root || entry.etym || "";
        const strongId = entry.strong || sid;

        wrap.appendChild(
          h("div", { class: "lex-item" },
            h("div", { class: "lex-head" }, `${strongId} — ${head}`),
            gloss ? h("div", { class: "lex-gloss" }, gloss) : null,
            root ? h("div", { class: "lex-root muted" }, root) : null
          )
        );
      }
    });
    el.appendChild(wrap);
  }

  function makeCommentEl(bookPath, chapterNum, vnum) {
    const wrap = h("div", { class: "comment-wrap" });
    const ta = h("textarea", { class: "comment-box", rows: "4", placeholder: "Write your notes on this verse…" });
    ta.value = loadComment(bookPath, chapterNum, vnum);
    ta.addEventListener("input", () => saveComment(bookPath, chapterNum, vnum, ta.value));
    wrap.appendChild(ta);
    return wrap;
  }

  // ---------- Verse Row ----------
  function buildVerseRow(verseObj) {
    const verseNum = verseObj.v;
    const displayText = stripStrongs(verseObj.t);

    const row = h("section", {
      class: "verse-row",
      id: `v-${verseNum}`,
      "data-v": verseNum,
      role: "group",
      "aria-labelledby": `vlabel-${verseNum}`,
    });

    const num = h("a", { id: `vlabel-${verseNum}`, class: "verse-num", href: `#v-${verseNum}`, "aria-label": `Verse ${verseNum}` }, String(verseNum));
    const text = h("div", { class: "verse-text" }); text.innerHTML = displayText;

    const xrefContent = h("div");
    const commentContent = makeCommentEl(app.bookPath, app.chapterNum, verseNum);
    const lexContent = h("div");

    const xrefPanel = makePanel("xref", xrefContent);
    const commentPanel = makePanel("comment", commentContent);
    const lexPanel = makePanel("lex", lexContent);

    const setExpanded = (btn, expanded) => btn.setAttribute("aria-expanded", expanded ? "true" : "false");

    const toolbar = makeToolbar(verseObj, (which) => {
      const btns = {
        xref: toolbar.querySelector(".btn-xref"),
        comment: toolbar.querySelector(".btn-comment"),
        lex: toolbar.querySelector(".btn-lex"),
      };
      const panels = { xref: xrefPanel, comment: commentPanel, lex: lexPanel };

      if (which === "xref") fillXrefs(xrefContent, verseObj);
      if (which === "lex") fillLexicon(lexContent, verseObj);

      Object.entries(panels).forEach(([k, panel]) => {
        if (k === which) {
          panel.hidden = !panel.hidden;
          setExpanded(btns[k], !panel.hidden);
        } else {
          panel.hidden = true;
          setExpanded(btns[k], false);
        }
      });
    });

    const header = h("div", { class: "verse-header" }, num, text);
    const tools = h("div", { class: "verse-tools" }, toolbar);
    row.appendChild(header);
    row.appendChild(tools);
    row.appendChild(xrefPanel);
    row.appendChild(commentPanel);
    row.appendChild(lexPanel);
    row.appendChild(h("hr", { class: "verse-divider", role: "separator" }));

    return row;
  }

  // ---------- Render ----------
  function renderChapter(data, sourceUrl) {
    app.els.verses.innerHTML = "";
    if (!Array.isArray(data) || data.length === 0) {
      app.els.verses.textContent = "No verses found in this chapter.";
      return;
    }
    data.forEach((vobj) => app.els.verses.appendChild(buildVerseRow(vobj)));

    if (app.lastAttempts.some((s) => /HTTP|not found|TypeError|Failed/i.test(s))) {
      const dbg = h("details", { class: "loader-debug" },
        h("summary", {}, "Load details"),
        h("pre", { class: "attempts" }, app.lastAttempts.join("\n"))
      );
      app.els.verses.appendChild(dbg);
    }
  }

  // ---------- Bootstrap ----------
  async function loadLexicons() {
    const base = "/israelite-research/data/lexicon";
    const tries = [
      `${base}/strongs-greek.json`,
      `${base}/strongs-hebrew.json`,
      `data/lexicon/strongs-greek.json`,
      `data/lexicon/strongs-hebrew.json`,
    ];
    const results = await Promise.allSettled(tries.map((t) => fetch(t, { cache: "no-store" })));
    results.forEach((r, i) => {
      const url = tries[i];
      if (r.status === "fulfilled" && r.value.ok) {
        r.value.json().then((json) => {
          if (/greek/i.test(url)) app.lexicons.greek = json;
          if (/hebrew/i.test(url)) app.lexicons.hebrew = json;
        }).catch(() => {});
      }
    });
  }

  async function init() {
    app.els.verses = $("#verses");
    app.els.headerTitle = $(".page-title");
    app.els.debug = $("#debug");

    const rawBook = app.params.get("book");   // "matthew" or "newtestament/matthew"
    app.chapterNum = app.params.get("chapter");

    if (!rawBook || !app.chapterNum) {
      app.els.verses.textContent = "Missing book or chapter.";
      return;
    }

    // Normalize: ensure "newtestament/<book>"
    app.bookPath = /newtestament\//i.test(rawBook) ? rawBook : `newtestament/${rawBook}`;

    if (app.els.headerTitle) {
      const bookSlug = app.bookPath.split("/").slice(-1)[0].replace(/-/g, " ");
      app.els.headerTitle.textContent = `${bookSlug} — Chapter ${app.chapterNum}`;
    }

    // Preload lexicons
    loadLexicons();

    const abs = `/israelite-research/data/${app.bookPath}/${app.chapterNum}.json`;
    const rel = `data/${app.bookPath}/${app.chapterNum}.json`;
    const { data, url } = await fetchWithFallbacks([abs, rel]);

    if (!data) {
      app.els.verses.innerHTML = "";
      app.els.verses.appendChild(
        h("div", { class: "error" },
          h("div", { class: "error-title" }, "Could not load chapter data."),
          h("div", { class: "error-detail" }, `Last attempts:\n${app.lastAttempts.join("\n")}`)
        )
      );
      return;
    }

    renderChapter(data, url);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

/* --- Minimal structural styles for modern buttons (optional if already in styles.css) ---
:root{ --ink:#0b2340; --muted:#6b7280; --accent:#F17300; --border:#e6ebf2; --card:#ffffff; }
.verse-row{padding:12px 0}
.verse-header{display:flex; gap:10px; align-items:flex-start}
.verse-num{font-variant-numeric:tabular-nums; text-decoration:none; font-weight:700; color:var(--accent)}
.verse-text{color:var(--ink); line-height:1.55}
.verse-toolbar{display:flex; gap:8px; margin:8px 0 6px}
.verse-toolbar .tool{border:1px solid var(--border); background:var(--card); padding:6px 10px; border-radius:999px; cursor:pointer}
.verse-toolbar .tool[aria-expanded="true"]{border-color:var(--accent)}
.panel{border:1px dashed var(--border); border-radius:12px; padding:8px 10px; margin:8px 0}
.panel .muted{color:var(--muted)}
.lex-head{font-weight:700}
.lex-gloss{margin:2px 0 0}
.lex-root{font-size:.9em}
.comment-box{width:100%; border:1px solid var(--border); border-radius:12px; padding:8px 10px; font:inherit}
.verse-divider{border:none; border-top:1px solid var(--border); margin:12px 0 0}
.loader-debug{margin-top:12px}
.error-title{font-weight:800; color:var(--ink)}
.error-detail{white-space:pre-wrap; color:var(--muted); margin-top:4px}
*/
