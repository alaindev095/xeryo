#!/usr/bin/env node
/*
 * Xeryo static site build. Zero dependencies (Node 18+).
 */
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const FLAGS = new Set(process.argv.slice(2));
const PREVIEW = FLAGS.has('--preview');
const STRICT = FLAGS.has('--strict');

const PAGES = ['index', 'about', 'ventures', 'umunara-internship', 'contact', '404'];
const STATIC_FILES = ['favicon.svg', 'favicon.ico', 'site.webmanifest'];
const STATIC_DIRS = ['css', 'js', 'assets'];
const OG_IMAGE_PATH = '/assets/images/xeryo-social-preview.png';
const LOGO_PATH = '/assets/icons/xeryo-logo-512.png';
const SOCIAL_LABELS = {
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  github: 'GitHub',
};

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const fileConfig = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
const env = process.env;
const config = {
  siteUrl: (env.XERYO_SITE_URL || fileConfig.siteUrl || '').trim(),
  appUrl: (env.XERYO_APP_URL || fileConfig.appUrl || '').trim(),
  contactEmail: (env.XERYO_CONTACT_EMAIL || fileConfig.contactEmail || '').trim(),
  social: Object.fromEntries(
    Object.keys(SOCIAL_LABELS)
      .map((key) => [key, String(fileConfig.social?.[key] || '').trim()])
      .filter(([, value]) => value)
  ),
};

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

let siteUrl = config.siteUrl.replace(/\/+$/, '');
if (!siteUrl) {
  if (!PREVIEW) {
    fail(
      'siteUrl is not set. Set "siteUrl" in site.config.json (or the XERYO_SITE_URL environment ' +
        'variable) to the final https address, for example https://www.example-domain.rw. ' +
        'For a local or preview build run: node scripts/build.mjs --preview'
    );
    siteUrl = 'https://invalid.invalid';
  } else {
    siteUrl = (env.DEPLOY_PRIME_URL || env.URL || `http://localhost:${env.PORT || 8080}`).replace(/\/+$/, '');
  }
} else if (!PREVIEW) {
  let parsed;
  try {
    parsed = new URL(siteUrl);
  } catch {
    fail(`siteUrl "${siteUrl}" is not a valid URL.`);
  }
  if (parsed) {
    if (parsed.protocol !== 'https:') fail('siteUrl must start with https:// for a production build.');
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) fail('siteUrl must be the bare origin (no path, query or hash).');
    if (/^(localhost|127\.|0\.0\.0\.0)/.test(parsed.hostname) || /\.(example|test|invalid|localhost)$/.test(parsed.hostname)) {
      fail(`siteUrl host "${parsed.hostname}" is a placeholder or development host, not a production domain.`);
    }
  }
}

if (config.appUrl && !isHttpsUrl(config.appUrl)) fail(`appUrl "${config.appUrl}" must be a full https:// URL.`);
if (config.contactEmail && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(config.contactEmail)) {
  fail(`contactEmail "${config.contactEmail}" is not a valid email address.`);
}
for (const [key, value] of Object.entries(config.social)) {
  if (!isHttpsUrl(value)) fail(`social.${key} "${value}" must be a full https:// URL.`);
}

const missing = [];
if (!config.appUrl) missing.push('appUrl (Umunara Internship application link)');
if (!config.contactEmail) missing.push('contactEmail (verified contact address)');
if (missing.length) {
  const text = `Not configured, related links/sections are omitted from the build: ${missing.join('; ')}.`;
  STRICT && !PREVIEW ? fail(text) : warn(text);
}

const partials = {};
for (const name of ['head', 'wordmark', 'header', 'footer', 'cta']) {
  partials[name] = await readFile(path.join(ROOT, 'partials', `${name}.html`), 'utf8');
}

function includePartials(html, source) {
  let out = html;
  for (let pass = 0; pass < 3; pass++) {
    out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) {
        fail(`${source}: unknown partial "${name}".`);
        return '';
      }
      return partials[name];
    });
  }
  return out;
}

const flags = {
  APP: Boolean(config.appUrl),
  EMAIL: Boolean(config.contactEmail),
  SOCIAL: Object.keys(config.social).length > 0,
};

function applyConditionals(html, source) {
  let out = html.replace(/<!--IF:(\w+)-->([\s\S]*?)<!--\/IF:\1-->/g, (_, key, body) => {
    if (!(key in flags)) fail(`${source}: unknown condition "${key}".`);
    return flags[key] ? body : '';
  });
  out = out.replace(/<!--IFNOT:(\w+)-->([\s\S]*?)<!--\/IFNOT:\1-->/g, (_, key, body) => {
    if (!(key in flags)) fail(`${source}: unknown condition "${key}".`);
    return flags[key] ? '' : body;
  });
  return out;
}

