/* Génère une page par produit (produit-<id>.html), sitemap.xml et robots.txt
   à partir de assets/catalog.js. À relancer quand tu ajoutes ou renommes un produit :
       node tools/build-pages.mjs
   (Les prix et textes affichés sur le site viennent toujours de catalog.js, pas de ces pages.) */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/catalog.js'), 'utf8'), ctx);
const { STORE_PRODUCTS: P, STORE_CONFIG: CFG, STORE_CURRENCY: money } = ctx;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const site = CFG.siteUrl.replace(/\/$/, '');

for (const p of P) {
  const title = `${p.name} — ${p.variant} | 1608`;
  const url = `${site}/produit-${p.id}.html`;
  const img = `${site}/${p.photos[0]}`;
  const html = `<!doctype html>
<html lang="fr-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0d0e0d">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="1608">
<meta property="og:locale" content="fr_CA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:alt" content="${esc(p.name)}, vue avant">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="preload" href="assets/fonts/inter-display-900.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="${p.photos[0]}" as="image">
<link rel="stylesheet" href="assets/store.css">
<script src="assets/catalog.js" defer></script>
<script src="assets/payment-config.js" defer></script>
<script src="assets/site.js" defer></script>
</head>
<body data-page="product" data-product-id="${p.id}">
<div data-site-header></div>
<main id="main">
<div data-pdp aria-live="polite"><div class="container section"><h1 class="display">${esc(p.name)}</h1></div></div>
</main>
<div data-site-footer></div>
<div class="mobile-buy" data-mobile-buy hidden></div>
<noscript><div class="container section"><h1>${esc(p.name)} — ${esc(p.variant)}</h1><p>${esc(p.description)}</p><p>${money(p.price)}</p><p>Active JavaScript pour choisir ta taille et ajouter la pièce au panier. <a href="index.html">Retour à la collection</a></p></div></noscript>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, `produit-${p.id}.html`), html);
}

const urls = ['/', '/checkout.html', ...P.map(p => `/produit-${p.id}.html`)];
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.filter(u => u !== '/checkout.html').map(u => `  <url><loc>${site}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /checkout.html\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`${P.length} pages produit + sitemap.xml + robots.txt générés`);
