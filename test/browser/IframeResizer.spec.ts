import { expect, test } from '@playwright/test';

test('connects, resizes and exchanges messages with the child runtime', async ({ page }) => {
    await page.goto('/test/browser/parent.html');

    const iframe = page.getByTitle('Embedded browser test');
    const child = page.frameLocator('iframe[title="Embedded browser test"]');
    await expect.poll(() => page.evaluate(() => window.browserTestState.ready)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.browserTestState.protocol)).toBe('modern');
    await expect
        .poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height)))
        .toBeGreaterThanOrEqual(180);

    const initialHeight = await iframe.evaluate(element => Number.parseFloat(element.style.height));
    await page.evaluate(() => {
        window.postMessage(
            {
                frameId: 'forged',
                protocol: '@rio-cloud/iframe-resizer',
                reason: 'manual',
                size: { height: 9999, width: 9999 },
                type: 'resize',
                version: 1,
            },
            '*'
        );
    });
    await expect.poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height))).toBe(initialHeight);

    await child.getByRole('button', { name: 'Grow content' }).click();

    await expect
        .poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height)))
        .toBeGreaterThan(initialHeight);

    await child.getByRole('button', { name: 'Send message' }).click();
    await expect.poll(() => page.evaluate(() => window.browserTestState.message)).toEqual({ status: 'received' });
});

test('connects to an origin-checked child on a different origin', async ({ page }) => {
    await page.goto('/test/browser/parent.html?protocol=cross-origin');

    const iframe = page.locator('iframe');
    const child = page.frameLocator('iframe');

    await expect.poll(() => page.evaluate(() => window.browserTestState.ready)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.browserTestState.protocol)).toBe('modern');
    await expect(iframe).toHaveAttribute('src', 'http://127.0.0.1:4174/test/browser/child.html');

    const initialHeight = await iframe.evaluate(element => element.getBoundingClientRect().height);
    await child.getByRole('button', { name: 'Grow content' }).click();

    await expect
        .poll(() => iframe.evaluate(element => element.getBoundingClientRect().height))
        .toBeGreaterThan(initialHeight);
});

test('forwards child in-page links to child and parent targets', async ({ page }) => {
    await page.goto('/test/browser/parent.html?protocol=in-page-links');

    const child = page.frameLocator('iframe');
    await expect.poll(() => page.evaluate(() => window.browserTestState.ready)).toBe(true);

    await child.getByRole('link', { name: 'Jump to child target' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);

    await page.evaluate(() => window.scrollTo(0, 0));
    await child.getByRole('link', { name: 'Jump to parent target' }).click();
    await expect
        .poll(() => page.locator('#parent-anchor').evaluate(element => Math.abs(element.getBoundingClientRect().top)))
        .toBeLessThan(2);
});

test('supports in-page links from an unmodified iframe-resizer 4.3 child', async ({ page }) => {
    await page.goto('/test/browser/parent.html?protocol=legacy-in-page-links');

    const child = page.frameLocator('iframe');
    await expect.poll(() => page.evaluate(() => window.browserTestState.protocol)).toBe('legacy-v4');

    await child.getByRole('link', { name: 'Jump to legacy child target' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);

    await page.evaluate(() => window.scrollTo(0, 0));
    await child.getByRole('link', { name: 'Jump to parent target' }).click();
    await expect
        .poll(() => page.locator('#parent-anchor').evaluate(element => Math.abs(element.getBoundingClientRect().top)))
        .toBeLessThan(2);
});

test('supports an unmodified iframe-resizer 4.3 child', async ({ page }) => {
    await page.goto('/test/browser/parent.html?protocol=legacy-v4');

    const iframe = page.getByTitle('Embedded browser test');
    const child = page.frameLocator('iframe[title="Embedded browser test"]');
    await expect.poll(() => page.evaluate(() => window.browserTestState.ready)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.browserTestState.protocol)).toBe('legacy-v4');
    await expect
        .poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height)))
        .toBeGreaterThanOrEqual(180);
    await expect
        .poll(() =>
            child.locator('body').evaluate(() => ({
                marginBottom: getComputedStyle(document.body).marginBottom,
                marginTop: getComputedStyle(document.body).marginTop,
            }))
        )
        .toEqual({ marginBottom: '20px', marginTop: '0px' });

    const initialHeight = await iframe.evaluate(element => Number.parseFloat(element.style.height));
    await child.getByRole('button', { name: 'Grow legacy content' }).click();

    await expect
        .poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height)))
        .toBeGreaterThan(initialHeight);

    await child.getByRole('button', { name: 'Send legacy message' }).click();
    await expect
        .poll(() => page.evaluate(() => window.browserTestState.message))
        .toEqual({
            status: 'legacy-received',
        });

    expect(await page.evaluate(() => window.sendBrowserTestMessage({ status: 'from-parent' }))).toBe(true);
    await expect(child.locator('#parent-message')).toHaveText('{"status":"from-parent"}');
});

