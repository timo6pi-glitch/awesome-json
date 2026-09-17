import fs from 'node:fs';
import crypto from 'node:crypto';

const DATA_DIR = process.env.RADAR_DATA_DIR || 'data/veille-business';
const radarPath = `${DATA_DIR}/radar.json`;
const latestPath = `${DATA_DIR}/latest.json`;
const now = new Date();
const nowIso = now.toISOString();

const parisParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23'
}).formatToParts(now).map(({type, value}) => [type, value]));
const localDate = `${parisParts.year}-${parisParts.month}-${parisParts.day}`;
const localHour = Number(parisParts.hour);

const families = [
  'github-et-demandes-fonctionnelles',
  'communautes-us',
  'communautes-chine-asie',
  'nouveaux-usages-developpeurs',
  'changements-plateformes',
  'logiciels-open-source-et-lacunes',
  'travail-manuel-recurrent',
  'avis-et-alternatives-logicielles'
];
const dayIndex = Math.floor(Date.UTC(Number(parisParts.year), Number(parisParts.month)-1, Number(parisParts.day)) / 86400000);
const family = families[(dayIndex * 24 + localHour) % families.length];

const painPatterns = /\b(manual|manually|tedious|painful|frustrat|broken|missing|difficult|hours? every|waste of time|workaround|doesn.t work|wish there|need a tool|looking for|alternative)\b/i;
const platformPatterns = /\b(deprecat|breaking change|removed|migration|required|sunset|end of life|api change)\b/i;
const paymentPatterns = /\b(paid|paying|subscription|\$\d+|€\d+|per month|monthly bill|revenue)\b/i;
const manualPatterns = /\b(manual|manually|spreadsheet|copy.?paste|every week|every month|hours?)\b/i;
const rejectPatterns = /\b(marketing agency|content generator|social media post|release notes? to|hire me|freelance gig|seo content)\b/i;

