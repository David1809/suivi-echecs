import { build } from 'esbuild';
import fs from 'fs';
const b64 = p => fs.readFileSync(p).toString('base64');
const fonts = `
@font-face{font-family:'Bricolage Grotesque Variable';font-style:normal;font-display:swap;font-weight:200 800;font-stretch:75% 100%;src:url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2')}) format('woff2-variations')}
@font-face{font-family:'Figtree Variable';font-style:normal;font-display:swap;font-weight:300 900;src:url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2')}) format('woff2-variations')}
`;
const js = (await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' })).outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = fonts + fs.readFileSync('src/style.css', 'utf8');
const html = fs.readFileSync('src/index.template.html', 'utf8').replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
fs.mkdirSync('dist/engine', { recursive: true });
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) fs.copyFileSync('node_modules/stockfish/bin/' + f, 'dist/engine/' + f);
console.log('index.html', (html.length / 1024).toFixed(0), 'Ko');
