/* canon-strongs.js — load + look up + render Strong's (HE/GR) */
(function(){
  const S = {
    heUrl: "/israelite-research/data/lexicon/strongs-hebrew.json",
    grUrl: "/israelite-research/data/lexicon/strongs-greek.json",
    he: null, gr: null, idx: new Map(), ready: false
  };
  const loadJSON = (u) => fetch(u, {cache:"force-cache"}).then(r=>r.json());

  function index(obj){
    Object.entries(obj||{}).forEach(([code, e])=>{
      S.idx.set(code.toUpperCase(), { code: code.toUpperCase(), ...e });
    });
  }

  async function load(lang="auto"){
    if (lang==="he"||lang==="auto"){ if(!S.he){ S.he = await loadJSON(S.heUrl); index(S.he); } }
    if (lang==="gr"||lang==="auto"){ if(!S.gr){ S.gr = await loadJSON(S.grUrl); index(S.gr); } }
    S.ready = true;
  }
  function get(code){ return code ? S.idx.get(String(code).toUpperCase()) || null : null; }

  // helpers for rendering inside verse panel
  function linkifyRefs(arr){
    if (!arr || !arr.length) return "";
    return arr.map(r => `<a class="xref" data-ref="${r}">${r}</a>`).join(" • ");
  }
  // Compact line for the verse panel
  function renderRow(e){
    const defs = Array.isArray(e.defs) ? e.defs : [];
    const pos  = e.pos ? `<span class="pos">${e.pos}</span>` : "";
    const gloss= e.gloss ? `<span class="gloss"><em>${e.gloss}</em></span>` : "";
    const refs = e.refs?.length ? `<div class="refs">Refs: ${linkifyRefs(e.refs)}</div>` : "";
    const defList = defs.length ? `<ol class="defs">${defs.map(d=>`<li>${d}</li>`).join("")}</ol>` : "";
    return `
      <div class="strongs-item">
        <div class="head">
          <span class="code">${e.code}</span>
          <span class="lemma">${e.lemma || ""}</span>
          <span class="tr">${e.translit || ""}</span>
          ${pos}
          ${gloss}
        </div>
        ${ (defList || refs) ? `<details class="more"><summary>details</summary>${defList}${refs}</details>` : "" }
      </div>
    `;
  }

  function rescan(){ try{window.citations?.scan?.()}catch{} try{window.XRefHover?.scan?.()}catch{} }

  window.Strongs = { load, get, renderRow, _state: S, _rescan: rescan };
})();
