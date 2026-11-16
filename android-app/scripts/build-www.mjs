import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function findGame() {
  const candidates = [
    path.resolve(root, '..'), // when this project lives at android-app/ in the game repo
    '/workspace/gingerbread-house',
    path.resolve(root, '../gingerbread-house'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'src/main.js')) && fs.existsSync(path.join(c, 'build.mjs'))) return c;
  }
  throw new Error('Could not find the game source (src/main.js + build.mjs)');
}
const game = findGame();
console.log('game source:', game);
const www = path.join(root, 'www');
fs.mkdirSync(www, { recursive: true });

// Rebuild the game's index.html from src
execSync('node build.mjs', { cwd: game, stdio: 'inherit' });

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
if (!html.includes('<!--NATIVE-->')) {
  html = html.replace('<script>', '<!--NATIVE-->\n<script>');
}
html = html.replace('<!--NATIVE-->', '<script src="native.js"></script>');
fs.writeFileSync(path.join(www, 'index.html'), html);

await build({
  entryPoints: [path.join(root, 'scripts/native-bridge.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  outfile: path.join(www, 'native.js'),
  legalComments: 'none',
});

console.log('www/index.html', (html.length / 1024).toFixed(0), 'KB');
console.log('www/native.js', (fs.statSync(path.join(www, 'native.js')).size / 1024).toFixed(1), 'KB');
