import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { resolveApiKeyIdentity } from '$lib/server/auth/apiKey.js';
import { getDb } from '$lib/server/db/index.js';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	html: z.string().min(1).max(1_000_000)
});

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#x27;': "'",
	'&#39;': "'",
	'&apos;': "'",
	'&nbsp;': ' ',
	'&pound;': '£',
	'&euro;': '€',
	'&yen;': '¥',
	'&copy;': '©',
	'&reg;': '®',
	'&trade;': '™',
	'&mdash;': '—',
	'&ndash;': '–',
	'&lsquo;': '\u2018',
	'&rsquo;': '\u2019',
	'&ldquo;': '\u201C',
	'&rdquo;': '\u201D',
	'&hellip;': '…',
	'&bull;': '•',
	'&middot;': '·',
	'&deg;': '°',
	'&plusmn;': '±',
	'&times;': '×',
	'&divide;': '÷',
	'&frac12;': '½',
	'&frac14;': '¼',
	'&frac34;': '¾',
	'&sup2;': '²',
	'&sup3;': '³',
	'&micro;': 'µ'
};

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&[a-z]+;/g, (m) => ENTITIES[m] ?? m)
		.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
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