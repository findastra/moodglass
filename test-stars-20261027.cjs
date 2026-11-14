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
 {title:'Tiny Moon (NIRCam Image)',thumbnailImg:{url:thumb('STScI-SMALL')}},
 {title:'Giant Mosaic (NIRCam Image)',thumbnailImg:{url:thumb('STScI-GIANT')}}]}};
// Each picture is a PNG header with its real size, followed by its id. Everything else is 6000 x 4000.
const sizes={'STScI-01GA6KKWG229B16K4Q38CH3BXS':[14575,8441],'STScI-SMALL':[1200,900],'STScI-GIANT':[20000,12000]};
const png=(w,h,id)=>{const b=Buffer.alloc(24+id.length);Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);b.write(id,24);return new Uint8Array(b);};
const publicGet=async(url,limit,redirects,range)=>{gets.push({url,range:!!range});if(offline)throw Error('offline');
 if(url.includes('/wp-json/smd/v1/content-list/'))return new TextEncoder().encode(JSON.stringify(gallery));
 const id=url.match(/(STScI-[A-Z0-9]+)/)[1];const [w,h]=sizes[id]||[6000,4000];return png(w,h,id);};
const fullGets=id=>gets.filter(g=>g.url.includes(id)&&!g.url.includes('wp-json')&&!g.range).length;
const decodes=[];
const sandbox={require:n=>n==='fs'?fsShim:require(n),publicGet,TextDecoder,TextEncoder,Blob,JSON,Math,Error,console,URLSearchParams,
 DOMParser:class{parseFromString(s){return{body:{textContent:s}};}},
 createImageBitmap:async(blob,options)=>{decodes.push(options);return{width:options?.resizeWidth,height:options?.resizeHeight,close(){}};},
 OffscreenCanvas:class{constructor(w,h){this.width=w;this.height=h;}getContext(){return{drawImage(){}}}async convertToBlob(){const w=this.width,h=this.height;return{arrayBuffer:async()=>new TextEncoder().encode(`jpeg ${w}x${h}`).buffer};}},
 BdApi:{Plugins:{folder:'plugins'},Data:{load:()=>null,save:(a,k,v)=>saved[k]=JSON.parse(JSON.stringify(v))},UI:{showToast:m=>toasts.push(m)}}};
vm.runInNewContext(source+'\nthis.StarPhotos=StarPhotos;this.imageSize=imageSize;',sandbox);
(async()=>{
 // Sizes come from the file header, for PNG and JPEG, without opening the picture.
 assert.deepEqual({...sandbox.imageSize(png(14575,8441,'x'))},{w:14575,h:8441});
 const jpeg=new Uint8Array([0xff,0xd8,0xff,0xe0,0x00,0x04,0x4a,0x46,0xff,0xc0,0x00,0x11,0x08,0x10,0xe0,0x1e,0x00,0x03,0x01,0x22,0x00]);
 assert.deepEqual({...sandbox.imageSize(jpeg)},{w:7680,h:4320});assert.equal(sandbox.imageSize(new Uint8Array([1,2,3])),null);
 const s=new sandbox.StarPhotos();
 // The first four clicks bring in the four classics, each a new photo.
 const shown=[];for(let i=0;i<4;i++)shown.push((await s.next()).file);
 assert.equal(new Set(shown).size,4);assert.ok(shown[0].startsWith('webb-STScI-01GA6KKWG229B16K4Q38CH3BXS'));
 // Anything bigger than 8K is opened straight at 8K and stored as an 8K JPEG; the full original is never opened.
 assert.equal(shown[0],'webb-STScI-01GA6KKWG229B16K4Q38CH3BXS.jpg');assert.equal(new TextDecoder().decode(disk.get(shown[0])),'jpeg 7680x4448');
 assert.equal(decodes.length,1);assert.deepEqual({...decodes[0]},{resizeWidth:7680,resizeHeight:4448,resizeQuality:'high'});
 // Pictures up to 8K are saved untouched, without opening them.
 assert.equal(sandbox.imageSize(disk.get(shown[1])).w,6000);
 // Photos load as bytes, not text.
 assert.ok((await s.item(shown[1]).load()) instanceof Uint8Array);
 // Next click: a new gallery image. Compass, explainer and hardware entries are never downloaded; too-small ones are skipped.
 const fifth=await s.next();assert.ok(['webb-STScI-LION.png'].includes(fifth.file)||saved.stars.tried.includes('STScI-SMALL'));
 const sixth=await s.next();
 assert.ok(disk.has('webb-STScI-LION.png'));assert.ok(saved.stars.tried.includes('STScI-SMALL'));assert.ok(!disk.has('webb-STScI-SMALL.png'));
 for(const bad of ['COMPASS','EXPLAINER','HARDWARE'])assert.ok(!gets.some(g=>g.url.includes('STScI-'+bad)&&!g.url.includes('wp-json')),bad+' should not download');
 // Too small (1200 px) and too big to open safely (20000 x 12000): skipped from the first 64 KB, never fully downloaded.
 assert.ok(saved.stars.tried.includes('STScI-GIANT'));assert.equal(fullGets('STScI-SMALL'),0);assert.equal(fullGets('STScI-GIANT'),0);
 assert.notEqual(sixth.file,fifth.file);
 // NASA answered but had nothing new that fits: say so, not "could not be reached".
 assert.ok(toasts.some(t=>/No new Webb image/.test(t)));assert.ok(!toasts.some(t=>/could not be reached/.test(t)));
 // Offline: a different photo from the library, with a notice.
 offline=true;const off=await s.next();assert.ok(disk.has(off.file));assert.ok(toasts.some(t=>/could not be reached/.test(t)));
 // A user's own image in the folder can be shown.
 disk.set('my-own-nebula.png',new Uint8Array([1]));const seen=new Set();for(let i=0;i<60;i++)seen.add((await s.next()).file);assert.ok(seen.has('my-own-nebula.png'));
 console.log('PASS: four Webb classics first, then new gallery images each click; non-sky/too-small/too-big skipped from the header; 8K cap opened at 8K; bytes not text; honest offline notice; own photos used.');
})().catch(e=>{console.error(e);process.exitCode=1});
