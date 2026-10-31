import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { load } from 'cheerio';
import { resolveApiKeyIdentity } from '$lib/server/auth/apiKey.js';
import { getDb } from '$lib/server/db/index.js';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	html: z.string().min(1).max(1_000_000)
});

function stripHtml(html: string): string {
	return load(html)
		.text()
		.replace(/\s+/g, ' ')
		.trim();
}

export const POST: RequestHandler = async ({ request }) => {
	const identity = await resolveApiKeyIdentity(getDb(), request.headers.get('authorization'));
	if (!identity) return json({ error: 'Missing or invalid API key' }, { status: 401 });
	if (!identity.scopes.includes('export:create')) {
		return json({ error: 'API key does not have the export:create scope' }, { status: 403 });
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 400 });
	}

	return json({ text: stripHtml(parsed.data.html) });
};