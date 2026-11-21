import { test, expect, APIRequestContext, Page } from '@playwright/test';

// End-to-end tests: the API makes the user, the page does the journey,
// and the API checks what was saved at the end.
// All test data and helper steps are kept here, in one place.
// Every test signs up its own new user, so no test depends on another test.

const PASSWORD = 'password123'; // API.md: at least 8 characters.

function uniqueName(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function authHeader(token: string) {
  return { Authorization: `Token ${token}` };
}

// Every user a test makes is kept here, so test.afterEach can clean up after it.
let createdUsers: { username: string; token: string }[] = [];

// API: sign up a new user. API.md: POST /api/users gives 201 and a token.
async function signUp(request: APIRequestContext) {
  const username = uniqueName('e2euser');
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: PASSWORD } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  const user = { username, token: json.user.token as string };
  createdUsers.push(user);
  return user;
}

// Cleanup: runs after every test, also when a check in the test fails.
// It finds the data through the API, so it also cleans up when a test stops halfway.
// API.md has no request to delete a user, so the users stay in the app.
test.afterEach(async ({ request }) => {
  try {
    for (const user of createdUsers) {
      const list = await request.get(`/api/articles?author=${encodeURIComponent(user.username)}&limit=100`);
      expect.soft(list.status()).toBe(200);
      const { articles } = await list.json();

      for (const article of articles) {
        const slug = encodeURIComponent(article.slug);
        // Delete this user's comments first. API.md: DELETE comment gives 204.
        const commentsResponse = await request.get(`/api/articles/${slug}/comments`);
        const { comments } = await commentsResponse.json();
        for (const comment of comments) {
          if (comment.author.username !== user.username) continue;
          const deleted = await request.delete(`/api/articles/${slug}/comments/${comment.id}`, {
            headers: authHeader(user.token),
          });
          expect.soft(deleted.status()).toBe(204);
        }
        // Then delete the article. API.md: DELETE article gives 204.
        const deleted = await request.delete(`/api/articles/${slug}`, { headers: authHeader(user.token) });
        expect.soft(deleted.status()).toBe(204);
      }

      // API: the user has no articles left.
      const after = await request.get(`/api/articles?author=${encodeURIComponent(user.username)}`);
      expect.soft((await after.json()).articlesCount).toBe(0);
    }
  } finally {
    createdUsers = [];
  }
});

// Page: give the page the token. app.js reads it from localStorage, key jwtToken.
async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('jwtToken', t), token);
}

// API: make an article to comment on. API.md: POST /api/articles gives 201.
async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: authHeader(token),
    data: {
      article: {
        title: uniqueName('E2E comment target '),
        description: 'An article to post a comment on',
        body: 'This article is made by the API for the comment test.',
        tagList: [],
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article as { slug: string; title: string };
}

test('editor: a signed-in user publishes a new article', async ({ page, request }) => {
  const user = await signUp(request);
  await signInPage(page, user.token);
  const article = {
    title: uniqueName('E2E article '),
    description: 'Short description for the e2e test',
    body: 'This is the body of the e2e test article.',
    tags: ['e2e', 'testing'],
  };

  // Page: open the editor as the signed-in user.
  await page.goto('/editor');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: user.username, exact: true })).toHaveText(user.username);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New Article');

  // Page: fill the form and publish. Labels and button name come from app.js.
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(article.title);
  await page.getByRole('textbox', { name: "What's this article about?" }).fill(article.description);
  await page.getByRole('textbox', { name: 'Write your article' }).fill(article.body);
  await page.getByRole('textbox', { name: 'Tags', exact: true }).fill(article.tags.join(', '));
  await page.getByRole('button', { name: 'Publish Article' }).click();

  // Page: app.js opens /article/<slug> after a publish.
  await expect(page).toHaveURL(/\/article\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title);
  await expect(page.getByText(article.body, { exact: true })).toHaveText(article.body);
  await expect(page.getByRole('list', { name: 'Tags' }).getByRole('listitem')).toHaveText(article.tags);

  // API: the article is saved with the correct content.
  const slug = decodeURIComponent(new URL(page.url()).pathname.split('/article/')[1]);
  const response = await request.get(`/api/articles/${encodeURIComponent(slug)}`);
  expect(response.status()).toBe(200);
  const saved = (await response.json()).article;
  expect(saved.slug).toBe(slug);
  expect(saved.title).toBe(article.title);
  expect(saved.description).toBe(article.description);
  expect(saved.body).toBe(article.body);
  expect(saved.tagList).toEqual(article.tags); // API.md: this app keeps the tag order.
  expect(saved.author.username).toBe(user.username);

  // API: the user has exactly one article, so the publish saved it once.
  const list = await request.get(`/api/articles?author=${encodeURIComponent(user.username)}`);
  expect(list.status()).toBe(200);
  const listJson = await list.json();
  expect(listJson.articlesCount).toBe(1);
  expect(listJson.articles[0].slug).toBe(slug);
});

test('comments: a signed-in user posts a comment on an article', async ({ page, request }) => {
  const user = await signUp(request);
  // ASSUMPTION: the user comments on their own article. The prompt does not say whose article it is.
  const target = await createArticle(request, user.token);
  await signInPage(page, user.token);
  const commentBody = uniqueName('E2E comment ');

  // Page: open the article as the signed-in user.
  await page.goto(`/article/${encodeURIComponent(target.slug)}`);
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: user.username, exact: true })).toHaveText(user.username);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(target.title);

  // Page: write and post the comment. Label and button name come from app.js.
  const comments = page.getByRole('region', { name: 'Comments' });
  await comments.getByRole('textbox', { name: 'Write a comment' }).fill(commentBody);
  await comments.getByRole('button', { name: 'Post Comment' }).click();

  // Page: the comment shows in the list.
  await expect(comments.getByText(commentBody, { exact: true })).toHaveText(commentBody);

  // API: the comment is saved once, with the correct content and author.
  const response = await request.get(`/api/articles/${encodeURIComponent(target.slug)}/comments`);
  expect(response.status()).toBe(200);
  const saved = (await response.json()).comments;
  expect(saved).toHaveLength(1);
  expect(saved[0].body).toBe(commentBody);
  expect(saved[0].author.username).toBe(user.username);
});
