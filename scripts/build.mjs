// Générateur du site : recipes/*.gram → dist/
// Parse avec @gram-lang/parser, compile avec @gram-lang/kitchen, rend du HTML statique.
import { getAST } from "@gram-lang/parser";
import { compile, aggregateSectionIngredients } from "@gram-lang/kitchen";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const SITE_URL = "https://bernardstanislas.github.io/cuisine";
const REPO_URL = "https://github.com/Bernardstanislas/cuisine";
const SITE_NAME = "Carnet de cuisine";

// ---------------------------------------------------------------- helpers

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// « crème » → « creme » : la recherche ignore les accents (même pli côté app.js)
const fold = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const UNIT_LABELS = { cs: "c. à soupe", cc: "c. à café" };
const prettyUnit = (u) => (u ? UNIT_LABELS[u] ?? u : "");

const FRACTIONS = { "1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾" };

const fmtNumber = (n) => {
  const r = Math.round(n * 100) / 100;
  return String(r).replace(".", ",");
};

// Formate une valeur de quantité compilée (nombre, fraction, plage, texte).
function fmtQtyValue(q) {
  if (q == null) return "";
  if (typeof q === "number") return fmtNumber(q);
  if (typeof q === "string") return q;
  if (q.type === "range" && q.range) return `${fmtNumber(q.range.min)}–${fmtNumber(q.range.max)}`;
  if (q.type === "fraction") {
    const t = q.text ?? "";
    for (const [a, u] of Object.entries(FRACTIONS)) if (t.trim() === a) return u;
    const m = t.match(/^(\d+)\s+(\d\/\d)$/);
    if (m && FRACTIONS[m[2]]) return `${m[1]} ${FRACTIONS[m[2]]}`;
    return t || fmtNumber(q.value);
  }
  if (q.type === "single") return fmtNumber(q.value);
  if (q.type === "text") return q.text ?? String(q.value ?? "");
  return q.text ?? String(q.value ?? "");
}

const numericQty = (q) =>
  typeof q === "number" ? q : q && (q.type === "single" || q.type === "fraction") ? q.value : null;

// minutes → « 45 min », « 1 h 30 », « 24 h », « 2 j »
function fmtMinutes(min) {
  min = Math.round(min);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  if (h >= 48 && r === 0 && h % 24 === 0) return `${h / 24} j`;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

// Pour les totaux affichés : au-delà de 2 h, arrondi au quart d'heure.
function fmtMinutesRounded(min) {
  return fmtMinutes(min > 120 ? Math.round(min / 15) * 15 : min);
}

// « -1d » → « la veille », « -2h » → « 2 h avant »
function fmtRetro(retro) {
  const m = String(retro).match(/-?(\d+(?:\.\d+)?)\s*(d|h|min|m)/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit === "d") return n === 1 ? "la veille" : `${n} jours avant`;
  if (unit === "h") return `${n} h avant`;
  return `${n} min avant`;
}

const retroMinutes = (retro) => {
  const m = String(retro).match(/-?(\d+(?:\.\d+)?)\s*(d|h|min|m)/);
  if (!m) return 0;
  return Number(m[1]) * ({ d: 1440, h: 60 }[m[2]] ?? 1);
};

// Icônes inline (12px) — pas d'emoji : rendu identique partout.
const ICONS = {
  timer:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 22a9 9 0 1 1 9-9 9 9 0 0 1-9 9Zm0-16a7 7 0 1 0 7 7 7 7 0 0 0-7-7Zm1 7.4 3.1 1.8-1 1.7L11 14.5V9h2ZM9 1h6v2H9Z"/></svg>',
  rest:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h12v2l-.9.9L13 9v6l4.1 4.1.9.9v2H6v-2l.9-.9L11 15V9L6.9 4.9 6 4Zm3.4 2L12 6.6 14.6 4ZM12 17.4 9.4 20h5.2Z"/></svg>',
  temp:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 13.2V5a3 3 0 0 0-6 0v8.2a5 5 0 1 0 6 0ZM12 4a1 1 0 0 1 1 1v3h-2V5a1 1 0 0 1 1-1Zm0 16a3 3 0 0 1-1-5.83V13h2v1.17A3 3 0 0 1 12 20Z"/></svg>',
  people:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 11a4 4 0 1 1 4-4 4 4 0 0 1-4 4Zm0 2c4.4 0 8 2.2 8 5v3H4v-3c0-2.8 3.6-5 8-5Z"/></svg>',
  hand:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 11.2V4.5a1.5 1.5 0 0 1 3 0V10h1V2.5a1.5 1.5 0 0 1 3 0V10h1V4a1.5 1.5 0 0 1 3 0v9.6c0 4.6-2.9 8.4-7.5 8.4-3.4 0-5.2-1.6-6.7-4.4l-2.6-5a1.4 1.4 0 0 1 .6-1.9 2 2 0 0 1 2.5.5Z"/></svg>',
  moon:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 14.6A9 9 0 0 1 9.4 3 9 9 0 1 0 21 14.6Z"/></svg>',
};
const icon = (name) => `<span class="i">${ICONS[name]}</span>`;

// ------------------------------------------------------- chargement recettes

function loadRecipes() {
  const dir = join(ROOT, "recipes");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".gram"))
    .map((f) => {
      const source = readFileSync(join(dir, f), "utf8");
      const compiled = compile(getAST(source));
      const slug = basename(f, ".gram");
      for (const w of compiled.warnings ?? []) {
        console.warn(`⚠ ${f}: ${w.message}`);
      }
      return { slug, file: f, source, compiled };
    })
    .sort((a, b) => a.compiled.title.localeCompare(b.compiled.title, "fr"));
}

