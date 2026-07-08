(function(){
  function dispatch(el, type, iso){
    el.dispatchEvent(new CustomEvent(type, { bubbles:true, detail:{ iso } }));
  }

  function wirePolygon(poly){
    if (!poly || poly._forcedActive) return;
    poly._forcedActive = true;
    poly.set("interactive", true);

    // Visual cues
    try {
      const color = (typeof am5 !== "undefined") ? am5.color(0x007bff) : null;
      poly.states.create("hover", { stroke: color, strokeWidth: 1.5, fillOpacity: 0.9 });
      poly.states.create("active",{ stroke: color, strokeWidth: 2.0, fillOpacity: 1.0 });
      if (!poly.get("tooltipText")) poly.set("tooltipText", "{name}");
    } catch(e){}

    // ISO code from dataContext.id (e.g., "FR", "ES", ...)
    const getISO = () => {
      const dc = poly.dataItem && poly.dataItem.dataContext;
      return dc && (dc.id || dc.iso || dc.ISO || dc.code) || null;
    };

    poly.events.on("pointerover", () => { const iso = getISO(); if (iso) dispatch(document, "region:focus", iso); });
    poly.events.on("pointerout",  () => { const iso = getISO(); if (iso) dispatch(document, "region:blur",  iso); });
    poly.events.on("click",       () => { const iso = getISO(); if (iso) dispatch(document, "region:select",iso); });
  }

  function wireAllFromRoot(root){
    if (!root) return false;
    let wired = 0;

    // Traverse containers to find all MapPolygonSeries
    function walk(c){
      if (!c || !c.children) return;
      c.children.each(child => {
        const cname = (child && child.constructor && child.constructor.name) || child.className || "";
        if (/MapPolygonSeries/.test(cname) && child.mapPolygons && child.mapPolygons.each) {
          child.mapPolygons.each(wirePolygon);
          wired++;
        }
        walk(child);
      });
    }
    walk(root.container);
    return wired > 0;
  }

  function tryWire(){
    // amCharts v5 registry of roots
    if (typeof am5 !== "undefined" && am5.registry && am5.registry.rootElements) {
      let ok = false;
      am5.registry.rootElements.forEach(r => { ok = wireAllFromRoot(r) || ok; });
      return ok;
    }
    return false;
  }

  function fallbackSVG(){
    const host = document.getElementById("chart-globe");
    if (!host) return false;
    const svg = host.querySelector("svg");
    if (!svg) return false;
    const isoLike = /^[A-Z]{2}(-[A-Z]{2})?$/;
    svg.querySelectorAll("[id]").forEach(n => {
      if (isoLike.test(n.id)) {
        n.style.pointerEvents = "auto";
        n.style.stroke = "rgba(0,123,255,.9)";
        n.style.strokeWidth = "1.2";
        n.addEventListener("mouseenter", () => dispatch(n, "region:focus", n.id));
        n.addEventListener("mouseleave", () => dispatch(n, "region:blur",  n.id));
        n.addEventListener("click",      () => dispatch(n, "region:select",n.id));
      }
    });
    return true;
  }

  function init(){
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (tryWire() || fallbackSVG() || tries > 60) clearInterval(t);
    }, 100);
  }

  window.addEventListener("globe:ready", init);
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(init, 200);
  else document.addEventListener("DOMContentLoaded", init);
})();
