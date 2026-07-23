import { expect, test } from '@playwright/test';

test('resizes the iframe to the child height without child scrolling', async ({ page }) => {
    await page.goto('/demo/');

    const iframe = page.getByTitle('Resizable demo application');
    const child = page.frameLocator('iframe');

    await expect(page.getByTestId('connection-status')).toHaveText('modern');
    await expect(page.getByTestId('resize-count')).not.toHaveText('0');

    const initialHeight = await iframe.evaluate(element => element.getBoundingClientRect().height);

    await child.getByRole('button', { name: 'Add content' }).click();
    await child.getByRole('button', { name: 'Add content' }).click();

    await expect
        .poll(() => iframe.evaluate(element => element.getBoundingClientRect().height))
        .toBeGreaterThan(initialHeight);

    const expandedHeight = await iframe.evaluate(element => element.getBoundingClientRect().height);
    const childHasVerticalOverflow = await child
        .locator('html')
        .evaluate(element => element.scrollHeight > window.innerHeight + 1);

    expect(childHasVerticalOverflow).toBe(false);

    await child.getByRole('button', { name: 'Remove content' }).click();

    await expect
        .poll(() => iframe.evaluate(element => element.getBoundingClientRect().height))
        .toBeLessThan(expandedHeight);

    await page.evaluate(() => window.scrollTo(0, 0));
    await child.getByRole('link', { name: 'Child target' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

    await page.evaluate(() => window.scrollTo(0, 0));
    await child.getByRole('link', { name: 'Parent target' }).click();
    await expect(page.locator('#parent-anchor-target')).toBeInViewport();
});
