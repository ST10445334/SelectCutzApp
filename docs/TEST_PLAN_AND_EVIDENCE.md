# Test plan and evidence (Person 3)

## 1. What was run, and results
| Suite | Command | Result | Evidence file |
|---|---|---|---|
| API end-to-end (authentication, roles, booking, duplicates, cancel, notifications, gallery, admin, errors) on real PHP 8.3 + MariaDB 10.11 | `npm run test:api` | **57 / 57 passed** | `docs/evidence/api-e2e-results.md` |
| Same suite against the ORIGINAL backend from the zip | (see below) | 33 passed, **24 failed** | `docs/evidence/api-e2e-BEFORE-fixes.md` |
| Unit tests (Angular, vitest) incl. login, booking, dashboard, gallery, timeouts | `npm run test:ci` | **50 / 50 passed, 0 errors** | `docs/evidence/web-checks.txt` |
| Lint / production build | `npm run lint`, `npm run build` | clean, no budget warnings | `docs/evidence/web-checks.txt` |
| Live smoke test of the hosted site | `BASE_URL=https://YOUR-DOMAIN/api npm run test:live` | **to run after you host it** | `docs/evidence/live-smoke-results.md` |
| Real phone checklist | section 4 | **to run on your phone** | your screenshots/video |

Of the 24 "before" failures, ~8 were features that did not exist yet (gallery, mark-as-read) and ~16 were real defects, listed in `DEFECT_LOG.md` (D-01, D-04, D-05, D-07 to D-10).

## 2. End-to-end authentication tests (A01-A19)
Validation (bad email, short password, empty fields), duplicate email (case-insensitive), correct/incorrect password -> 200/401, same message for unknown user and wrong password (no user enumeration), SQL-injection style input -> 401 not 500, malformed JSON handled, customer credentials refused on admin login, admin login, **role checks** (anonymous and customer blocked from every admin endpoint; admin blocked from customer endpoints), logout invalidates the token, forged token refused.

## 3. Online integration, timeouts, duplicates, error states
| Topic | Tests |
|---|---|
| Online integration | O01-O08: health, live services, settings, gallery, CORS allowed for the app origin and refused for others, response < 1.5 s, HTTPS on hosted URL |
| Timeouts | Unit tests: 6 s limit becomes a clear message; after a booking timeout the user is told to check My Bookings; server returns JSON on DB outage (E01); unreachable server fails fast (E02) |
| Duplicate booking | B04 double tap/retry, B05 same customer two services, B06 other customer, B15 re-book after cancel, **B16 five simultaneous bookings -> exactly one wins**; unit test: three rapid taps send one request |
| Error states | 400 validation, 401 session, 404, 405, 409 conflict, 500 DB down - each shows a readable message on screen (booking, dashboard, gallery, admin pages) |

## 4. Manual checklist on the phone (fill in; attach a screenshot per row)
| # | Step | Expected | Pass/Fail | Screenshot |
|---|---|---|---|---|
| 1 | Install APK, open app | Splash, Home with logo |  |  |
| 2 | Services / Gallery | Live records, images (missing image shows logo) |  |  |
| 3 | Register with 3-char password | Validation message |  |  |
| 4 | Register correctly, log in | Dashboard "Welcome, name" |  |  |
| 5 | Wrong password | "Invalid login..." message |  |  |
| 6 | Services > Book on a service | Service preselected on Book page |  |  |
| 7 | Book a future slot | Confirmation page + reference |  |  |
| 8 | Book same slot again / other account | "already booked" |  |  |
| 9 | My Bookings > Cancel | Status Cancelled (red), new notification |  |  |
| 10 | Mark all as read | "new" badge disappears |  |  |
| 11 | Stop Apache, open Services/Book | Friendly error + Try again |  |  |
| 12 | Admin login > Services/Reports/Logo & Owner | Pages load, data correct |  |  |
| 13 | Admin > Gallery upload JPG, then a .pdf | JPG appears on public Gallery; PDF refused |  |  |
| 14 | Customer opens /admin/services | Sent to login |  |  |
| 15 | Rotate phone, small screen | Layout usable |  |  |

## 5. How to re-run
```
npm ci
npm run lint && npm run test:ci          # web
npm run test:api                         # needs XAMPP MySQL running + php on PATH (XAMPP\php); on Windows run in Git Bash
BASE_URL=https://YOUR-DOMAIN/api npm run test:live
```
Admin tests use a dedicated test admin created by the script (`e2e_admin`) in the **local** database only - never put the owner's real password into tests.
To reproduce the "before" run: extract the original zip elsewhere, rename the DB in its SQL to `select_cutz_db`, add a test admin, run `BASE_URL=... node tests/api/api-e2e.mjs`.
