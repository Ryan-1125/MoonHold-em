import {Capacitor,registerPlugin} from '@capacitor/core';
import {App} from '@capacitor/app';

if(Capacitor.isNativePlatform()){
  const ImageExport=registerPlugin('ImageExport');
  window.PokerLab={
    native:true,
    async saveImage(url,filename){
      const blob=await(await fetch(url)).blob();
      const data=await new Promise((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);
      });
      return ImageExport.save({data,filename});
    }
  };
  document.documentElement.classList.add('native-app');
  await App.addListener('backButton',async()=>{
    const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);
    if(dialog){dialog.close();return;}
    const input=document.activeElement;
    if(input?.matches('input,textarea')){input.blur();return;}
    await App.minimizeApp();
  });
}
await import('./app.js');
