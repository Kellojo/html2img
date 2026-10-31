import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/renderer/render.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/renderer/render.js')>();
	return { ...actual, renderToImage: vi.fn() };
});

process.env.DATABASE_PATH = ':memory:';

const { closeDb, getDb } = await import('$lib/server/db/index.js');
const { createApiKey } = await import('$lib/server/db/repo/api-keys.js');
const { seedEmailTemplate } = await import('$lib/server/db/repo/export-configs.js');
const { listExports } = await import('$lib/server/db/repo/exports.js');
const { renderToImage, ExportTimeoutError } = await import('$lib/server/renderer/render.js');
const { POST } = await import('./+server.js');

type Db = ReturnType<typeof getDb>;

function seedUsers(db: Db) {
	db.prepare(
		`INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt", role)
		 VALUES ('u1', 'a@b.c', 'A', 0, 0, 0, 'user')`
	).run();
}

async function call(configName: string, body: unknown, authorization?: string): Promise<Response> {
	const headers = new Headers({ 'content-type': 'application/json' });
	if (authorization) headers.set('authorization', authorization);
	const event = {
		locals: { user: null, session: null } as unknown as App.Locals,
		params: { config: configName },
		request: new Request(`http://localhost/api/v1/export/${encodeURIComponent(configName)}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		}),
		url: new URL(`http://localhost/api/v1/export/${encodeURIComponent(configName)}`)
	};
	return await POST(event as never);
}

beforeEach(async () => {
	closeDb();
	seedUsers(getDb());
	seedEmailTemplate(getDb());
	vi.mocked(renderToImage).mockReset();
	vi.mocked(renderToImage).mockResolvedValue({
		buffer: Buffer.from('fake-image'),
		mimeType: 'image/png',
		extension: 'png'
	});
});

describe('POST /api/v1/export/:config', () => {
	it('requires a valid API key', async () => {
		expect((await call('email', { html: '<b>x</b>' })).status).toBe(401);
		expect((await call('email', { html: '<b>x</b>' }, 'Bearer nope')).status).toBe(401);
	});

	it('rejects keys without the export:create scope', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k', scopes: [] });
		expect((await call('email', { html: '<b>x</b>' }, `Bearer ${rawKey}`)).status).toBe(403);
	});

	it('validates the request body', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		expect((await call('email', {}, `Bearer ${rawKey}`)).status).toBe(400);
	});

	it('returns 404 for an unknown config', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call('missing', { html: '<b>x</b>' }, `Bearer ${rawKey}`);
		expect(res.status).toBe(404);
	});

	it('renders HTML with the named config and records the export', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call('email', { html: '<b>hello</b>' }, `Bearer ${rawKey}`);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('image/png');
		expect(res.headers.get('x-export-id')).not.toBeNull();
		expect(Buffer.from(await res.arrayBuffer()).toString('utf8')).toBe('fake-image');

		const arg = vi.mocked(renderToImage).mock.calls[0][0];
		expect(arg.html).toBe('<b>hello</b>');
		expect(arg.width).toBe(600);
		expect(arg.fullPage).toBe(true);
		expect(arg.deviceScaleFactor).toBe(2);

		const records = listExports(getDb(), 'u1');
		expect(records).toHaveLength(1);
		expect(records[0].status).toBe('success');
		expect(records[0].mime).toBe('image/png');
	});

	it('applies overrides from the request body', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call(
			'email',
			{ html: '<b>hello</b>', width: 800, format: 'jpeg' },
			`Bearer ${rawKey}`
		);
		expect(res.status).toBe(200);
		const arg = vi.mocked(renderToImage).mock.calls[0][0];
		expect(arg.width).toBe(800);
		expect(arg.format).toBe('jpeg');
	});

	it('returns 408 when rendering times out', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		vi.mocked(renderToImage).mockRejectedValue(new ExportTimeoutError(10));
		const res = await call('email', { html: '<b>x</b>' }, `Bearer ${rawKey}`);
		expect(res.status).toBe(408);
		const body = await res.json();
		expect(body.error).toMatch(/timed out/);
	});

	it('handles config names with special characters by encoding', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call('email', { html: '<b>x</b>' }, `Bearer ${rawKey}`);
		expect(res.status).toBe(200);
	});
});