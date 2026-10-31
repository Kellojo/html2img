import { z } from 'zod';

export const EXPORT_FORMATS = ['png', 'jpeg', 'webp'] as const;
export const WAIT_UNTIL = ['load', 'domcontentloaded', 'networkidle'] as const;

const name = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'use only letters, numbers, dots, dashes or underscores');

const fields = {
	name,
	width: z.number().int().min(100).max(8000),
	height: z.number().int().min(100).max(8000).nullable(),
	deviceScaleFactor: z.number().min(0.5).max(4),
	fullPage: z.boolean(),
	format: z.enum(EXPORT_FORMATS),
	quality: z.number().int().min(1).max(100).nullable(),
	omitBackground: z.boolean(),
	css: z.string().max(200_000).nullable(),
	waitUntil: z.enum(WAIT_UNTIL),
	waitForNetworkIdle: z.boolean(),
	timeoutMs: z.number().int().min(1000).max(10000)
};

export const exportConfigCreateSchema = z.object({
	name: fields.name,
	width: fields.width.default(800),
	height: fields.height.default(null),
	deviceScaleFactor: fields.deviceScaleFactor.default(1),
	fullPage: fields.fullPage.default(false),
	format: fields.format.default('png'),
	quality: fields.quality.default(null),
	omitBackground: fields.omitBackground.default(false),
	css: fields.css.default(null),
	waitUntil: fields.waitUntil.default('load'),
	waitForNetworkIdle: fields.waitForNetworkIdle.default(false),
	timeoutMs: fields.timeoutMs.default(10000)
});

export const exportConfigPatchSchema = z
	.object({
		name: fields.name,
		width: fields.width,
		height: fields.height,
		deviceScaleFactor: fields.deviceScaleFactor,
		fullPage: fields.fullPage,
		format: fields.format,
		quality: fields.quality,
		omitBackground: fields.omitBackground,
		css: fields.css,
		waitUntil: fields.waitUntil,
		waitForNetworkIdle: fields.waitForNetworkIdle,
		timeoutMs: fields.timeoutMs
	})
	.partial();

export const exportOverrideSchema = z
	.object({
		width: fields.width,
		height: fields.height,
		deviceScaleFactor: fields.deviceScaleFactor,
		fullPage: fields.fullPage,
		format: fields.format,
		quality: fields.quality,
		omitBackground: fields.omitBackground,
		css: fields.css,
		waitUntil: fields.waitUntil,
		waitForNetworkIdle: fields.waitForNetworkIdle,
		timeoutMs: fields.timeoutMs
	})
	.partial();

export type ExportConfigCreate = z.infer<typeof exportConfigCreateSchema>;
export type ExportConfigPatch = z.infer<typeof exportConfigPatchSchema>;
export type ExportOverride = z.infer<typeof exportOverrideSchema>;

export function validateExportConfigShape(data: {
	fullPage: boolean;
	height: number | null;
}): string | null {
	if (!data.fullPage && data.height == null) {
		return 'height is required when fullPage is false';
	}
	return null;
}
