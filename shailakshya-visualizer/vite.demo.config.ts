import { defineConfig } from 'vite';

/**
 * Standalone demo bundle: the planning half, running entirely in the browser.
 * Published as a shareable page, so it must contain no keys and make no API
 * calls. See web/src/demo.ts.
 */
export default defineConfig({
  root: 'web',
  publicDir: false,
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: 'src/demo.ts',
      formats: ['iife'],
      name: 'ShailakshyaDemo',
      fileName: () => 'demo.js',
    },
  },
});
