// /israelite-research/js/verses.js
// Show real Scripture text in a hover card without changing visible citation text.
// Also removes wrapping parentheses around citations.
//
// Uses bible-api.com (KJV by default) and caches results in localStorage.
// No backups created. No DOM clobbering.

(function () {
  var DEFAULT_XL = 'kjv'; // default translation key for API
  var API = function(ref, xl){ return 'https://bible-api.com/' + encodeURIComponent(ref) + '?translation=' + encodeURIComponent(xl || DEFAULT_XL); };
  var DASH = /\u2013|\u2014/g; // en/em dash → hyphen

  function trimParensAround(el){
    // Remove a "(" just before and a ")" just after the element, if present.
    var prev = el.previousSibling, next = el.nextSibling;
    if(prev && prev.nodeType === 3){
      // remove trailing "(" or " (" from the previous text node
      var t = prev.nodeValue;
      t = t.replace(/\s*\($/, '');
      if(t !== prev.nodeValue) prev.nodeValue = t;
    }
    if(next && next.nodeType === 3){
      // remove leading ")" or ") " from the next text node
      var u = next.nodeValue;
      u = u.replace(/^\)\s*/, '');
      if(u !== next.nodeValue) next.nodeValue = u;
    }
  }

  function normalizeRef(raw){
    // Normalize dashes and whitespace; keep commas for disjoint refs (we’ll fetch separately)
    return (raw || '').replace(DASH, '-').replace(/\s+/g, ' ').trim();
  }

  function splitRefs(ref){
    // e.g., "Rev 20:3,8" → ["Rev 20:3", "Rev 20:8"]
    // If comma appears after a chapter, duplicate the book+chapter on RHS pieces.
    var r = normalizeRef(ref);
    if(r.indexOf(',') === -1) return [r];
    var m = r.match(/^(.+?\s+\d+):(\d[\d\-]*)/); // capture "Book Ch:Verses"
    if(!m) return [r];
    var bookchap = m[1]; // "Rev 20"
    var parts = r.replace(bookchap+':', '').split(',');
    return parts.map(function(p){ p=p.trim(); return p.indexOf(':')===-1 ? (bookchap+':'+p) : p; });
  }

  function localGet(key){
    try { return localStorage.getItem(key); } catch(e){ return null; }
  }
  function localSet(key, val){
    try { localStorage.setItem(key, val); } catch(e){}
  }

  function fetchTextForRef(ref, xl){
    // Try cache first
    var key = 'verse:'+ (xl||DEFAULT_XL) + ':' + ref.toLowerCase();
    var cached = localGet(key);
    if(cached) return Promise.resolve(cached);

    // Network fetch
    return fetch(API(ref, xl), {mode:'cors'}).then(function(res){
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    }).then(function(data){
      // bible-api.com returns { text, reference } or { verses: [...] }
      var text = '';
      if(data && typeof data.text === 'string'){
        text = data.text.trim();
      } else if(data && Array.isArray(data.verses)){
        text = data.verses.map(function(v){ return (v.text || '').trim(); }).join(' ');
      }
      text = text.replace(/\s+/g,' ').trim();
      if(!text) throw new Error('empty text');
      localSet(key, text);
      return text;
    }).catch(function(){
      // Fallback: leave empty (CSS will still show ref+note)
      return '';
    });
  }

  function enhance(el){
    // Keep visible text as-is; prepare tooltip
    var ref  = normalizeRef(el.getAttribute('data-ref')  || el.textContent || '');
    var note = el.getAttribute('data-note') || '';
    var xl   = el.getAttribute('data-translation') || DEFAULT_XL;

    // Remove parentheses around the citation
    trimParensAround(el);

    // Basic accessibility title
    if(ref) el.setAttribute('title', ref + (note ? (' — ' + note) : ''));

    // If the element was clobbered earlier, restore to the ref label
    var visible = (el.textContent || '').trim().toLowerCase();
    if(ref && (visible === 'verse preview' || visible === 'preview' || visible === 'citation')){
      el.textContent = ref;
    }

    // Disjoint references (comma-separated): fetch each and join
    var refs = splitRefs(ref);
    var jobs = refs.map(function(r){ return fetchTextForRef(r, xl); });

    Promise.all(jobs).then(function(texts){
      var txt = texts.filter(Boolean).join(' ● ');
      // Put the full display content into a data attribute consumed by CSS
      // If API failed, fall back to whatever note we have; CSS will still render a helpful card.
      if(txt){
        el.setAttribute('data-text', txt);
      }else{
        el.setAttribute('data-text', note || '');
      }
      // Keep the normalized ref around for CSS content
      el.setAttribute('data-ref', ref);
    });
  }

  function init(){
    var nodes = document.querySelectorAll('.verse');
    nodes.forEach(enhance);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
