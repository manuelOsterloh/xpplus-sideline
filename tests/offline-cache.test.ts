import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../scripts/sw-template.js',import.meta.url),'utf8').replace('__VERSION__','test').replace('__ASSETS__','["/index.html","/app.js"]');
function worker(fail=false) {
 const handlers: Record<string,Function>={};const deleted:string[]=[];const added:string[]=[];let skipped=0,claimed=0,network=0;
 const cache={addAll:async(requests:Request[])=>{added.push(...requests.map(r=>r.url));if(fail)throw Error('network');},match:async(path:string)=>path==='/index.html'?'offline-shell':path==='/app.js'?'offline-code':undefined};
 const self={addEventListener:(name:string,fn:Function)=>handlers[name]=fn,clients:{claim:async()=>{claimed++;}},skipWaiting:()=>{skipped++;},location:{origin:'https://sideline.test'}};
 class LocalRequest {url:string;constructor(url:string){this.url=url;}}
 vm.runInNewContext(source,{self,caches:{open:async()=>cache,delete:async(name:string)=>{deleted.push(name);},match:async()=>undefined},Request:LocalRequest,URL,fetch:async()=>{network++;throw Error('offline');}});
 async function event(name:string,extra:Record<string,unknown>={}) {let promise:Promise<unknown>|undefined;handlers[name]!({waitUntil:(p:Promise<unknown>)=>promise=p,respondWith:(p:Promise<unknown>)=>promise=p,...extra});return await promise;}
 return{event,deleted,added,metrics:()=>({skipped,claimed,network})};
}
test('offline install preloads the whole shell without activating an update mid-game',async()=>{
 const w=worker();await w.event('install');assert.deepEqual(w.added,['/index.html','/app.js']);assert.equal(w.metrics().skipped,0);await w.event('message',{data:'ACTIVATE'});assert.equal(w.metrics().skipped,1);
});
test('failed partial install discards only its own cache',async()=>{
 const w=worker(true);await assert.rejects(w.event('install'));assert.deepEqual(w.deleted,['sideline-shell-test']);
});
test('cold navigation and JS are served without network access',async()=>{
 const w=worker();assert.equal(await w.event('fetch',{request:{url:'https://sideline.test/',method:'GET',mode:'navigate'}}),'offline-shell');assert.equal(await w.event('fetch',{request:{url:'https://sideline.test/app.js',method:'GET',mode:'cors'}}),'offline-code');assert.equal(w.metrics().network,0);
});
test('readiness confirms every cached file and foreign origins are not intercepted',async()=>{
 const w=worker();let message:any;await w.event('message',{data:'CHECK_READY',source:{postMessage:(value:unknown)=>message=value}});assert.equal(message.ready,true);assert.equal(await w.event('fetch',{request:{url:'https://other.test/',method:'GET',mode:'navigate'}}),undefined);assert.equal(w.metrics().network,0);
});
