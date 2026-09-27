import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
const evidence = path.resolve('docs/review/chung-ket-20260927/bang-chung');
for (const [app, folder, entries, base] of [
  ['demo-wallet', 'site', ['index','gioi-thieu','soi','so-lieu','phong-van'], '/'],
  ['trang-tan-cong', 'site/tan-cong', ['index'], '/tan-cong/'],
]) {
  const root = path.resolve('apps', app);
  await build({ configFile:false, envFile:false, root, base,
    cacheDir:path.join(evidence,'cache',app),
    plugins:[react(),tailwindcss()], css:{postcss:{}},
    define:{global:'globalThis'},resolve:{alias:{buffer:'buffer/'}},
    build:{outDir:path.join(evidence,folder),emptyOutDir:false,
      rollupOptions:{input:Object.fromEntries(entries.map(x=>[x,path.join(root,x+'.html')]))}},
  });
}
