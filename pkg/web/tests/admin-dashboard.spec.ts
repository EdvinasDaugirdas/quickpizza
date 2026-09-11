import { expect, test } from '@playwright/test';
import { enableAdvancedMode, openHome, requestPizza } from './helpers';

test('shows a newly generated pizza in the admin dashboard', async ({
	page,
}) => {
	await openHome(page);
	await enableAdvancedMode(page);

	const customName = `Admin E2E ${Date.now()}`;
	await page.getByLabel('Custom Pizza Name:').fill(customName);
	await requestPizza(page);

	await page.goto('/admin');
	await page.getByLabel(/Username/).fill('admin');
	await page.getByLabel(/Password/).fill('admin');

	const loginResponsePromise = page.waitForResponse(
		(response) =>
			response.url().includes('/api/admin/login') &&
			response.request().method() === 'POST',
	);
	const recommendationsPromise = page.waitForResponse(
		(response) =>
			response.url().endsWith('/api/internal/recommendations') &&
			response.request().method() === 'GET',
	);
	await page.getByRole('button', { name: 'Sign in' }).click();
	expect((await loginResponsePromise).status()).toBe(200);
	expect((await recommendationsPromise).status()).toBe(200);

	await expect(
		page.getByRole('heading', { name: 'Latest pizza recommendations' }),
	).toBeVisible();
	await expect(page.getByText(customName, { exact: false })).toBeVisible();

	const refreshPromise = page.waitForResponse(
		(response) =>
			response.url().endsWith('/api/internal/recommendations') &&
			response.request().method() === 'GET',
	);
	await page.getByRole('button', { name: 'Refresh' }).click();
	expect((await refreshPromise).status()).toBe(200);
	await expect(page.getByText(customName, { exact: false })).toBeVisible();

	await page.getByRole('button', { name: 'Logout' }).click();
	await expect(
		page.getByRole('heading', { name: 'QuickPizza Administration' }),
	).toBeVisible();
});
