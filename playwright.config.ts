import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: {
			DATABASE_PATH: ':memory:',
			ENABLE_SIGNUP: 'true',
			ENABLE_PASSWORD_LOGIN: 'true',
			AUTO_PROMOTE_FIRST_USER: 'true'
		}
	},
	testMatch: '**/*.e2e.{ts,js}'
});
