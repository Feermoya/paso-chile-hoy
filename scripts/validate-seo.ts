/**
 * Validación objetiva de metadatos SEO (sin scrapear Google).
 * Ejecutar: npm run validate:seo
 *
 * Falla ante errores objetivos: títulos/descripciones vacíos o duplicados,
 * canonicals no absolutos, falta de cobertura de URLs prioritarias,
 * robots.txt inválido o sitemap sin las URLs clave.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  SITE_URL,
  buildHomeMeta,
  buildPasoAChileHoyMeta,
  buildPassPageMeta,
  buildLegalPageMeta,
  type PassStatus,
} from "@/utils/seo";
import { PASOS } from "@/data/pasos";
import { buildPassStructuredGraph } from "@/utils/passPageSchema";

type Issue = { level: "error" | "warn"; msg: string };

const issues: Issue[] = [];

function err(msg: string) {
  issues.push({ level: "error", msg });
}
function warn(msg: string) {
  issues.push({ level: "warn", msg });
}

function assertAbsoluteHttps(url: string, label: string) {
  if (!/^https:\/\/[^/]+/.test(url)) {
    err(`${label}: canonical/URL debe ser https absoluto (${url})`);
  }
}

function assertNonEmpty(value: string, label: string) {
  if (!value?.trim()) err(`${label}: vacío`);
}

function assertNoEmoji(title: string, label: string) {
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(title) || /[✅🔴⚠️⚪]/.test(title)) {
    err(`${label}: el title no debe llevar emoji`);
  }
}

function assertNoDynamicStatus(title: string, label: string) {
  if (/\b(ABIERTO|CERRADO|CONDICIONADO)\b/.test(title)) {
    err(`${label}: el title no debe incluir estado operativo dinámico`);
  }
}

const home = buildHomeMeta();
const landing = buildPasoAChileHoyMeta();
const legal = buildLegalPageMeta();

const passMetas = PASOS.filter((p) => p.active).map((p) =>
  buildPassPageMeta({
    passName: p.name,
    passShortName: p.shortName,
    passSlug: p.slug,
    status: "abierto" as PassStatus,
    schedule: "09:00-21:00",
    tempC: 3,
    weatherDesc: "Algo nublado",
    freshnessLabel: "hace 12 min",
    regionLabel: p.provinceAR === "San Juan" ? "San Juan, Argentina" : "Mendoza, Argentina",
  }),
);

const bundles = [
  { id: "/", meta: home },
  { id: "/paso-a-chile-hoy", meta: landing },
  { id: "/legal", meta: legal },
  ...passMetas.map((m, i) => ({
    id: `/${PASOS.filter((p) => p.active)[i]!.slug}`,
    meta: m,
  })),
];

const titles = new Map<string, string>();
const descriptions = new Map<string, string>();
const canonicals = new Map<string, string>();

for (const { id, meta } of bundles) {
  assertNonEmpty(meta.title, `${id} title`);
  assertNonEmpty(meta.description, `${id} description`);
  assertNonEmpty(meta.canonical, `${id} canonical`);
  assertAbsoluteHttps(meta.canonical, `${id} canonical`);
  assertNoEmoji(meta.title, `${id} title`);
  assertNoDynamicStatus(meta.title, `${id} title`);

  if (meta.title.length > 70) {
    warn(`${id} title: ${meta.title.length} caracteres (puede truncarse en móvil)`);
  }
  if (meta.description.length > 170) {
    warn(`${id} description: ${meta.description.length} caracteres (puede truncarse)`);
  }
  if (meta.description.length < 50) {
    err(`${id} description: demasiado corta`);
  }

  if (titles.has(meta.title)) {
    err(`Title duplicado entre ${titles.get(meta.title)} y ${id}: "${meta.title}"`);
  } else {
    titles.set(meta.title, id);
  }

  if (descriptions.has(meta.description)) {
    err(
      `Description duplicada entre ${descriptions.get(meta.description)} y ${id}`,
    );
  } else {
    descriptions.set(meta.description, id);
  }

  if (canonicals.has(meta.canonical)) {
    err(`Canonical duplicado entre ${canonicals.get(meta.canonical)} y ${id}`);
  } else {
    canonicals.set(meta.canonical, id);
  }

  if (!meta.canonical.startsWith(SITE_URL)) {
    err(`${id}: canonical fuera de SITE_URL (${meta.canonical})`);
  }
}

// El title de paso no debe cambiar si cambia el status (estabilidad SERP).
const cristoOpen = buildPassPageMeta({
  passName: "Paso Sistema Cristo Redentor",
  passShortName: "Cristo Redentor",
  passSlug: "cristo-redentor",
  status: "abierto",
  schedule: null,
  tempC: null,
  weatherDesc: null,
  freshnessLabel: "hace un momento",
});
const cristoClosed = buildPassPageMeta({
  passName: "Paso Sistema Cristo Redentor",
  passShortName: "Cristo Redentor",
  passSlug: "cristo-redentor",
  status: "cerrado",
  schedule: null,
  tempC: null,
  weatherDesc: null,
  freshnessLabel: "hace 3 h",
});
if (cristoOpen.title !== cristoClosed.title) {
  err("Title de /cristo-redentor cambia según el estado operativo");
}
if (cristoOpen.description !== cristoClosed.description) {
  err("Description de /cristo-redentor cambia según el estado operativo");
}

// JSON-LD básico de un paso.
const graph = buildPassStructuredGraph({
  paso: PASOS.find((p) => p.slug === "cristo-redentor")!,
  scheduleText: "09:00-21:00",
  displayStatus: "abierto",
  dateModified: "2026-10-16T12:00:00.000Z",
});
try {
  JSON.stringify(graph);
  const nodes = (graph as { "@graph"?: unknown[] })["@graph"];
  if (!Array.isArray(nodes) || nodes.length < 2) {
    err("JSON-LD de paso: @graph incompleto");
  }
} catch {
  err("JSON-LD de paso: no serializa");
}

// robots.txt
const robotsPath = resolve(process.cwd(), "public/robots.txt");
if (!existsSync(robotsPath)) {
  err("Falta public/robots.txt");
} else {
  const robots = readFileSync(robotsPath, "utf8");
  if (!/Sitemap:\s*https:\/\/pasochilehoy\.com\/sitemap\.xml/i.test(robots)) {
    err("robots.txt: falta Sitemap canónico https://pasochilehoy.com/sitemap.xml");
  }
  if (!/Allow:\s*\//i.test(robots)) {
    err("robots.txt: falta Allow: /");
  }
  if (!/Disallow:\s*\/api\//i.test(robots)) {
    warn("robots.txt: se recomienda Disallow: /api/");
  }
}

// sitemap source
const sitemapPath = resolve(process.cwd(), "src/pages/sitemap.xml.ts");
if (!existsSync(sitemapPath)) {
  err("Falta src/pages/sitemap.xml.ts");
} else {
  const sm = readFileSync(sitemapPath, "utf8");
  for (const path of ["/", "/cristo-redentor", "/pehuenche", "/agua-negra", "/paso-a-chile-hoy", "/legal"]) {
    if (!sm.includes(`"${path}"`) && !sm.includes(`'${path}'`) && !sm.includes(`/${path.replace(/^\//, "")}`)) {
      // slug paths are built from PASOS; check slug string
      if (path === "/" && !sm.includes('path: "/"')) err("sitemap: falta home");
      if (path !== "/" && path !== "/paso-a-chile-hoy" && path !== "/legal") {
        const slug = path.slice(1);
        if (!sm.includes("PASOS") && !sm.includes(slug)) {
          err(`sitemap: no referencia ${path}`);
        }
      }
    }
  }
  if (!sm.includes("/paso-a-chile-hoy")) err("sitemap: falta /paso-a-chile-hoy");
  if (!sm.includes("/legal")) err("sitemap: falta /legal");
}

const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warn");

console.log(`validate:seo — ${bundles.length} URLs revisadas`);
for (const { id, meta } of bundles) {
  console.log(`  ${id}`);
  console.log(`    title: ${meta.title}`);
  console.log(`    desc:  ${meta.description}`);
  console.log(`    canon: ${meta.canonical}`);
}

for (const w of warnings) console.warn(`WARN  ${w.msg}`);
for (const e of errors) console.error(`ERROR ${e.msg}`);

if (errors.length) {
  console.error(`\nFalló validate:seo con ${errors.length} error(es).`);
  process.exit(1);
}

console.log(`\nOK validate:seo (${warnings.length} advertencia(s)).`);
