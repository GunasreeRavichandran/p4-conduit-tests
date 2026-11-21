# My schema, auth and contract checks (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-21

## 1. My first look
How I would check that an article answer has the right shape: I would check that the response contains all the required fields under article and that each field has the correct data type as defined in API.md. This will help ensure the response structure stays consistent even after the new version.

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):** Missing bio: Fails – bio is missing from the key list. · New field password: Fails – password is an extra field. · Token is a number: Passes – the key list checks only field names, not value types.

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. In every schema test, check both the field names and their value types against API.md.
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 passed, 0 failed
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
- **Claude's test:** "GET /api/articles/:slug answers with the Article shape from API.md"
- **Claude said:** "The answer is 200. Each Article field from API.md is there, with the right type. Text fields match what the test sent. `author` has `username`, `bio: null`, `image: null` and a boolean `following`."
- **My answer:** No, it won't turn red. toMatchObject checks only the fields listed in the test. If a new field like password is added, the test will still pass because it doesn't check for extra fields.

## 6. My change
- **What I asked Claude:** "In @P4/tests/contract.spec.ts, the article shape test lets in extra fields. Add a check that the article has exactly the keys defined in API.md. Do not run the tests."
- **The run after it:** 5 passed, 0 failed

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** The article shape test will fail because F2 removes a field from the article response, so the exact key list no longer matches the keys defined in API.md.
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 3 passed, 2 failed ("GET /api/articles/:slug answers with the Article shape from API.md", "changing someone else's article gives 403 and the article stays the same")
- **What Playwright showed:** `-     "body": "This is the body of the contract article.",` (the article test); `Expected: "This is the body of the contract article."` · `Received: undefined` (the 403 test)
- **My answer about a red test:** It failed because F2 removed the body field from the article response. The test checks that the article stays the same after the update attempt, including its body. Since body is missing, the assertion fails even though the test is about authorization.
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed
