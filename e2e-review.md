# My end-to-end tests and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you found and decided.

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-21

## 1. My first look
- **After I published an article by hand, I would check:** I would check that the article is published successfully and appears in the article list with the correct title and content.
- **Where the page keeps my sign-in:** jwtToken

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** No. Line 19 only checks that the article heading is visible. It doesn't prove that the article was liked or that the favorite count increased.

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. At the end of each test, use the API to verify that the published article or posted comment is actually saved with the correct content.
```

## 4. The run
- **Claude's 2 tests:** 2 passed, 0 failed. No test failed.

## 5. The teammate's question
- **Claude said:** "Every test signs up its own new user, so no test depends on another test."
- **My answer:** Not necessarily. Each test creates its own user and data, so they don't depend on each other, but the created users, articles, and comments may still remain in the app after the tests run.

## 6. What I saw on the home page
- E2E comment target 179528483169190565

## 7. My change
- **My line to Claude:** "In @P4/tests/e2e.spec.ts, the tests leave behind the users, published articles, and comments they create. Add cleanup in test.afterEach to delete the created data, so it runs even when a check fails. Do not run the tests."
- **The clean-up Claude added:** test.afterEach deletes the comments and articles of each user the tests made. The users stay: API.md has no request to delete a user.

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → 4 passed, 0 failed
- **The newest article on the home page after the run:** Your first end-to-end test
