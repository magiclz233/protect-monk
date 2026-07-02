import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['cjs'],           // 微信小游戏必须 CJS
      fileName: () => 'game.js',  // 固定输出名
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: false, // 调试阶段先不压缩
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  server: {
    port: 3000,
    open: true,
  },
});
