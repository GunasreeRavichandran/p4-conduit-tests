import { expect, Page } from '@playwright/test';

// Page object for the sign-in page (/login).
// Labels and button name come from the existing profile-follow tests.
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  // Sign in through the page, then check the user's name shows in the main menu.
  async signIn(email: string, password: string, username: string) {
    await this.goto();
    await this.page.getByRole('textbox', { name: 'Email' }).fill(email);
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      this.page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: username, exact: true }),
    ).toBeVisible();
  }
}
