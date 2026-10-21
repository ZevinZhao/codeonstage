import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Vite 配置：React 插件 + 路径别名 @ → src
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
          icons: ['lucide-react'],
          // Three.js 独立分块：放映厅胶卷渲染（约 600KB+，仅首页使用）
          three: ['three'],
        },
      },
    },
  },
});