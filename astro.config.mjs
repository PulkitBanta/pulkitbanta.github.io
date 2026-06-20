import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pulkitbanta.com',
  base: '/',
  integrations: [sitemap()],
  server: {
    port: 3001,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
