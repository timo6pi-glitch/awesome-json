const KEY = "veille-business-reports-v1";
const FEED_URL = "https://raw.githubusercontent.com/timo6pi-glitch/awesome-json/veille-business-feed/veille-business/latest.json";

const initialReport = {
  version: 1,
  date: "2026-09-17",
  decision: "RECHERCHER",
  headline: "Vérifier les fichiers graphiques avant fabrication",
  summary: "Une douleur technique est documentée et un produit voisin affiche des revenus vérifiés. La fréquence du problème et la volonté de payer restent à établir avant de construire.",
  candidates: [
    {
      name: "Contrôle de fichiers pour découpe laser",
      verdict: "RECHERCHER",
      buyer: "Petits ateliers de découpe laser et vendeurs de fichiers SVG",
      problem: "Des masques, formes superposées ou doublons peuvent créer des tracés supplémentaires et des doubles découpes.",
      evidence: "LightBurn documente les formes supplémentaires à l’import et le nettoyage manuel. VectoSolve affiche 3 206 $ de revenu sur 30 jours, 1 707 $ de MRR et 239 abonnements actifs, avec une vérification Stripe datée du 17 septembre 2026.",
      payment: "Revenus observés chez VectoSolve, produit voisin. Aucun paiement observé pour notre concept.",
      competition: "LightBurn supprime déjà certains doublons et VectoSolve convertit déjà les fichiers. Un simple convertisseur serait insuffisant.",
      improvement: "Audit par lots et comparaison visuelle entre dessin affiché et chemins réellement exportés.",
      counterproof: "La correction géométrique fiable et la validation sur machines sont difficiles ; la récurrence d’achat est inconnue.",
      channel: "Démonstrations avant/après sur des fichiers autorisés dans les communautés de fabrication. Conversion non démontrée.",
      feasibility: "Prototype SVG local possible sans API payante. Coûts d’exploitation et validation matérielle inconnus.",
      test: "Comparer dix fichiers problématiques autorisés aux fonctions natives et mesurer détection, faux positifs et temps de correction.",
      sources: [
        { label: "Documentation LightBurn", url: "https://docs.lightburnsoftware.com/latest/Troubleshooting/ImportedExtraLines/" },
        { label: "Revenus VectoSolve", url: "https://trustmrr.com/startup/vectosolve" }
      ]
    },
    {
      name: "Contrôle des secrets pour agents IA",
      verdict: "RECHERCHER",
      buyer: "Petites équipes techniques utilisant plusieurs agents de code",
      problem: "Les agents et IDE doivent accéder à des secrets sans ouvrir toutes les données sensibles de la machine.",
      evidence: "Floria a été présenté le 17 septembre sur V2EX avec autorisations par application et confirmation Touch ID.",
      payment: "Aucun paiement ni volonté de payer observés.",
      competition: "Floria est déjà disponible en open source.",
      improvement: "Administration d’équipe et prise en charge d’autres systèmes, hypothèse non validée.",
      counterproof: "Sécurité, confiance, support système et audits rendent ce produit difficile à exploiter seul.",
      channel: "Démonstrations techniques et intégrations développeurs ; acquisition non démontrée.",
      feasibility: "Recherche technique accessible, produit complet trop ambitieux comme premier business.",
      test: "Chercher des besoins d’équipe explicitement non couverts avant tout développement.",
      sources: [
        { label: "Présentation V2EX", url: "https://www.v2ex.com/t/1242599" },
        { label: "Dépôt Floria", url: "https://github.com/ratazzi/floria" }
      ]
    }
  ],
  excluded: [
    { name: "Import de catalogues PDF vers Shopify", reason: "Importier couvre déjà extraction, variantes, validation et retour arrière ; avantage précis non trouvé." },
    { name: "Conversion de relevés bancaires", reason: "CapyParse affiche déjà des abonnements et plusieurs exports ; différenciation insuffisante." },
    { name: "Versions locales de fichiers", reason: "LumeTrace couvre déjà l’idée en open source, sans preuve de paiement." }
  ],
  coverage: {
    text: "12 recherches et 20 ouvertures de pages, échecs inclus. Sources anglophones, produit français et communauté sinophone consultés. Aucun marché chinois validé.",
    tags: ["États-Unis / anglais", "Europe / français", "Communauté sinophone", "Web public"]
  }
};

