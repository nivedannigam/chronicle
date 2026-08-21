#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const root = process.cwd()

const result = spawnSync(
	'npx',
	['playwright', 'test', 'e2e/chronicle/reset.spec.ts'],
	{
		cwd: root,
		env: {
			...process.env,
			VITE_CHRONICLE_QA_MODE: 'true',
		},
		stdio: 'inherit',
		shell: process.platform === 'win32',
	},
)

process.exit(result.status ?? 0)