const socialLinks = Object.entries(config.social)
  .map(([key, url]) => `<li><a href="${esc(url)}" rel="me noopener">${SOCIAL_LABELS[key]}</a></li>`)
  .join('\n            ');

const pageUrl = (meta) => siteUrl + (meta.path === '/' ? '/' : meta.path);

function buildSocialMeta(meta) {
  const url = pageUrl(meta);
  const image = siteUrl + OG_IMAGE_PATH;
  const alt = 'Xeryo wordmark on a black background with the line: Building technology for what comes next.';
  return [
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Xeryo">',
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    '<meta property="og:image:type" content="image/png">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="twitter:image:alt" content="${esc(alt)}">`,
  ].join('\n');
}

function buildJsonLd(meta) {
  const graphs = [];
  const orgId = `${siteUrl}/#organization`;

  if (meta.path === '/') {
    const organization = {
      '@type': 'Organization',
      '@id': orgId,
      name: 'Xeryo',
      url: `${siteUrl}/`,
      logo: { '@type': 'ImageObject', url: siteUrl + LOGO_PATH, width: 512, height: 512 },
      description: 'Xeryo is a technology company building practical digital products. Its first product is Umunara Internship.',
    };
    if (config.contactEmail) organization.email = config.contactEmail;
    if (Object.keys(config.social).length) organization.sameAs = Object.values(config.social);

    const website = {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: 'Xeryo',
      inLanguage: 'en',
      publisher: { '@id': orgId },
    };
    graphs.push({ '@context': 'https://schema.org', '@graph': [organization, website] });
  }

  if (Array.isArray(meta.breadcrumb) && meta.breadcrumb.length) {
    const trail = [['Home', '/'], ...meta.breadcrumb];
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: trail.map(([name, p], index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        item: siteUrl + p,
      })),
    });
  }

  return graphs
    .map((graph) => `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`)
    .join('\n');
}

const rendered = {};
const robotsMeta = PREVIEW ? '<meta name="robots" content="noindex, nofollow">' : null;

for (const name of PAGES) {
  const file = path.join(ROOT, `${name}.html`);
  let html = await readFile(file, 'utf8');

  const front = html.match(/^\s*<!--meta\s*([\s\S]*?)-->\s*/);
  if (!front) {
    fail(`${name}.html: missing the <!--meta { ... }--> block at the top of the file.`);
    continue;
  }
  let meta;
  try {
    meta = JSON.parse(front[1]);
  } catch (error) {
    fail(`${name}.html: the meta block is not valid JSON (${error.message}).`);
    continue;
  }
  for (const key of ['title', 'description', 'path']) {
    if (!meta[key]) fail(`${name}.html: meta block is missing "${key}".`);
  }
  html = html.slice(front[0].length);

  html = includePartials(html, `${name}.html`);
  html = html.replace(/ data-nav="([\w-]+)"/g, (_, key) => (key === name ? ' aria-current="page"' : ''));
  html = applyConditionals(html, `${name}.html`);

  const indexable = !meta.noindex;
  const tokens = {
    TITLE: esc(meta.title || ''),
    DESCRIPTION: esc(meta.description || ''),
    ROBOTS_META: robotsMeta || (meta.noindex ? '<meta name="robots" content="noindex">' : ''),
    CANONICAL_LINK: indexable ? `<link rel="canonical" href="${esc(pageUrl(meta))}">` : '',
    SOCIAL_META: indexable ? buildSocialMeta(meta) : '',
    JSONLD: indexable ? buildJsonLd(meta) : '',
    SOCIAL_LINKS: socialLinks,
    SITE_URL: siteUrl,
    APP_URL: esc(config.appUrl),
    EMAIL: esc(config.contactEmail),
    YEAR: String(new Date().getFullYear()),
  };
  html = html.replace(/%%([A-Z_]+)%%/g, (whole, key) => (key in tokens ? tokens[key] : whole));
  html = html.replace(/\n{3,}/g, '\n\n');
  rendered[name] = { html, meta, indexable };
}

