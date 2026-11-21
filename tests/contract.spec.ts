import { test, expect, APIRequestContext } from '@playwright/test';

// Contract tests for the Conduit API, written from P4/API.md only.

// Unique test data, so every test has its own user and article.
function uniqueId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

// Sign up a new user (API.md: POST /api/users gives 201 User).
async function signUp(request: APIRequestContext) {
  const id = uniqueId();
  const newUser = {
    username: `contract-user-${id}`,
    email: `contract-user-${id}@example.com`,
    password: 'password123',
  };
  const response = await request.post('/api/users', { data: { user: newUser } });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { ...newUser, token: json.user.token as string };
}

// Create an article (API.md: POST /api/articles gives 201 Article).
async function createArticle(request: APIRequestContext, token: string) {
  const id = uniqueId();
  const newArticle = {
    title: `Contract article ${id}`,
    description: 'An article for the contract tests',
    body: 'This is the body of the contract article.',
    tagList: ['contract', 'testing'],
  };
  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${token}` },
    data: { article: newArticle },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { ...newArticle, slug: json.article.slug as string };
}

test.describe('Schema checks', () => {
  test('GET /api/articles/:slug answers with the Article shape from API.md', async ({ request }) => {
    const author = await signUp(request);
    const article = await createArticle(request, author.token);

    const response = await request.get(`/api/articles/${article.slug}`);

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      article: {
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: article.tagList,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        favorited: expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: {
          username: author.username,
          bio: null,
          image: null,
          following: expect.any(Boolean),
        },
      },
    });
    // Exactly the Article keys from API.md: no missing keys and no extra keys.
    expect(Object.keys(json.article).sort()).toEqual(
      [
        'slug',
        'title',
        'description',
        'body',
        'tagList',
        'createdAt',
        'updatedAt',
        'favorited',
        'favoritesCount',
        'author',
      ].sort(),
    );
  });

  test('GET /api/user answers with the User shape from API.md', async ({ request }) => {
    const user = await signUp(request);

    const response = await request.get('/api/user', {
      headers: { Authorization: `Token ${user.token}` },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      user: {
        email: user.email,
        token: expect.any(String),
        username: user.username,
        bio: null,
        image: null,
      },
    });
  });
});

test.describe('Auth checks', () => {
  test('GET /api/user with no token gives 401 "is missing"', async ({ request }) => {
    const response = await request.get('/api/user');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
  });

  test('GET /api/user with a wrong token gives 401 "is invalid"', async ({ request }) => {
    const response = await request.get('/api/user', {
      headers: { Authorization: 'Token this-is-not-a-real-token' },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
  });

  test("changing someone else's article gives 403 and the article stays the same", async ({ request }) => {
    const author = await signUp(request);
    const article = await createArticle(request, author.token);
    const otherUser = await signUp(request);

    const response = await request.put(`/api/articles/${article.slug}`, {
      headers: { Authorization: `Token ${otherUser.token}` },
      data: { article: { title: 'Changed by another user' } },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    // GET the article again: the title must not have changed.
    const check = await request.get(`/api/articles/${article.slug}`);
    expect(check.status()).toBe(200);
    const json = await check.json();
    expect(json.article.title).toBe(article.title);
    expect(json.article.body).toBe(article.body);
  });
});
