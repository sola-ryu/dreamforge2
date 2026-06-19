import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '@/*': './src/*'
    }
  },
  onwarn: (warning, handler) => {
    if (warning.code.startsWith('a11y_')) return;
    handler(warning);
  }
};

export default config;
