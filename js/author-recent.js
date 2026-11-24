(() => {
 // Catalog dates may be "YYYY-MM-DD" or a full ISO timestamp ("2026-11-03T04:30:00Z").
 // Show the authored calendar day (the same day the article listing prints); return '' if unparseable.
 const formatDate=value=>{
  const m=/^(\d{4}-\d{2}-\d{2})/.exec(value||'');
  const d=m?new Date(m[1]+'T12:00:00Z'):new Date(value);
  if(isNaN(d))return '';
  return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:m?'UTC':undefined});
 };
 const refresh=()=>{
  const root=document.querySelector('#author-modal .sj-author-page-right');
  if(!root || root.dataset.liveArticles)return;
  root.dataset.liveArticles='loading';
  window.loadArticleCatalog().then(items=>{
   const list=items.filter(a=>a.author.toLowerCase()==='semitic jew').slice(0,5);
   if(!list.length)throw Error('No author articles');
   const nodes=list.map(item=>{const card=articleElement('article','');const a=articleElement('a',item.title);a.href=item.href;card.append(a);const p=articleElement('p',item.author);const label=formatDate(item.date);if(label){const time=articleElement('time',label);time.dateTime=item.date;p.append(' • ',time);}card.append(p);return card;});
   root.replaceChildren(articleElement('h3','Recent Articles'),...nodes);root.dataset.liveArticles='ready';
  }).catch(()=>{root.replaceChildren(articleElement('h3','Recent Articles'));const a=articleElement('a','View all articles by Semitic Jew');a.href='/articles.html';root.append(a);});
 };
 refresh();const observer=new MutationObserver(()=>{refresh();if(document.querySelector('#author-modal'))observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});
})();