// ------------------------------------------------- historique d'affinage
// Convention de commit : « recette(<slug>): commentaire » (le scope est
// facultatif quand le commit ne touche qu'une recette). Le premier commit du
// fichier devient « Entrée au carnet » même sans convention.

const DATE_FR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function recipeHistory(file, slug) {
  let out = "";
  try {
    out = execFileSync(
      "git",
      ["log", "--follow", "--format=%H%x09%aI%x09%s", "--", `recipes/${file}`],
      { cwd: ROOT, encoding: "utf8" }
    );
  } catch {
    return []; // pas de dépôt git (archive) : le site se construit sans historique
  }
  const commits = out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [sha, date, subject] = l.split("\t");
      return { sha, date, subject };
    });
  if (!commits.length) return [];
  const creation = commits[commits.length - 1];
  const entries = [];
  for (const c of commits) {
    const m = c.subject.match(/^recette(?:\(([^)]*)\))?\s*:\s*(.+)$/i);
    if (m) {
      if (m[1] && m[1].trim() !== slug) continue; // scopé sur une autre recette
      entries.push({ sha: c.sha, date: c.date, comment: m[2].trim(), creation: c === creation });
    } else if (c === creation) {
      entries.push({ sha: c.sha, date: c.date, comment: "Entrée au carnet", creation: true });
    }
  }
  return entries; // du plus récent au plus ancien, création en dernier
}

function renderHistory(entries, file) {
  if (!entries.length) return "";
  const lis = entries
    .map(
      (e) => `<li${e.creation ? ' class="creation"' : ""}>
  <time datetime="${esc(e.date.slice(0, 10))}">${esc(DATE_FR.format(new Date(e.date)))}</time>
  <p>${esc(e.comment)}</p>
  <a href="${REPO_URL}/commit/${e.sha}">voir la modification</a>
</li>`
    )
    .join("\n");
  return `<section class="history">
      <h2>Affinages</h2>
      <p class="hist-note">la recette telle qu'elle s'améliore, retouche après retouche</p>
      <ol class="hist">
${lis}
      </ol>
    </section>`;
}

const ingName = (compiled, id) => compiled.registry.ingredients[id]?.name ?? id;
const cookName = (compiled, id) => compiled.registry.cookware[id]?.name ?? id;

