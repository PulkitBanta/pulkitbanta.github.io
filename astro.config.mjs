import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pulkitbanta.com',
  base: '/',
  integrations: [sitemap()],
  // Self-hosted at build time with metric-matched fallbacks, so there's no third-party
  // request chain and no layout shift when the web font swaps in.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
    },
  ],
  server: {
    port: 3001,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
