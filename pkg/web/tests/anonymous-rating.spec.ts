import { expect, test } from '@playwright/test';
import { openHome, requestPizza } from './helpers';

test('rejects an anonymous pizza rating and explains how to proceed', async ({
	page,
}) => {
	await openHome(page);
	await requestPizza(page);

	const ratingResponsePromise = page.waitForResponse(
		(response) =>
			response.url().endsWith('/api/ratings') &&
			response.request().method() === 'POST',
	);
	await page.getByRole('button', { name: 'Love it!' }).click();
	const ratingResponse = await ratingResponsePromise;

	expect(ratingResponse.status()).toBe(401);
	expect(ratingResponse.request().postDataJSON()).toMatchObject({ stars: 5 });
	await expect(page.locator('#rate-result')).toHaveText('Please log in first.');
});
