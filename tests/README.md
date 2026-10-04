# Cross-Application Tests

Unit tests live next to the code they cover
(`georesponse-fe/src/**/*.test.ts(x)`, `georesponse-be/**/*_test.go`). This
directory holds the two slower layers of the testing pyramid described in
`docs/05_engineering/TESTING_STRATEGY.md`. Both need a running stack
(`./run.sh` / `.\run.ps1`, or `docker compose up --build`).

## `integration/`: API and Database (Go)

Black-box HTTP tests against a real backend and database: create, read,
update, change status, relocate, view history, and delete, plus the error
contract and an authorization denial. Nothing is mocked. The tests log in
with the seeded demo accounts and clean up what they create.

```bash
cd tests/integration
GEORESPONSE_API_URL=http://localhost:8080 go test ./... -v
```

```powershell
cd tests\integration
$env:GEORESPONSE_API_URL = "http://localhost:8080"; go test ./... -v
```

Without `GEORESPONSE_API_URL` the tests skip, so `go test ./...` is safe to
run anywhere. `scripts/dev/test.sh` / `test.ps1` run this suite (with
`-count=1`) after the unit tests when the variable is set. CI runs it in
its `integration` job (`docs/11_devops/CI_CD.md` section 4.3).

| Variable | Default | Purpose |
|---|---|---|
| `GEORESPONSE_API_URL` | None (required) | Backend base URL, e.g. `http://localhost:8080` |
| `GEORESPONSE_ADMIN_ID` / `GEORESPONSE_ADMIN_PASSWORD` | `user-001` / `ChangeMe123!` | Administrator login (seeded) |
| `GEORESPONSE_READONLY_ID` / `GEORESPONSE_READONLY_PASSWORD` | `user-002` / `ChangeMe123!` | Read-only login (seeded); its sub-test skips if the login fails |

## `e2e/`: Browser Golden Path (Playwright)

One test, driven through the real UI in Chromium: log in, view resources on
the map and list, then create, update, relocate, and delete a resource. It
runs locally only, not in CI.

```bash
cd tests/e2e
npm install
npm run install-browsers      # once: downloads Chromium
E2E_BASE_URL=http://localhost:5173 npm test
```

```powershell
cd tests\e2e
npm install
npm run install-browsers
$env:E2E_BASE_URL = "http://localhost:5173"; npm test
```

`npm run test:headed` runs the same test with a visible browser.

| Variable | Default | Purpose |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:5173` | Frontend URL of the running stack |
| `E2E_ADMIN_ID` / `E2E_ADMIN_PASSWORD` | `user-001` / `ChangeMe123!` | Administrator login (seeded) |

Failures keep a trace and screenshot under `tests/e2e/test-results/`.
