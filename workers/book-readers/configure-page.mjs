import {readFileSync,writeFileSync} from 'node:fs';
const [address,key]=process.argv.slice(2);
const url=new URL(address);
if(url.protocol!=='https:' || !/^[A-Za-z0-9_-]+$/.test(key||'')) throw new Error('Supply your deployed HTTPS Worker URL and public Turnstile site key.');
const file=new URL('../../christian-marxism.html',import.meta.url);
let html=readFileSync(file,'utf8');
html=html.replace(/data-reader-api="[^"]*"/,`data-reader-api="${url.origin}"`).replace(/data-turnstile-sitekey="[^"]*"/,`data-turnstile-sitekey="${key}"`);
writeFileSync(file,html);
console.log('Book page configured. Preview and test a signup before pushing.');
