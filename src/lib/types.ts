export type ExportFormat = 'png' | 'jpeg' | 'webp';
export type WaitUntil = 'load' | 'domcontentloaded' | 'networkidle';

export interface ExportConfig {
	id: string;
	name: string;
	isSystem: boolean;
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
	createdAt: number;
	updatedAt: number;
}

export interface ApiKey {
	id: string;
	label: string;
	scopes: string[];
	createdAt: number;
	lastUsedAt: number | null;
}

export interface ExportRecord {
	id: string;
	configId: string | null;
	apiKeyId: string | null;
	status: 'success' | 'error';
	mime: string | null;
	size: number | null;
	error: string | null;
	createdAt: number;
}
