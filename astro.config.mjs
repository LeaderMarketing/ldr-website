import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// SITE_URL / BASE_PATH are set by the GitHub Pages workflow for the preview build
// (https://leadermarketing.github.io/ldr-website/). Locally and in production they're unset.
export default defineConfig({
  site: process.env.SITE_URL || 'https://www.ldr.com.au', // TODO: confirm production domain
  base: process.env.BASE_PATH || '/',
  integrations: [react()],
  trailingSlash: 'ignore',
});
