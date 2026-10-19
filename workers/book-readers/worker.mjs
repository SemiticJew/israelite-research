export function signup(value) {
  if (!value || typeof value.email !== 'string' || typeof value.ebook !== 'boolean' || typeof value.paperback !== 'boolean') return null;
  const email = value.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) || /[\r\n\x00-\x1f]/.test(email) || (!value.ebook && !value.paperback) || value.consent !== true) return null;
  if (typeof value.token !== 'string' || !value.token.length || value.token.length > 2048) return null;
  return { email, ebook: +value.ebook, paperback: +value.paperback, token: value.token };
}
export default {
 async fetch(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value=>value.trim()).filter(Boolean);
  const reference=crypto.randomUUID();
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (body, status = 200) => {
   if(request.method==='POST') console.log(JSON.stringify({event:'book_signup',reference,status,result:status===200?'accepted':body.error}));
   return new Response(JSON.stringify(status>=400?{...body,reference}:body), {status,headers});
  };
  if (origin && !allowed.includes(origin)) return reply({error:'Origin not allowed'},403);
  const path = new URL(request.url).pathname;
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  try {
   if (path === '/counts' && request.method === 'GET') {
    const totals = await env.DB.prepare('SELECT total, ebook, paperback FROM totals WHERE id=1').first();
    return reply(totals);
   }
   if (path !== '/signup' || request.method !== 'POST') return reply({error:'Not found'},404);
   if (!allowed.includes(origin)) return reply({error:'Origin required'},403);
   if (!env.TURNSTILE_SECRET_KEY) return reply({error:'Signup not configured'},503);
   if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'JSON required'},415);
   // Bound the body before parsing, including requests without Content-Length.
   const reader = request.body?.getReader();
   if (!reader) return reply({error:'Missing body'},400);
   const chunks=[]; let size=0;
   while (true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>4096){await reader.cancel();return reply({error:'Body too large'},413);} chunks.push(value); }
   let input;
   try { input=JSON.parse(await new Blob(chunks).text()); } catch { return reply({error:'Invalid JSON'},400); }
   const data=signup(input);
   if (!data) return reply({error:'Check your email, choices and consent'},400);
   const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:data.token,remoteip:request.headers.get('CF-Connecting-IP') || undefined}),signal:AbortSignal.timeout(10000)
   });
   if(!verification.ok) return reply({error:'Spam check temporarily unavailable'},503);
   const check = await verification.json();
   const hosts = allowed.map(url=>new URL(url).hostname);
   if(!check.success || check.action !== 'book-signup' || !hosts.includes(check.hostname)) return reply({error:'Please retry the spam check'},400);
   // Never alter an existing person's preferences without verifying ownership.
   // Duplicate submissions have the same generic response and do not increment totals.
   const saved=await env.DB.prepare('INSERT OR IGNORE INTO readers(email,ebook,paperback) VALUES(?,?,?)').bind(data.email,data.ebook,data.paperback).run();
   if(!saved.success) return reply({error:'Signup could not be recorded'},503);
   return reply({ok:true});
  } catch { return reply({error:'Please try again shortly'},503); }
 }
};
