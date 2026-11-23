// spec: specs/profile-follow.md
// seed: tests/seed.spec.ts

import { test, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

// Every test signs up its own new reader through the API,
// so it does not change the shared practice-reader account.
// ASSUMPTION: practice-author and the article "Your first end-to-end test" come from the seed data (README.md).
const AUTHOR = 'practice-author';
const PASSWORD = 'password123'; // API.md: at least 8 characters.

function uniqueName(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function authHeader(token: string) {
  return { Authorization: `Token ${token}` };
}

// Every user a test makes is kept here, so test.afterEach can clean up after it.
let createdUsers: { username: string; email: string; token: string }[] = [];

// API: sign up a new user. API.md: POST /api/users gives 201 and a token.
async function signUp(request: APIRequestContext) {
  const username = uniqueName('followreader');
  const email = `${username}@example.com`;
  const response = await request.post('/api/users', {
    data: { user: { username, email, password: PASSWORD } },
  });
  expect(response.status()).toBe(201);
  const user = { username, email, token: (await response.json()).user.token as string };
  createdUsers.push(user);
  return user;
}

// Cleanup: the new reader stops following the author, also when a check fails.
// API.md has no request to delete a user, so the users stay in the app.
test.afterEach(async ({ request }) => {
  try {
    for (const user of createdUsers) {
      const response = await request.delete(`/api/profiles/${AUTHOR}/follow`, { headers: authHeader(user.token) });
      expect.soft(response.status()).toBe(200);
    }
  } finally {
    createdUsers = [];
  }
});

test.describe('Profile page and following an author', () => {
  test('Follow an author and check the change persists', async ({ page, request }) => {
    const reader = await signUp(request);

    const followButton = page.getByRole('button', { name: `Follow ${AUTHOR}`, exact: true });
    const unfollowButton = page.getByRole('button', { name: `Unfollow ${AUTHOR}`, exact: true });

    // API: a new user does not follow the author yet.
    const before = await request.get(`/api/profiles/${AUTHOR}`, { headers: authHeader(reader.token) });
    expect(before.status()).toBe(200);
    expect((await before.json()).profile.following).toBe(false);

    // 1. Sign in as the new reader and open /profile/practice-author.
    await new LoginPage(page).signIn(reader.email, PASSWORD, reader.username);

    await page.goto(`/profile/${AUTHOR}`);
    await expect(page.getByRole('heading', { name: AUTHOR, level: 1 })).toBeVisible();
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);

    // 2. Click "Follow practice-author".
    await followButton.click();
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);

    // 3. Reload.
    await page.reload();
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);

    // 4. Open Home, then "Your Feed".
    await page.getByRole('link', { name: 'Home' }).click();
    await page.getByRole('link', { name: 'Your Feed' }).click();
    await expect(page.getByRole('link', { name: 'Your first end-to-end test' })).toBeVisible();

    // 5. API: GET /api/profiles/practice-author with the reader's token says following is true.
    const profileResponse = await request.get(`/api/profiles/${AUTHOR}`, { headers: authHeader(reader.token) });
    expect(profileResponse.status()).toBe(200);
    expect((await profileResponse.json()).profile.following).toBe(true);
  });
});
