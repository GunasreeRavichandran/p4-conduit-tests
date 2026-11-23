import { test, expect, APIRequestContext } from '@playwright/test';

// API tests for comments, written from API.md only.
// Every test signs up its own new user and makes its own article,
// so no test depends on the shared practice users or on another test.

const PASSWORD = 'password123'; // API.md: at least 8 characters.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/; // API.md: dates are ISO 8601 text.

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
  const username = uniqueName('commentuser');
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: PASSWORD } },
  });
  expect(response.status()).toBe(201);
  const user = { username, token: (await response.json()).user.token as string };
  createdUsers.push(user);
  return user;
}

// API: make an article to comment on. API.md: POST /api/articles gives 201.
async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: authHeader(token),
    data: {
      article: {
        title: uniqueName('Comment target '),
        description: 'An article to post a comment on',
        body: 'This article is made by the API for the comments tests.',
        tagList: [],
      },
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).article as { slug: string };
}

// API: post a comment. API.md: POST /api/articles/:slug/comments gives 201.
async function postComment(request: APIRequestContext, token: string, slug: string, body: string) {
  const response = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
    headers: authHeader(token),
    data: { comment: { body } },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).comment;
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

test.describe('Comments API', () => {
  test('POST comment saves the comment with the correct content and author', async ({ request }) => {
    const user = await signUp(request);
    // ASSUMPTION: the user comments on their own article. The prompt does not say whose article it is.
    const article = await createArticle(request, user.token);
    const body = uniqueName('API comment ');

    const comment = await postComment(request, user.token, article.slug, body);

    // API.md: Comment is {"id","createdAt","updatedAt","body","author"}, and author is a Profile.
    expect(comment.id).toBeDefined();
    expect(comment.body).toBe(body);
    expect(comment.createdAt).toMatch(ISO_DATE);
    expect(comment.updatedAt).toMatch(ISO_DATE);
    expect(comment.author.username).toBe(user.username);
    // API.md: a new user has bio and image set to null.
    expect(comment.author.bio).toBeNull();
    expect(comment.author.image).toBeNull();
    expect(typeof comment.author.following).toBe('boolean');
  });

  test('GET comments returns the saved comment', async ({ request }) => {
    const user = await signUp(request);
    // ASSUMPTION: the user comments on their own article. The prompt does not say whose article it is.
    const article = await createArticle(request, user.token);
    const body = uniqueName('API comment ');
    const posted = await postComment(request, user.token, article.slug, body);

    // API.md: GET comments takes an optional token. Check it with the token and without it.
    for (const headers of [authHeader(user.token), {}]) {
      const response = await request.get(`/api/articles/${encodeURIComponent(article.slug)}/comments`, { headers });
      expect(response.status()).toBe(200);
      const { comments } = await response.json();

      // The new article has only this comment, so the list has exactly one item.
      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe(posted.id);
      expect(comments[0].body).toBe(body);
      expect(comments[0].createdAt).toBe(posted.createdAt);
      expect(comments[0].updatedAt).toBe(posted.updatedAt);
      expect(comments[0].author.username).toBe(user.username);
    }
  });
});
