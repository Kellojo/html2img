import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	return {
		user: {
			email: locals.user.email,
			name: locals.user.name,
			role: (locals.user as { role?: string }).role ?? 'user'
		}
	};
};
