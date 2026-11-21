// Fabrique dist/worker.js : le catalogue public (prix, tailles) est copié depuis assets/catalog.js,
// pour que le serveur recalcule lui-même les prix et ne fasse jamais confiance au navigateur.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/catalog.js'), 'utf8'), { window: win, Intl });
const cat = {}; for (const p of win.STORE_PRODUCTS) cat[p.id] = { name: p.name, price: p.price, sizes: p.sizes };
const src = fs.readFileSync(path.join(root, 'worker/src/index.js'), 'utf8');
fs.mkdirSync(path.join(root, 'worker/dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'worker/dist/worker.js'), `const CATALOG=${JSON.stringify(cat)};\n${src}`);
fs.writeFileSync(path.join(root, 'worker/catalog.json'), JSON.stringify(cat, null, 1));
console.log('ok', Object.keys(cat).length, 'modèles');
// --- Worker d'administration (privé) : intègre l'interface (HTML/JS/CSS) dans le code ---
{
  const ui = f => JSON.stringify(fs.readFileSync(path.join(root, 'worker/admin-ui', f), 'utf8'));
  const a = fs.readFileSync(path.join(root, 'worker/src/admin.js'), 'utf8').replace('__HTML__', () => ui('index.html')).replace('__APP_JS__', () => ui('app.js')).replace('__APP_CSS__', () => ui('app.css'));
  fs.writeFileSync(path.join(root, 'worker/dist/admin.js'), a);
  console.log('admin ok');
}
