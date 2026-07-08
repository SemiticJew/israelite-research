/* canon-strongs.js — load + look up + render Strong's Hebrew/Greek accordion labels */
(function(){
  const S = {
    heUrl: "/data/lexicon/strongs-hebrew.json",
    grUrl: "/data/lexicon/strongs-greek.json",
    orderUrl: "/data/lexicon/verse-strongs-order.json",
    he: null,
    gr: null,
    order: null,
    idx: new Map(),
    ready: false
  };

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));

  const cleanText = (value) =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();

  const shortText = (value, limit = 120) => {
    const text = cleanText(value);
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  };

  const loadJSON = (u) => fetch(u, {cache:"force-cache"}).then(r => {
    if (!r.ok) throw new Error(`Unable to load ${u}`);
    return r.json();
  });

  function languageForCode(code){
    const clean = String(code || "").trim().toUpperCase();

    if (clean.startsWith("H")) {
      return {
        key: "hebrew",
        label: "Hebrew",
        full: "Strong’s Hebrew",
        note: "H-numbers identify Hebrew / Aramaic lexical entries used in the Tanakh."
      };
    }

    if (clean.startsWith("G")) {
      return {
        key: "greek",
        label: "Greek",
        full: "Strong’s Greek",
        note: "G-numbers identify Greek lexical entries used in the New Testament."
      };
    }

    return {
      key: "unknown",
      label: "Lexicon",
      full: "Strong’s Entry",
      note: "This entry is not marked as Hebrew or Greek."
    };
  }

  function normalizeEntry(code, entry){
    const cleanCode = String(code || entry?.code || "").trim().toUpperCase();

    return {
      code: cleanCode,
      ...entry,
      language: languageForCode(cleanCode)
    };
  }

  function index(obj){
    Object.entries(obj || {}).forEach(([code, e]) => {
      const normalized = normalizeEntry(code, e);
      S.idx.set(normalized.code, normalized);
    });
  }

  async function load(lang="auto"){
    if (lang === "he" || lang === "auto") {
      if (!S.he) {
        S.he = await loadJSON(S.heUrl);
        index(S.he);
      }
    }

    if (lang === "gr" || lang === "auto") {
      if (!S.gr) {
        S.gr = await loadJSON(S.grUrl);
        index(S.gr);
      }
    }

    S.ready = true;
  }

  async function loadOrder(){
    if (S.order) return S.order;

    try {
      const payload = await loadJSON(S.orderUrl);
      S.order = payload?.entries || {};
    } catch (_error) {
      S.order = {};
    }

    return S.order;
  }

  function get(code){
    if (!code) return null;
    return S.idx.get(String(code).toUpperCase()) || null;
  }

  function normalizeCanonKeyPart(value){
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function verseOrderKey(meta){
    if (!meta) return "";

    const canon = normalizeCanonKeyPart(meta.canon || meta.canonId || meta.testament);
    const book = normalizeCanonKeyPart(meta.book || meta.slug || meta.bookSlug);
    const chapter = Number(meta.chapter || meta.ch);
    const verse = Number(meta.verse || meta.v);

    if (!canon || !book || !chapter || !verse) return "";
    return `${canon}/${book}/${chapter}/${verse}`;
  }

  async function orderedTerms(meta, fallbackCodes){
    const order = await loadOrder();
    const key = verseOrderKey(meta);
    const ordered = key ? order[key] : null;

    if (Array.isArray(ordered) && ordered.length) {
      return ordered.map(item => ({
        word: item.word || "",
        code: String(item.code || "").toUpperCase()
      })).filter(item => item.code);
    }

    const seen = new Set();
    return (Array.isArray(fallbackCodes) ? fallbackCodes : [])
      .map(code => String(code || "").toUpperCase())
      .filter(code => {
        if (!code || seen.has(code)) return false;
        seen.add(code);
        return true;
      })
      .map(code => ({ word: "", code }));
  }

  function linkifyRefs(arr){
    if (!arr || !arr.length) return "";
    return arr.map(r => `<a class="xref" data-ref="${esc(r)}">${esc(r)}</a>`).join(" • ");
  }

  function englishSense(entry){
    if (!entry) return "";

    if (entry.gloss) return entry.gloss;

    if (Array.isArray(entry.defs) && entry.defs.length) {
      return entry.defs[0];
    }

    if (entry.kjv_def) {
      return entry.kjv_def.split(/[;,]/)[0];
    }

    if (entry.strongs_def) {
      return entry.strongs_def;
    }

    return "";
  }

  function renderMissingRow(code){
    const cleanCode = String(code || "Unknown").toUpperCase();
    const language = languageForCode(cleanCode);

    return `
      <details class="strongs-item lex-accordion missing" data-lexicon-language="${esc(language.key)}">
        <summary class="lex-summary">
          <span class="lex-summary-main">
            <span class="code">${esc(cleanCode)}</span>
            <span class="lex-language ${esc(language.key)}">${esc(language.full)}</span>
            <span class="lemma">Entry not found</span>
          </span>
          <span class="lex-summary-meta">Click to review</span>
        </summary>
        <div class="lex-details">
          <p class="lex-note">${esc(language.note)} This code was attached to the verse, but no matching dictionary entry was found.</p>
        </div>
      </details>
    `;
  }

  function renderRow(entryOrCode, options = {}){
    const e = typeof entryOrCode === "string"
      ? get(entryOrCode) || normalizeEntry(entryOrCode, {})
      : normalizeEntry(entryOrCode?.code, entryOrCode || {});

    const alignedWord = cleanText(options.word || entryOrCode?.word || "");

    if (!e || !e.code) {
      return renderMissingRow(entryOrCode);
    }

    const language = e.language || languageForCode(e.code);
    const defs = Array.isArray(e.defs) ? e.defs : [];
    const transliteration = e.translit || e.xlit || "";
    const sense = englishSense(e);
    const hasDictionaryData = Boolean(
      e.lemma ||
      transliteration ||
      e.pron ||
      e.pos ||
      e.gloss ||
      e.strongs_def ||
      e.kjv_def ||
      defs.length
    );

    if (!hasDictionaryData) {
      return renderMissingRow(e.code);
    }

    const pronunciation = e.pron ? `<span class="pron">Pron. ${esc(e.pron)}</span>` : "";
    const pos = e.pos ? `<span class="pos">${esc(e.pos)}</span>` : "";
    const gloss = e.gloss ? `<span class="gloss"><em>${esc(e.gloss)}</em></span>` : "";
    const refs = e.refs?.length ? `<div class="refs">Refs: ${linkifyRefs(e.refs)}</div>` : "";
    const defList = defs.length ? `<ol class="defs">${defs.map(d => `<li>${esc(d)}</li>`).join("")}</ol>` : "";
    const strongsDef = e.strongs_def ? `<div class="lex-field"><span class="lex-label">Strong’s Definition</span><div class="lex-value">${esc(e.strongs_def)}</div></div>` : "";
    const kjvDef = e.kjv_def ? `<div class="lex-field"><span class="lex-label">KJV Usage</span><div class="lex-value">${esc(e.kjv_def)}</div></div>` : "";
    const derivation = e.derivation ? `<div class="lex-field"><span class="lex-label">Derivation</span><div class="lex-value">${esc(e.derivation)}</div></div>` : "";

    return `
      <details class="strongs-item lex-accordion" data-lexicon-language="${esc(language.key)}">
        <summary class="lex-summary">
          <span class="lex-summary-main">
            <span class="code">${esc(e.code)}</span>
            <span class="lex-language ${esc(language.key)}">${esc(language.full)}</span>
            <span class="lemma">${esc(e.lemma || "")}</span>
            <span class="tr">${esc(transliteration)}</span>
          </span>
          <span class="lex-summary-english">
            ${alignedWord ? `<span><span class="lex-label-inline">English term</span> ${esc(alignedWord)}</span>` : ""}
            <span><span class="lex-label-inline">English sense</span> ${esc(shortText(sense || "No English gloss available yet."))}</span>
          </span>
        </summary>

        <div class="lex-details">
          <p class="lex-note">${esc(language.note)}</p>

          <div class="lex-selected-line">
            <span class="lex-label">Selected Term</span>
            <div class="lex-value">
              ${esc(e.code)} ${esc(e.lemma || "")}
              ${transliteration ? ` — ${esc(transliteration)}` : ""}
            </div>
          </div>

          ${alignedWord ? `<div class="lex-field"><span class="lex-label">English Term in Verse</span><div class="lex-value">${esc(alignedWord)}</div></div>` : ""}
          ${sense ? `<div class="lex-field"><span class="lex-label">English Sense / Alignment</span><div class="lex-value">${esc(sense)}</div></div>` : ""}
          ${pos || gloss || pronunciation ? `<div class="lex-meta-line">${pronunciation}${pos}${gloss}</div>` : ""}
          ${defList ? `<div class="lex-field"><span class="lex-label">Definitions</span>${defList}</div>` : ""}
          ${strongsDef}
          ${kjvDef}
          ${derivation}
          ${refs}
        </div>
      </details>
    `;
  }

  function rescan(){
    try{ window.citations?.scan?.(); }catch{}
    try{ window.XRefHover?.scan?.(); }catch{}
  }

  function renderOrderedRows(terms){
    return (Array.isArray(terms) ? terms : [])
      .map(term => renderRow(term.code, { word: term.word }))
      .join("");
  }

  window.Strongs = {
    load,
    loadOrder,
    get,
    orderedTerms,
    renderRow,
    renderOrderedRows,
    languageForCode,
    englishSense,
    _state: S,
    _rescan: rescan
  };
})();
