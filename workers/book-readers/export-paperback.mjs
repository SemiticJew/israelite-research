// Run locally with Cloudflare login. Never deploy exported contact files.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
const data=JSON.parse(execFileSync('npx',['wrangler','d1','execute','semitic-jew-book-readers','--remote','--json','--command','SELECT email, created_at, consent_version FROM readers WHERE paperback=1 ORDER BY created_at'],{encoding:'utf8'}));
const rows=data.flatMap(item=>item.results||[]);
const csv=value=>'"'+String(/^[=+\-@]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
const path=join(homedir(),'Downloads',`christian-marxism-paperback-${Date.now()}.csv`);
writeFileSync(path,['Email,Signup date,Consent version',...rows.map(row=>[row.email,row.created_at,row.consent_version].map(csv).join(','))].join('\n'),{mode:0o600});
console.log(`Exported ${rows.length} paperback notification requests to ${path}`);
