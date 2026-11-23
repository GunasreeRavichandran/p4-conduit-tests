# Tests from Playwright's agents, and my review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-23

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** `.claude/agents/playwright-test-planner.md`, `.claude/agents/playwright-test-generator.md`, `.claude/agents/playwright-test-healer.md`, `.mcp.json`, `specs/README.md`, `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  - Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  - Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  - Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. Every test must verify the actual result after the action, not just check that a success message appears.
- **The plan the planner saved:** `specs/profile-follow.md` (2 scenarios)
- **The test files the generator wrote:** `tests/profile-follow/follow-author.spec.ts`, `tests/profile-follow/unfollow-author.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "Claude says the test unfollows first if needed, so it sets its own start state. So we can keep this test in our suite as it is, right?" (about `follow-author.spec.ts`)
- **My answer:** Not completely. The test does set the follow state before starting, but it only does that through the UI. It doesn't guarantee a clean, independent start state every time. We should verify that the setup is reliable and that the test cleans up after itself before adding it to the suite. It changes the practice-reader account's following state because the test signs in using practice-reader@example.com and clicks Unfollow if that account is already following the author.
- "Follow an author and check the change persists" · **changed**, because the test checks a useful follow/unfollow flow, but it changes the shared practice-reader account. It should create its own user through the API and use that user so the test is independent and doesn't affect other tests.
- "Unfollow an author and check the change persists" · **changed**, because the test checks a useful unfollow flow and verifies that the change persists after a reload. But it uses the shared practice-reader account and assumes the seed data always starts with the author followed. It should create its own user through the API and set up its own starting state. Also, the login steps should be moved into a page object.

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): In @P4/tests/profile-follow/follow-author.spec.ts: Changed. The test checks a useful follow/unfollow flow, but it changes the shared practice-reader account. It should create its own user through the API and use that user so the test is independent and doesn't affect other tests. In @P4/tests/profile-follow/unfollow-author.spec.ts: Changed. The test checks a useful unfollow flow and verifies that the change persists after a reload. But it uses the shared practice-reader account and assumes the seed data always starts with the author followed. It should create its own user through the API and set up its own starting state. Also, the login steps should be moved into a page object.
- **Result:** No fault: 23 passed, 0 failed (the "No fault" line of my second fault run)
