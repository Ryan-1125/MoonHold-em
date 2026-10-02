import os from 'node:os';
import {createRequire} from 'node:module';
// Restricted Windows runners may not expose account details to libuv.
const userInfo=os.userInfo;
os.userInfo=(...args)=>{
  try{return userInfo(...args);}
  catch(error){
    if(process.platform!=='win32'||error.code!=='ERR_SYSTEM_ERROR')throw error;
    return {username:process.env.USERNAME||'builder',homedir:os.homedir(),shell:process.env.ComSpec||'cmd.exe',uid:-1,gid:-1};
  }
};
createRequire(import.meta.url)('@capacitor/cli/bin/capacitor');
