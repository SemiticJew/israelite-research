(() => {
 'use strict';
 const section=document.querySelector('[data-reader-api]');
 if(!section?.dataset.readerApi || !section.dataset.turnstileSitekey) return;
 let endpoint;
 try { endpoint=new URL(section.dataset.readerApi); if(endpoint.protocol!=='https:') return; } catch { return; }
 const form=document.getElementById('reader-form');
 const status=document.getElementById('reader-status');
 const button=form.querySelector('button[type=submit]');
 let widget, token='', sending=false, refreshing=false;
 const updates=document.createElement('p');
 updates.className='reader-update-status';
 updates.setAttribute('role','status');
 document.getElementById('reader-progress').after(updates);
 const showStatus=message=>{status.textContent=message;status.setAttribute('tabindex','-1');status.focus({preventScroll:true});};
 const request=async(path,options={})=>{
  const response=await fetch(new URL('/'+path,endpoint),{...options,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok) {
   const error=new Error('Request failed');
   error.reference=result.reference;
   error.status=response.status;
   throw error;
  }
  return result;
 };
 async function refresh(){
  if(refreshing)return;
  refreshing=true;
  try {
  const counts=await request('counts');
  for(const key of ['total','ebook','paperback']) if(!Number.isSafeInteger(counts[key])||counts[key]<0) throw new Error('Invalid counts');
  for(const key of ['total','ebook','paperback']) document.getElementById(`reader-${key}`).textContent=counts[key].toLocaleString();
  const bar=document.getElementById('reader-progress');bar.value=Math.min(counts.total,10000);bar.hidden=false;
  updates.textContent='Updated '+new Date().toLocaleTimeString()+'. Totals refresh every 30 seconds while this page is open.';
  } catch(error) {
   updates.textContent='Live totals are temporarily unavailable. Retrying automatically.';
   throw error;
  } finally {refreshing=false;}
 }
 const refreshQuietly=()=>{if(!document.hidden)refresh().catch(()=>{});};
 refreshQuietly();
 setInterval(refreshQuietly,30000);
 document.addEventListener('visibilitychange',refreshQuietly);
 window.addEventListener('online',refreshQuietly);
 form.addEventListener('invalid',()=>{status.textContent='Please enter a valid email and check the consent box before submitting.';},true);
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
  if(!payload.ebook&&!payload.paperback){showStatus('Please choose at least one option.');return;}
  if(!payload.token){status.textContent='Please complete the spam check.';return;}
  sending=true;button.disabled=true;status.textContent='Saving your signup…';
  try{
   const saved=await request('signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   if(saved.ok!==true)throw new Error('Unconfirmed signup');
   form.reset();showStatus('Your email is on the reader list. Thank you! Each email counts once; repeat submissions keep your original choices. No confirmation email is sent.');
   await refresh().catch(()=>{});
  }catch(error){
   const message=error.status===400?'Please check your choices and complete the spam check again.':error.status===403?'Please open this form directly at semiticjew.org and try again.':'We couldn’t confirm your signup. Your entries are still here; please try again. Repeating a signup will not count you twice.';
   const reference=typeof error.reference==='string'&&/^[a-f0-9-]{36}$/.test(error.reference)?' Support reference: '+error.reference:'';
   showStatus(message+reference);
  }
  finally{sending=false;token='';button.disabled=true;window.turnstile.reset(widget);}
 });
})();
