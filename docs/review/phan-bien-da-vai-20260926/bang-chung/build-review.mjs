import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
// No project config or .env loading. All outputs within review directory.
await build({configFile:false,envFile:false,root:path.resolve('apps/demo-wallet'),base:'/',publicDir:path.resolve('apps/demo-wallet/public'),cacheDir:path.resolve('docs/review/phan-bien-da-vai-20260926/bang-chung/vite-cache'),plugins:[react(),tailwindcss()],css:{postcss:{}},define:{global:'globalThis'},resolve:{alias:{buffer:'buffer/'}},build:{outDir:path.resolve('docs/review/phan-bien-da-vai-20260926/bang-chung/site'),emptyOutDir:false}});