test('maps v4 sizing options to the modern child', async ({ page }) => {
    await page.goto('/test/browser/parent.html?protocol=legacy-options');

    await expect.poll(() => page.evaluate(() => window.browserTestState.protocol)).toBe('modern');
    const child = page.frameLocator('iframe[title="Embedded browser test"]');
    await expect
        .poll(() =>
            child.locator('body').evaluate(() => ({
                marginBottom: getComputedStyle(document.body).marginBottom,
                marginTop: getComputedStyle(document.body).marginTop,
            }))
        )
        .toEqual({ marginBottom: '20px', marginTop: '0px' });
});

test('supports the modern child runtime in srcDoc', async ({ page }) => {
    await page.goto('/test/browser/parent.html?protocol=srcdoc');

    const iframe = page.getByTitle('Embedded browser test');
    await expect.poll(() => page.evaluate(() => window.browserTestState.protocol)).toBe('modern');
    await expect
        .poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height)))
        .toBeGreaterThanOrEqual(180);

    const initialHeight = await iframe.evaluate(element => Number.parseFloat(element.style.height));
    await page
        .frameLocator('iframe[title="Embedded browser test"]')
        .getByRole('button', { name: 'Grow srcDoc content' })
        .click();

    await expect
        .poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height)))
        .toBeGreaterThan(initialHeight);
});

test('allows a v4 parent to use the modern child runtime', async ({ page }) => {
    await page.goto('/test/browser/legacy-parent.html');

    const iframe = page.getByTitle('New child in legacy parent');
    await expect.poll(() => page.evaluate(() => window.legacyParentState.ready)).toBe(true);
    await expect
        .poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height)))
        .toBeGreaterThanOrEqual(180);

    const initialHeight = await iframe.evaluate(element => Number.parseFloat(element.style.height));
    const child = page.frameLocator('iframe[title="New child in legacy parent"]');
    await child.getByRole('button', { name: 'Grow content' }).click();

    await expect
        .poll(() => iframe.evaluate(element => Number.parseFloat(element.style.height)))
        .toBeGreaterThan(initialHeight);

    await child.getByRole('button', { name: 'Send message' }).click();
    await expect.poll(() => page.evaluate(() => window.legacyParentState.message)).toEqual({ status: 'received' });

    expect(await page.evaluate(() => window.sendLegacyParentMessage({ status: 'from-legacy-parent' }))).toBe(true);
    await expect(child.locator('#parent-message')).toHaveText('{"status":"from-legacy-parent"}');
});

test('allows a v4 parent to follow in-page links from the modern child runtime', async ({ page }) => {
    await page.goto('/test/browser/legacy-in-page-links-parent.html?inPageLinks=true');

    const child = page.frameLocator('iframe');
    await expect.poll(() => page.evaluate(() => window.legacyParentState.ready)).toBe(true);

    await child.getByRole('link', { name: 'Jump to child target' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);

    await page.evaluate(() => window.scrollTo(0, 0));
    await child.getByRole('link', { name: 'Jump to parent target' }).click();
    await expect
        .poll(() => page.locator('#parent-anchor').evaluate(element => Math.abs(element.getBoundingClientRect().top)))
        .toBeLessThan(2);
});
