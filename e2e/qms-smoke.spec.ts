import { expect, test } from '@playwright/test';

test('home loads and links to sign in', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: /queue management/i })).toBeVisible();
	await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
});

test('login page is reachable', async ({ page }) => {
	await page.goto('/auth/login');
	await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});