// Temps total « séquentiel » honnête : le moteur superpose les tâches de fond,
// ce qui sous-estime les repos strictement successifs (pain…). On additionne.
function totalMinutes(compiled) {
  let active = 0;
  let passive = 0;
  for (const sec of compiled.sections) {
    for (const step of sec.steps) {
      if (step.type !== "step") continue;
      active += step.timings?.activeDuration ?? 0;
      for (const bg of step.backgroundTasks ?? []) passive += bg.duration ?? 0;
    }
  }
  return Math.max(Math.round((compiled.metrics.preparationTime ?? 0) + active + passive), compiled.metrics.activeTime ?? 0);
}

function recipeRetro(compiled) {
  let max = null;
  for (const sec of compiled.sections) {
    if (sec.retro_planning && (!max || retroMinutes(sec.retro_planning) > retroMinutes(max))) {
      max = sec.retro_planning;
    }
  }
  return max;
}

// --------------------------------------------------------- rendu des étapes

// data-attrs de mise à l'échelle des quantités
function qtyAttrs(qty, { fixed = false, relative = false } = {}) {
  const n = numericQty(qty);
  if (fixed || relative || n == null) return "";
  return ` data-qty="${n}"`;
}

function renderQty(qty, unit, opts = {}) {
  if (qty == null && !unit) return "";
  const isRel = qty && typeof qty === "object" && qty.type === "RelativeQuantity";
  if (isRel) {
    return `<b class="qty" title="pourcentage du boulanger">${fmtNumber(qty.percent)} % de ${esc(opts.relTargetName ?? qty.target)}</b>`;
  }
  const val = fmtQtyValue(qty);
  const u = prettyUnit(unit);
  if (!val && !u) return "";
  const range = qty && typeof qty === "object" && qty.type === "range" && qty.range;
  const rangeAttr = range && !opts.fixed ? ` data-qty-min="${range.min}" data-qty-max="${range.max}"` : "";
  return `<b class="qty"${qtyAttrs(qty, opts)}${rangeAttr}${opts.fixed ? ' data-fixed="1" title="ne change pas avec les portions"' : ""}>${esc(val)}${u ? ` ${esc(u)}` : ""}</b>`;
}

function renderUsage(compiled, u) {
  const reg = compiled.registry;
  if (u.id && reg.cookware[u.id] && !reg.ingredients[u.id]) {
    const n = numericQty(u.qty);
    const count = n && n > 1 ? ` ×${fmtNumber(n)}` : "";
    return `<span class="cook">${esc(cookName(compiled, u.id))}${count}</span>`;
  }
  const entry = reg.ingredients[u.id];
  const name = ingName(compiled, u.id);
  const fixed = Boolean(u.fixed);
  const opts = { fixed, relTargetName: undefined };
  if (u.qty && typeof u.qty === "object" && u.qty.type === "RelativeQuantity") {
    opts.relTargetName = u.qty.target;
  }
  const display = u.alias ?? name;
  const qty = renderQty(u.qty, u.unit, opts);
  const prep = u.preparation ? `<i class="prep">, ${esc(u.preparation)}</i>` : "";
  const optional = (u.modifiers ?? []).includes("optional");
  const cls = entry?.is_intermediate ? "ref" : "ing";
  return `<span class="${cls}${optional ? " opt" : ""}">${esc(display)}${qty ? ` ${qty}` : ""}${prep}${optional ? '<i class="prep"> (facultatif)</i>' : ""}</span>`;
}

