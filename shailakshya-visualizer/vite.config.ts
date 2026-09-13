import { defineConfig } from 'vite';

/**
 * The widget ships as a single script tag dropped into the company's existing
 * site (SPEC §4), so the build is an IIFE bundle with its CSS inlined into the
 * JS rather than a second <link> the client would have to remember to add.
 */
export default defineConfig({
  root: 'web',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    // Most Nepali traffic is mobile on variable connections (SPEC §9), so the
    // bundle is kept small enough to parse quickly on a low-end phone.
    rollupOptions: {
      output: {
        entryFileNames: 'visualizer.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
