# My CI workflow and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

Repository: the P4 folder · Workflow: `.github/workflows/playwright.yml` · Date: 2026-11-24

## 1. What my project needs
- **Node.js on my laptop (`node -v`):** v24.17.0
- **My whole suite on my laptop:** `npx playwright test` → 23 passed, 0 failed
- **What the GitHub computer needs (my words):**
  - Node.js 22.13 or newer, because package.json specifies "node": ">=22.13". (My rule for Claude, later: Use Node.js 24.)
  - `npm ci` – because it installs the exact package versions from `package-lock.json`, keeping the GitHub environment consistent with my laptop.
  - Chromium only (from the example)

## 2. My prompt to Claude
```text
Task: Write a GitHub Actions workflow that runs this Playwright suite on every push and keeps the HTML report. My GitHub repository is the P4 folder, so save it as P4/.github/workflows/playwright.yml. After the file, write one line for each step: what it does.
Material: @P4/package.json @P4/playwright.config.ts @P4/README.md
Rules: Use actions/checkout@v6, actions/setup-node@v6 and actions/upload-artifact@v6. Do not run anything. Do not commit or push. Use Node.js 24, install dependencies using npm ci, and install only Chromium because that is the browser configured in my Playwright project.
```

## 3. What Claude's workflow got wrong for my project
- **Claude's workflow:** in my project, Claude wrote `node-version: 24` (lines 12–15), because my rule asked for it. The line judged, from another run:
  ```text
  13 |       - name: Set up Node.js
  14 |         uses: actions/setup-node@v6
  15 |         with:
  16 |           node-version: 22
  17 |           cache: npm
  ```
- **Claude said:** "ASSUMPTION: `node-version: 22` gets the newest Node 22, which is 22.13 or later. You could use 24 instead. Nothing in the material asks for a specific version."
- **My project needs:** Node.js 24 (my laptop: v24.17.0)
- **My answer to the developer:** No, I wouldn't merge it yet. node-version: 22 may install a Node 22 version, but our suite was tested on Node 24. We should change it to node-version: 24 to match our laptop and keep the CI environment consistent.
- **My line to Claude:** Add a comment above the node-version: 24 line in P4/.github/workflows/playwright.yml explaining that Node.js 24 is used because my laptop's tested version is v24.17.0. Keep all other workflow steps unchanged.

## 4. My reading of the workflow
- **When, where, the code and Node.js (lines 3–16):**
  - on: push – Runs the workflow whenever someone pushes a change.
  - jobs: – Defines the jobs GitHub needs to run.
  - test: – Names the job.
  - runs-on: ubuntu-latest – Runs the job on a fresh Linux computer.
  - steps: – Lists the actions to perform.
  - actions/checkout@v6 – Copies the repository code onto the GitHub computer.
  - actions/setup-node@v6 – Sets up Node.js.
  - with: – Provides settings for the Node.js setup.
  - node-version: 24 – Uses Node.js 24 to match the version tested on my laptop.
- **Packages, browser, tests and the report (lines 18–32):**
  - Install dependencies – Installs the exact packages from package-lock.json using npm ci.
  - Install Chromium – Installs Chromium and its required system dependencies for Playwright.
  - Run Playwright tests – Runs the test suite using npx playwright test.
  - Upload HTML report – Uploads the Playwright HTML report to GitHub.
  - if: ${{ !cancelled() }} – Uploads the report even if tests fail, as long as the workflow wasn't cancelled.
  - name: playwright-report – Gives the uploaded report an identifiable name.
  - path: playwright-report/ – Specifies the folder containing the report.

## 5. The first run on GitHub
- **Run:** Add the CI workflow · **Result:** … · **Tests:** …
- **The report (artifact):** …

## 6. A red run on purpose
- **The change:** `tests/example.spec.ts` line 6, `toBe(200)` → `toBe(201)`
- **My prediction:** …
- **What GitHub showed:** …

## 7. Fixed, and green again
- **The fix:** line 6 back to `toBe(200)` · **Run:** Fix the expected status · **Result:** …

## 8. Review notes for my other AI-written tests (written while CI ran)
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.
Monday's and Tuesday's tests that I did not review in depth on those days. Each one: kept, changed or removed, and why.

### Monday: `tests/api.spec.ts`
- "…": **kept / changed / removed**, because …

### Tuesday: `tests/contract.spec.ts`
- "…": **kept / changed / removed**, because …
