
import { defineConfig } from 'vitest/config'
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsConfigPaths({ projects: ['tsconfig.test.json'] })],
    test: {
        include: ['test/**/*.test.ts']
    },
})