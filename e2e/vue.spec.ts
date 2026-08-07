import { expect, test } from '@playwright/test'

// Keep only a lightweight smoke check; full workflow coverage lives in unit/MSW specs.
test('loads the Agent workspace shell', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/agent\/session$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('TMS Session')
  await expect(page.getByRole('navigation', { name: 'Agent navigation' })).toContainText('TMS List')
})
