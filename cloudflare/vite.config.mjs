import { defineConfig } from 'vite';
import path from 'node:path';

const root = import.meta.dirname;
export default defineConfig({
  root,
  envDir: false,
  publicDir: path.resolve(root, '../public'),
  esbuild: { jsx: 'automatic' },
  plugins: [{
    name: 'browser-server-boundary',
    generateBundle() {
      for (const id of this.getModuleIds()) {
        if (/node_modules\/(?:ioredis|@prisma|\.prisma)\//.test(id) || /\/src\/lib\/(?:auth|db|redis|redis-utils)\.[cm]?[jt]s$/.test(id)) {
          this.error('Server-only module reached the browser bundle: ' + id);
        }
      }
    },
  }],
  resolve: {
    alias: [
      { find: 'next/link', replacement: path.resolve(root, 'compat/link.tsx') },
      { find: 'next/image', replacement: path.resolve(root, 'compat/image.tsx') },
      { find: 'next/navigation', replacement: path.resolve(root, 'compat/navigation.ts') },
      { find: '@', replacement: path.resolve(root, '../src') },
    ],
  },
  define: {
    'process.env.NEXT_PUBLIC_APP_URL': 'window.location.origin',
    'process.env.NEXT_PUBLIC_GOOGLE_API_KEY': JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''),
    'process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID': JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''),
  },
  build: { outDir: path.resolve(root, '../pages-dist'), emptyOutDir: true, sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return;
        if (warning.code === 'SOURCEMAP_ERROR' && warning.message.includes('original location')) return;
        warn(warning);
      },
    },
  },
});
