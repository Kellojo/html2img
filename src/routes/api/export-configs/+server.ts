import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth/guards.js';
import { getDb } from '$lib/server/db/index.js';
import {
	createExportConfig,
	listExportConfigs,
	toPublic
} from '$lib/server/db/repo/export-configs.js';
import {
	exportConfigCreateSchema,
	validateExportConfigShape
} from '$lib/server/export-config-schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const user = requireUser(locals);
	return json({ configs: listExportConfigs(getDb(), user.id).map(toPublic) });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = requireUser(locals);
	const parsed = exportConfigCreateSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, { message: parsed.error.issues[0]?.message ?? 'Invalid body' });
	const shapeError = validateExportConfigShape(parsed.data);
	if (shapeError) error(400, { message: shapeError });
	const row = createExportConfig(getDb(), { userId: user.id, ...parsed.data });
	return json({ config: toPublic(row) }, { status: 201 });
};
