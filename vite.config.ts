import { defineConfig, normalizePath } from 'vite';
import solidPlugin from 'vite-plugin-solid';
// import devtools from 'solid-devtools/vite';

import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'node:path'

export default defineConfig({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),

    viteStaticCopy({
      targets: [
        {
          src: normalizePath(path.resolve(__dirname, './rendr')),
          dest: './',
        },
        {
          src: normalizePath(path.resolve(__dirname, './sketches')),
          dest: './',
        },
      ],
    }),
  ],
  server: {
    port: 3000,
    watch: {}
  },
  build: {
    target: 'esnext',
  },
  // base: './',
});
