import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { resolveApiKeyIdentity } from '$lib/server/auth/apiKey.js';
import { getDb } from '$lib/server/db/index.js';
import { getExportConfigByName } from '$lib/server/db/repo/export-configs.js';
import { renderExport, ExportRequestError } from '$lib/server/exports/service.js';
import { ExportTimeoutError, toBody } from '$lib/server/renderer/render.js';
import { exportOverrideSchema } from '$lib/server/export-config-schema.js';
import type { RequestHandler } from './$types';

const bodySchema = z
	.object({
		html: z.string().min(1).max(1_000_000),
		config: z.string().trim().min(1).max(100)
	})
	.and(exportOverrideSchema);

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

	const { html, config: configName, ...overrides } = parsed.data;
	const row = getExportConfigByName(getDb(), identity.userId, configName);
	if (!row) return json({ error: `Unknown export config '${configName}'` }, { status: 404 });

	try {
		const { result, recordId } = await renderExport({
			row,
			html,
			overrides,
			record: { userId: identity.userId, apiKeyId: identity.keyId }
		});
		return new Response(toBody(result.buffer), {
			headers: {
				'content-type': result.mimeType,
				'content-disposition': `inline; filename="export.${result.extension}"`,
				'cache-control': 'no-store',
				'x-export-id': recordId ?? ''
			}
		});
	} catch (e) {
		if (e instanceof ExportTimeoutError) return json({ error: e.message }, { status: 408 });
		if (e instanceof ExportRequestError) return json({ error: e.message }, { status: e.status });
		return json({ error: 'Export failed' }, { status: 500 });
	}
};
