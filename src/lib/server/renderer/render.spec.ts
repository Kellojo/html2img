import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import { renderToImage } from './render.js';

const hasChromium = existsSync(chromium.executablePath());

function pngSize(buffer: Buffer): { width: number; height: number } {
	const signature = buffer.subarray(0, 8).toString('hex');
	if (signature !== '89504e470d0a1a0a') throw new Error('Not a PNG');
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const html = `<!doctype html><html><body style="margin:0;width:300px;height:200px;background:#4f46e5"></body></html>`;

describe.skipIf(!hasChromium)('renderer', () => {
	it('renders fixed-size PNG at the configured viewport dimensions', async () => {
		const { buffer, mimeType } = await renderToImage({
			html,
			width: 300,
			height: 200,
			deviceScaleFactor: 1,
			fullPage: false,
			format: 'png',
			quality: null,
			omitBackground: false,
			css: null,
			waitUntil: 'load',
			waitForNetworkIdle: false,
			timeoutMs: 10000
		});
		expect(mimeType).toBe('image/png');
		const size = pngSize(buffer);
		expect(size.width).toBe(300);
		expect(size.height).toBe(200);
	});

	it('renders JPEG and WebP with the right magic bytes', async () => {
		const jpeg = await renderToImage({
			html,
			width: 200,
			height: 150,
			deviceScaleFactor: 1,
			fullPage: false,
			format: 'jpeg',
			quality: 80,
			omitBackground: false,
			css: null,
			waitUntil: 'load',
			waitForNetworkIdle: false,
			timeoutMs: 10000
		});
		expect(jpeg.mimeType).toBe('image/jpeg');
		expect(jpeg.buffer[0]).toBe(0xff);
		expect(jpeg.buffer[1]).toBe(0xd8);

		const webp = await renderToImage({
			html,
			width: 200,
			height: 150,
			deviceScaleFactor: 1,
			fullPage: false,
			format: 'webp',
			quality: 80,
			omitBackground: false,
			css: null,
			waitUntil: 'load',
			waitForNetworkIdle: false,
			timeoutMs: 10000
		});
		expect(webp.mimeType).toBe('image/webp');
		expect(webp.buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
		expect(webp.buffer.subarray(8, 12).toString('ascii')).toBe('WEBP');
	});

	it('captures full-page content taller than the viewport', async () => {
		const tall = `<!doctype html><html><body style="margin:0;height:800px;background:#16a34a"></body></html>`;
		const { buffer } = await renderToImage({
			html: tall,
			width: 200,
			height: 200,
			deviceScaleFactor: 1,
			fullPage: true,
			format: 'png',
			quality: null,
			omitBackground: false,
			css: null,
			waitUntil: 'load',
			waitForNetworkIdle: false,
			timeoutMs: 10000
		});
		const size = pngSize(buffer);
		expect(size.width).toBe(200);
		expect(size.height).toBeGreaterThan(200);
	});

	it('applies device scale factor', async () => {
		const { buffer } = await renderToImage({
			html,
			width: 100,
			height: 100,
			deviceScaleFactor: 2,
			fullPage: false,
			format: 'png',
			quality: null,
			omitBackground: false,
			css: null,
			waitUntil: 'load',
			waitForNetworkIdle: false,
			timeoutMs: 10000
		});
		const size = pngSize(buffer);
		expect(size.width).toBe(200);
		expect(size.height).toBe(200);
	});
});
