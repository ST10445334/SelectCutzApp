# Person 3 - status against the task list

Legend: DONE = finished and tested here. YOU = must be done on your machine/accounts (I could not do it from here).

| Task | Status | Where |
|---|---|---|
| Integrate feature branches | DONE (procedure, PR template, merge order, checklist) + YOU do the merges | `docs/CI_CD_AND_INTEGRATION.md`, `.github/PULL_REQUEST_TEMPLATE.md` |
| Produce signed/debug build | DONE (signing + versioning configured, scripts) / YOU run Gradle (needs Android SDK) | `docs/PHONE_BUILD_AND_INSTALL.md`, `android/app/build.gradle` |
| Install on phone | YOU | same guide, section A |
| End-to-end authentication tests + evidence | DONE | `tests/api/api-e2e.mjs` (A01-A19), `docs/evidence/` |
| Booking flow, history, cancellation, notifications | DONE (improved + fixed) | `booking/`, `dashboard/`, `backend/api/booking_*.php`, `customer.php`, `notifications_read.php` |
| Separate Services, Reports, Logo, Owner pages | Already existed and verified (`admin-services`, `admin-reports`, `admin-site`, `owner`); tested via G08-G10 | |
| Gallery upload flow | DONE (new) | `gallery/`, `admin-gallery/`, `backend/api/gallery.php` |
| Test online integration, timeouts, duplicate protection, error states | DONE locally; YOU run live smoke after hosting | `docs/TEST_PLAN_AND_EVIDENCE.md` |
| Maintain Azure DevOps, GitHub Actions | DONE (pipelines written, validated as YAML) / YOU create the Azure project and add secrets | `azure-pipelines.yml`, `.github/workflows/` |
| Defect log | DONE (25 entries: 20 fixed, 5 open) | `docs/DEFECT_LOG.md`, `docs/defect-log.csv` |
| Demonstration video | YOU record - script ready | `docs/DEMO_VIDEO_SCRIPT.md` |

## Before you do anything
1. Install **Node 24 LTS**. 2. Existing database? Run `database/migration_person3.sql` once (MariaDB/XAMPP). New database: import `database/select_cutz_db.sql`.
3. `npm ci`, then follow `docs/PHONE_BUILD_AND_INSTALL.md`.

## Changes that touch Person 1/2 areas (tell them)
* `backend/db.php`: database name fixed to `selectcutz`; env overrides added.
* `backend/api/common.php`: JSON error handler, strict sessions, real image validation.
* Booking, cancel and customer APIs changed (HTTP 409 for conflicts, past-slot rules). Database: booking unique index replaced, `gallery` table added.
* `api.service.ts`: errors are now `ApiError` (has `.kind` and `.status`; `.message` unchanged).
* Login/register screens and admin Services/Reports/Site code were not modified apart from a Gallery link in the admin side menu.
