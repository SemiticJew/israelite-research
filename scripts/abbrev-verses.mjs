import fs from 'fs';
import path from 'path';

const root = process.argv[2] || '.';

// Abbreviation rules
const rules = [
  // OT
  [/\bGenesis\b/g, 'Gen'],
  [/\bExodus\b/g, 'Exod'],
  [/\bLeviticus\b/g, 'Lev'],
  [/\bNumbers\b/g, 'Num'],
  [/\bDeuteronomy\b/g, 'Deut'],
  [/\bJoshua\b/g, 'Josh'],
  [/\bJudges\b/g, 'Judg'],
  [/\bRuth\b/g, 'Ruth'],
  [/\b1\s*Samuel\b/gi, '1 Sam'],
  [/\b2\s*Samuel\b/gi, '2 Sam'],
  [/\b1\s*Kings\b/gi, '1 Kgs'],
  [/\b2\s*Kings\b/gi, '2 Kgs'],
  [/\b1\s*Chronicles\b/gi, '1 Chr'],
  [/\b2\s*Chronicles\b/gi, '2 Chr'],
  [/\bEzra\b/g, 'Ezra'],
  [/\bNehemiah\b/g, 'Neh'],
  [/\bEsther\b/g, 'Esth'],
  [/\bJob\b/g, 'Job'],
  [/\bPsalms?\b/g, 'Ps'],
  [/\bProverbs\b/g, 'Prov'],
  [/\bEcclesiastes\b/g, 'Eccl'],
  [/\bSong of (Songs|Solomon)\b/gi, 'Song'],
  [/\bIsaiah\b/g, 'Isa'],
  [/\bJeremiah\b/g, 'Jer'],
  [/\bLamentations\b/g, 'Lam'],
  [/\bEzekiel\b/g, 'Ezek'],
  [/\bDaniel\b/g, 'Dan'],
  [/\bHosea\b/g, 'Hos'],
  [/\bJoel\b/g, 'Joel'],
  [/\bAmos\b/g, 'Amos'],
  [/\bObadiah\b/g, 'Obad'],
  [/\bJonah\b/g, 'Jonah'],
  [/\bMicah\b/g, 'Mic'],
  [/\bNahum\b/g, 'Nah'],
  [/\bHabakkuk\b/g, 'Hab'],
  [/\bZephaniah\b/g, 'Zeph'],
  [/\bHaggai\b/g, 'Hag'],
  [/\bZechariah\b/g, 'Zech'],
  [/\bMalachi\b/g, 'Mal'],

  // NT numbered first to avoid clobbering
  [/\b1\s*John\b/gi, '1 Jn'],
  [/\b2\s*John\b/gi, '2 Jn'],
  [/\b3\s*John\b/gi, '3 Jn'],
  [/\b1\s*Peter\b/gi, '1 Pet'],
  [/\b2\s*Peter\b/gi, '2 Pet'],
  [/\b1\s*Corinthians\b/gi, '1 Cor'],
  [/\b2\s*Corinthians\b/gi, '2 Cor'],
  [/\b1\s*Thessalonians\b/gi, '1 Thess'],
  [/\b2\s*Thessalonians\b/gi, '2 Thess'],
  [/\b1\s*Timothy\b/gi, '1 Tim'],
  [/\b2\s*Timothy\b/gi, '2 Tim'],

  // NT non-numbered
  [/\bMatthew\b/g, 'Matt'],
  [/\bMark\b/g, 'Mark'],
  [/\bLuke\b/g, 'Luke'],
  // Bare "John" (not numbered) → "Jn"
  [/\bJohn\b/g, 'Jn'],
  [/\bActs\b/g, 'Acts'],
  [/\bRomans\b/g, 'Rom'],
  [/\bGalatians\b/g, 'Gal'],
  [/\bEphesians\b/g, 'Eph'],
  [/\bPhilippians\b/g, 'Phil'],
  [/\bColossians\b/g, 'Col'],
  [/\bTitus\b/g, 'Tit'],
  [/\bPhilemon\b/g, 'Philem'],
  [/\bHebrews\b/g, 'Heb'],
  [/\bJames\b/g, 'Jas'],
  [/\bJude\b/g, 'Jude'],
  [/\bRevelation\b/g, 'Rev'],
];

function abbrevBlock(txt){
  let out = txt;
  for (const [rx, rep] of rules) out = out.replace(rx, rep);
  return out;
}

function processHtml(src){
  // Abbreviate inside verse spans first (if any remain)
  let out = src.replace(/(<span class="verse">)(.*?)(<\/span>)/gsi, (m, a, mid, b) => a + abbrevBlock(mid) + b);
  // Abbreviate inside Notes & Bibliography list
  out = out.replace(/(<section[^>]*class="footnotes"[^>]*>[\s\S]*?<\/section>)/gsi, (m) => abbrevBlock(m));
  return out;
}

function walk(dir){
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()){
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(p);
    } else if (e.isFile() && e.name.endsWith('.html')){
      const src = fs.readFileSync(p, 'utf8');
      const out = processHtml(src);
      if (out !== src){
        fs.writeFileSync(p, out, 'utf8');
        console.log('Updated:', p);
      }
    }
  }
}

walk(root);