function renderToken(compiled, tok) {
  if (typeof tok === "string") return { html: esc(tok), text: true };
  if (tok.type === "timer") {
    const n = numericQty(tok.quantity);
    const isMin = /^m(in)?$/.test(tok.unit ?? "");
    const val =
      n != null && isMin && n >= 60
        ? fmtMinutes(n)
        : `${fmtQtyValue(tok.quantity)}${tok.unit ? ` ${esc(prettyUnit(tok.unit))}` : ""}`;
    const cls = tok.isPassive ? "timer passive" : "timer";
    const title = tok.name ? ` title="${esc(tok.name)}"` : "";
    return { html: `<span class="${cls}"${title}>${icon(tok.isPassive ? "rest" : "timer")}${val}</span>` };
  }
  if (tok.type === "temperature") {
    const val = tok.text ? esc(tok.text) : `${fmtQtyValue(tok.quantity)} ${esc(tok.unit ?? "")}`;
    return { html: `<span class="temp">${icon("temp")}${val}</span>` };
  }
  if (tok.type === "declaration") {
    return { html: `<span class="decl" title="produit de cette étape">→ ${esc(tok.name)}</span>` };
  }
  if (tok.type === "reference") {
    return { html: `<span class="ref">${esc(tok.name)}</span>` };
  }
  if (tok.type === "comment") {
    return { html: `<span class="stepnote">${esc(tok.value.trim())}</span>` };
  }
  if (tok.type === "alternative" && Array.isArray(tok.options)) {
    return { html: tok.options.map((o) => renderUsage(compiled, o)).join('<span class="alt-or"> ou </span>') };
  }
  if (tok.id) return { html: renderUsage(compiled, tok) };
  return { html: "" };
}

