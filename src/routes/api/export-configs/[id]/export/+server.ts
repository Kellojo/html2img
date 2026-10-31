import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth/guards.js';
import { getDb } from '$lib/server/db/index.js';
import { getExportConfigForUser } from '$lib/server/db/repo/export-configs.js';
import { renderExport, ExportRequestError } from '$lib/server/exports/service.js';
import { ExportTimeoutError, toBody } from '$lib/server/renderer/render.js';
import type { RequestHandler } from './$types';

const schema = z.object({ html: z.string().min(1).max(1_000_000) });

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const user = requireUser(locals);
	const row = getExportConfigForUser(getDb(), params.id, user.id);
	if (!row) error(404, { message: 'Export config not found' });

	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, { message: 'html is required (max 1MB)' });

	try {
		const { result, recordId } = await renderExport({
			row,
			html: parsed.data.html,
			record: { userId: user.id, apiKeyId: null }
		});
		return new Response(toBody(result.buffer), {
			headers: {
				'content-type': result.mimeType,
				'content-disposition': `attachment; filename="export.${result.extension}"`,
				'cache-control': 'no-store',
				'x-export-id': recordId ?? ''
			}
		});
	} catch (e) {
		if (e instanceof ExportTimeoutError) error(408, { message: e.message });
		if (e instanceof ExportRequestError) error(e.status, { message: e.message });
		throw e;
	}
};
