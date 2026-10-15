# API end-to-end test evidence

- Target: `http://127.0.0.1:8083/api`
- Run at: 2026-10-11T21:53:51.011Z
- Mode: full
- Result: **33 passed, 24 failed, 0 skipped** (of 57)

| ID | Area | Test | Result | ms | Note |
|---|---|---|---|---|---|
| O01 | Online | Health endpoint reports API + database running | PASS | 64 |  |
| O02 | Online | Services list returns live records | PASS | 10 |  |
| O03 | Online | Site settings (logo/owner) are served | PASS | 8 |  |
| O04 | Online | Gallery list is public | FAIL | 8 | expected: got 404, wanted 200 |
| O05 | Online | CORS preflight (OPTIONS) answers 204 for the app origin | PASS | 13 |  |
| O06 | Online | CORS is NOT granted to an unknown origin | PASS | 3 |  |
| O07 | Online | Key read endpoints respond in under 1500 ms | PASS | 24 |  |
| O08 | Online | Hosted site uses HTTPS (skipped for local http) | PASS | 0 |  |
| A01 | Auth | Register rejects invalid email | PASS | 17 |  |
| A02 | Auth | Register rejects short password (<6) and empty name/phone | PASS | 22 |  |
| A03 | Auth | Register creates a customer account | PASS | 95 |  |
| A04 | Auth | Duplicate email is rejected (case-insensitive) | PASS | 3 |  |
| A05 | Auth | Customer login succeeds and returns a session token | PASS | 78 |  |
| A06 | Auth | Wrong password returns 401 | PASS | 73 |  |
| A07 | Auth | Unknown user returns the same 401 message (no user enumeration) | PASS | 75 |  |
| A08 | Auth | Empty credentials are rejected | PASS | 3 |  |
| A09 | Auth | Customer credentials do not work on the admin login | PASS | 2 |  |
| A10 | Auth | SQL-injection style username is rejected safely (401, not 500) | PASS | 4 |  |
| A11 | Auth | Malformed JSON / unknown action does not crash the API | PASS | 4 |  |
| A12 | Auth | Admin login succeeds with the test admin | PASS | 70 |  |
| A13 | Auth | Admin login rejects a wrong admin password | PASS | 71 |  |
| A14 | Role | Admin endpoints reject anonymous users (401) | FAIL | 6 | gallery.php: got 404, wanted 401 |
| A15 | Role | Admin endpoints reject a logged-in CUSTOMER (role check) | FAIL | 9 | gallery.php: got 404, wanted 401 |
| A16 | Role | Customer endpoints reject anonymous users (401) | FAIL | 11 | notifications_read.php: got 404, wanted 401 |
| A17 | Role | Customer endpoints reject an ADMIN session | PASS | 2 |  |
| A18 | Auth | Logout destroys the session (token no longer works) | PASS | 148 |  |
| A19 | Auth | A forged / random session token is refused | PASS | 2 |  |
| B01 | Booking | Booking without login is refused (401) | PASS | 6 |  |
| B02 | Booking | Customer can create a booking (confirmed, id returned) | PASS | 5 |  |
| B03 | Booking | Booking creates a notification for the customer | FAIL | 2 | assertion failed |
| B04 | Duplicate | Same customer, same slot again (double-tap / retry) -> 409, still ONE booking | FAIL | 3 | expected: got 400, wanted 409 |
| B05 | Duplicate | Same customer cannot hold two services at one date+time | FAIL | 6 | expected: got 200, wanted 409 |
| B06 | Duplicate | A different customer cannot take an already-booked slot | FAIL | 3 | expected: got 400, wanted 409 |
| B07 | Booking | Past date is rejected | FAIL | 3 | expected: got 200, wanted 400 |
| B08 | Booking | Impossible date (31 Feb) and bad formats are rejected | FAIL | 3 | expected: got 500, wanted 400 |
| B09 | Booking | Unknown service returns 404 | PASS | 2 |  |
| B10 | Booking | A forged customerId in the body is ignored (booking belongs to the session user) | PASS | 8 |  |
| B11 | History | Booking history shows only the customer's own bookings | PASS | 4 |  |
| B12 | Cancel | Cancel a booking: succeeds and writes a cancellation notification | FAIL | 4 | assertion failed |
| B13 | Cancel | Cancelling twice returns 409 | FAIL | 2 | expected: got 404, wanted 409 |
| B14 | Cancel | A customer cannot cancel someone else's booking (404) | PASS | 9 |  |
| B15 | Cancel | A cancelled slot can be booked again | FAIL | 3 | rebook after cancel: got 500, wanted 200 |
| B16 | Duplicate | Race: 5 customers book the same slot at once -> exactly one wins | FAIL | 711 | conflicts: got 0, wanted 4 |
| B17 | Notify | Notifications can be marked as read | FAIL | 3 | expected unread |
| B18 | Booking | GET on a write endpoint returns 405, not a crash | FAIL | 2 | expected: got 400, wanted 405 |
| G01 | Gallery | Public gallery lists seeded images | FAIL | 1 | Cannot read properties of null (reading 'length') |
| G02 | Gallery | Anonymous and customer uploads are refused | FAIL | 1 | expected: got 404, wanted 401 |
| G03 | Gallery | Admin uploads a valid image; it is served back as an image | FAIL | 2 | expected: got 404, wanted 200 |
| G04 | Gallery | A script disguised as an image (fake PNG) is rejected | FAIL | 2 | expected: got 404, wanted 400 |
| G05 | Gallery | Non-image data URL and image over 5 MB are rejected | FAIL | 20 | expected: got 404, wanted 400 |
| G06 | Gallery | Missing title is rejected | FAIL | 2 | expected: got 404, wanted 400 |
| G07 | Gallery | Admin deletes the image (record and file removed) | FAIL | 2 | expected: got 404, wanted 200 |
| G08 | Admin | Admin can add then delete a service with an image | PASS | 8 |  |
| G09 | Admin | Reports return totals; cancelled bookings are excluded from revenue | PASS | 5 |  |
| G10 | Admin | Admin can update site details (logo/owner text) | PASS | 9 |  |
| E01 | Errors | Database outage returns a clear JSON message (not a blank/HTML page) | FAIL | 1213 | expected: got 200, wanted 500 |
| E02 | Errors | Unreachable server fails fast with a network error (client can show a message) | PASS | 1 |  |