// Le parser mange parfois l'espace entre un jeton et le texte suivant :
// on recolle avec une espace sauf devant la ponctuation ou après une apostrophe.
function renderStepContent(compiled, content) {
  let html = "";
  let prevWasToken = false;
  for (const tok of content) {
    const r = renderToken(compiled, tok);
    if (!r.html) continue;
    if (html) {
      const startsPunct = r.text && /^[\s.,;:!?)»…]/.test(r.html.replace(/^&nbsp;/, " "));
      const endsOpen = /[\s('«’ ]$|^$/.test(html.slice(-6).replace(/&nbsp;$/, " ")) || /['’(]$/.test(html);
      if (prevWasToken && !startsPunct) html += " ";
      else if (!prevWasToken && !r.text && !endsOpen) html += " ";
    }
    html += r.html;
    prevWasToken = !r.text;
  }
  return html.replace(/\s+([,.;])/g, "$1").replace(/\s+([:!?»])/g, " $1");
}

// ------------------------------------------------------ liste d'ingrédients

function renderShoppingItem(compiled, item) {
  if (item.type === "composite") {
    const parts = (item.usage ?? [])
      .map((u) => {
        const q = numericQty(u.qty);
        return `${q ? `${fmtNumber(q)} ` : ""}${ingName(compiled, u.id)}`;
      })
      .join(", ");
    const label = `<b class="qty" data-qty="${item.qty}">${fmtNumber(item.qty)}</b> ${esc(ingName(compiled, item.id))}`;
    return `${label}${parts ? ` <i class="prep">(pour : ${esc(parts)})</i>` : ""}`;
  }
  if (item.type === "alternative" && Array.isArray(item.options)) {
    return item.options
      .map((o) => renderShoppingItem(compiled, o))
      .join('<span class="alt-or"> ou </span>');
  }
  const name = item.alias ?? ingName(compiled, item.id);
  const optional = (item.modifiers ?? []).includes("optional") || (item.modifierSet && item.modifierSet.has?.("optional"));
  const fixed = Boolean(item.fixed ?? item.allFixed);
  let qty = "";
  if (item.relative && Array.isArray(item.variable_entries)) {
    // « 2% of farine de blé » → 2 % × 450 g = 9 g (reste proportionnel au scaling)
    let total = 0;
    let unit = null;
    const labels = [];
    for (const entry of item.variable_entries) {
      const m = String(entry).match(/^([\d.]+)\s*%\s+of\s+(.+)$/);
      if (!m) continue;
      labels.push(`${fmtNumber(Number(m[1]))} % de ${m[2]}`);
      const target = (compiled.shopping_list ?? []).find((t) => t.name === m[2] || t.id === m[2]);
      const q = target ? numericQty(target.qty) : null;
      if (q != null) {
        total += (Number(m[1]) / 100) * q;
        unit = target.unit ?? unit;
      }
    }
    const label = esc(labels.join(" + "));
    qty =
      total > 0
        ? `<b class="qty" data-qty="${Math.round(total * 100) / 100}" title="${label}">${fmtNumber(total)}${unit ? ` ${esc(prettyUnit(unit))}` : ""}</b>`
        : `<b class="qty">${label}</b>`;
  } else if (item.qty != null && typeof item.qty === "object" && item.qty.type === "RelativeQuantity") {
    qty = renderQty(item.qty, null, { relTargetName: item.qty.target });
  } else if (item.qty != null) {
    qty = renderQty(item.qty, item.unit, { fixed });
  }
  if (item.otherUnits) {
    for (const [u, q] of Object.entries(item.otherUnits)) {
      qty += ` <span class="qty-plus">+</span> ${renderQty(q, u, { fixed })}`;
    }
  }
  const prep = item.preparation ? `<i class="prep">, ${esc(item.preparation)}</i>` : "";
  return `${qty ? `${qty} ` : ""}${esc(name)}${prep}${optional ? ' <i class="prep">(facultatif)</i>' : ""}`;
}

function renderIngredientsPanel(compiled) {
  const items = (compiled.shopping_list ?? []).filter((it) => {
    const entry = compiled.registry.ingredients[it.id];
    const mods = it.modifiers ?? [];
    return !entry?.is_intermediate && !mods.includes("hidden");
  });
  if (!items.length) return "";
  const lis = items
    .map(
      (it, i) =>
        `<li><button type="button" class="tick" data-check="ing-${i}" aria-pressed="false" aria-label="cocher"></button><span class="ing-label">${renderShoppingItem(compiled, it)}</span></li>`
    )
    .join("\n");
  return lis;
}

// ------------------------------------------------------------ pages HTML

function pageShell({ root, title, description, ogImage, body, slug }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${slug ? "article" : "website"}">
<meta property="og:image" content="${ogImage}">
<meta name="theme-color" content="#722f37">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,600;6..96,700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${root}assets/site.css">
</head>
<body${slug ? ` data-recipe="${esc(slug)}"` : ""}>
${body}
<script src="${root}assets/app.js" defer></script>
</body>
</html>`;
}

function categoryOf(compiled) {
  return compiled.meta.category ?? "Autres";
}

function renderCard(r) {
  const c = r.compiled;
  const retro = recipeRetro(c);
  const tags = [categoryOf(c), ...(Array.isArray(c.meta.tags) ? c.meta.tags : [])];
  const ingredients = Object.values(c.registry.ingredients)
    .filter((e) => !e.is_intermediate)
    .map((e) => e.name);
  return `<a class="card" href="recettes/${r.slug}/" data-category="${esc(categoryOf(c))}" data-search="${esc(
    fold([c.title, c.meta.description ?? "", tags.join(" "), ingredients.join(" ")].join(" "))
  )}">
  <figure><img src="assets/img/${r.slug}-card.jpg" srcset="assets/img/${r.slug}-card.jpg 640w, assets/img/${r.slug}-hero.jpg 1280w" sizes="(min-width: 700px) 340px, 100vw" width="640" height="480" alt="${esc(c.title)}" loading="lazy"></figure>
  <div class="card-body">
    <h2>${esc(c.title)}</h2>
    <p>${esc(c.meta.description ?? "")}</p>
    <footer>
      <span class="meta-chip">${icon("timer")}${fmtMinutesRounded(totalMinutes(c))}</span>
      ${retro ? `<span class="meta-chip night">${icon("moon")}${esc(fmtRetro(retro))}</span>` : ""}
      <span class="meta-chip cat">${esc(categoryOf(c))}</span>
    </footer>
  </div>
</a>`;
}

function buildHome(recipes) {
  const categories = [...new Set(recipes.map((r) => categoryOf(r.compiled)))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );
  const body = `<header class="masthead">
  <div class="wrap">
    <h1>Carnet de <em>cuisine</em></h1>
    <p class="masthead-sub">${recipes.length} recettes de famille, éprouvées et réglées au gramme près : mijotés du dimanche, pain de campagne et desserts de goûter.</p>
  </div>