if (errors.length) {
  report();
  process.exit(1);
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const [name, page] of Object.entries(rendered)) {
  await writeFile(path.join(DIST, `${name}.html`), page.html);
}
for (const dir of STATIC_DIRS) await cp(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
for (const file of STATIC_FILES) {
  if (existsSync(path.join(ROOT, file))) {
    await cp(path.join(ROOT, file), path.join(DIST, file));
  }
}

const sitemapSource = await readFile(path.join(ROOT, 'sitemap.xml'), 'utf8');
const sitemap = sitemapSource.replace(/%%SITE_URL%%/g, siteUrl);
const robots = PREVIEW
  ? 'User-agent: *\nDisallow: /\n'
  : (await readFile(path.join(ROOT, 'robots.txt'), 'utf8')).replace(/%%SITE_URL%%/g, siteUrl);
await writeFile(path.join(DIST, 'sitemap.xml'), sitemap);
await writeFile(path.join(DIST, 'robots.txt'), robots);

// --- FIX: Copy Google verification files ---
try {
  const rootFiles = await readdir(ROOT);
  for (const file of rootFiles) {
    if ((file.startsWith('google') && file.endsWith('.html')) || file.startsWith('BingSiteAuth')) {
      const src = path.join(ROOT, file);
      const dest = path.join(DIST, file);
      if (existsSync(src)) {
        await cp(src, dest);
        console.log(`  copied verification: ${file}`);
      }
    }
  }
} catch (e) {
  console.log('  verification copy warning:', e.message);
}

const distPath = (urlPath) => {
  const clean = urlPath.split('#')[0].split('?')[0];
  return path.join(DIST, clean.endsWith('/') ? clean + 'index.html' : clean);
};
const titles = new Map();
const descriptions = new Map();

for (const [name, page] of Object.entries(rendered)) {
  const { html, meta, indexable } = page;
  const label = `${name}.html`;

  if (html.match(/<h1[\s>]/g)?.length !== 1) fail(`${label}: expected exactly one <h1>.`);
  if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(html)) fail(`${label}: an <img> is missing its alt attribute.`);
  if (/%%[A-Z_]+%%|\{\{>|<!--\/?(IF|IFNOT):/.test(html)) fail(`${label}: unreplaced template token or marker left in the output.`);

  if (meta.title.length > 65) warn(`${label}: title is ${meta.title.length} characters; search results may truncate it.`);
  if (meta.description.length > 160) warn(`${label}: description is ${meta.description.length} characters; it may be truncated.`);
  if (meta.description.length < 70) warn(`${label}: description is short (${meta.description.length} characters).`);

  if (indexable) {
    if (!html.includes(`<link rel="canonical" href="${esc(pageUrl(meta))}">`)) fail(`${label}: canonical link missing or wrong.`);
    if (titles.has(meta.title)) fail(`${label}: title duplicates ${titles.get(meta.title)}.`);
    if (descriptions.has(meta.description)) fail(`${label}: description duplicates ${descriptions.get(meta.description)}.`);
    titles.set(meta.title, label);
    descriptions.set(meta.description, label);

    for (const block of html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)) {
      try {
        JSON.parse(block[1]);
      } catch (error) {
        fail(`${label}: invalid JSON-LD (${error.message}).`);
      }
    }
  } else if (!/<meta name="robots" content="noindex/.test(html)) {
    fail(`${label}: non-indexable page is missing a noindex robots tag.`);
  }

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (target.startsWith('#')) {
      if (target.length > 1 && !html.includes(`id="${target.slice(1)}"`)) fail(`${label}: anchor ${target} has no matching id.`);
    } else if (target.startsWith('/') && !target.startsWith('//')) {
      if (!existsSync(distPath(target))) fail(`${label}: broken internal link or asset "${target}".`);
    }
  }
}

if (!existsSync(distPath(OG_IMAGE_PATH))) fail(`Social preview image missing at ${OG_IMAGE_PATH}.`);
if (!existsSync(distPath(LOGO_PATH))) fail(`Logo missing at ${LOGO_PATH}.`);

const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expected = Object.values(rendered).filter((p) => p.indexable).map((p) => pageUrl(p.meta));
for (const url of expected) if (!locs.includes(url)) fail(`sitemap.xml is missing ${url}.`);
for (const url of locs) if (!expected.includes(url)) fail(`sitemap.xml lists ${url}, which is not an indexable page.`);
if (new Set(locs).size !== locs.length) fail('sitemap.xml contains duplicate URLs.');

function report() {
  const mode = PREVIEW ? 'preview' : 'production';
  console.log(`\nXeryo build (${mode}) for ${siteUrl}`);
  for (const message of warnings) console.log(`  warning: ${message}`);
  for (const message of errors) console.log(`  ERROR:   ${message}`);
}

report();
if (errors.length) {
  console.log('\nBuild failed. dist/ may be incomplete.');
  process.exit(1);
}
console.log(`\nBuilt ${Object.keys(rendered).length} pages, sitemap.xml and robots.txt into dist/${PREVIEW ? ' (noindex preview: not suitable for production)' : ''}`);
