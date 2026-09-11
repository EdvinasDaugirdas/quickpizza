import { expect, test } from '@playwright/test';
import { requestPizza } from './helpers';

test('persists a rating for a logged-in user', async ({ page }) => {
	await page.goto('/login');
	await expect
		.poll(() => page.locator('#csrf-token').inputValue())
		.not.toBe('');
	await page.getByLabel(/Username/).fill('default');
	await page.getByLabel(/Password/).fill('12345678');

	const loginResponsePromise = page.waitForResponse(
		(response) =>
			response.url().includes('/api/users/token/login') &&
			response.request().method() === 'POST',
	);
	await page.getByRole('button', { name: 'Sign in' }).click();
	expect((await loginResponsePromise).status()).toBe(200);
	await expect(
		page.getByRole('heading', { name: 'Your Pizza Ratings:' }),
	).toBeVisible();

	await page.getByRole('link', { name: 'Back to main page' }).click();
	const pizzaResponse = await requestPizza(page);
	const recommendation = await pizzaResponse.json();

	const ratingResponsePromise = page.waitForResponse(
		(response) =>
			response.url().endsWith('/api/ratings') &&
			response.request().method() === 'POST',
	);
	await page.getByRole('button', { name: 'Love it!' }).click();
	expect((await ratingResponsePromise).status()).toBe(201);
	await expect(page.locator('#rate-result')).toHaveText('Rated!');

	await page.getByRole('link', { name: 'Profile' }).click();
	await expect(
		page.getByText(`stars=5, pizza_id=${recommendation.pizza.id}`, {
			exact: false,
		}),
	).toBeVisible();

	await page.getByRole('button', { name: 'Logout' }).click();
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});
