import { expect, test } from '@playwright/test';
import { enableAdvancedMode, openHome, requestPizza } from './helpers';

test('applies advanced restrictions to a vegetarian recommendation', async ({
	page,
}) => {
	await openHome(page);
	await enableAdvancedMode(page);

	const numberInputs = page.locator('input[type="number"]');
	await numberInputs.nth(0).fill('900');
	await numberInputs.nth(1).fill('2');
	await numberInputs.nth(2).fill('4');
	await page.getByLabel('Must be vegetarian').check();

	const excludedTool = await page
		.locator('select option')
		.first()
		.getAttribute('value');
	expect(excludedTool).toBeTruthy();
	await page.locator('select').selectOption(excludedTool as string);

	const customName = 'Playwright Vegetarian Special';
	await page.getByLabel('Custom Pizza Name:').fill(customName);

	const response = await requestPizza(page);
	expect(response.request().postDataJSON()).toMatchObject({
		maxCaloriesPerSlice: 900,
		minNumberOfToppings: 2,
		maxNumberOfToppings: 4,
		mustBeVegetarian: true,
		customName,
		excludedTools: [excludedTool],
	});

	const recommendation = await response.json();
	expect(recommendation.pizza.name).toBe(customName);
	expect(recommendation.pizza.tool).not.toBe(excludedTool);
	expect(recommendation.calories).toBeLessThanOrEqual(900);
	expect(recommendation.vegetarian).toBe(true);
	expect(
		recommendation.pizza.ingredients.every(
			(ingredient: { vegetarian: boolean }) => ingredient.vegetarian,
		),
	).toBe(true);
	await expect(page.locator('#recommendations')).toContainText(customName);
});
