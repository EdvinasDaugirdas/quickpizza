import { expect, type Page } from 'playwright/test';

export async function openHome(page: Page) {
	await page.goto('/');
	await expect(
		page.getByRole('button', { name: 'Pizza, Please!' }),
	).toBeVisible();
}

export async function enableAdvancedMode(page: Page) {
	await page.locator('label').filter({ hasText: 'Advanced' }).click();
	await expect(page.getByLabel('Custom Pizza Name:')).toBeVisible();
	await expect(page.locator('select option').first()).toBeAttached();
}

export async function requestPizza(page: Page) {
	const responsePromise = page.waitForResponse(
		(response) =>
			response.url().endsWith('/api/pizza') &&
			response.request().method() === 'POST',
	);
	await page.getByRole('button', { name: 'Pizza, Please!' }).click();
	const response = await responsePromise;
	expect(response.status()).toBe(200);
	return response;
}
