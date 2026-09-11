import { expect, test } from '@playwright/test';
import { openHome, requestPizza } from './helpers';

test('broadcasts recommendations to another connected visitor', async ({
	context,
	page,
}) => {
	const otherVisitor = await context.newPage();
	const firstSocketPromise = page.waitForEvent('websocket');
	const secondSocketPromise = otherVisitor.waitForEvent('websocket');

	await Promise.all([openHome(page), openHome(otherVisitor)]);
	await Promise.all([firstSocketPromise, secondSocketPromise]);

	await requestPizza(page);
	await expect(
		otherVisitor.getByText(/We have already given \d+ recommendations?/),
	).toBeVisible();
	await expect(otherVisitor.locator('#recommendations')).not.toBeVisible();
});
