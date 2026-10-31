import { expect, test } from '@playwright/test';

test('signs up, sees the default email template, and creates a config', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);

	await page.getByRole('link', { name: 'Sign up' }).click();
	await expect(page).toHaveURL(/\/signup$/);

	await page.locator('input[type="text"]').fill('Test User');
	await page.locator('input[type="email"]').fill(`test-${Date.now()}@example.com`);
	await page.locator('input[type="password"]').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();

	await expect(page.getByRole('heading', { name: 'Export configs' })).toBeVisible();
	await expect(page.getByText('default', { exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'New config' }).click();
	await page.getByPlaceholder('e.g. email').fill('social');
	await page.getByRole('button', { name: 'Create config' }).click();

	await expect(page.getByText('Config created')).toBeVisible();
	await expect(page.getByRole('button', { name: /social/ })).toBeVisible();
});
