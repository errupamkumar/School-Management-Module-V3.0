import { expect, test, type Page } from '@playwright/test';

/**
 * Signs in through the real login form as each role and opens every page in
 * that role's sidebar. Fails on uncaught page errors, error boundaries and
 * failed API calls (4xx/5xx other than intentional 404s).
 */
const PASSWORD = process.env.SEED_PASSWORD || 'Demo@12345';
// E2E_ROLES=owner,reception,... checks other demo logins.
const ROLES = (process.env.E2E_ROLES || 'admin,teacher,accountant,parent,student').split(',').map((r) => r.trim()).filter(Boolean);

async function signIn(page: Page, username: string) {
  await page.goto('/login');
  const school = page.locator('#school');
  await school.fill('DEMO');
  await page.locator('#identifier').fill(username);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 }); // the first compile in dev mode can be slow
}

for (const role of ROLES) {
  test(`${role}: every menu page renders`, async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
    page.on('response', (r) => {
      const url = new URL(r.url());
      if (url.pathname.startsWith('/api/') && r.status() >= 400 && r.status() !== 404) problems.push(`${r.status()} ${r.request().method()} ${url.pathname}${url.search}`);
    });

    await signIn(page, role);
    await page.locator('aside nav a[href^="/"]').first().waitFor({ timeout: 60_000 }); // shell renders after /api/me
    const links =await page.locator('aside nav a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')!))]);
    expect(links.length).toBeGreaterThan(3);

    for (const href of links) {
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Something went wrong', { exact: false }), `${href} shows an error`).toHaveCount(0);
      await expect(page.locator('h1').first(), `${href} has a heading`).toBeVisible();
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
}
