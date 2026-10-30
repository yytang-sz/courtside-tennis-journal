const path=require('node:path'),fs=require('node:fs');
const esbuild=require('esbuild');
const result=esbuild.buildSync({entryPoints:[require.resolve('@cloudbase/js-sdk')],bundle:true,platform:'browser',format:'esm',target:['safari15'],minify:true,legalComments:'linked',metafile:true,outfile:path.join(__dirname,'site/vendor/cloudbase-2.32.0.esm.js'),logLevel:'warning'});
const external=Object.values(result.metafile.outputs).flatMap(v=>v.imports);
if(external.length)throw Error('SDK still contains external imports: '+JSON.stringify(external));
fs.writeFileSync(path.join(__dirname,'sdk-bundle-manifest.json'),JSON.stringify({sdk:'@cloudbase/js-sdk@2.32.0',esbuild:require('esbuild/package.json').version,externalImports:external},null,2));
console.log('Browser SDK bundled locally; no external module imports.');
