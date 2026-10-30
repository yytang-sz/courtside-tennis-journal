'use strict';
const {createHash}=require('node:crypto');
const kinds=new Set(['players','matches']);
const playerFields=new Set(['id','name','age','gender','ageGroup','goals','createdAt','updatedAt','simulated']);
const matchFields=new Set(['id','playerId','date','event','opponent','score','ratings','notes','observerRating','selfRating','reflection','strength','nextAction','createdAt','overallMethod','ratingScale','simulated']);
function fail(message,code='INVALID_ARGUMENT'){const error=new Error(message);error.code=code;throw error;}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
function same(a,b,ignoreCreated=false){const x={...a},y={...b};if(ignoreCreated){delete x.createdAt;delete y.createdAt;}return JSON.stringify(stable(x))===JSON.stringify(stable(y));}
function documentKey(owner,kind,id){return createHash('sha256').update(JSON.stringify([owner,kind,id])).digest('hex');}
function createService({store,core,allowedUids=[]}){
 const approved=new Set(allowedUids.filter(v=>typeof v==='string'&&v));
 function validateKind(kind){if(!kinds.has(kind))fail('记录类型无效');}
 function clean(kind,row){
  validateKind(kind);
  if(!row||typeof row!=='object'||Array.isArray(row))fail('记录格式无效');
  const fields=kind==='players'?playerFields:matchFields;
  if(Object.keys(row).some(k=>!fields.has(k)))fail('记录包含不允许的字段');
  if(typeof row.id!=='string'||!row.id||row.id.length>100)fail('记录编号无效');
  if(row.id.startsWith('embedded-template-player-1-30-v1')||row.playerId==='embedded-template-player-1-30-v1')fail('内置示例只读，不上传云端');
  if(Buffer.byteLength(JSON.stringify(row),'utf8')>100000)fail('单条记录文字过多，请缩短备注');
  return JSON.parse(JSON.stringify(row));
 }
 function validate(kind,row,parent){
  try{
   if(kind==='players')core.validateBackup({format:'tennis-player-records',version:1,players:[row],matches:[]});
   else{
    if(!parent)fail('球员不存在或不属于当前账号','NOT_FOUND');
    core.validateBackup({format:'tennis-player-records',version:1,players:[parent],matches:[row]});
    if(row.overallMethod==='mean-v1')row.ratings.overall=core.overall(row.ratings);
   }
  }catch(e){if(e.code)throw e;fail(e.message);}
 }
 async function addInside(tx,kind,row){
  const parent=kind==='matches'?await tx.get('players',row.playerId):null;
  validate(kind,row,parent);
  const existing=await tx.get(kind,row.id);
  if(existing){if(!same(existing,row,true))fail('相同编号的内容冲突，已有记录未覆盖','CONFLICT');return false;}
  await tx.put(kind,row);return true;
 }
 async function handle(event,identity){
  if(!identity||!identity.uid||identity.anonymous)fail('请先登录教练账号','UNAUTHENTICATED');
  const owner=identity.uid;
  if(!approved.has(owner))fail('此账号没有访问记录本的权限','FORBIDDEN');
  if(!event||typeof event!=='object'||Array.isArray(event))fail('请求无效');
  if(event.action==='status')return {uid:owner,revision:await store.revision(owner)};
  if(event.action==='page'){
   validateKind(event.kind);const limit=event.limit??50,cursor=event.cursor??'';
   if(!Number.isInteger(limit)||limit<1||limit>50||typeof cursor!=='string'||cursor.length>100)fail('分页参数无效');
   return store.page(owner,event.kind,cursor,limit);
  }
  if(event.action==='add'){
   const row=clean(event.kind,event.row);
   const added=await store.run(owner,tx=>addInside(tx,event.kind,row));return {id:row.id,duplicate:!added};
  }
  if(event.action==='updatePlayer'){
   const row=clean('players',event.row),expected=clean('players',event.expected);
   if(row.id!==expected.id)fail('球员编号不能修改');validate('players',row);
   return store.run(owner,async tx=>{
    const current=await tx.get('players',row.id);
    if(!current)fail('球员不存在','NOT_FOUND');
    if(same(current,row))return {id:row.id,duplicate:true};
    if(!same(current,expected))fail('球员资料已在另一设备改变，请刷新后重新编辑','CONFLICT');
    if(row.createdAt!==current.createdAt)fail('建立时间不能修改');
    await tx.put('players',row);return {id:row.id,duplicate:false};
   });
  }
  if(event.action==='importBatch'){
   if(!Array.isArray(event.players)||!Array.isArray(event.matches)||event.players.length+event.matches.length>20)fail('每批最多导入20条记录');
   const ps=event.players.map(r=>clean('players',r)),ms=event.matches.map(r=>clean('matches',r));
   return store.run(owner,async tx=>{let addedP=0,addedM=0;for(const row of ps)if(await addInside(tx,'players',row))addedP++;for(const row of ms)if(await addInside(tx,'matches',row))addedM++;return {addedP,addedM};});
  }
  fail('未知操作');
 }
 return {handle};
}
module.exports={createService,documentKey,same};
