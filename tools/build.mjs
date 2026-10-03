// Builds dist/raithwyn.html: the whole game in one file (code, styles, sprite atlas and
// portraits inlined).
// The result opens from disk with a double click and needs no server.
import { build } from 'esbuild';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p, enc = 'utf8') => readFile(root + p, enc);

const bundle = await build({
  entryPoints: [root + 'src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
});
const js = bundle.outputFiles[0].text.replaceAll('</script', '<\\/script');
const css = await read('styles.css');
const atlas = (await readFile(root + 'assets/atlas.png')).toString('base64');
const portraits = {};
for (const f of await readdir(root + 'assets/portraits'))
  if (f.endsWith('.webp'))
    portraits[f.slice(0, -5)] =
      'data:image/webp;base64,' +
      (await readFile(root + 'assets/portraits/' + f)).toString('base64');

let html = await read('index.html');
const swap = (from, to) => {
  if (!html.includes(from)) throw new Error(`index.html: marker not found: ${from}`);
  html = html.replace(from, () => to);
};
swap('<link rel="stylesheet" href="styles.css">', `<style>\n${css}</style>`);
swap(
  '<script type="module" src="src/main.js"></script>',
  `<script>window.__ATLAS__='data:image/png;base64,${atlas}';window.__PORTRAITS__=${JSON.stringify(portraits)};</script>\n<script>${js}</script>`,
);

await mkdir(root + 'dist', { recursive: true });
await writeFile(root + 'dist/raithwyn.html', html);
console.log(`dist/raithwyn.html  ${(html.length / 1024).toFixed(0)} kB`);
