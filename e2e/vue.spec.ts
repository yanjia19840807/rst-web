import { expect, test } from '@playwright/test'

// Keep only a lightweight smoke check; feature coverage lives in unit specs.
test('loads the Agent workspace shell', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/agent\/session$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My TMS')
})