</header>
<main class="wrap">
  <nav class="filters" aria-label="Filtrer les recettes">
    <div class="chips" role="group" aria-label="Catégories">
      <button type="button" class="chip is-on" data-filter="">Tout</button>
      ${categories.map((c) => `<button type="button" class="chip" data-filter="${esc(c)}">${esc(c)}</button>`).join("\n      ")}
    </div>
    <input type="search" id="search" placeholder="Chercher un plat, un ingrédient…" aria-label="Chercher une recette">
  </nav>
  <div class="cards" id="cards">
    ${recipes.map(renderCard).join("\n")}
  </div>
  <p class="empty" id="empty" hidden>Rien dans le garde-manger pour cette recherche.</p>
</main>
<footer class="site-footer">
  <div class="wrap">
    <p><a href="${REPO_URL}">Code source & recettes</a> · Photos <a href="https://unsplash.com">Unsplash</a></p>
  </div>
</footer>`;
  return pageShell({
    root: "",
    title: `${SITE_NAME} — recettes de famille`,
    description: "Des recettes de famille éprouvées et réglées au gramme près : mijotés, pain de campagne, desserts.",
    ogImage: `${SITE_URL}/assets/img/${recipes[0].slug}-hero.jpg`,
    body,
  });
}

function renderSection(compiled, sec, sectionIndex, stepOffset) {
  const multi = compiled.sections.length > 1;
  const retro = sec.retro_planning ? fmtRetro(sec.retro_planning) : null;
  let html = "";
  if (multi && sec.title) {
    html += `<h3 class="sec-title">${esc(sec.title)}${
      retro ? ` <span class="meta-chip night">${icon("moon")}${esc(retro)}</span>` : ""
    }${sec.intermediate_preparation ? ` <span class="decl">→ ${esc(sec.intermediate_preparation)}</span>` : ""}</h3>`;
    const agg = aggregateSectionIngredients(sec.ingredients ?? []).filter(
      (i) => !compiled.registry.ingredients[i.id]?.is_intermediate
    );
    if (agg.length) {
      html += `<p class="sec-ings">${agg
        .map((i) => {
          const q = i.quantities?.[0];
          const qty = q ? `${fmtQtyValue(q.qty && q.qty.percent != null ? null : q.qty)}${q.unit ? ` ${prettyUnit(q.unit)}` : ""}`.trim() : "";
          return `${esc(ingName(compiled, i.id))}${qty ? ` <b>${esc(qty)}</b>` : ""}`;
        })
        .join(" · ")}</p>`;
    }
  }
  const steps = sec.steps.filter((s) => s.type === "step");
  html += `<ol class="steps" start="${stepOffset + 1}">`;
  let n = stepOffset;
  for (const step of steps) {
    n += 1;
    html += `<li class="step" data-step="${n}">
  <button type="button" class="step-num" data-check="step-${n}" aria-pressed="false" aria-label="marquer l'étape ${n} comme faite"><span>${n}</span></button>
  <div class="step-body">${step.action ? `<b class="action">${esc(step.action)}</b> ` : ""}${renderStepContent(compiled, step.content)}</div>
</li>`;
  }
  html += "</ol>";
  return { html, count: n - stepOffset };
}

function buildRecipePage(r) {
  const c = r.compiled;
  const root = "../../";
  const retro = recipeRetro(c);
  const portions = Number(c.meta.portions) || 1;
  const cookware = (c.cookware ?? []).map((u) => {
    const n = numericQty(u.qty);
    return `${cookName(c, u.id)}${n && n > 1 ? ` ×${fmtNumber(n)}` : ""}`;
  });
  const tags = Array.isArray(c.meta.tags) ? c.meta.tags : [];

  let sectionsHtml = "";
  let offset = 0;
  c.sections.forEach((sec, i) => {
    const { html, count } = renderSection(c, sec, i, offset);
    sectionsHtml += html;
    offset += count;
  });

  const body = `<header class="recipe-top">
  <nav class="wrap crumbs"><a href="${root}">← Toutes les recettes</a></nav>
