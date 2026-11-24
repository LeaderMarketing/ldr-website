import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://www.ldr.com.au', // TODO: confirm production domain
  integrations: [react()],
  trailingSlash: 'ignore',
});
