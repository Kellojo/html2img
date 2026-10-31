import { chromium, type Browser, type Page } from 'playwright';
import { config } from '../config.js';
import type { ExportFormat, WaitUntil } from '$lib/types.js';

export const MIME_TYPES: Record<ExportFormat, string> = {
	png: 'image/png',
	jpeg: 'image/jpeg',
	webp: 'image/webp'
};

export const EXTENSIONS: Record<ExportFormat, string> = {
	png: 'png',
	jpeg: 'jpg',
	webp: 'webp'
};

export interface RenderOptions {
	html: string;
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

export interface RenderResult {
	buffer: Buffer;
	mimeType: string;
	extension: string;
}

/** Convert a screenshot buffer into a BodyInit-compatible Uint8Array. */
export function toBody(buffer: Buffer): Uint8Array<ArrayBuffer> {
	return new Uint8Array(buffer);
}

export class ExportTimeoutError extends Error {
	constructor(timeoutMs: number) {
		super(`Export timed out after ${timeoutMs}ms`);
		this.name = 'ExportTimeoutError';
	}
}

class Semaphore {
	private active = 0;
	private waiters: (() => void)[] = [];

	constructor(private readonly limit: number) {}

	async run<T>(fn: () => Promise<T>): Promise<T> {
		await this.acquire();
		try {
			return await fn();
		} finally {
			this.release();
		}
	}

	private acquire(): Promise<void> {
		if (this.active < this.limit) {
			this.active++;
			return Promise.resolve();
		}
		return new Promise((resolve) => this.waiters.push(resolve));
	}

	private release(): void {
		const next = this.waiters.shift();
		if (next) {
			next();
		} else {
			this.active--;
		}
	}
}

const semaphore = new Semaphore(config.EXPORT_CONCURRENCY);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new ExportTimeoutError(ms)), ms);
		promise.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			(e) => {
				clearTimeout(timer);
				reject(e);
			}
		);
	});
}

async function screenshot(page: Page, options: RenderOptions): Promise<Buffer> {
	const screenshotOptions: Parameters<Page['screenshot']>[0] = {
		type: options.format,
		fullPage: options.fullPage
	};
	if (options.format === 'jpeg' || options.format === 'webp') {
		screenshotOptions.quality = options.quality ?? 90;
	}
	if (options.format === 'png' || options.format === 'webp') {
		screenshotOptions.omitBackground = options.omitBackground;
	}
	return page.screenshot(screenshotOptions);
}

async function renderWithBrowser(browser: Browser, options: RenderOptions): Promise<RenderResult> {
	const context = await browser.newContext({
		viewport: { width: options.width, height: options.height ?? 900 },
		deviceScaleFactor: options.deviceScaleFactor
	});
	const page = await context.newPage();

	// 'networkidle' is not a valid setContent waitUntil; wait for load first and then idle.
	const setContentWaitUntil: 'load' | 'domcontentloaded' =
		options.waitUntil === 'networkidle' ? 'load' : options.waitUntil;

	await page.setContent(options.html, {
		waitUntil: setContentWaitUntil,
		timeout: options.timeoutMs
	});

	if (options.css) {
		await page.addStyleTag({ content: options.css });
	}

	if (options.waitForNetworkIdle || options.waitUntil === 'networkidle') {
		await page.waitForLoadState('networkidle', { timeout: options.timeoutMs }).catch(() => {});
	}

	const buffer = await screenshot(page, options);
	await context.close();
	return { buffer, mimeType: MIME_TYPES[options.format], extension: EXTENSIONS[options.format] };
}

export async function renderToImage(options: RenderOptions): Promise<RenderResult> {
	const browser = await chromium.launch({ headless: true });
	try {
		return await withTimeout(
			semaphore.run(() => renderWithBrowser(browser, options)),
			options.timeoutMs
		);
	} finally {
		await browser.close().catch(() => {});
	}
}
