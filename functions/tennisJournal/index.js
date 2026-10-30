'use strict';
const {createService}=require('./service.cjs');
const {createCloudStore}=require('./cloud-store.cjs');
const core=require('./core.cjs');

// SDK invocation only: do not configure an unauthenticated HTTP trigger.
exports.main=async(event,context)=>{
 try{
  const cloudbase=require('@cloudbase/node-sdk');
  // Capture trusted runtime identity before any await. Never accept event.uid/ownerId.
  const parsed=cloudbase.parseContext(context),trusted=parsed.environment||parsed.environ||{};
  const identity={uid:trusted.TCB_UUID,anonymous:trusted.TCB_ISANONYMOUS_USER===true||trusted.TCB_ISANONYMOUS_USER==='true'};
  const allowedUids=(process.env.COACH_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  // Reject before opening a database connection, including when config is empty.
  if(!identity.uid||identity.anonymous)return {ok:false,error:{code:'UNAUTHENTICATED',message:'请先登录教练账号'}};
  if(!allowedUids.includes(identity.uid))return {ok:false,error:{code:'FORBIDDEN',message:'此账号没有访问记录本的权限'}};
  const app=cloudbase.init({env:cloudbase.SYMBOL_CURRENT_ENV,region:'ap-shanghai'});
  const service=createService({store:createCloudStore(app.database()),core,allowedUids});
  return {ok:true,data:await service.handle(event,identity)};
 }catch(error){
  const known=['INVALID_ARGUMENT','NOT_FOUND','CONFLICT','UNAUTHENTICATED','FORBIDDEN'].includes(error.code);
  return {ok:false,error:{code:known?error.code:'CLOUD_ERROR',message:known?error.message:'云端操作未确认完成，请检查网络后重试；如已保存，重试不会重复新增。'}};
 }
};
