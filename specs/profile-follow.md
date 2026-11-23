# Profile page and following an author

## Application Overview

Plan for the profile page /profile/practice-author in the Conduit practice app (http://127.0.0.1:3000). Signed-in user: practice-reader (practice-reader@example.com / Practice123, from README.md). Do not use practice-author, because a user cannot follow themselves. Observed on a fresh start: practice-reader already follows practice-author (the profile shows the button "Unfollow practice-author"). Signed out, the profile shows no follow button. The profile shows the bio "I write about testing and quality." and 7 articles. The home page has the tabs "Your Feed" and "Global Feed". STATE WARNING: both scenarios change the follow state, and data persists within one run. Each scenario ends with the state it started with (reader follows author), and each one first checks its start state, so they can run in any order. ASSUMPTION: the start state (reader already follows author) comes from the seed data. QUESTION for the product owner: is it intended that practice-reader follows practice-author on a fresh start?

## Test Scenarios

### 1. Follow an author from the profile page

**Seed:** `tests/seed.spec.ts`

#### 1.1. Unfollow an author and check the change persists

**File:** `tests/profile-follow/unfollow.spec.ts`

**Steps:**
  1. Sign in as practice-reader (practice-reader@example.com / Practice123). Open /profile/practice-author.
    - expect: The heading "practice-author" is shown, with the bio "I write about testing and quality."
    - expect: The button "Unfollow practice-author" is shown (ASSUMPTION: seeded start state)
  2. Click the button "Unfollow practice-author".
    - expect: The button name changes to "Follow practice-author"
    - expect: The button "Unfollow practice-author" is no longer shown
  3. Reload the page.
    - expect: The button "Follow practice-author" is still shown (the change persisted on the server, not only in the page)
  4. Go to Home and open the tab "Your Feed".
    - expect: No article by practice-author is listed, for example "Your first end-to-end test" is missing (ASSUMPTION: Your Feed lists only articles of followed authors, as API.md says for GET /api/articles/feed). This checks the follower state in a place other than the button.
  5. Cleanup: open /profile/practice-author and click "Follow practice-author".
    - expect: The button shows "Unfollow practice-author" again, so the data is back in the start state

#### 1.2. Follow an author and check the change persists

**File:** `tests/profile-follow/follow.spec.ts`

**Steps:**
  1. Sign in as practice-reader. Open /profile/practice-author. If the button is "Unfollow practice-author", click it first, so the start state is not following.
    - expect: The button "Follow practice-author" is shown
  2. Click the button "Follow practice-author".
    - expect: The button name changes to "Unfollow practice-author"
    - expect: The button "Follow practice-author" is no longer shown
  3. Reload the page.
    - expect: The button "Unfollow practice-author" is still shown (persisted)
  4. Go to Home and open the tab "Your Feed".
    - expect: Articles by practice-author are listed, for example "Your first end-to-end test" (title seen on the profile page)
  5. Cross-check by API: GET /api/profiles/practice-author with the header Authorization: Token <token of practice-reader>. No cleanup is needed, because the end state equals the seed state.
    - expect: Status 200 and profile.following is true (API.md, Profiles)
