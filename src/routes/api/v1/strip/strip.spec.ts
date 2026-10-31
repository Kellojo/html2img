import { beforeEach, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

const { closeDb, getDb } = await import('$lib/server/db/index.js');
const { createApiKey } = await import('$lib/server/db/repo/api-keys.js');
const { POST } = await import('./+server.js');

type Db = ReturnType<typeof getDb>;

function seedUsers(db: Db) {
	db.prepare(
		`INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt", role)
		 VALUES ('u1', 'a@b.c', 'A', 0, 0, 0, 'user')`
	).run();
}

async function call(body: unknown, authorization?: string): Promise<Response> {
	const headers = new Headers({ 'content-type': 'application/json' });
	if (authorization) headers.set('authorization', authorization);
	const event = {
		locals: { user: null, session: null } as unknown as App.Locals,
		params: {},
		request: new Request('http://localhost/api/v1/strip', {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		}),
		url: new URL('http://localhost/api/v1/strip')
	};
	return await POST(event as never);
}

beforeEach(() => {
	closeDb();
	seedUsers(getDb());
});

describe('POST /api/v1/strip', () => {
	it('requires a valid API key', async () => {
		expect((await call({ html: '<p>test</p>' })).status).toBe(401);
		expect((await call({ html: '<p>test</p>' }, 'Bearer nope')).status).toBe(401);
	});

	it('rejects keys without the export:create scope', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k', scopes: [] });
		expect((await call({ html: '<p>test</p>' }, `Bearer ${rawKey}`)).status).toBe(403);
	});

	it('validates the request body', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		expect((await call({}, `Bearer ${rawKey}`)).status).toBe(400);
		expect((await call({ html: '' }, `Bearer ${rawKey}`)).status).toBe(400);
	});

	it('strips HTML tags and decodes entities', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call(
			{ html: '<div><p>Hello &amp; welcome</p><span> to our <b>site</b></span></div>' },
			`Bearer ${rawKey}`
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.text).toBe('Hello & welcome to our site');
	});

	it('normalises whitespace', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call(
			{ html: '<p>Line   one\n\n\tLine  two</p>' },
			`Bearer ${rawKey}`
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.text).toBe('Line one Line two');
	});

	it('handles nested and empty tags', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call(
			{ html: '<div><br><hr><img src="x.jpg"></div>' },
			`Bearer ${rawKey}`
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.text).toBe('');
	});

	it('preserves text inside deeply nested structures', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const html = `<!doctype html>
<html>
<head><title>Page</title></head>
<body>
  <table>
    <tr><td>Invoice</td><td>&pound;42.00</td></tr>
    <tr><td>VAT</td><td>&pound;8.40</td></tr>
  </table>
</body>
</html>`;
		const res = await call({ html }, `Bearer ${rawKey}`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.text).toContain('Invoice');
		expect(body.text).toContain('£42.00');
		expect(body.text).toContain('VAT');
		expect(body.text).toContain('£8.40');
	});

	it('decodes numeric HTML entities', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call(
			{ html: '&#65; &#x42; &#163;' },
			`Bearer ${rawKey}`
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.text).toBe('A B £');
	});

	it('excludes CSS and script content from the output', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const html = `<!doctype html>
<html>
<head>
  <style>.button { color: red; font-size: 16px; }</style>
  <script>const secret = "not-visible-text";</script>
</head>
<body>
  <p>Hello world</p>
  <style>p { margin: 0; }</style>
  <script>doSomething();</script>
</body>
</html>`;
		const res = await call({ html }, `Bearer ${rawKey}`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.text).toBe('Hello world');
		expect(body.text).not.toContain('color');
		expect(body.text).not.toContain('secret');
		expect(body.text).not.toContain('margin');
		expect(body.text).not.toContain('doSomething');
	});

	it('excludes template content but keeps visible text', async () => {
		const { rawKey } = await createApiKey(getDb(), { userId: 'u1', label: 'k' });
		const res = await call(
			{ html: '<template><span>hidden</span></template><p>visible</p>' },
			`Bearer ${rawKey}`
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.text).toBe('visible');
	});
});