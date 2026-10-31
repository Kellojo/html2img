import { config } from '../config.js';
import { createExport } from '../db/repo/exports.js';
import type { ExportConfigRow } from '../db/repo/export-configs.js';
import { getDb } from '../db/index.js';
import type { ExportOverride } from '../export-config-schema.js';
import { renderToImage, type RenderOptions, type RenderResult } from '../renderer/render.js';
import type { ExportFormat, WaitUntil } from '$lib/types.js';

export class ExportRequestError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'ExportRequestError';
		this.status = status;
	}
}

export function configRowToRenderOptions(
	row: ExportConfigRow,
	overrides: ExportOverride = {}
): Omit<RenderOptions, 'html'> {
	const merged = {
		width: row.width,
		height: row.height,
		deviceScaleFactor: row.device_scale_factor,
		fullPage: row.full_page === 1,
		format: row.format as ExportFormat,
		quality: row.quality,
		omitBackground: row.omit_background === 1,
		css: row.css,
		waitUntil: row.wait_until as WaitUntil,
		waitForNetworkIdle: row.wait_for_network_idle === 1,
		timeoutMs: Math.min(row.timeout_ms, config.EXPORT_MAX_TIMEOUT_MS),
		...overrides
	};

	if (!merged.fullPage && merged.height == null) {
		throw new ExportRequestError(400, 'height is required when fullPage is false');
	}

	return merged;
}

export interface RenderExportOptions {
	row: ExportConfigRow;
	html: string;
	overrides?: ExportOverride;
	record?: { userId: string; apiKeyId: string | null };
}

export interface RenderExportResult {
	result: RenderResult;
	recordId: string | null;
}

export async function renderExport({
	row,
	html,
	overrides,
	record
}: RenderExportOptions): Promise<RenderExportResult> {
	const options = configRowToRenderOptions(row, overrides);

	let result: RenderResult;
	try {
		result = await renderToImage({ ...options, html });
	} catch (e) {
		if (record) {
			createExport(getDb(), {
				userId: record.userId,
				configId: row.id,
				apiKeyId: record.apiKeyId,
				status: 'error',
				error: e instanceof Error ? e.message : String(e)
			});
		}
		throw e;
	}

	let recordId: string | null = null;
	if (record) {
		recordId = createExport(getDb(), {
			userId: record.userId,
			configId: row.id,
			apiKeyId: record.apiKeyId,
			status: 'success',
			mime: result.mimeType,
			size: result.buffer.length
		}).id;
	}

	return { result, recordId };
}
