import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { defineConfig, Plugin } from 'vite';
import { getAllStaticAssets } from './src/render/AssetKeys';

const SOURCE_ENTRY_TAG = '<script type="module" src="/src/main.ts"></script>';
const PREVIEW_ENTRY_TAG = '<script type="module" src="./game.web.js"></script>';

function copyRuntimeAssets(): Plugin {
  return {
    name: 'copy-runtime-assets',
    closeBundle(): void {
      const files = ['game.json', ...getAllStaticAssets().map(asset => asset.path)];
      for (const file of files) {
        const source = resolve(__dirname, 'public', file);
        const target = resolve(__dirname, 'dist', file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(source, target);
      }

      const sourceHtml = readFileSync(resolve(__dirname, 'index.html'), 'utf8');
      if (!sourceHtml.includes(SOURCE_ENTRY_TAG)) {
        throw new Error('index.html 中未找到浏览器源码入口，无法生成预览页面');
      }
      writeFileSync(
        resolve(__dirname, 'dist', 'index.html'),
        sourceHtml.replace(SOURCE_ENTRY_TAG, PREVIEW_ENTRY_TAG),
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [copyRuntimeAssets()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['es', 'cjs'],
      fileName: format => format === 'cjs' ? 'game.js' : 'game.web.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: mode === 'production' ? 'esbuild' : false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
  server: {
    port: 3000,
    open: true,
  },
}));
