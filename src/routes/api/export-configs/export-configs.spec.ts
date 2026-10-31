import { beforeEach, describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

process.env.DATABASE_PATH = ':memory:';

const { closeDb, getDb } = await import('$lib/server/db/index.js');
const { seedEmailTemplate } = await import('$lib/server/db/repo/export-configs.js');
const { GET, POST } = await import('./+server.js');
const { GET: GET_ONE, PATCH, DELETE: DELETE_ONE } = await import('./[id]/+server.js');

type Db = ReturnType<typeof getDb>;

interface CallInit {
	user?: { id: string; role?: string } | null;
	params?: Record<string, string>;
	body?: unknown;
	method?: string;
}

async function call<T = unknown>(
	handler: (event: never) => Response | Promise<Response>,
	init: CallInit = {}
): Promise<{ status: number; body: T }> {
	const url = new URL('http://localhost/api/export-configs');
	const headers = new Headers();
	let body: string | undefined;
	if (init.body !== undefined) {
		headers.set('content-type', 'application/json');
		body = JSON.stringify(init.body);
	}
	const event = {
		locals: { user: init.user ?? null, session: null } as unknown as App.Locals,
		params: init.params ?? {},
		request: new Request(url, {
			method: init.method ?? (body !== undefined ? 'POST' : 'GET'),
			headers,
			body
		}),
		url
	};
	try {
		const res = await handler(event as never);
		return { status: res.status, body: (await res.json()) as T };
	} catch (e) {
		if (isHttpError(e)) return { status: e.status, body: e.body as T };
		throw e;
	}
}

const u1 = { id: 'u1', role: 'user' };
const u2 = { id: 'u2', role: 'user' };

function seedUsers(db: Db) {
	db.prepare(
		`INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt", role)
		 VALUES ('u1', 'a@b.c', 'A', 0, 0, 0, 'user'),
		        ('u2', 'd@e.f', 'D', 0, 0, 0, 'user')`
	).run();
}

beforeEach(() => {
	closeDb();
	seedUsers(getDb());
	seedEmailTemplate(getDb());
});

describe('export-configs endpoints', () => {
	it('requires authentication', async () => {
		expect((await call(GET)).status).toBe(401);
		expect((await call(POST, { body: { name: 'x' } })).status).toBe(401);
	});

	it('creates a config with defaults and lists own + system', async () => {
		const create = await call<{ config: { id: string; name: string; width: number } }>(POST, {
			user: u1,
			body: { name: 'social', width: 1200, height: 630, fullPage: false, format: 'jpeg' }
		});
		expect(create.status).toBe(201);
		expect(create.body.config.name).toBe('social');
		expect(create.body.config.width).toBe(1200);

		const list = await call<{ configs: { name: string }[] }>(GET, { user: u1 });
		expect(list.status).toBe(200);
		expect(list.body.configs.map((c) => c.name)).toEqual(
			expect.arrayContaining(['email', 'social'])
		);
	});

	it('rejects invalid bodies', async () => {
		expect(
			(await call(POST, { user: u1, body: { name: 'bad name!', fullPage: true } })).status
		).toBe(400);
		expect((await call(POST, { user: u1, body: { name: 'nope', fullPage: false } })).status).toBe(
			400
		);
	});

	it('scopes GET/PATCH/DELETE to the owner', async () => {
		const created = await call<{ config: { id: string } }>(POST, {
			user: u1,
			body: { name: 'mine', width: 300, height: 200, fullPage: false }
		});
		const id = created.body.config.id;
		expect((await call(GET_ONE, { user: u2, params: { id } })).status).toBe(404);
		expect((await call(PATCH, { user: u2, params: { id }, body: { name: 'stolen' } })).status).toBe(
			404
		);
		expect((await call(DELETE_ONE, { user: u2, params: { id } })).status).toBe(404);
		expect((await call(DELETE_ONE, { user: u1, params: { id } })).status).toBe(200);
	});

	it('makes system templates read-only but visible to everyone', async () => {
		const list = await call<{ configs: { id: string; name: string }[] }>(GET, { user: u2 });
		const email = list.body.configs.find((c) => c.name === 'email')!;
		expect(email).toBeDefined();
		expect((await call(GET_ONE, { user: u2, params: { id: email.id } })).status).toBe(200);
		expect(
			(await call(PATCH, { user: u2, params: { id: email.id }, body: { name: 'x' } })).status
		).toBe(403);
		expect((await call(DELETE_ONE, { user: u2, params: { id: email.id } })).status).toBe(403);
	});
});