function readJson(path, fallback) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return fallback; }
}
function canonical(raw) {
  try { const u = new URL(raw); u.hash=''; ['utm_source','utm_medium','utm_campaign','ref'].forEach(k=>u.searchParams.delete(k)); return u.toString().replace(/\/$/, ''); }
  catch { return raw; }
}
function idFor(url) { return crypto.createHash('sha256').update(canonical(url)).digest('hex').slice(0, 18); }
function textOf(item) { return `${item.title || ''} ${item.body || item.description || item.text || ''}`.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function classify(text) {
  if (platformPatterns.test(text)) return 'PLATFORM_CHANGE';
  if (paymentPatterns.test(text)) return 'PAYMENT';
  if (manualPatterns.test(text)) return 'MANUAL_WORK';
  if (painPatterns.test(text)) return 'PAIN';
  return null;
}
async function getJson(url, headers={}) {
  const r = await fetch(url, {headers: {'User-Agent':'Galaxy-Free-Radar/1.0', ...headers}, signal: AbortSignal.timeout(15000)});
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function collect() {
  const since = new Date(now.getTime()-7*86400000).toISOString().slice(0,10);
  const ghHeaders = process.env.GITHUB_TOKEN ? {Authorization:`Bearer ${process.env.GITHUB_TOKEN}`, Accept:'application/vnd.github+json'} : {};
  if (family === 'github-et-demandes-fonctionnelles') {
    const q = encodeURIComponent(`is:issue is:open created:>=${since} label:enhancement comments:>2`);
    const j = await getJson(`https://api.github.com/search/issues?q=${q}&sort=comments&order=desc&per_page=30`, ghHeaders);
    return j.items.map(x=>({title:x.title, body:x.body, url:x.html_url, date:x.created_at, source:'GitHub Issues', region:'Monde', language:'anglais'}));
  }
  if (family === 'communautes-us' || family === 'travail-manuel-recurrent' || family === 'avis-et-alternatives-logicielles') {
    const query = family === 'travail-manuel-recurrent' ? 'manual workflow' : family === 'avis-et-alternatives-logicielles' ? 'alternative software' : 'wish there was a tool';
    const j = await getJson(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=comment&hitsPerPage=40`);
    return j.hits.map(x=>({title:x.story_title || x.title || query, body:x.comment_text, url:`https://news.ycombinator.com/item?id=${x.objectID}`, date:x.created_at, source:'Hacker News', region:'États-Unis / monde', language:'anglais'}));
  }
  if (family === 'communautes-chine-asie') {
    const j = await getJson('https://www.v2ex.com/api/topics/latest.json');
    return j.map(x=>({title:x.title, body:x.content, url:x.url, date:new Date(x.created*1000).toISOString(), source:'V2EX', region:'Chine / Asie', language:'chinois'}));
  }
  if (family === 'nouveaux-usages-developpeurs') {
    const j = await getJson('https://dev.to/api/articles?top=7&per_page=50');
    return j.map(x=>({title:x.title, body:x.description, url:x.url, date:x.published_at, source:'DEV Community', region:'Monde', language:'anglais'}));
  }
  const repos = family === 'changements-plateformes'
    ? ['n8n-io/n8n','Shopify/shopify-api-js','vercel/next.js']
    : ['calcom/cal.com','frappe/erpnext','nextcloud/server'];
  const all=[];
  for (const repo of repos) {
    const j = await getJson(`https://api.github.com/repos/${repo}/issues?state=open&sort=comments&direction=desc&per_page=30`, ghHeaders);
    all.push(...j.filter(x=>!x.pull_request).map(x=>({title:x.title, body:x.body, url:x.html_url, date:x.created_at, source:`GitHub ${repo}`, region:'Monde', language:'anglais'})));
  }
  return all;
}

const radar = readJson(radarPath, {version:1, updatedAt:null, sourceFamilies:families, signals:[], rejected:[]});
radar.sourceFamilies = families;
const known = new Set([...radar.signals, ...radar.rejected].map(x=>canonical(x.url)));
let items=[]; let collectionError=null;
try { items = await collect(); } catch (e) { collectionError=String(e.message || e); }

const newSignals=[]; const newRejected=[];
for (const item of items) {
  if (!item.url || !item.date || known.has(canonical(item.url))) continue;
  const text=textOf(item);
  const evidenceType=classify(text);
  if (rejectPatterns.test(text)) {
    newRejected.push({url:canonical(item.url), reason:'Sujet exclu par les règles du radar (service, contenu marketing ou mission).', rejectedAt:nowIso});
  } else if (evidenceType && text.length >= 80) {
    const excerpt=text.slice(0,420);
    newSignals.push({
      id:idFor(item.url), firstSeenAt:nowIso, lastSeenAt:nowIso,
      region:item.region, language:item.language, sourceFamily:family,
      title:(item.title || 'Signal sans titre').slice(0,180), url:canonical(item.url), sourceName:item.source,
      observedFact:excerpt, evidenceType,
      freshness:`Publié le ${String(item.date).slice(0,10)} ; collecté le ${localDate}.`,
      buyerHypothesis:'Acheteur à identifier précisément après revue humaine.',
      softwareHypothesis:'Possibilité de produit logiciel à qualifier ; aucune opportunité validée à ce stade.',
      confidence:evidenceType === 'PAYMENT' || evidenceType === 'PLATFORM_CHANGE' ? 'MEDIUM' : 'LOW', status:'UNREVIEWED'
    });
  }
  if (newSignals.length >= 12) break;
}

if (newSignals.length || newRejected.length) {
  radar.signals=[...newSignals,...radar.signals].slice(0,200);
  radar.rejected=[...newRejected,...radar.rejected].slice(0,100);
  radar.updatedAt=nowIso;
  radar.lastRun={at:nowIso,family,region:newSignals[0]?.region || 'aucun signal retenu',newSignals:newSignals.length,collectionError};
  fs.mkdirSync(DATA_DIR,{recursive:true});
  fs.writeFileSync(radarPath, JSON.stringify(radar,null,2)+'\n');
}

const existingLatest=readJson(latestPath, null);
if (localHour >= 8 && existingLatest?.date !== localDate && radar.signals.length) {
  const weights={PAYMENT:5,PLATFORM_CHANGE:4,MANUAL_WORK:3,PAIN:2,NEW_USAGE:1};
  const ranked=[...radar.signals].sort((a,b)=>(weights[b.evidenceType]||0)-(weights[a.evidenceType]||0) || String(b.firstSeenAt).localeCompare(String(a.firstSeenAt))).slice(0,3);
  const latest={
    version:2,date:localDate,decision:'RECHERCHER',headline:'Signaux logiciels à examiner',
    summary:'Rapport automatique indépendant de ChatGPT. Les éléments sont des signaux publics à vérifier, pas des business validés.',
    candidates:ranked.map(s=>({
      name:s.title, verdict:'RECHERCHER', buyer:s.buyerHypothesis, problem:s.observedFact,
      evidence:`${s.sourceName} — ${s.freshness}`, payment:s.evidenceType==='PAYMENT'?'Paiement ou dépense mentionné dans la source ; montant et représentativité à vérifier.':'Aucun paiement confirmé pour cette hypothèse.',
      competition:'Concurrents et solution native à rechercher avant tout développement.',
      improvement:s.softwareHypothesis, counterproof:'Signal isolé ou automatisé : fréquence, budget et représentativité restent inconnus.',
      channel:'Canal écrit à identifier après confirmation de l’acheteur ; aucun trafic garanti.',
      feasibility:'Un prototype ne doit être lancé qu’après revue manuelle et test de paiement.',
      test:'Lire la source, identifier cinq acheteurs comparables et vérifier le problème avant de coder.',
      sources:[{label:s.sourceName,url:s.url}]
    })),
    excluded:[], coverage:{text:`Collecte automatique ${family}. ${newSignals.length} nouveau(x) signal(aux) lors du dernier passage.`,tags:['Web public gratuit',family,'Sans ChatGPT']}
  };
  fs.writeFileSync(latestPath, JSON.stringify(latest,null,2)+'\n');
}

console.log(JSON.stringify({family,newSignals:newSignals.length,newRejected:newRejected.length,collectionError,reportDate:localHour>=8?localDate:null}));
