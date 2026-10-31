import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth/guards.js';
import { getDb } from '$lib/server/db/index.js';
import {
	deleteExportConfig,
	getExportConfigForUser,
	toPublic,
	updateExportConfig
} from '$lib/server/db/repo/export-configs.js';
import {
	exportConfigPatchSchema,
	validateExportConfigShape
} from '$lib/server/export-config-schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) => {
	const user = requireUser(locals);
	const row = getExportConfigForUser(getDb(), params.id, user.id);
	if (!row) error(404, { message: 'Export config not found' });
	return json({ config: toPublic(row) });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const user = requireUser(locals);
	const existing = getExportConfigForUser(getDb(), params.id, user.id);
	if (!existing) error(404, { message: 'Export config not found' });
	if (existing.is_system === 1) error(403, { message: 'Default templates are read-only' });

	const parsed = exportConfigPatchSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, { message: parsed.error.issues[0]?.message ?? 'Invalid body' });

	const mergedFullPage = parsed.data.fullPage ?? existing.full_page === 1;
	const mergedHeight = Object.prototype.hasOwnProperty.call(parsed.data, 'height')
		? (parsed.data.height ?? null)
		: existing.height;
	const shapeError = validateExportConfigShape({
		fullPage: mergedFullPage,
		height: mergedHeight
	});
	if (shapeError) error(400, { message: shapeError });

	const row = updateExportConfig(getDb(), params.id, user.id, parsed.data);
	if (!row) error(404, { message: 'Export config not found' });
	return json({ config: toPublic(row) });
};

export const DELETE: RequestHandler = ({ locals, params }) => {
	const user = requireUser(locals);
	const existing = getExportConfigForUser(getDb(), params.id, user.id);
	if (!existing) error(404, { message: 'Export config not found' });
	if (existing.is_system === 1) error(403, { message: 'Default templates are read-only' });
	if (!deleteExportConfig(getDb(), params.id, user.id)) {
		error(404, { message: 'Export config not found' });
	}
	return json({ ok: true });
};
