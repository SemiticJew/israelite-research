(async function(){
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if(!id){ document.body.innerHTML = "<p>Missing id.</p>"; return; }

  const url = `/israelite-research/data/encyclopedia/isbd/${id}.json`;
  const data = await fetch(url).then(r=>r.json()).catch(()=>null);
  if(!data){ document.body.innerHTML = "<p>Entry not found.</p>"; return; }

  const set = (sel, html) => { const el = document.querySelector(sel); if(el) el.innerHTML = html; };

  document.title = `${data.term} — Israelite Encyclopedia`;
  set("#term", data.term || id);
  set("#summary", data.summary || "");

  const asList = (arr) => `<ul>${(arr||[]).map(x=>`<li>${x}</li>`).join("")}</ul>`;

  set("#biblical_refs", `
    <h2 class="h">Biblical References</h2>
    ${asList((data.biblical_refs||[]))}
  `);

  const hg = data.hebrew_greek || {};
  set("#hebrew_greek", `
    <h2 class="h">Hebrew/Greek</h2>
    <div><strong>Lemma:</strong> ${hg.lemma||""}</div>
    <div><strong>Translit:</strong> ${hg.translit||""}</div>
    <div><strong>Strong’s:</strong> ${(hg.strongs||[]).map(s=>`<code class="kv">${s}</code>`).join(" ")}</div>
  `);

  const cc = data.complexion_context || {};
  set("#complexion_context", `
    <h2 class="h">Complexion Context</h2>
    ${cc.descriptions ? `<h3>Descriptions</h3>${asList(cc.descriptions.map(d=>`${d.source}: ${d.note}`))}`:""}
    ${cc.iconography ? `<h3>Iconography</h3>${asList(cc.iconography.map(d=>`${d.artifact} (${d.period}): ${d.note}`))}`:""}
    ${cc.interpretive_notes ? `<h3>Interpretive Notes</h3>${asList(cc.interpretive_notes)}`:""}
  `);

  const ac = data.african_context || {};
  set("#african_context", `
    <h2 class="h">African Context</h2>
    ${ac.integration ? `<h3>Integration</h3>${asList(ac.integration.map(i=>`${i.group}: ${i.evidence}`))}`:""}
    ${ac.geographies ? `<h3>Geographies</h3>${asList(ac.geographies.map(g=>`${g.place}: ${g.role}`))}`:""}
    ${ac.timelines ? `<h3>Timelines</h3>${asList(ac.timelines.map(t=>`${t.label}: ${t.from} → ${t.to}`))}`:""}
  `);

  set("#claims", `
    <h2 class="h">Claims</h2>
    ${asList((data.claims||[]).map(c=>`${c.statement} <span class="meta">(confidence ${Math.round((c.confidence||0)*100)}%)</span>`))}
  `);

  set("#evidence", `
    <h2 class="h">Evidence</h2>
    ${asList((data.evidence||[]).map(e=>`${e.type} [${e.citation_key}]: ${e.excerpt} — <em>${e.relevance}</em>`))}
  `);

  set("#counterpoints", `
    <h2 class="h">Counterpoints</h2>
    ${asList((data.counterpoints||[]).map(cp=>`${cp.argument} <span class="meta">(strength ${Math.round((cp.strength||0)*100)}%)</span>`))}
  `);

  const an = data.analysis || {};
  set("#analysis", `
    <h2 class="h">Analysis</h2>
    <p>${an.reasoning||""}</p>
    ${an.limitations?`<p class="meta"><strong>Limitations:</strong> ${an.limitations}</p>`:""}
  `);

  const lg = data.linguistics || {};
  set("#linguistics", `
    <h2 class="h">Linguistics</h2>
    ${lg.loanwords?`<div><strong>Loanwords:</strong> ${asList(lg.loanwords)}</div>`:""}
    ${lg.onomastics_notes?`<div><strong>Onomastics:</strong> ${lg.onomastics_notes}</div>`:""}
  `);

  set("#related_entries", `
    <h2 class="h">Related Entries</h2>
    ${asList((data.related_entries||[]).map(id=>`<a href="/israelite-research/encyclopedia/entry.html?id=${encodeURIComponent(id)}">${id}</a>`))}
  `);

  const pv = data.provenance || {};
  set("#provenance", `
    <h2 class="h">Provenance</h2>
    <div><strong>Compilers:</strong> ${(pv.compilers||[]).join(", ")}</div>
    <div><strong>Last Updated:</strong> ${pv.last_updated||""}</div>
    ${pv.sources?`<div><strong>Sources:</strong> ${asList(pv.sources.map(s=>`${s.key} (${s.license})`))}</div>`:""}
  `);
})();
