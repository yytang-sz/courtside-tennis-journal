'use strict';
const {documentKey}=require('./service.cjs');
const collection=kind=>({players:'tennis_players',matches:'tennis_matches'})[kind];
function checkedResponse(response){if(!response||response.code){const error=new Error(response?.message||'数据库响应无效');error.code=response?.code||'CLOUD_ERROR';throw error;}return response;}
function unwrap(response){checkedResponse(response);return Array.isArray(response.data)?response.data[0]??null:response.data??null;}
function checked(row,owner){if(row&&row.ownerId!==owner)throw Error('数据库记录归属校验失败');return row;}
function createCloudStore(db){
 const metaId=owner=>documentKey(owner,'meta','revision');
 async function revision(owner){const data=checked(unwrap(await db.collection('tennis_meta').doc(metaId(owner)).get()),owner);return data?.revision??0;}
 async function run(owner,callback){
  return db.runTransaction(async transaction=>{
   const metaDoc=transaction.collection('tennis_meta').doc(metaId(owner));
   const meta=checked(unwrap(await metaDoc.get()),owner);let dirty=false;
   const tx={
    async get(kind,id){const row=checked(unwrap(await transaction.collection(collection(kind)).doc(documentKey(owner,kind,id)).get()),owner);return row?.record??null;},
    async put(kind,record){checkedResponse(await transaction.collection(collection(kind)).doc(documentKey(owner,kind,record.id)).set({ownerId:owner,recordId:record.id,record,savedAt:new Date().toISOString()}));dirty=true;}
   };
   const result=await callback(tx);
   if(dirty)checkedResponse(await metaDoc.set({ownerId:owner,revision:(meta?.revision??0)+1}));
   return result;
  });
 }
 async function page(owner,kind,cursor='',limit=50){
  const where={ownerId:owner};if(cursor)where.recordId=db.command.gt(cursor);
  const response=checkedResponse(await db.collection(collection(kind)).where(where).orderBy('recordId','asc').limit(limit).get());
  if(!Array.isArray(response.data))throw Error('数据库分页结果无效');
  const envelopes=response.data.map(row=>checked(row,owner));
  return {rows:envelopes.map(row=>row.record),cursor:envelopes.length===limit?envelopes[envelopes.length-1].recordId:null};
 }
 return {revision,run,page};
}
module.exports={createCloudStore};
