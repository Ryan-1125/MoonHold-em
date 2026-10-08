import './build-web.mjs';
import './build-icons.mjs';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const output=new URL('dist-app/',root);
await mkdir(output,{recursive:true});
await mkdir(new URL('licenses/',output),{recursive:true});
await copyFile(new URL('LICENSE',root),new URL('licenses/MoonHoldem.txt',output));
for(const name of ['core','android','app'])await copyFile(new URL(`node_modules/@capacitor/${name}/LICENSE`,root),new URL(`licenses/Capacitor-${name}.txt`,output));
for(const name of ['app.js','style.css','worker.js','engine.mjs'])await copyFile(new URL(`web/${name}`,root),new URL(name,output));
await copyFile(new URL('mobile/native.css',root),new URL('native.css',output));
let html=await readFile(new URL('web/index.html',root),'utf8');
html=html.replace('</head>','<link rel="stylesheet" href="native.css"></head>')
  .replace('src="app.js"','src="native.js"');
await writeFile(new URL('index.html',output),html);
await build({entryPoints:[fileURLToPath(new URL('mobile/native.js',root))],outfile:fileURLToPath(new URL('native.js',output)),bundle:true,format:'esm',target:'es2022',external:['./app.js']});
console.log('Offline Android assets ready: dist-app/');
