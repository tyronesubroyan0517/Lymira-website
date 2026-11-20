import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://lymiracollective.com',
  build: { format: 'file' },
  trailingSlash: 'never',
})
