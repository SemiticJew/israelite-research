(function(){
  const grid=document.getElementById('chapGrid');if(!grid)return;
  function canonFromPath(){const p=location.pathname.split('/').filter(Boolean);const i=p.indexOf('israelite-research');return(i>=0&&p[i+1])?p[i+1]:'newtestament';}
  function bookFromPath(){return(location.pathname.split('/').pop()||'').replace(/\.html$/,'').toLowerCase();}
  function chapterHref(c,b,ch){return`/israelite-research/${c}/chapter.html?book=${b}&ch=${ch}`;}
  const canon=canonFromPath(),book=bookFromPath();
  async function getTotal(){try{const r=await fetch(`/israelite-research/data/${canon}/books.json`);if(r.ok){const j=await r.json();return Number(j[book])||150;}}catch{}return 150;}
  (async()=>{const total=await getTotal();const f=document.createDocumentFragment();for(let i=1;i<=total;i++){const a=document.createElement('a');a.className='ch';a.href=chapterHref(canon,book,i);a.textContent=i;f.appendChild(a);}grid.innerHTML='';grid.appendChild(f);})();
})();
