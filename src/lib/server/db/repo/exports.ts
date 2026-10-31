import { randomUUID } from 'node:crypto';
import type { ExportRecord } from '$lib/types.js';
import type { Db } from '../index.js';

export interface ExportRow {
	id: string;
	user_id: string;
	config_id: string | null;
	api_key_id: string | null;
	status: string;
	mime: string | null;
	size: number | null;
	error: string | null;
	created_at: number;
}

export function toPublic(row: ExportRow): ExportRecord {
	return {
		id: row.id,
		configId: row.config_id,
		apiKeyId: row.api_key_id,
		status: row.status as ExportRecord['status'],
		mime: row.mime,
		size: row.size,
		error: row.error,
		createdAt: row.created_at
	};
}

export interface CreateExportInput {
	userId: string;
	configId: string | null;
	apiKeyId?: string | null;
	status: 'success' | 'error';
	mime?: string | null;
	size?: number | null;
	error?: string | null;
}

export function createExport(db: Db, input: CreateExportInput): ExportRow {
	const id = randomUUID();
	db.prepare(
		`INSERT INTO exports (id, user_id, config_id, api_key_id, status, mime, size, error, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		input.userId,
		input.configId,
		input.apiKeyId ?? null,
		input.status,
		input.mime ?? null,
		input.size ?? null,
		input.error ?? null,
		Date.now()
	);
	return db.prepare('SELECT * FROM exports WHERE id = ?').get(id) as ExportRow;
}

export function listExports(db: Db, userId: string, limit = 50): ExportRow[] {
	const capped = Math.min(Math.max(limit, 1), 500);
	return db
		.prepare('SELECT * FROM exports WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
		.all(userId, capped) as ExportRow[];
}
