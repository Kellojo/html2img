import type { BetterAuthOptions } from 'better-auth';
import { config } from '../config.js';
import { getAppSecret } from '../crypto.js';
import { getDb } from '../db/index.js';

export function authOptions(): BetterAuthOptions {
	return {
		appName: 'HTML2IMG',
		...(config.ORIGIN ? { baseURL: config.ORIGIN } : {}),
		secret: getAppSecret(),
		database: getDb(),
		emailAndPassword: {
			enabled: config.ENABLE_PASSWORD_LOGIN,
			disableSignUp: !config.ENABLE_SIGNUP
		},
		user: {
			additionalFields: {
				role: { type: 'string', defaultValue: 'user', input: false }
			}
		},
		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						if (config.AUTO_PROMOTE_FIRST_USER) {
							const { c } = getDb().prepare('SELECT COUNT(*) AS c FROM user').get() as {
								c: number;
							};
							if (c === 0) return { data: { ...user, role: 'admin' } };
						}
						return { data: user };
					}
				}
			}
		}
	};
}
