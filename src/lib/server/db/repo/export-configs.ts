import { randomUUID } from 'node:crypto';
import type { ExportConfig, ExportFormat, WaitUntil } from '$lib/types.js';
import type { Db } from '../index.js';

export interface ExportConfigRow {
	id: string;
	user_id: string | null;
	name: string;
	is_system: number;
	width: number;
	height: number | null;
	device_scale_factor: number;
	full_page: number;
	format: string;
	quality: number | null;
	omit_background: number;
	css: string | null;
	wait_until: string;
	wait_for_network_idle: number;
	timeout_ms: number;
	created_at: number;
	updated_at: number;
}

export function toPublic(row: ExportConfigRow): ExportConfig {
	return {
		id: row.id,
		name: row.name,
		isSystem: row.is_system === 1,
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
		timeoutMs: row.timeout_ms,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

export interface CreateExportConfigInput {
	userId: string | null;
	name: string;
	isSystem?: boolean;
	width: number;
	height: number | null;
	deviceScaleFactor: number;
	fullPage: boolean;
	format: ExportFormat;
	quality: number | null;
	omitBackground: boolean;
	css: string | null;
	waitUntil: WaitUntil;
	waitForNetworkIdle: boolean;
	timeoutMs: number;
}

export interface UpdateExportConfigInput {
	name?: string;
	width?: number;
	height?: number | null;
	deviceScaleFactor?: number;
	fullPage?: boolean;
	format?: ExportFormat;
	quality?: number | null;
	omitBackground?: boolean;
	css?: string | null;
	waitUntil?: WaitUntil;
	waitForNetworkIdle?: boolean;
	timeoutMs?: number;
}

export function listExportConfigs(db: Db, userId: string): ExportConfigRow[] {
	return db
		.prepare(
			'SELECT * FROM export_configs WHERE user_id = ? OR is_system = 1 ORDER BY is_system DESC, name ASC'
		)
		.all(userId) as ExportConfigRow[];
}

export function getExportConfig(db: Db, id: string): ExportConfigRow | undefined {
	return db.prepare('SELECT * FROM export_configs WHERE id = ?').get(id) as
		ExportConfigRow | undefined;
}

export function getExportConfigForUser(
	db: Db,
	id: string,
	userId: string
): ExportConfigRow | undefined {
	return db
		.prepare('SELECT * FROM export_configs WHERE id = ? AND (user_id = ? OR is_system = 1)')
		.get(id, userId) as ExportConfigRow | undefined;
}

export function getExportConfigByName(
	db: Db,
	userId: string,
	name: string
): ExportConfigRow | undefined {
	return db
		.prepare(
			'SELECT * FROM export_configs WHERE name = ? AND (user_id = ? OR is_system = 1) ORDER BY (user_id = ?) DESC LIMIT 1'
		)
		.get(name, userId, userId) as ExportConfigRow | undefined;
}

export function createExportConfig(db: Db, input: CreateExportConfigInput): ExportConfigRow {
	const id = randomUUID();
	const now = Date.now();
	db.prepare(
		`INSERT INTO export_configs (
			id, user_id, name, is_system, width, height, device_scale_factor, full_page,
			format, quality, omit_background, css, wait_until, wait_for_network_idle,
			timeout_ms, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		input.userId,
		input.name,
		input.isSystem ? 1 : 0,
		input.width,
		input.height,
		input.deviceScaleFactor,
		input.fullPage ? 1 : 0,
		input.format,
		input.quality,
		input.omitBackground ? 1 : 0,
		input.css,
		input.waitUntil,
		input.waitForNetworkIdle ? 1 : 0,
		input.timeoutMs,
		now,
		now
	);
	return getExportConfig(db, id)!;
}

export function updateExportConfig(
	db: Db,
	id: string,
	userId: string,
	patch: UpdateExportConfigInput
): ExportConfigRow | undefined {
	const existing = getExportConfig(db, id);
	if (!existing || existing.is_system === 1 || existing.user_id !== userId) return undefined;
	const merged: ExportConfig = { ...toPublic(existing), ...patch };
	const now = Date.now();
	db.prepare(
		`UPDATE export_configs SET
			name = ?, width = ?, height = ?, device_scale_factor = ?, full_page = ?,
			format = ?, quality = ?, omit_background = ?, css = ?, wait_until = ?,
			wait_for_network_idle = ?, timeout_ms = ?, updated_at = ?
		WHERE id = ?`
	).run(
		merged.name,
		merged.width,
		merged.height,
		merged.deviceScaleFactor,
		merged.fullPage ? 1 : 0,
		merged.format,
		merged.quality,
		merged.omitBackground ? 1 : 0,
		merged.css,
		merged.waitUntil,
		merged.waitForNetworkIdle ? 1 : 0,
		merged.timeoutMs,
		now,
		id
	);
	return getExportConfig(db, id)!;
}

export function deleteExportConfig(db: Db, id: string, userId: string): boolean {
	return (
		db
			.prepare('DELETE FROM export_configs WHERE id = ? AND user_id = ? AND is_system = 0')
			.run(id, userId).changes > 0
	);
}

export function seedEmailTemplate(db: Db): void {
	const existing = db
		.prepare('SELECT id FROM export_configs WHERE is_system = 1 AND name = ?')
		.get('email');
	if (existing) return;
	createExportConfig(db, {
		userId: null,
		name: 'email',
		isSystem: true,
		width: 600,
		height: null,
		deviceScaleFactor: 2,
		fullPage: true,
		format: 'png',
		quality: null,
		omitBackground: false,
		css: null,
		waitUntil: 'load',
		waitForNetworkIdle: false,
		timeoutMs: 10000
	});
}