function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : null;
  } catch { return null; }
}
function cleanText(value, max = 4000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function normalizeReport(input) {
  if (!input || typeof input !== "object") throw new Error("Le rapport n’est pas un objet JSON.");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null;
  if (!date) throw new Error("Date manquante ou invalide.");
  const decisions = ["TESTER", "RECHERCHER", "ÉCARTER"];
  const decision = decisions.includes(input.decision) ? input.decision : "RECHERCHER";
  const candidates = Array.isArray(input.candidates) ? input.candidates.slice(0, 3).map((c) => ({
    name: cleanText(c.name, 160) || "Candidat sans nom",
    verdict: decisions.includes(c.verdict) ? c.verdict : "RECHERCHER",
    buyer: cleanText(c.buyer), problem: cleanText(c.problem), evidence: cleanText(c.evidence),
    payment: cleanText(c.payment), competition: cleanText(c.competition),
    improvement: cleanText(c.improvement), counterproof: cleanText(c.counterproof),
    channel: cleanText(c.channel), feasibility: cleanText(c.feasibility), test: cleanText(c.test),
    sources: Array.isArray(c.sources) ? c.sources.slice(0, 8).map(s => ({ label: cleanText(s.label, 100), url: safeUrl(s.url) })).filter(s => s.url) : []
  })) : [];
  return {
    version: 1, date, decision,
    headline: cleanText(input.headline, 220) || (candidates[0]?.name ?? "Aucun candidat retenu"),
    summary: cleanText(input.summary),
    candidates,
    excluded: Array.isArray(input.excluded) ? input.excluded.slice(0, 10).map(e => ({ name: cleanText(e.name, 140), reason: cleanText(e.reason) })) : [],
    coverage: {
      text: cleanText(input.coverage?.text),
      tags: Array.isArray(input.coverage?.tags) ? input.coverage.tags.slice(0, 8).map(x => cleanText(x, 80)).filter(Boolean) : []
    }
  };
}
function extractJson(text) {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return JSON.parse(fenced[1]);
  const start = trimmed.indexOf("{"), end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error("Aucun bloc JSON valide trouvé.");
}
function loadReports() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    const reports = Array.isArray(parsed) ? parsed.map(normalizeReport) : [];
    return reports.some(r => r.date === initialReport.date) ? reports : [initialReport, ...reports];
  } catch { return [initialReport]; }
}
function saveReports(reports) {
  localStorage.setItem(KEY, JSON.stringify(reports.slice(0, 45)));
}
function storeReport(report) {
  reports = [report, ...reports.filter(r => r.date !== report.date)].sort((a,b) => b.date.localeCompare(a.date));
  saveReports(reports);
}
let reports = loadReports().sort((a,b) => b.date.localeCompare(a.date));
let current = reports[0];

const $ = (id) => document.getElementById(id);
function text(el, value) { el.textContent = value || ""; }
function node(tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined) el.textContent = value;
  return el;
}
function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle:"long" }).format(new Date(date + "T12:00:00Z"));
}
function render(report) {
  current = report;
  text($("reportDate"), formatDate(report.date));
  text($("headline"), report.headline);
  text($("summary"), report.summary);
  text($("candidateCount"), report.candidates.length ? report.candidates.length + " piste" + (report.candidates.length > 1 ? "s" : "") : "aucune piste");
  text($("candidateTotal"), report.candidates.length + " / 3");
  const badge = $("decisionBadge");
  text(badge, report.decision); badge.className = "decision-badge " + report.decision;
  $("candidateList").replaceChildren();
  if (!report.candidates.length) $("candidateList").append(node("p", "empty", "Aucun candidat retenu aujourd’hui. Cela ne prouve pas une absence d’opportunité."));
  report.candidates.forEach((c, i) => {
    const card = node("button", "candidate"); card.type = "button";
    const top = node("div", "candidate-top");
    top.append(node("span", "rank", "PISTE " + String(i + 1).padStart(2,"0")), node("span", "verdict", c.verdict));
    card.append(top, node("h3", "", c.name), node("p", "", c.problem));
    const foot = node("div", "candidate-foot");
    foot.append(node("span", "", c.buyer || "Acheteur inconnu"), node("span", "arrow", "↗"));
    card.append(foot); card.addEventListener("click", () => openDetail(c));
    $("candidateList").append(card);
  });
  text($("coverageText"), report.coverage.text || "Couverture non documentée.");
  $("coverageTags").replaceChildren(...report.coverage.tags.map(t => node("span", "tag", t)));
  $("excludedList").replaceChildren(...report.excluded.map(e => {
    const row = node("div", "excluded");
    row.append(node("strong", "", e.name), node("span", "", e.reason));
    return row;
  }));
  renderHistory();
}
function openDetail(c) {
  const host = $("detailContent"); host.replaceChildren();
  host.append(node("div", "section-label", c.verdict), node("h2", "", c.name));
  const blocks = [
    ["ACHETEUR", c.buyer], ["PROBLÈME", c.problem], ["PREUVES", c.evidence],
    ["PAIEMENT OBSERVÉ", c.payment], ["CONCURRENCE", c.competition],
    ["AMÉLIORATION HYPOTHÉTIQUE", c.improvement], ["CONTRE-PREUVE", c.counterproof],
    ["CANAL POSSIBLE", c.channel], ["FAISABILITÉ", c.feasibility], ["PREMIER TEST", c.test]
  ];
  blocks.filter(([,v]) => v).forEach(([label,value]) => {
    const b = node("div", "detail-block"); b.append(node("h3", "", label), node("p", "", value)); host.append(b);
  });
  if (c.sources.length) {
    const b = node("div", "detail-block"); b.append(node("h3", "", "SOURCES"));
    c.sources.forEach(s => { const a = node("a", "source-link", s.label || "Source"); a.href=s.url; a.target="_blank"; a.rel="noopener noreferrer"; b.append(a); });
    host.append(b);
  }
  $("detailDialog").showModal();
}
function renderHistory() {
  const host = $("historyList"); host.replaceChildren();
  if (!reports.length) { host.append(node("p", "empty", "Aucun rapport enregistré.")); return; }
  reports.forEach(r => {
    const b=node("button","history-item"); b.type="button";
    b.append(node("strong","",formatDate(r.date)), node("span","",r.decision+" · "+r.candidates.length+" piste"+(r.candidates.length>1?"s":"")));
    b.addEventListener("click",()=>{render(r);scrollTo({top:0,behavior:"smooth"});});
    host.append(b);
  });
}
function toast(message) {
  const el=$("toast"); text(el,message); el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200);
}
const fallbackPrompt = "Produis à la fin de la veille un unique bloc JSON valide avec : version=1, date YYYY-MM-DD, decision TESTER/RECHERCHER/ÉCARTER, headline, summary, candidates (maximum 3 : name, verdict, buyer, problem, evidence, payment, competition, improvement, counterproof, channel, feasibility, test, sources[{label,url}]), excluded[{name,reason}], coverage{text,tags}. N’invente aucune donnée manquante.";

$("openImport").addEventListener("click",()=>{ $("importError").textContent=""; $("reportInput").value=""; $("importDialog").showModal(); });
$("importReport").addEventListener("click",()=>{
  try {
    const report=normalizeReport(extractJson($("reportInput").value));
    storeReport(report); render(report); $("importDialog").close(); toast("Rapport enregistré");
  } catch (err) { text($("importError"), err instanceof Error ? err.message : "Rapport invalide."); }
});
$("copyPrompt").addEventListener("click",async()=>{
  try { await navigator.clipboard.writeText(fallbackPrompt); toast("Prompt copié"); }
  catch { $("reportInput").value=fallbackPrompt; $("reportInput").select(); }
});
$("clearHistory").addEventListener("click",()=>{
  if (!confirm("Effacer les rapports importés sur ce téléphone ?")) return;
  reports=[initialReport]; saveReports(reports); render(initialReport); toast("Historique effacé");
});

async function syncLatestReport() {
  const freshness = $("freshness");
  try {
    const response = await fetch(FEED_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const report = normalizeReport(await response.json());
    const wasNew = !reports.some(r => r.date === report.date);
    storeReport(report);
    render(reports[0]);
    text(freshness, "Veille synchronisée");
    if (wasNew) toast("Nouveau rapport reçu");
  } catch {
    text(freshness, "Dernier rapport disponible");
  }
}

render(current);
syncLatestReport();
addEventListener("online", syncLatestReport);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") syncLatestReport();
});
if ("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
