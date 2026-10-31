import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
	vi.resetModules();
	process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
	process.env = { ...ORIGINAL_ENV };
});

describe('config', () => {
	it('applies defaults', async () => {
		const { config } = await import('./config.js');
		expect(config.DATABASE_PATH).toBe('./data/html2img.db');
		expect(config.ENABLE_SIGNUP).toBe(true);
		expect(config.ENABLE_PASSWORD_LOGIN).toBe(true);
		expect(config.OIDC_ONLY).toBe(false);
		expect(config.OIDC_SCOPES).toBe('openid profile email');
	});

	it('parses booleans from strings', async () => {
		process.env.ENABLE_SIGNUP = 'false';
		process.env.OIDC_ONLY = 'true';
		process.env.OIDC_ISSUER = 'https://idp.example.com';
		process.env.OIDC_CLIENT_ID = 'id';
		process.env.OIDC_CLIENT_SECRET = 'secret';
		const { config } = await import('./config.js');
		expect(config.ENABLE_SIGNUP).toBe(false);
		expect(config.OIDC_ONLY).toBe(true);
	});

	it('rejects OIDC_ONLY without full OIDC config', async () => {
		process.env.OIDC_ONLY = 'true';
		await expect(import('./config.js')).rejects.toThrow(/OIDC_ONLY/);
	});

	it('accepts OIDC_ONLY with full OIDC config', async () => {
		process.env.OIDC_ONLY = 'true';
		process.env.OIDC_ISSUER = 'https://idp.example.com';
		process.env.OIDC_CLIENT_ID = 'id';
		process.env.OIDC_CLIENT_SECRET = 'secret';
		const { config } = await import('./config.js');
		expect(config.OIDC_ONLY).toBe(true);
	});
});
