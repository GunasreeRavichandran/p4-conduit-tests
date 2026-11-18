import { test, expect, APIRequestContext } from '@playwright/test';

// All test data and helper steps are kept here, in one place.
// Every test signs up its own new user, so no test depends on another test.

const PASSWORD = 'password123'; // API.md: at least 8 characters.

const NEW_ARTICLE = {
  title: 'API test article',
  description: 'Short description for the API test',
  body: 'This is the body of the API test article.',
  tagList: ['testing', 'api'],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function uniqueName(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function authHeader(token: string) {
  return { Authorization: `Token ${token}` };
}

async function signUp(request: APIRequestContext) {
  const username = uniqueName('apiuser');
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: PASSWORD } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

async function createArticle(request: APIRequestContext, token: string, title = uniqueName('API test article ')) {
  const response = await request.post('/api/articles', {
    headers: authHeader(token),
    data: { article: { ...NEW_ARTICLE, title } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article;
}

// ---------- Positive tests ----------

test('create: a signed-in user creates an article and gets it back with all fields', async ({ request }) => {
  const author = await signUp(request);
  const title = uniqueName('API test article ');

  const response = await request.post('/api/articles', {
    headers: authHeader(author.token),
    data: { article: { ...NEW_ARTICLE, title } },
  });

  expect(response.status()).toBe(201);
  const { article } = await response.json();
  expect(typeof article.slug).toBe('string');
  expect(article.slug.length).toBeGreaterThan(0);
  expect(article.title).toBe(title);
  expect(article.description).toBe(NEW_ARTICLE.description);
  expect(article.body).toBe(NEW_ARTICLE.body);
  expect(article.tagList).toEqual(['testing', 'api']); // API.md: this app keeps the tag order.
  expect(article.createdAt).toMatch(ISO_DATE);
  expect(article.updatedAt).toMatch(ISO_DATE);
  expect(article.favorited).toBe(false); // ASSUMPTION: a new article is not liked by its author.
  expect(article.favoritesCount).toBe(0); // ASSUMPTION: a new article has 0 likes.
  expect(article.author).toEqual({
    username: author.username,
    bio: null, // API.md: a new user has bio null.
    image: null, // API.md: a new user has image null.
    following: false, // ASSUMPTION: an author does not follow themself.
  });
});

test('read: anyone can read a saved article by its slug', async ({ request }) => {
  const author = await signUp(request);
  const created = await createArticle(request, author.token);

  // No token: API.md says the token is optional here.
  const response = await request.get(`/api/articles/${created.slug}`);

  expect(response.status()).toBe(200);
  const { article } = await response.json();
  expect(article.slug).toBe(created.slug);
  expect(article.title).toBe(created.title);
  expect(article.description).toBe(NEW_ARTICLE.description);
  expect(article.body).toBe(NEW_ARTICLE.body);
  expect(article.tagList).toEqual(['testing', 'api']);
  expect(article.createdAt).toBe(created.createdAt);
  expect(article.author.username).toBe(author.username);
});

test('change: the author changes only the body, and the other fields stay as they were', async ({ request }) => {
  // the app returns an empty tagList instead of keeping the existing tags when tagList is not included in the update request, but API.md says fields not sent must remain unchanged.
  test.fail();
  const author = await signUp(request);
  const created = await createArticle(request, author.token);
  const newBody = 'This body was changed by the API test.';

  const response = await request.put(`/api/articles/${created.slug}`, {
    headers: authHeader(author.token),
    data: { article: { body: newBody } },
  });

  expect(response.status()).toBe(200);
  const { article } = await response.json();
  expect(article.body).toBe(newBody);
  expect(article.title).toBe(created.title);
  expect(article.description).toBe(NEW_ARTICLE.description);
  expect(article.tagList).toEqual(['testing', 'api']);
  // ASSUMPTION: the slug stays the same when the title does not change.
  expect(article.slug).toBe(created.slug);

  // The change is saved: read the article again.
  const readBack = await request.get(`/api/articles/${created.slug}`);
  expect(readBack.status()).toBe(200);
  const saved = (await readBack.json()).article;
  expect(saved.body).toBe(newBody);
  expect(saved.title).toBe(created.title);
});

test('delete: the author deletes an article, and it is gone', async ({ request }) => {
  const author = await signUp(request);
  const created = await createArticle(request, author.token);

  const response = await request.delete(`/api/articles/${created.slug}`, {
    headers: authHeader(author.token),
  });

  expect(response.status()).toBe(204);
  expect(await response.text()).toBe(''); // API.md: 204, no body.

  const readBack = await request.get(`/api/articles/${created.slug}`);
  expect(readBack.status()).toBe(404);
  expect(await readBack.json()).toEqual({ errors: { article: ['not found'] } });
});

// ---------- Negative tests ----------

test('create without a token gives 401 "token is missing"', async ({ request }) => {
  const response = await request.post('/api/articles', {
    data: { article: { ...NEW_ARTICLE, title: uniqueName('No token article ') } },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
});

test('create without a title gives 422 "title can\'t be blank", and nothing is saved', async ({ request }) => {
  const author = await signUp(request);
  const { description, body, tagList } = NEW_ARTICLE;

  const response = await request.post('/api/articles', {
    headers: authHeader(author.token),
    data: { article: { description, body, tagList } },
  });

  expect(response.status()).toBe(422);
  expect(await response.json()).toEqual({ errors: { title: ["can't be blank"] } });

  // The new user has no articles saved.
  const list = await request.get(`/api/articles?author=${author.username}`);
  expect(list.status()).toBe(200);
  expect(await list.json()).toEqual({ articles: [], articlesCount: 0 });
});

test('read an article that does not exist gives 404 "article not found"', async ({ request }) => {
  const response = await request.get(`/api/articles/${uniqueName('no-such-article-')}`);

  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ errors: { article: ['not found'] } });
});

test('change someone else\'s article gives 403 "article forbidden", and the article stays the same', async ({ request }) => {
  const author = await signUp(request);
  const otherUser = await signUp(request);
  const created = await createArticle(request, author.token);

  const response = await request.put(`/api/articles/${created.slug}`, {
    headers: authHeader(otherUser.token),
    data: { article: { body: 'Changed by another user' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const readBack = await request.get(`/api/articles/${created.slug}`);
  expect(readBack.status()).toBe(200);
  expect((await readBack.json()).article.body).toBe(NEW_ARTICLE.body);
});

test('delete someone else\'s article gives 403 "article forbidden", and the article still exists', async ({ request }) => {
  const author = await signUp(request);
  const otherUser = await signUp(request);
  const created = await createArticle(request, author.token);

  const response = await request.delete(`/api/articles/${created.slug}`, {
    headers: authHeader(otherUser.token),
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const readBack = await request.get(`/api/articles/${created.slug}`);
  expect(readBack.status()).toBe(200);
  expect((await readBack.json()).article.title).toBe(created.title);
});

test('delete with a wrong token gives 401 "token is invalid", and the article still exists', async ({ request }) => {
  const author = await signUp(request);
  const created = await createArticle(request, author.token);

  const response = await request.delete(`/api/articles/${created.slug}`, {
    headers: authHeader('this-is-not-a-real-token'),
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } }); // API.md: this app says "is invalid".

  const readBack = await request.get(`/api/articles/${created.slug}`);
  expect(readBack.status()).toBe(200);
  expect((await readBack.json()).article.title).toBe(created.title);
});
