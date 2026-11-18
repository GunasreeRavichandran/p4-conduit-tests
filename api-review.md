# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- Post method, 201 created

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted 201 – Comment created successfully. Response contains {"comment":{...}}. The app answered 201, with the comment body "Clear and useful." and the author practice-reader.
- **B** (the same comment, with no token): I predicted 401 – Token is missing. Response: {"errors":{"token":["is missing"]}}. The app answered 401, {"errors":{"token":["is missing"]}}.
- **C** (a comment on an article that does not exist): I predicted 404 – Article not found. Response: {"errors":{"article":["not found"]}}. The app answered 404, {"errors":{"article":["not found"]}}.

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Check both the status code and response body to make sure the API returns the expected data, not just a successful status.
```

## 4. The run
- **Result:** 9 passed, 1 failed
- **A red test, and who is wrong:** "change: the author changes only the body, and the other fields stay as they were". Expected `["testing", "api"]`, Received `[]` (tagList). API.md says: "Updating: every field is optional. A field you do not send stays as it was." My answer: The app is wrong. Since the request doesn't send tagList, the existing tags should remain unchanged. The test is correct.
- **My note** (kept with `test.fail()`): the app returns an empty tagList instead of keeping the existing tags when tagList is not included in the update request, but API.md says fields not sent must remain unchanged.

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "create without a token gives 401 "token is missing""
- **My answer:** No, we only know the app returned 401 with the expected error message. We need to check that no article was actually created.

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "create: a signed-in user creates an article and gets it back with all fields"
- **My decision:** Keep, but add a GET request to verify the article was actually saved. Also, check the assumptions against API.md before trusting them.

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. Check the exact status code and response body based on API.md.
2. After a request that changes data or gets rejected, use GET to verify the actual data.
3. Use unique test data and create a separate user for each test.