</header>
<main class="recipe wrap" data-portions="${portions}" data-steps="${offset}">
  <figure class="hero"><img src="${root}assets/img/${r.slug}-hero.jpg" width="1280" height="960" alt="${esc(c.title)}" fetchpriority="high"></figure>
  <article>
    <div class="recipe-head">
      <p class="cat-line">${esc(categoryOf(c))}${tags.length ? ` · ${tags.map(esc).join(" · ")}` : ""}</p>
      <h1>${esc(c.title)}</h1>
      ${c.meta.description ? `<p class="desc">${esc(c.meta.description)}</p>` : ""}
      <div class="meta-row">
        <span class="meta-chip">${icon("hand")}${fmtMinutes(c.metrics.activeTime)} devant le plan de travail</span>
        <span class="meta-chip">${icon("timer")}${fmtMinutesRounded(totalMinutes(c))} en tout</span>
        ${retro ? `<span class="meta-chip night">${icon("moon")}à commencer ${esc(fmtRetro(retro))}</span>` : ""}
      </div>
      ${c.meta.makes ? `<p class="makes">${esc(c.meta.makes)}</p>` : ""}
    </div>

    <section class="panel" id="ingredients">
      <div class="panel-head">
        <h2>Ingrédients</h2>
        <div class="stepper" role="group" aria-label="Nombre de portions">
          <button type="button" data-portions-delta="-1" aria-label="moins de portions">−</button>
          <output id="portions">${portions}</output>
          <button type="button" data-portions-delta="1" aria-label="plus de portions">+</button>
          <span class="stepper-label">${esc(c.meta.makes && !c.meta.portions ? "" : "pers.")}</span>
        </div>
      </div>
      <ul class="ing-list">
        ${renderIngredientsPanel(c)}
      </ul>
      ${cookware.length ? `<p class="cookware"><b>Matériel :</b> ${cookware.map(esc).join(", ")}</p>` : ""}
    </section>

    <section class="method">
      <div class="method-head">
        <h2>Préparation</h2>
        <button type="button" id="wakelock" hidden aria-pressed="false">Garder l'écran allumé</button>
      </div>
      ${sectionsHtml}
    </section>

    ${c.meta.notes ? `<aside class="notes"><h2>Note du cuisinier</h2><p>${esc(c.meta.notes)}</p></aside>` : ""}

    ${renderHistory(recipeHistory(r.file, r.slug), r.file)}

    <footer class="recipe-foot">
      <p class="ascode"><a href="${REPO_URL}/blob/main/recipes/${r.file}">Texte source de la recette</a>${c.meta.source ? ` · d’après <a href="${esc(String(c.meta.source).split(" ")[0])}">${esc(String(c.meta.source).replace(/^https?:\/\//, "").split(/[\/\s]/)[0])}</a>` : ""}</p>
      <p><button type="button" id="reset" hidden>Réinitialiser les coches</button></p>
    </footer>
  </article>
</main>
<footer class="site-footer">
  <div class="wrap"><p><a href="${root}">${SITE_NAME}</a> · Photos <a href="https://unsplash.com">Unsplash</a></p></div>
</footer>`;

  return pageShell({
    root,
    slug: r.slug,
    title: `${c.title} — ${SITE_NAME}`,
    description: c.meta.description ?? c.title,
    ogImage: `${SITE_URL}/assets/img/${r.slug}-hero.jpg`,
    body,
  });
}

// ---------------------------------------------------------------- build

const recipes = loadRecipes();
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(ROOT, "assets"), join(DIST, "assets"), { recursive: true });

writeFileSync(join(DIST, "index.html"), buildHome(recipes));
writeFileSync(join(DIST, "404.html"), pageShell({
  root: "/cuisine/",
  title: `Page introuvable — ${SITE_NAME}`,
  description: "Cette page n'existe pas.",
  ogImage: `${SITE_URL}/assets/img/${recipes[0].slug}-hero.jpg`,
  body: `<main class="wrap notfound"><h1>Rien sur le feu ici.</h1><p><a href="/cuisine/">← Retour au carnet</a></p></main>`,
}));

for (const r of recipes) {
  const dir = join(DIST, "recettes", r.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), buildRecipePage(r));
  writeFileSync(join(dir, "recette.json"), JSON.stringify(r.compiled, null, 1));
}

console.log(`✓ ${recipes.length} recettes → dist/`);
