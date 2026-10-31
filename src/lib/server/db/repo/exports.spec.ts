import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../index.js';
import { createExport, listExports, toPublic } from './exports.js';

let db: Db;

beforeEach(() => {
	db = openDatabase(':memory:');
	db.prepare(
		`INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt", role)
		 VALUES ('u1', 'a@b.c', 'A', 0, 0, 0, 'user')`
	).run();
});

describe('exports repo', () => {
	it('creates and lists export records for a user', () => {
		const a = createExport(db, {
			userId: 'u1',
			configId: null,
			status: 'success',
			mime: 'image/png',
			size: 123
		});
		const b = createExport(db, { userId: 'u1', configId: null, status: 'error', error: 'boom' });

		const rows = listExports(db, 'u1');
		expect(rows).toHaveLength(2);
		expect(rows[0].id).toBe(b.id); // newest first
		expect(toPublic(a).status).toBe('success');
		expect(toPublic(b).error).toBe('boom');
	});

	it('scopes listing to the user', () => {
		createExport(db, { userId: 'u1', configId: null, status: 'success' });
		expect(listExports(db, 'someone-else')).toHaveLength(0);
	});

	it('caps the returned list length', () => {
		for (let i = 0; i < 10; i++) {
			createExport(db, { userId: 'u1', configId: null, status: 'success' });
		}
		expect(listExports(db, 'u1', 3)).toHaveLength(3);
	});
});
