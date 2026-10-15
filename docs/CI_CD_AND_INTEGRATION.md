# Integration, GitHub Actions and Azure DevOps (Person 3)

## 1. Integrating the feature branches
Branches: `main` (always demo-able) <- `develop` (integration) <- `feature/p1-*`, `feature/p2-*`, `feature/p3-*`.
1. Everyone opens a Pull Request into `develop` (template in `.github/`). CI must be green before merge (turn on *Branch protection > Require status checks*: `Web`, `API`).
2. Merge order that avoids most conflicts: **Person 2 first** (database + API), then **Person 1** (screens), then **Person 3**. Re-run `npm run test:api` after the database/API merge and `npm run test:ci` after the UI merge.
3. Likely conflict spots: `database/select_cutz_db.sql` (keep every table/column from every branch **and** add a migration script), `src/app/core/api.service.ts`, `src/app/app.routes.ts`, `backend/api/common.php`, `src/environments/*`.
4. After merging `develop` into `main`: `npm run hosting` (or download the `www` artifact) -> upload to the host -> run the live smoke test (section 4).
Integration checklist: [ ] CI green [ ] fresh DB import works [ ] migration works on an old DB [ ] register/login/book/cancel by hand [ ] admin pages [ ] gallery upload [ ] APK installs on the phone.

## 2. GitHub Actions (`.github/workflows/`)
| Workflow | Runs | Result |
|---|---|---|
| `ci.yml` job **web** | lint, 50 unit tests, production build | `www` artifact |
| `ci.yml` job **api** | PHP syntax check, 57 API end-to-end tests on a real MariaDB service | `api-e2e-evidence` artifact |
| `ci.yml` job **android** | debug APK always; signed release on `main` if secrets exist | APK artifacts |
| `live-smoke.yml` | read-only checks of the hosted site (manual + Mon-Sat 08:00 SAST) | `live-smoke-evidence` |

Repository settings to add (Settings > Secrets and variables > Actions):
* Variable `API_BASE_URL` = `https://YOUR-DOMAIN/api`
* Secrets for signed builds: `ANDROID_KEYSTORE_BASE64` (`base64 -w0 selectcutz-release.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

## 3. Azure DevOps (`azure-pipelines.yml`)
1. dev.azure.com > project > **Pipelines > New pipeline** > GitHub > pick the repo > *Existing Azure Pipelines YAML file* > `/azure-pipelines.yml`.
2. **Pipelines > Library**: upload secure file `selectcutz-release.jks`; add secret variables `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (link the group in the pipeline) and variable `API_BASE_URL`. First run asks you to *Permit* access to the secure file.
3. **Boards**: create work items for the tasks, name branches `feature/p3-123-short-name`, put `AB#123` in PR titles so Azure links them. Import `docs/defect-log.csv` as Bugs.
4. Stages: Web -> Api -> Android (same checks as GitHub).

## 4. Weekly maintenance routine
* Daily: look at the pipeline status; fix or revert whatever broke it.
* After every merge to `main`: live smoke test (`npm run test:live` with `BASE_URL=https://YOUR-DOMAIN/api`).
* Keep `docs/DEFECT_LOG.md` / `defect-log.csv` current (new ID, severity, evidence, status). Close a defect only after a test proves it.
* Dependencies: `npm outdated`, then update on a branch and let CI decide.
* Never put the live DB password or keystore in git; they live in the host panel / pipeline secrets.
