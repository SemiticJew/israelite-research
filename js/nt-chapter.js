(function () {
  const $ = (s) => document.querySelector(s);

  const $verses=$('#verses'),$hover=$('#hovercard'),
        $prev=$('#btnPrev'),$next=$('#btnNext'),
        $chSel=$('#chSelect'),$canon=$('#canonSelect'),
        $book=$('#bookSelect'),$title=$('#pageTitle'),$crumbs=$('#crumbs');

  const $dictToggle=$('#dictToggle'),$dictReveal=$('#dictReveal'),
        $dictQuery=$('#dictQuery'),$dictBody=$('#dictBody');

  const status=(m)=>{if($verses)$verses.innerHTML=`<p class="muted">${m}</p>`;}
  const esc=(s)=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cap=(slug)=>slug.split('-').map((t,i)=>i===0&&/^\d+$/.test(t)?t:t.charAt(0).toUpperCase()+t.slice(1)).join(' ');

  function canonFromPath(){const p=location.pathname.split('/').filter(Boolean);const i=p.indexOf('israelite-research');const c=(i>=0&&p[i+1])?p[i+1]:'newtestament';return/^(tanakh|newtestament|apocrypha)$/i.test(c)?c.toLowerCase():'newtestament';}
  function ctxFromUrl(){const q=new URLSearchParams(location.search);return{canon:canonFromPath(),book:(q.get('book')||'').toLowerCase().trim(),chapter:parseInt(q.get('ch')||q.get('c')||'1',10)||1};}
  function chapterHref(c,b,ch){return`/israelite-research/${c}/chapter.html?book=${b}&ch=${ch}`;}

  const CANON_ORDER={tanakh:['genesis','exodus','leviticus','numbers','deuteronomy','joshua','judges','ruth','1-samuel','2-samuel','1-kings','2-kings','1-chronicles','2-chronicles','ezra','nehemiah','esther','job','psalms','proverbs','ecclesiastes','song-of-solomon','isaiah','jeremiah','lamentations','ezekiel','daniel','hosea','joel','amos','obadiah','jonah','micah','nahum','habakkuk','zephaniah','haggai','zechariah','malachi'],
                      newtestament:['matthew','mark','luke','john','acts','romans','1-corinthians','2-corinthians','galatians','ephesians','philippians','colossians','1-thessalonians','2-thessalonians','1-timothy','2-timothy','titus','philemon','hebrews','james','1-peter','2-peter','1-john','2-john','3-john','jude','revelation'],
                      apocrypha:['tobit','judith','additions-to-esther','wisdom','sirach','baruch','letter-of-jeremiah','prayer-of-azariah','susanna','bel-and-the-dragon','1-maccabees','2-maccabees','1-esdras','2-esdras','prayer-of-manasseh']};

  async function loadBooksJson(c){try{const r=await fetch(`/israelite-research/data/${c}/books.json`);if(r.ok)return await r.json();}catch(e){console.warn('books.json load failed',e)}const m={};(CANON_ORDER[c]||[]).forEach(s=>m[s]=150);return m;}
  function updateHeader(ctx){if($title)$title.textContent=`${cap(ctx.book||'')} (Chapter ${ctx.chapter})`;if($crumbs)$crumbs.textContent=`${cap(ctx.canon)} → ${cap(ctx.book||'')} → ${ctx.chapter}`;}
  function updateChSel(t,c){if(!$chSel)return;$chSel.innerHTML='';for(let i=1;i<=t;i++){const o=document.createElement('option');o.value=String(i);o.textContent=`Chapter ${i}`;if(i===c)o.selected=true;$chSel.appendChild(o);}}

  function wireNav(ctx,t){const total=t[ctx.book]||t[Object.keys(t)[0]]||150;
    updateHeader(ctx);updateChSel(total,ctx.chapter);
    if($prev)$prev.onclick=()=>location.href=chapterHref(ctx.canon,ctx.book,Math.max(1,ctx.chapter-1));
    if($next)$next.onclick=()=>location.href=chapterHref(ctx.canon,ctx.book,Math.min(total,ctx.chapter+1));
    if($chSel)$chSel.onchange=e=>location.href=chapterHref(ctx.canon,ctx.book,parseInt(e.target.value,10));
    if($canon){$canon.value=ctx.canon;$canon.onchange=()=>{const tgt=$canon.value;const order=CANON_ORDER[tgt]||[];const next=order.includes(ctx.book)?ctx.book:order[0]||'matthew';location.href=chapterHref(tgt,next,1);};}
    if($book){const slugs=Object.keys(t);const order=slugs.length?slugs:(CANON_ORDER[ctx.canon]||[]);$book.innerHTML='';order.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=cap(s);if(s===ctx.book)o.selected=true;$book.appendChild(o);});$book.onchange=e=>location.href=chapterHref(ctx.canon,e.target.value,1);}
  }

  function cmtStoreKey(ctx){return `vc:${ctx.canon}/${ctx.book}/${ctx.chapter}`;}
  function loadNotes(ctx){try{return JSON.parse(localStorage.getItem(cmtStoreKey(ctx))||'{}');}catch{return{}}}
  function saveNotes(ctx,notes){localStorage.setItem(cmtStoreKey(ctx), JSON.stringify(notes||{}));}

  function svgXR(){return '<svg viewBox="0 0 24 24"><path d="M4 7h8M12 7l8 10M4 17h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'}
  function svgC(){return '<svg viewBox="0 0 24 24"><path d="M4 5h16v12a2 2 0 0 1-2 2H8l-4 3V5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
  function svgS(){return '<svg viewBox="0 0 24 24"><path d="M7 7h10M7 12h10M7 17h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'}
  function toolButton(label,svg){const b=document.createElement('button');b.type='button';b.className='tool-btn';b.setAttribute('aria-expanded','false');b.innerHTML=svg+'<span>'+label+'</span>';return b;}

  function renderVerses(j,ctx){
    const vs=Array.isArray(j?.verses)?j.verses:[];if(!vs.length){status('Verses coming soon.');return;}
    const notes=loadNotes(ctx);
    const frag=document.createDocumentFragment();

    vs.forEach(v=>{
      const wrap=document.createElement('div');wrap.className='verse';wrap.id=`v${v.v}`;wrap.setAttribute('data-verse',v.v);

      const vline=document.createElement('div');vline.className='vline';
      const num=document.createElement('span');num.className='vnum';num.textContent=v.v;
      const txt=document.createElement('span');txt.className='vtext';txt.textContent=v.t||'';
      vline.appendChild(num);vline.appendChild(txt);

      const tools=document.createElement('div');tools.className='v-tools';
      const btnXR=toolButton('x-ref',svgXR());
      const btnC =toolButton('comment',svgC());
      const btnS =toolButton('strongs',svgS());

      const pXR=document.createElement('div');pXR.className='v-panel vp-xr';pXR.innerHTML='<div class="muted">Cross references coming soon.</div>';
      const pC =document.createElement('div');pC.className='v-panel vp-cmt';
      const ta =document.createElement('textarea');ta.className='v-cmt';ta.placeholder='Add your personal commentary for this verse…';ta.value=notes[v.v]||'';
      ta.addEventListener('input',()=>{notes[v.v]=ta.value.trim();saveNotes(ctx,notes);});
      pC.appendChild(ta);
      const pS =document.createElement('div');pS.className='v-panel vp-str';
      if(Array.isArray(v.s)&&v.s.length){
        pS.innerHTML=v.s.map(code=>`<code style="display:inline-block;margin:.15rem .25rem .15rem 0;padding:.15rem .35rem;border:1px solid var(--sky);border-radius:8px;background:#054A910D">${esc(code)}</code>`).join('');
      }else{
        pS.innerHTML='<div class="muted">No Strong’s numbers for this verse.</div>';
      }

      function toggle(panel,btn){
        const open=panel.classList.toggle('open');
        btn.setAttribute('aria-expanded',open?'true':'false');
      }
      btnXR.onclick=()=>toggle(pXR,btnXR);
      btnC.onclick =()=>toggle(pC ,btnC );
      btnS.onclick =()=>toggle(pS ,btnS );

      wrap.appendChild(vline);
      tools.appendChild(btnXR);
      tools.appendChild(btnC);
      tools.appendChild(btnS);
      wrap.appendChild(tools);
      wrap.appendChild(pXR);
      wrap.appendChild(pC);
      wrap.appendChild(pS);

      frag.appendChild(wrap);
    });

    $verses.innerHTML='';
    $verses.appendChild(frag);

    if(location.hash&&/^#v\d+$/.test(location.hash)){
      const a=document.getElementById(location.hash.slice(1));if(a)a.scrollIntoView({behavior:'instant',block:'start'});
    }
  }

  async function fetchFirstOk(urls){for(const u of urls){try{const r=await fetch(u);if(r.ok)return await r.json();}catch(e){console.warn('fetch error',u,e)}}return null;}

  async function loadChapter(ctx){
    if(!ctx.book){ctx.book=(CANON_ORDER[ctx.canon]||[])[0]||'matthew';history.replaceState(null,'',chapterHref(ctx.canon,ctx.book,ctx.chapter));}
    const totals=await loadBooksJson(ctx.canon);wireNav(ctx,totals);
    status('Loading…');
    const j=await fetchFirstOk([`/israelite-research/data/${ctx.canon}/${ctx.book}/${ctx.chapter}.json`]);
    j?renderVerses(j,ctx):status('Verses coming soon.');
  }

  let EASTON=null;
  async function loadEaston(){if(EASTON)return EASTON;for(const u of['/israelite-research/data/dictionaries/easton_dictionary.json','/israelite-research/data/easton_dictionary.json']){try{const r=await fetch(u);if(r.ok){EASTON=await r.json();return EASTON;}}catch(e){console.warn('easton load failed',e)}}return{entries:[]};}
  function* eastonIter(db){
    // Normalize multiple possible schemas:
    // 1) Array of {headword,text} or {h,g}
    // 2) Array of {term, definitions:[...]}
    // 3) Object map { "Headword": "definition ..." }
    // 4) Object entries: { entries:[...] }
    if (Array.isArray(db)) {
      for (const e of db) {
        const h = e.headword || e.h || e.term || '';
        let t = e.text || e.g || '';
        if (!t && Array.isArray(e.definitions)) t = e.definitions.join(' ');
        yield { h, t };
      }
    } else if (Array.isArray(db?.entries)) {
      for (const e of db.entries) {
        const h = e.headword || e.h || e.term || '';
        let t = e.text || e.g || '';
        if (!t && Array.isArray(e.definitions)) t = e.definitions.join(' ');
        yield { h, t };
      }
    } else if (db && typeof db === 'object') {
      for (const k in db) {
        const v = db[k];
        let t = '';
        if (typeof v === 'string') t = v;
        else if (Array.isArray(v?.definitions)) t = v.definitions.join(' ');
        else if (typeof v?.text === 'string') t = v.text;
        yield { h: k, t };
      }
    }
  }
  function wireDictionary(){
    if(!$dictToggle||!$dictReveal||!$dictQuery||!$dictBody) return;
    $dictToggle.onclick=()=>{const open=$dictReveal.getAttribute('data-open')==='1';$dictReveal.style.maxHeight=open?'0':'100px';$dictReveal.setAttribute('data-open',open?'0':'1');if(!open)$dictQuery.focus();};
    $dictQuery.onkeydown=async e=>{if(e.key!=='Enter')return;const q=$dictQuery.value.trim().toLowerCase();if(!q)return;$dictBody.innerHTML='<p class="muted">Searching…</p>';const db=await loadEaston();const hits=[];for(const e of eastonIter(db)){if((e.h||'').toLowerCase().includes(q)||(e.t||'').toLowerCase().includes(q)){hits.push(e);if(hits.length>=50)break;}}$dictBody.innerHTML=hits.length?hits.map(e=>`<div style="margin:.45rem 0"><div style="font-weight:700;color:#0b2340">${esc(e.h||'(entry)')}</div><div>${esc(e.t||'')}</div></div>`).join(''):'<p class="muted">No results.</p>';};
  }

  const ctx=ctxFromUrl();
  loadChapter(ctx);
  wireDictionary();

  function closeHoverCard(){ if(!$hover) return; $hover.classList.remove('open'); $hover.setAttribute('aria-hidden','true'); }
  document.addEventListener('scroll', closeHoverCard);
  document.addEventListener('click', (e) => { if ($hover && !$hover.contains(e.target)) closeHoverCard(); });
})();
