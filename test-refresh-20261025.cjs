const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const listeners=new Map();let cacheCalls=0,networkCalls=0,fail=false;
class Dispatcher {dispatch(e){listeners.get(e.type)?.(e);}subscribe(n,f){listeners.set(n,f);}unsubscribe(n){listeners.delete(n);}}
const dispatcher=new Dispatcher();
const actions={jumpToMessage(){},_tryFetchMessagesCached(){cacheCalls++;return true;},fetchMessages(args){
  assert.equal(args.skipLocalFetch,true);assert.equal(args.before,'200');
  if(this._tryFetchMessagesCached(args))return;
  networkCalls++;
  return Promise.resolve().then(()=>{dispatcher.dispatch({type:fail?'LOAD_MESSAGES_FAILURE':'LOAD_MESSAGES_SUCCESS',channelId:args.channelId,isBefore:true,requestStartTime:Date.now(),messages:[{id:'100'}]});return !fail;});
}};
const BdApi={Plugins:{folder:'test'},Data:{load(){return null;}},Webpack:{getModule(predicate,options){assert.equal(options.searchExports,true);return[actions,dispatcher].find(predicate);}},Patcher:{instead(name,obj,key,fn){const original=obj[key];obj[key]=function(...args){return fn(this,args,original.bind(this));};return()=>{obj[key]=original;};}}};
const context={require,module:{exports:{}},BdApi,URL,setTimeout,clearTimeout,console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'channels-20261024.js'),'utf8')+'\nmodule.exports=ChannelPhotos;',context);
(async()=>{
 const c=new context.module.exports({});const original=actions._tryFetchMessagesCached;
 const result=await c.page('123','200',{cancelled:false});assert.equal(result[0].id,'100');assert.equal(networkCalls,1);assert.equal(cacheCalls,0);assert.equal(actions._tryFetchMessagesCached,original);assert.equal(listeners.size,0);
 fail=true;await assert.rejects(c.page('123','200',{cancelled:false}),/could not load/);assert.equal(actions._tryFetchMessagesCached,original);assert.equal(listeners.size,0);
 console.log('PASS exported modules, prototype dispatcher, fresh paginated network request, immediate cache-hook restoration, failure cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
