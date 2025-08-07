import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  
  onwarn: (warning, handler) => {
    // Disable specific a11y warnings
    if (warning.code === 'a11y-label-has-associated-control') return;
    // Uncomment the line below to disable ALL a11y warnings
    // if (warning.code.startsWith('a11y-')) return;
    
    // Handle all other warnings normally
    handler(warning);
  },

  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    paths: {
      base: process.env.NODE_ENV === 'production' ? '' : ''
    },
    alias: {
      $component: "src/component",
      $lib: "src/lib",
    }
  },

  vitePlugin: {
    inspector: false
  }
};

export default config;
