import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url).pathname;
await mkdir(root+'local/generated',{recursive:true});
await mkdir(root+'public/localadmin',{recursive:true});
await build({entryPoints:[root+'scripts/local-shared.ts'],outfile:root+'local/generated/shared.mjs',bundle:true,platform:'node',format:'esm',target:'node22',minify:false});
await build({entryPoints:[root+'scripts/local-admin-entry.tsx'],outfile:root+'public/localadmin/admin.js',bundle:true,platform:'browser',format:'esm',target:'es2022',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
await copyFile(root+'app/globals.css',root+'public/localadmin/admin.css');
console.log('Standalone local runtime and admin built.');
