import { z } from 'zod';

const boolFromString = (fallback: 'true' | 'false') =>
	z
		.enum(['true', 'false'])
		.default(fallback)
		.transform((v) => v === 'true');

const schema = z.object({
	DATABASE_PATH: z.string().default('./data/html2img.db'),
	TZ: z.string().default('UTC'),
	ENABLE_SIGNUP: boolFromString('true'),
	ENABLE_PASSWORD_LOGIN: boolFromString('true'),
	AUTO_PROMOTE_FIRST_USER: boolFromString('true'),
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	HOST: z.string().default('0.0.0.0'),
	ORIGIN: z.string().url().optional(),
	APP_SECRET: z.string().min(16).optional(),
	EXPORT_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
	EXPORT_MAX_TIMEOUT_MS: z.coerce.number().int().min(1000).max(10000).default(10000)
});

export type Config = z.infer<typeof schema>;

function load(): Config {
	const parsed = schema.safeParse(process.env);
	if (!parsed.success) {
		const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
		throw new Error(`Invalid environment configuration: ${issues}`);
	}
	return parsed.data;
}

export const config = load();
