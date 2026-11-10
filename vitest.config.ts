import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Pure logic runs in node. Component specs opt into jsdom with a
      // `// @vitest-environment jsdom` comment at the top of the file.
      environment: 'node',
      include: ['src/**/*.test.ts'],
      exclude: [...configDefaults.exclude, 'src-tauri/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
