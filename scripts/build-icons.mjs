import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const source=fileURLToPath(new URL('mobile/assets/icon-source.png',root));
const metadata=await sharp(source).metadata();
// Adaptive launchers show the central 72dp of a 108dp layer. Match that framing on older launchers.
const edge=Math.floor(Math.min(metadata.width,metadata.height)*2/3);
const crop={left:Math.floor((metadata.width-edge)/2),top:Math.floor((metadata.height-edge)/2),width:edge,height:edge};
for(const [density,size,layerSize] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]){
  const folder=new URL(`android/app/src/main/res/mipmap-${density}/`,root);
  await mkdir(folder,{recursive:true});
  const tile=await sharp(source).extract(crop).resize(size,size).png().toBuffer();
  for(const round of [false,true]){
    const shape=round?`<circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>`:`<rect width="${size}" height="${size}" rx="${size*.22}" fill="white"/>`;
    const mask=Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${shape}</svg>`);
    await sharp(tile).composite([{input:mask,blend:'dest-in'}]).png().toFile(fileURLToPath(new URL(round?'ic_launcher_round.png':'ic_launcher.png',folder)));
  }
  await sharp(source).resize(layerSize,layerSize).png().toFile(fileURLToPath(new URL('ic_launcher_foreground.png',folder)));
}
await mkdir(new URL('dist-app/',root),{recursive:true});
await sharp(source).extract(crop).resize(192,192).png().toFile(fileURLToPath(new URL('dist-app/app-icon.png',root)));
console.log('Launcher and app-header icons generated from mobile/assets/icon-source.png');
