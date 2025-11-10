(function(){
  const MAP = {
    "genesis":{canon:"tanakh",slug:"genesis"},"exodus":{canon:"tanakh",slug:"exodus"},
    "leviticus":{canon:"tanakh",slug:"leviticus"},"numbers":{canon:"tanakh",slug:"numbers"},
    "deuteronomy":{canon:"tanakh",slug:"deuteronomy"},"joshua":{canon:"tanakh",slug:"joshua"},
    "judges":{canon:"tanakh",slug:"judges"},"ruth":{canon:"tanakh",slug:"ruth"},
    "1 samuel":{canon:"tanakh",slug:"1-samuel"},"2 samuel":{canon:"tanakh",slug:"2-samuel"},
    "1 kings":{canon:"tanakh",slug:"1-kings"},"2 kings":{canon:"tanakh",slug:"2-kings"},
    "1 chronicles":{canon:"tanakh",slug:"1-chronicles"},"2 chronicles":{canon:"tanakh",slug:"2-chronicles"},
    "ezra":{canon:"tanakh",slug:"ezra"},"nehemiah":{canon:"tanakh",slug:"nehemiah"},
    "esther":{canon:"tanakh",slug:"esther"},"job":{canon:"tanakh",slug:"job"},
    "psalms":{canon:"tanakh",slug:"psalms"},"proverbs":{canon:"tanakh",slug:"proverbs"},
    "ecclesiastes":{canon:"tanakh",slug:"ecclesiastes"},"song-of-songs":{canon:"tanakh",slug:"song-of-songs"},
    "isaiah":{canon:"tanakh",slug:"isaiah"},"jeremiah":{canon:"tanakh",slug:"jeremiah"},
    "lamentations":{canon:"tanakh",slug:"lamentations"},"ezekiel":{canon:"tanakh",slug:"ezekiel"},
    "daniel":{canon:"tanakh",slug:"daniel"},"hosea":{canon:"tanakh",slug:"hosea"},
    "joel":{canon:"tanakh",slug:"joel"},"amos":{canon:"tanakh",slug:"amos"},
    "obadiah":{canon:"tanakh",slug:"obadiah"},"jonah":{canon:"tanakh",slug:"jonah"},
    "micah":{canon:"tanakh",slug:"micah"},"nahum":{canon:"tanakh",slug:"nahum"},
    "habakkuk":{canon:"tanakh",slug:"habakkuk"},"zephaniah":{canon:"tanakh",slug:"zephaniah"},
    "haggai":{canon:"tanakh",slug:"haggai"},"zechariah":{canon:"tanakh",slug:"zechariah"},
    "malachi":{canon:"tanakh",slug:"malachi"},
    "tobit":{canon:"apocrypha",slug:"tobit"},"judith":{canon:"apocrypha",slug:"judith"},
    "wisdom":{canon:"apocrypha",slug:"wisdom"},"sirach":{canon:"apocrypha",slug:"sirach"},
    "baruch":{canon:"apocrypha",slug:"baruch"},
    "1 maccabees":{canon:"apocrypha",slug:"1-maccabees"},"2 maccabees":{canon:"apocrypha",slug:"2-maccabees"},
    "susanna":{canon:"apocrypha",slug:"susanna"},"bel-and-the-dragon":{canon:"apocrypha",slug:"bel-and-the-dragon"},
    "prayer-of-azariah":{canon:"apocrypha",slug:"prayer-of-azariah"},
    "additions-to-esther":{canon:"apocrypha",slug:"additions-to-esther"},
    "matthew":{canon:"new-testament",slug:"matthew"},"mark":{canon:"new-testament",slug:"mark"},
    "luke":{canon:"new-testament",slug:"luke"},"john":{canon:"new-testament",slug:"john"},
    "acts":{canon:"new-testament",slug:"acts"},"romans":{canon:"new-testament",slug:"romans"},
    "1 corinthians":{canon:"new-testament",slug:"1-corinthians"},"2 corinthians":{canon:"new-testament",slug:"2-corinthians"},
    "galatians":{canon:"new-testament",slug:"galatians"},"ephesians":{canon:"new-testament",slug:"ephesians"},
    "philippians":{canon:"new-testament",slug:"philippians"},"colossians":{canon:"new-testament",slug:"colossians"},
    "1 thessalonians":{canon:"new-testament",slug:"1-thessalonians"},"2 thessalonians":{canon:"new-testament",slug:"2-thessalonians"},
    "1 timothy":{canon:"new-testament",slug:"1-timothy"},"2 timothy":{canon:"new-testament",slug:"2-timothy"},
    "titus":{canon:"new-testament",slug:"titus"},"philemon":{canon:"new-testament",slug:"philemon"},
    "hebrews":{canon:"new-testament",slug:"hebrews"},"james":{canon:"new-testament",slug:"james"},
    "1 peter":{canon:"new-testament",slug:"1-peter"},"2 peter":{canon:"new-testament",slug:"2-peter"},
    "1 john":{canon:"new-testament",slug:"1-john"},"2 john":{canon:"new-testament",slug:"2-john"},
    "3 john":{canon:"new-testament",slug:"3-john"},"jude":{canon:"new-testament",slug:"jude"},
    "revelation":{canon:"new-testament",slug:"revelation"}
  };

  const ALIASES = {
    "ps":"psalms","psalm":"psalms","song of songs":"song-of-songs","song":"song-of-songs",
    "bel and the dragon":"bel-and-the-dragon","prayer of azariah":"prayer-of-azariah",
    "1 mac":"1 maccabees","2 mac":"2 maccabees","1 macc":"1 maccabees","2 macc":"2 maccabees",
    "1 cor":"1 corinthians","2 cor":"2 corinthians","1 th":"1 thessalonians","2 th":"2 thessalonians",
    "1 tim":"1 timothy","2 tim":"2 timothy","1 pet":"1 peter","2 pet":"2 peter",
    "1 jn":"1 john","2 jn":"2 john","3 jn":"3 john","rev":"revelation"
  };

  function normBook(s){
    s=(s||"").toLowerCase().replace(/\./g,"").trim();
    return ALIASES[s] || s;
  }

  function parseRef(t){
    t=(t||"").replace(/[\u2012\u2013\u2014]/g,"-").trim();
    const m=t.match(/^((?:[1-3]\s+)?[A-Za-z][A-Za-z .'-]+?)\s+(\d+)(?::(\d+))?/);
    if(!m) return null;
    return { book: normBook(m[1]), ch: m[2], v: m[3] || "" };
  }

  function buildHref(book, ch, v){
    const hit = MAP[book];
    if(!hit) return null;
    if (hit.canon==="apocrypha"){
      return `/israelite-research/apocrypha/chapter.html?book=${encodeURIComponent(hit.slug)}&ch=${encodeURIComponent(ch)}`;
    }
    if (hit.canon==="tanakh"){
      return `/israelite-research/tanakh/chapter.html?book=${encodeURIComponent(hit.slug)}&ch=${encodeURIComponent(ch)}` + (v ? `#v=${encodeURIComponent(v)}` : "");
    }
    if (hit.canon==="new-testament"){
      return `/israelite-research/new-testament/chapter.html?book=${encodeURIComponent(hit.slug)}&ch=${encodeURIComponent(ch)}` + (v ? `#v=${encodeURIComponent(v)}` : "");
    }
    return null;
  }

  function maybeFix(a){
    const ref = a.getAttribute('data-ref') || a.textContent || "";
    const p = parseRef(ref);
    if(!p) return;
    const href=buildHref(p.book, p.ch, p.v);
    if(href) a.setAttribute('href', href);
  }

  function fixAll(root){
    (root||document).querySelectorAll('a.xref, a[data-ref]').forEach(maybeFix);
  }

  const mo = new MutationObserver(muts=>{
    for(const m of muts){
      for(const node of m.addedNodes || []){
        if(node.nodeType===1){
          if(node.matches && (node.matches('a.xref, a[data-ref]'))) maybeFix(node);
          fixAll(node);
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', function(){
    fixAll(document);
    mo.observe(document.body, {childList:true, subtree:true});
  });

  document.addEventListener('xrefs:updated', function(ev){
    fixAll((ev&&ev.detail&&ev.detail.root)||document);
  });
})();
