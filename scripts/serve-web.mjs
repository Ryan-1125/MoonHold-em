import './build-web.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../web/',import.meta.url);
const files=new Set(['index.html','style.css','app.js','worker.js','engine.mjs']);
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8'};
const port=Number(process.env.PORT||4173);
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    const name=pathname==='/'?'index.html':pathname.slice(1);
    if(!files.has(name)){res.writeHead(404);res.end('Not found');return;}
    const body=await readFile(fileURLToPath(new URL(name,root)));
    res.writeHead(200,{'Content-Type':types[name.split('.').pop()],'Cache-Control':'no-store'});res.end(body);
  } catch {res.writeHead(500);res.end('Unable to load file');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Stop the old server or set PORT.`:e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`MoonHoldem: http://127.0.0.1:${port}\nPress Ctrl+C to stop.`));
