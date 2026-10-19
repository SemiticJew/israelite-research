(() => {
 'use strict';
 const section=document.querySelector('[data-reader-api]');
 if(!section?.dataset.readerApi || !section.dataset.turnstileSitekey) return;
 let endpoint;
 try { endpoint=new URL(section.dataset.readerApi); if(endpoint.protocol!=='https:') return; } catch { return; }
 const form=document.getElementById('reader-form');
 const status=document.getElementById('reader-status');
 const button=form.querySelector('button[type=submit]');
 let widget, token='', sending=false;
 const request=async(path,options={})=>{
  const response=await fetch(new URL('/'+path,endpoint),{...options,credentials:'omit',signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error('Request failed');
  return response.json();
 };
 async function refresh(){
  const counts=await request('counts');
  for(const key of ['total','ebook','paperback']) if(!Number.isSafeInteger(counts[key])||counts[key]<0) throw new Error('Invalid counts');
  for(const key of ['total','ebook','paperback']) document.getElementById(`reader-${key}`).textContent=counts[key].toLocaleString();
  const bar=document.getElementById('reader-progress');bar.value=Math.min(counts.total,10000);bar.hidden=false;
 }
 refresh().catch(()=>{status.textContent='Totals are temporarily unavailable.';});
 window.bookReadersReady=()=>{
  for(const node of form.querySelectorAll('input,fieldset')) node.disabled=false;
  status.textContent='Choose one or both options and complete the spam check.';
  widget=window.turnstile.render('#reader-challenge',{
   sitekey:section.dataset.turnstileSitekey,action:'book-signup',theme:'auto',
   callback:value=>{token=value;button.disabled=sending;},
   'expired-callback':()=>{token='';button.disabled=true;},
   'error-callback':()=>{token='';button.disabled=true;status.textContent='Spam check could not load. Please refresh and try again.';}
  });
 };
 const script=document.createElement('script');
 script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=bookReadersReady&render=explicit';script.async=true;
 script.onerror=()=>{status.textContent='Signup could not load. Please refresh and try again.';};document.head.append(script);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending)return;
  const data=new FormData(form);
  const payload={email:String(data.get('email')).trim(),ebook:data.has('ebook'),paperback:data.has('paperback'),consent:data.has('consent'),token};
  if(!payload.ebook&&!payload.paperback){status.textContent='Please choose at least one option.';return;}
  if(!payload.token){status.textContent='Please complete the spam check.';return;}
  sending=true;button.disabled=true;status.textContent='Saving your signup…';
  try{
   await request('signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   form.reset();status.textContent='Thank you! If this email was already registered, your existing signup has been kept. Each email counts once.';
   await refresh().catch(()=>{});
  }catch{status.textContent='We couldn’t save your signup. Please complete the spam check again and retry.';}
  finally{sending=false;token='';button.disabled=true;window.turnstile.reset(widget);}
 });
})();
