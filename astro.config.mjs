import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://pulkitbanta.github.io',
  base: '/',
  server: {
    port: 3001,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});