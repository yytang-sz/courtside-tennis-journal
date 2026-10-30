const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {CloudJournalClient}=require(path.resolve(__dirname,'../site/cloud-client.js'));
test('CloudBase OAuth response objects produce actionable login errors',async()=>{
 const raw={error:'invalid_username_or_password',error_code:4043,error_description:'Username or password incorrect.'};
 const sdk={init:()=>({auth:()=>({signIn:async()=>{throw raw;}})})};
 const client=new CloudJournalClient({envId:'test-env',region:'ap-shanghai'},sdk);
 await assert.rejects(client.signIn('test-coach','test-only-placeholder'),error=>error instanceof Error&&error.code==='invalid_username_or_password'&&/用户名或密码/.test(error.message));
});
