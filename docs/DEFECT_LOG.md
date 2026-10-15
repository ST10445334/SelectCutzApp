# SELECT CUTZ - Defect log

Maintained by Person 3. Import `defect-log.csv` into Azure Boards (Boards > Work items > Import) or Excel.

Counts: 20 fixed, 5 open.

Severity: Critical = app unusable, High = major feature broken / blocks delivery, Medium = wrong behaviour or security weakness, Low = cosmetic / hygiene.

| ID | Severity | Area | Title | Found by / evidence | Root cause | Status | Fix / recommendation |
|---|---|---|---|---|---|---|---|
| D-01 | Critical | Backend/DB | Every API call returns 500 on a fresh setup | curl /api/health.php; evidence/api-e2e-BEFORE-fixes.md | backend/db.php connects to `select_cutz_db` but database/select_cutz_db.sql creates `selectcutz` | Fixed | db.php now uses `selectcutz` and accepts DB_HOST/DB_USER/DB_PASS/DB_NAME env overrides |
| D-02 | High | Build/CI | `npm ci` fails - lock file out of sync | npm ci: Missing chokidar@4.0.3, readdirp@4.1.2 from lock file | package-lock.json not regenerated after package.json changes | Fixed | Lock file regenerated with `npm install`; CI uses `npm ci` |
| D-03 | High | Build/CI | `ng build` refuses to run on Node < 22.22.3 | Angular CLI 22 message on Node 22.22.2 | Angular 22 minimum Node version | Fixed | `.nvmrc` = 24, `engines` in package.json, CI pins Node 24. Each team member must install Node 24 LTS |
| D-04 | High | Booking | A cancelled booking locks its slot forever; re-booking gives HTTP 500 | API test B15 (BEFORE: 500) | UNIQUE(ServiceID,BookingDate,BookingTime) also counted Cancelled rows | Fixed | ActiveSlot generated column + UNIQUE index so only ACTIVE bookings collide. Existing DBs: run database/migration_person3.sql |
| D-05 | High | Booking | Two people booking the same slot at the same moment crash with an unhandled DB error | API test B16 race of 5 (BEFORE: 0 clean conflicts) | No transaction / duplicate-key handling in booking_create.php | Fixed | Transaction + catch MySQL error 1062 -> HTTP 409 'slot already booked'. Exactly 1 of 5 wins |
| D-06 | High | Mobile config | Release APK can never reach the hosted API | environment.prod.ts nativeApiBaseUrl = http://localhost:8080/... | Native URL hard-coded for adb reverse; README says 10.0.2.2 | Fixed | `npm run api:url -- https://your-domain/api` (scripts/set-api-url.mjs); CI variable API_BASE_URL |
| D-07 | Medium | Booking | Past dates/times accepted by the server; client minimum date used the UTC date | API test B07 (BEFORE: 200) | No server validation; `toISOString()` is UTC not South African time | Fixed | Server rejects past slots (Africa/Johannesburg); client uses local date and checks time too |
| D-08 | Medium | Booking | Impossible date (e.g. 2027-02-31) causes HTTP 500 | API test B08 (BEFORE: 500) | Regex-only validation | Fixed | Real calendar validation with DateTime |
| D-09 | Medium | Booking | Same customer could book two services at the same date+time | API test B05 (BEFORE: 200) | Only the slot per service was checked | Fixed | Customer-level duplicate check, HTTP 409 with the existing reference number |
| D-10 | Medium | Booking | Cancelling a booking created no notification and left payment status unchanged | API test B12 (BEFORE: no notification) | Missing in booking_cancel.php | Fixed | Cancellation notification + paymentstatus 'Cancelled' in one transaction; past bookings can't be cancelled; double-cancel returns 409 |
| D-11 | Medium | Booking UI | Services page sent ?service=ID but the booking page ignored it | Code review; unit test 'preselects the service' | Query parameter never read | Fixed | Booking page preselects the service if it exists in the live list |
| D-12 | Medium | Booking UI | If the API failed, booking silently used a built-in service list whose IDs differ from the database (ID 4 = Taper Fade locally, Executive Cut in DB) - wrong service could be booked | Compare catalog.ts with select_cutz_db.sql | Offline fallback reused for booking | Fixed | Booking shows an error + 'Try again'; no fallback list |
| D-13 | Medium | Booking UI | After a timeout the user could retry blindly and double-book | Design review; unit test 'after a timeout...' | Timeout looked like a normal failure | Fixed | Message says the booking may be saved and links to My Bookings; server duplicate protection catches retries |
| D-14 | Medium | Tests | `ng test` reported 16 unhandled errors (real network calls) and exits non-zero | Baseline run | Specs used real HttpClient | Fixed | Specs use HttpClientTesting; 50 tests, 0 errors |
| D-15 | Medium | Security | Image upload trusted the declared type; any bytes could be saved as .png | API tests G04/G05 | Only the data-URL prefix was checked | Fixed | getimagesizefromstring() must decode as JPG/PNG/WebP; extension from real type; 5 MB limit |
| D-16 | Medium | Security | Server accepted any session id sent by the client (session fixation risk) | Code review common.php | session_id($header) without strict mode | Fixed | session.use_strict_mode=1 |
| D-17 | Medium | Feature | Gallery + admin gallery upload flow did not exist | Task list: 'gallery upload flow' | Not built | Fixed | gallery table, gallery.php, /gallery page, /admin/gallery page, menu links, tests |
| D-18 | Low | UI | Cancelled bookings shown with the green 'success' badge; times shown as 10:00:00 | Code review | Styling/format | Fixed | Red badge; HH:MM |
| D-19 | Low | Repo | hosting-package/ was a stale copy of the backend (auth.php, common.php, services.php differed) | File size comparison | Committed build output | Fixed | Regenerated with `npm run hosting`. Recommend not committing it (CI artifact instead) |
| D-20 | Low | Android | usesCleartextTraffic=true in every build | AndroidManifest.xml | Dev setting left on | Fixed | Debug = allowed; release = blocked unless -PallowCleartext=true |
| O-01 | Medium | Security | Admin username and password hash are in the SQL file in the repo; login has no rate-limit/lockout | Review | Seed data / no throttling | Open - Person 2 | Make repo private, change the admin password after deployment, add login throttling |
| O-02 | Medium | Security | Session id is returned to the app as `sessionToken` and stored in localStorage | Review | Design choice | Open - Person 2 | Acceptable for coursework; for production issue a separate random token with expiry |
| O-03 | Low | Config | Services page still falls back to the built-in list when API returns no rows (browsing only) | Review | catalog.ts | Open - Person 1 | Booking validates against the live list, so no wrong bookings. Show an empty-state instead |
| O-04 | Low | Build | Browserslist includes browsers outside Angular 22 support (build prints a warning) | ng build output | Old .browserslistrc | Open - Person 1 | Update .browserslistrc |
| O-05 | Info | Testing | Not verified in this review: install on a real phone, Android Gradle build, Azure DevOps organisation setup, screen recording | No Android SDK / device here | - | Open - Person 3 | Follow docs/PHONE_BUILD_AND_INSTALL.md and record evidence |
