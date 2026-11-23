# My practice fault report (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 2026-11-23
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** I would say the suite is green, but that doesn't mean it catches every real problem. I would find out by introducing some bugs intentionally and checking whether the tests catch them. That would help me understand how effective my test suite is.

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** `api.spec.ts`, `contract.spec.ts`, `e2e.spec.ts`, `example.spec.ts`, `profile-follow/follow-author.spec.ts`, `profile-follow/unfollow-author.spec.ts`, `seed.spec.ts`
- **No fault:** 21 passed, 0 failed
- **F1:** caught (10 tests failed) · Opening an article gives a server error (500)
- **F2:** caught (5 tests failed) · The article answer has no body text
- **F3:** caught (7 tests failed) · The article answer has a different title
- **F4:** caught (1 test failed: e2e comments test) · The comments list is always empty
- **F5:** stayed green (0 tests failed) · The article answer comes 3 seconds late
- **F6:** caught (1 test failed: e2e comments test) · Posting a comment is refused (422) and nothing is saved

## 3. The weak spot I chose, and why
My suite is weakest in comment testing because F4 and F6 were caught by only one test. A good suite should catch these faults reliably, even if one test breaks or is removed.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Add more API tests for the comments feature in P4/tests/comments.spec.ts. Cover posting a comment and verifying that the comment is saved correctly. Also check that GET comments returns the saved comment. Use a new user created through the API for each test, so tests don't depend on shared practice users or affect other tests.
- **New or changed test file:** `tests/comments.spec.ts` (new, 2 tests); `tests/profile-follow/follow-author.spec.ts` and `tests/profile-follow/unfollow-author.spec.ts` (changed); `tests/pages/login-page.ts` (new page object)

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4 F6`
- **No fault:** 23 passed, 0 failed
- **The fault I chose:** F4: 2 tests failed (before 1). F6: 3 tests failed (before 1).

## 6. What changed
The new API tests made the suite stronger. Earlier, F4 and F6 were caught by only one test each. Now F4 is caught by 2 tests and F6 by 3 tests. This gives us better coverage and reduces the risk of missing real problems if one test breaks.
