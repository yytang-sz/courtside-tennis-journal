const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const esbuild=require('esbuild');
test('browser SDK resolves without a package loader or external CDN imports',()=>{
 const result=esbuild.buildSync({entryPoints:[path.resolve(__dirname,'../site/vendor/cloudbase-2.32.0.esm.js')],bundle:false,write:false,format:'esm',metafile:true,logLevel:'silent'});
 const imports=Object.values(result.metafile.outputs).flatMap(v=>v.imports);
 assert.deepEqual(imports,[],'unresolved module imports would prevent browser login');
});
