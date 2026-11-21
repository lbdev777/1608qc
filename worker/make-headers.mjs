// Génère _headers (Cloudflare Pages) : CSP stricte avec empreintes SHA-256 des scripts en ligne, par page.
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const common = ['X-Content-Type-Options: nosniff', 'Referrer-Policy: strict-origin-when-cross-origin', 'X-Frame-Options: DENY',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()', 'Strict-Transport-Security: max-age=31536000; includeSubDomains'];
let out = '# Généré par worker/make-headers.mjs — ne pas modifier à la main.\n';
for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`);
  const csp = ["default-src 'self'", `script-src 'self' ${hashes.join(' ')}`.trim(), "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
    "connect-src 'self' https://*.workers.dev https://api.1608qc.com https://api.github.com", "font-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self' mailto:", "frame-ancestors 'none'"].join('; ');
  const p = f === 'index.html' ? ['/', '/index.html'] : ['/' + f, '/' + f.replace(/\.html$/, '')];
  for (const x of p) out += `${x}\n  Content-Security-Policy: ${csp}\n`;
}
out += `/*\n${common.map(h => '  ' + h).join('\n')}\n/assets/*\n  Cache-Control: public, max-age=3600\n`;
fs.writeFileSync(path.join(root, '_headers'), out); console.log('_headers ok');
