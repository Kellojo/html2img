import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../index.js';
import {
	createExportConfig,
	deleteExportConfig,
	getExportConfigByName,
	listExportConfigs,
	seedEmailTemplate,
	toPublic,
	updateExportConfig
} from './export-configs.js';

let db: Db;

function base(overrides: Partial<Parameters<typeof createExportConfig>[1]> = {}) {
	return {
		userId: 'u1',
		name: 'social',
		width: 1200,
		height: 630,
		deviceScaleFactor: 1,
		fullPage: false,
		format: 'jpeg' as const,
		quality: 85,
		omitBackground: false,
		css: null,
		waitUntil: 'load' as const,
		waitForNetworkIdle: false,
		timeoutMs: 10000,
		...overrides
	};
}

beforeEach(() => {
	db = openDatabase(':memory:');
	db.prepare(
		`INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt", role)
		 VALUES ('u1', 'a@b.c', 'A', 0, 0, 0, 'user'),
		        ('u2', 'd@e.f', 'D', 0, 0, 0, 'user')`
	).run();
});

describe('export-configs repo', () => {
	it('seedEmailTemplate creates a single default email config', () => {
		seedEmailTemplate(db);
		seedEmailTemplate(db);
		const rows = db.prepare('SELECT * FROM export_configs WHERE is_system = 1').all();
		expect(rows).toHaveLength(1);
		const row = rows[0] as {
			name: string;
			width: number;
			full_page: number;
			user_id: string | null;
		};
		expect(row.name).toBe('email');
		expect(row.width).toBe(600);
		expect(row.full_page).toBe(1);
		expect(row.user_id).toBeNull();
	});

	it('creates, updates and deletes an owned config', () => {
		const row = createExportConfig(db, base());
		expect(row.name).toBe('social');
		expect(row.format).toBe('jpeg');

		const updated = updateExportConfig(db, row.id, 'u1', { name: 'social-v2', width: 800 });
		expect(updated).toBeDefined();
		expect(updated!.name).toBe('social-v2');
		expect(updated!.width).toBe(800);

		expect(deleteExportConfig(db, row.id, 'u1')).toBe(true);
		expect(deleteExportConfig(db, row.id, 'u1')).toBe(false);
	});

	it('does not allow updating or deleting system templates', () => {
		seedEmailTemplate(db);
		const email = getExportConfigByName(db, 'u1', 'email')!;
		expect(updateExportConfig(db, email.id, 'u1', { name: 'hacked' })).toBeUndefined();
		expect(deleteExportConfig(db, email.id, 'u1')).toBe(false);
	});

	it('scopes deletes to the owner', () => {
		const row = createExportConfig(db, base({ userId: 'u1' }));
		expect(deleteExportConfig(db, row.id, 'u2')).toBe(false);
		expect(deleteExportConfig(db, row.id, 'u1')).toBe(true);
	});

	it('lists own and system configs, resolving own configs first by name', () => {
		seedEmailTemplate(db);
		const own = createExportConfig(db, base({ name: 'email', width: 700 }));
		const list = listExportConfigs(db, 'u1');
		expect(list.some((r) => r.id === own.id)).toBe(true);
		expect(getExportConfigByName(db, 'u1', 'email')!.id).toBe(own.id);
		expect(getExportConfigByName(db, 'u2', 'email')!.user_id).toBeNull();
	});

	it('converts rows to camelCase public shapes', () => {
		const row = createExportConfig(db, base({ omitBackground: true, fullPage: false }));
		const pub = toPublic(row);
		expect(pub.omitBackground).toBe(true);
		expect(pub.fullPage).toBe(false);
		expect(pub.deviceScaleFactor).toBe(1);
		expect(pub.createdAt).toBeGreaterThan(0);
	});
});
