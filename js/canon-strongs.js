/* canon-strongs.js — load + look up + render Strong's Hebrew/Greek labels */
(function(){
  const S = {
    heUrl: "/data/lexicon/strongs-hebrew.json",
    grUrl: "/data/lexicon/strongs-greek.json",
    he: null,
    gr: null,
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

  function get(code){
    if (!code) return null;
    return S.idx.get(String(code).toUpperCase()) || null;
  }

  function linkifyRefs(arr){
    if (!arr || !arr.length) return "";
    return arr.map(r => `<a class="xref" data-ref="${esc(r)}">${esc(r)}</a>`).join(" • ");
  }

  function renderMissingRow(code){
    const language = languageForCode(code);

    return `
      <div class="strongs-item missing" data-lexicon-language="${esc(language.key)}">
        <div class="head">
          <span class="code">${esc(String(code || "Unknown").toUpperCase())}</span>
          <span class="lex-language ${esc(language.key)}">${esc(language.full)}</span>
          <span class="lemma">Entry not found</span>
        </div>
        <p class="lex-note">${esc(language.note)} This code was attached to the verse, but no matching dictionary entry was found.</p>
      </div>
    `;
  }

  function renderRow(entryOrCode){
    const e = typeof entryOrCode === "string"
      ? get(entryOrCode) || normalizeEntry(entryOrCode, {})
      : normalizeEntry(entryOrCode?.code, entryOrCode || {});

    if (!e || !e.code) {
      return renderMissingRow(entryOrCode);
    }

    const language = e.language || languageForCode(e.code);
    const hasDictionaryData = Boolean(
      e.lemma ||
      e.translit ||
      e.xlit ||
      e.pron ||
      e.pos ||
      e.gloss ||
      e.strongs_def ||
      e.kjv_def ||
      (Array.isArray(e.defs) && e.defs.length)
    );

    if (!hasDictionaryData) {
      return renderMissingRow(e.code);
    }

    const defs = Array.isArray(e.defs) ? e.defs : [];
    const transliteration = e.translit || e.xlit || "";
    const pronunciation = e.pron ? `<span class="pron">Pron. ${esc(e.pron)}</span>` : "";
    const pos = e.pos ? `<span class="pos">${esc(e.pos)}</span>` : "";
    const gloss = e.gloss ? `<span class="gloss"><em>${esc(e.gloss)}</em></span>` : "";
    const refs = e.refs?.length ? `<div class="refs">Refs: ${linkifyRefs(e.refs)}</div>` : "";
    const defList = defs.length ? `<ol class="defs">${defs.map(d => `<li>${esc(d)}</li>`).join("")}</ol>` : "";
    const strongsDef = e.strongs_def ? `<div class="lex-field"><span class="lex-label">Strong’s Definition</span><div class="lex-value">${esc(e.strongs_def)}</div></div>` : "";
    const kjvDef = e.kjv_def ? `<div class="lex-field"><span class="lex-label">KJV Usage</span><div class="lex-value">${esc(e.kjv_def)}</div></div>` : "";
    const derivation = e.derivation ? `<div class="lex-field"><span class="lex-label">Derivation</span><div class="lex-value">${esc(e.derivation)}</div></div>` : "";

    return `
      <div class="strongs-item" data-lexicon-language="${esc(language.key)}">
        <div class="head">
          <span class="code">${esc(e.code)}</span>
          <span class="lex-language ${esc(language.key)}">${esc(language.full)}</span>
          <span class="lemma">${esc(e.lemma || "")}</span>
          <span class="tr">${esc(transliteration)}</span>
          ${pronunciation}
          ${pos}
          ${gloss}
        </div>
        <p class="lex-note">${esc(language.note)}</p>
        ${(defList || refs || strongsDef || kjvDef || derivation) ? `<details class="more"><summary>Show dictionary details</summary>${defList}${strongsDef}${kjvDef}${derivation}${refs}</details>` : ""}
      </div>
    `;
  }

  function rescan(){
    try{ window.citations?.scan?.(); }catch{}
    try{ window.XRefHover?.scan?.(); }catch{}
  }

  window.Strongs = { load, get, renderRow, languageForCode, _state: S, _rescan: rescan };
})();
