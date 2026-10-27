const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'stars-20261027.js'),'utf8');
const disk=new Map(),saved={},gets=[],toasts=[];let offline=false;
// BetterDiscord's fs: readFileSync returns text unless the encoding is null.
const fsShim={mkdirSync(){},readdirSync:()=>[...disk.keys()],statSync:()=>({isFile:()=>true}),existsSync:p=>disk.has(path.basename(p)),writeFileSync:(p,b)=>disk.set(path.basename(p),b),readFileSync:(p,enc='utf8')=>{const b=disk.get(path.basename(p));return enc===null?b:new TextDecoder().decode(b);}};
const thumb=(id,y='2025/01')=>`https://assets.science.nasa.gov/dynamicimage/assets/science/missions/webb/science/${y}/${id}.png?w=300&h=200`;
const gallery={type:{pagination_meta:{current:1,total:1},content:[
 {title:'Lion Nebula (MIRI Image)',thumbnailImg:{url:thumb('STScI-LION')}},
 {title:'Lion Nebula (MIRI Compass Image)',thumbnailImg:{url:thumb('STScI-COMPASS')}},
 {title:'Little Red Dots',thumbnailImg:{url:thumb('STScI-EXPLAINER')}},
 {title:'Mirror Segments in Clean Room (Image)',thumbnailImg:{url:thumb('STScI-HARDWARE')}},
 {title:'Tiny Moon (NIRCam Image)',thumbnailImg:{url:thumb('STScI-SMALL')}}]}};
const publicGet=async url=>{gets.push(url);if(offline)throw Error('offline');
 if(url.includes('/wp-json/smd/v1/content-list/'))return new TextEncoder().encode(JSON.stringify(gallery));
 const id=url.match(/(STScI-[A-Z0-9]+)/)[1];return new Uint8Array([...Buffer.from(id)]);};
const sandbox={require:n=>n==='fs'?fsShim:require(n),publicGet,TextDecoder,TextEncoder,Blob,JSON,Math,Error,console,URLSearchParams,
 DOMParser:class{parseFromString(s){return{body:{textContent:s}};}},
 createImageBitmap:async blob=>{const id=Buffer.from(await blob.arrayBuffer()).toString();const [width,height]=id.includes('SMALL')?[1200,900]:id.includes('GA6KKWG')?[14575,8441]:[6000,4000];return{width,height,close(){}};},
 OffscreenCanvas:class{constructor(w,h){this.width=w;this.height=h;}getContext(){return{drawImage(){}}}async convertToBlob(){const w=this.width,h=this.height;return{arrayBuffer:async()=>new TextEncoder().encode(`jpeg ${w}x${h}`).buffer};}},
 BdApi:{Plugins:{folder:'plugins'},Data:{load:()=>null,save:(a,k,v)=>saved[k]=JSON.parse(JSON.stringify(v))},UI:{showToast:m=>toasts.push(m)}}};
vm.runInNewContext(source+'\nthis.StarPhotos=StarPhotos;',sandbox);
(async()=>{
 const s=new sandbox.StarPhotos();
 // The first four clicks bring in the four classics, each a new photo.
 const shown=[];for(let i=0;i<4;i++)shown.push((await s.next()).file);
 assert.equal(new Set(shown).size,4);assert.ok(shown[0].startsWith('webb-STScI-01GA6KKWG229B16K4Q38CH3BXS'));
 // Anything bigger than 8K is stored as an 8K JPEG.
 assert.equal(shown[0],'webb-STScI-01GA6KKWG229B16K4Q38CH3BXS.jpg');assert.equal(new TextDecoder().decode(disk.get(shown[0])),'jpeg 7680x4448');
 // Photos load as bytes, not text.
 assert.ok((await s.item(shown[1]).load()) instanceof Uint8Array);
 // Next click: a new gallery image. Compass, explainer and hardware entries are never downloaded; too-small ones are skipped.
 const fifth=await s.next();assert.ok(['webb-STScI-LION.png'].includes(fifth.file)||saved.stars.tried.includes('STScI-SMALL'));
 const sixth=await s.next();
 assert.ok(disk.has('webb-STScI-LION.png'));assert.ok(saved.stars.tried.includes('STScI-SMALL'));assert.ok(!disk.has('webb-STScI-SMALL.png'));
 for(const bad of ['COMPASS','EXPLAINER','HARDWARE'])assert.ok(!gets.some(u=>u.includes('STScI-'+bad)&&!u.includes('wp-json')),bad+' should not download');
 assert.notEqual(sixth.file,fifth.file);
 // Offline: a different photo from the library, with a notice.
 offline=true;const off=await s.next();assert.ok(disk.has(off.file));assert.ok(toasts.some(t=>/could not be reached/.test(t)));
 // A user's own image in the folder can be shown.
 disk.set('my-own-nebula.png',new Uint8Array([1]));const seen=new Set();for(let i=0;i<60;i++)seen.add((await s.next()).file);assert.ok(seen.has('my-own-nebula.png'));
 console.log('PASS: four Webb classics first, then new gallery images each click; non-sky/too-small skipped; 8K cap; bytes not text; offline uses library; own photos used.');
})().catch(e=>{console.error(e);process.exitCode=1});
