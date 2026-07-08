(function(){
  function getISO(el){
    if(!el) return null;
    if(el.id && el.id.length===2) return el.id;
    if(el.getAttribute) {
      const id=el.getAttribute("id");
      if(id && id.length===2) return id;
      const title=el.getAttribute("title");
      if(title && title.length===2) return title;
    }
    if(el.closest){
      const p=el.closest("[id]");
      if(p && p.id && p.id.length===2) return p.id;
    }
    return null;
  }

  function gatherAllSVGISO(){
    const ids=[];
    document.querySelectorAll("#chart-globe svg .land[id], #chart-globe [data-iso]").forEach(n=>{
      const id=n.getAttribute("data-iso")||n.id;
      if(id && id.length===2) ids.push(id);
    });
    if(ids.length===0){
      document.querySelectorAll("svg .land[id]").forEach(n=>{
        const id=n.id;
        if(id && id.length===2) ids.push(id);
      });
    }
    return Array.from(new Set(ids));
  }

  function prepareRegions(){
    const allSVG = new Set(gatherAllSVGISO());
    const activeFromNotes = (window.ACTIVE_ISOS instanceof Set) ? window.ACTIVE_ISOS : new Set();
    const active = (activeFromNotes.size>0) ? activeFromNotes : allSVG;

    allSVG.forEach(iso=>{
      const sel = `#chart-globe svg .land#${iso}`;
      document.querySelectorAll(sel).forEach(n=>{
        if(active.has(iso)){
          n.classList.add("region-active");
          n.setAttribute("data-active","1");
        }else{
          n.classList.remove("region-active");
          n.removeAttribute("data-active");
        }
      });
    });

    const svg = document.querySelector("#chart-globe svg");
    if(!svg) return;
    svg.addEventListener("mouseover",(ev)=>{
      const iso=getISO(ev.target);
      if(!iso) return;
      const node = document.getElementById(iso);
      if(node) node.classList.add("region-hover");
      window.dispatchEvent(new CustomEvent("region:focus",{bubbles:true,detail:{iso}}));
    },{passive:true});
    svg.addEventListener("mouseout",(ev)=>{
      const iso=getISO(ev.target);
      if(!iso) return;
      const node = document.getElementById(iso);
      if(node) node.classList.remove("region-hover");
      window.dispatchEvent(new CustomEvent("region:blur",{bubbles:true,detail:{iso}}));
    },{passive:true});
    svg.addEventListener("click",(ev)=>{
      const iso=getISO(ev.target);
      if(!iso) return;
      window.dispatchEvent(new CustomEvent("region:click",{bubbles:true,detail:{iso}}));
    });

    console.log("Notes:",
      "loaded · Keys:", activeFromNotes.size,
      "· Matched Regions:", Array.from(active).filter(x=>allSVG.has(x)).length,
      "· Total Regions:", allSVG.size
    );
  }

  window.addEventListener("globe:ready", prepareRegions);
})();
