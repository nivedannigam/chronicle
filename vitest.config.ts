import path from 'node:path'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: 'node',
		include: [
			'src/**/*.test.ts',
			'packages/core/**/*.test.ts',
			'supabase/functions/**/*.test.ts',
		],
		exclude: ['supabase/functions/ask-ai/**'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
})
