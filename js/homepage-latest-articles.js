(() => {
 const mount=document.getElementById('homepage-latest-articles');if(!mount)return;
 window.loadArticleCatalog().then(items=>{
  if(!items.length)return;
  const nodes=items.slice(0,3).map(item=>{
   const card=articleElement('article','','home-card home-article');
   if(item.image){const img=document.createElement('img');img.src=item.image;img.alt='';img.loading='lazy';card.append(img);}
   const h=articleElement('h3','');const a=articleElement('a',item.title);a.href=item.href;h.append(a);card.append(h);
   card.append(articleElement('p','By '+item.author,'byline'),articleElement('p',item.excerpt,'article-excerpt'));
   const more=articleElement('a','Read more','read-more');more.href=item.href;card.append(more);return card;
  });mount.replaceChildren(...nodes);
 }).catch(console.warn);
})();
