import { readFile, readdir, mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const out = 'dist';
const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const cleanDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
const dateDisplay = value => value ? new Intl.DateTimeFormat('en-AU', {year:'numeric', month:'long', day:'numeric',timeZone:'UTC'}).format(new Date(value + 'T12:00:00Z')) : '';
function parseMarkdown(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if(match) for(const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([\w-]+):\s*(.*?)\s*$/);
    if(m) meta[m[1]] = m[2].replace(/^['"]|['"]$/g,'');
  }
  const body = match ? md.slice(match[0].length) : md;
  return {meta, body};
}
function bodyHtml(body) {
  return body.trim().split(/\r?\n\s*\r?\n/).filter(Boolean).map(p=>'<p>'+p.split(/\r?\n/).map(escapeHtml).join('<br>')+'</p>').join('\n');
}
await mkdir(out,{recursive:true});
const home = await readFile('index.html','utf8');
await copyFile('logo.png',path.join(out,'logo.png'));
let articles = [];
try {
  const files = await readdir('content/news');
  for (const file of files) {
    if (!file.endsWith('.md') || file.toLowerCase().includes('test')) continue;
    const {meta,body} = parseMarkdown(await readFile(path.join('content/news',file),'utf8'));
    if (!meta.title || meta.draft === 'true' || meta.published === 'false') continue;
    const slug = file.replace(/\.md$/,'');
    if(!/^[a-zA-Z0-9_-]+$/.test(slug)) continue;
    articles.push({ title: meta.title, date: cleanDate(meta.date), slug, body });
  }
} catch(e) { if(e.code !== 'ENOENT') throw e; }
articles.sort((a,b)=>(b.date || '').localeCompare(a.date || ''));
const section = articles.length ? `<section id="news" class="section" style="background:#e8eee3"><div class="wrap"><div class="eyebrow" style="color:#a83243">From the club</div><h2>Latest club news</h2><p>Working bees, restoration progress and community announcements.</p><div class="grid3">${articles.slice(0,6).map(a=>`<article class="tile"><div class="small">${escapeHtml(dateDisplay(a.date))}</div><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.body.replace(/[#*`\[\]]/g,'').trim().slice(0,155))}${a.body.length>155?'…':''}</p><p style="margin-top:14px"><a href="/news/${encodeURIComponent(a.slug)}.html">Read update →</a></p></article>`).join('')}</div></div></section>` : '';
const navItem = articles.length ? '<a href="#news">News</a>' : '';
let builtHome = home;
if(navItem) builtHome = builtHome.replace('<a href="#contact">Contact</a>',navItem+'<a href="#contact">Contact</a>');
builtHome = builtHome.replace('</main>', section + '</main>');
await writeFile(path.join(out,'index.html'),builtHome);
await mkdir(path.join(out,'news'),{recursive:true});
for(const a of articles) {
  const doc = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(a.title)} | Rosedale Golf Course</title><style>body{margin:0;background:#f6f3ea;color:#092c20;font:18px/1.7 Arial,sans-serif}.wrap{max-width:760px;margin:auto;padding:40px 24px}header,footer{background:#092c20;color:white;padding:22px}a{color:inherit}h1{font:normal clamp(2rem,5vw,3.5rem)/1.12 Georgia,serif}article{background:#fffefa;padding:clamp(20px,5vw,45px);border:1px solid #e4e1d7}p{overflow-wrap:anywhere}.date{font-size:14px;color:#526154}</style></head><body><header><div class="wrap" style="padding-top:0;padding-bottom:0"><a href="/">← Rosedale Golf Course &amp; Driving Range Inc.</a></div></header><main class="wrap"><article><p class="date">${escapeHtml(dateDisplay(a.date))}</p><h1>${escapeHtml(a.title)}</h1>${bodyHtml(a.body)}</article><p><a href="/#news">← Back to club news</a></p></main><footer><div class="wrap" style="padding-top:0;padding-bottom:0">Rosedale Golf Course &amp; Driving Range Inc.</div></footer></body></html>`;
  await writeFile(path.join(out,'news',a.slug+'.html'),doc);
}
console.log(`Built website and ${articles.length} public news article(s) into ${out}/`);
