# API end-to-end test evidence

- Target: `http://127.0.0.1:8081/api`
- Run at: 2026-10-11T22:00:53.006Z
- Mode: full
- Result: **57 passed, 0 failed, 0 skipped** (of 57)

| ID | Area | Test | Result | ms | Note |
|---|---|---|---|---|---|
| O01 | Online | Health endpoint reports API + database running | PASS | 62 |  |
| O02 | Online | Services list returns live records | PASS | 11 |  |
| O03 | Online | Site settings (logo/owner) are served | PASS | 7 |  |
| O04 | Online | Gallery list is public | PASS | 8 |  |
| O05 | Online | CORS preflight (OPTIONS) answers 204 for the app origin | PASS | 8 |  |
| O06 | Online | CORS is NOT granted to an unknown origin | PASS | 3 |  |
| O07 | Online | Key read endpoints respond in under 1500 ms | PASS | 26 |  |
| O08 | Online | Hosted site uses HTTPS (skipped for local http) | PASS | 0 |  |
| A01 | Auth | Register rejects invalid email | PASS | 14 |  |
| A02 | Auth | Register rejects short password (<6) and empty name/phone | PASS | 16 |  |
| A03 | Auth | Register creates a customer account | PASS | 97 |  |
| A04 | Auth | Duplicate email is rejected (case-insensitive) | PASS | 6 |  |
| A05 | Auth | Customer login succeeds and returns a session token | PASS | 71 |  |
| A06 | Auth | Wrong password returns 401 | PASS | 75 |  |
| A07 | Auth | Unknown user returns the same 401 message (no user enumeration) | PASS | 73 |  |
| A08 | Auth | Empty credentials are rejected | PASS | 3 |  |
| A09 | Auth | Customer credentials do not work on the admin login | PASS | 3 |  |
| A10 | Auth | SQL-injection style username is rejected safely (401, not 500) | PASS | 4 |  |
| A11 | Auth | Malformed JSON / unknown action does not crash the API | PASS | 4 |  |
| A12 | Auth | Admin login succeeds with the test admin | PASS | 74 |  |
| A13 | Auth | Admin login rejects a wrong admin password | PASS | 75 |  |
| A14 | Role | Admin endpoints reject anonymous users (401) | PASS | 10 |  |
| A15 | Role | Admin endpoints reject a logged-in CUSTOMER (role check) | PASS | 11 |  |
| A16 | Role | Customer endpoints reject anonymous users (401) | PASS | 10 |  |
| A17 | Role | Customer endpoints reject an ADMIN session | PASS | 2 |  |
| A18 | Auth | Logout destroys the session (token no longer works) | PASS | 150 |  |
| A19 | Auth | A forged / random session token is refused | PASS | 2 |  |
| B01 | Booking | Booking without login is refused (401) | PASS | 3 |  |
| B02 | Booking | Customer can create a booking (confirmed, id returned) | PASS | 4 |  |
| B03 | Booking | Booking creates a notification for the customer | PASS | 3 |  |
| B04 | Duplicate | Same customer, same slot again (double-tap / retry) -> 409, still ONE booking | PASS | 5 |  |
| B05 | Duplicate | Same customer cannot hold two services at one date+time | PASS | 3 |  |
| B06 | Duplicate | A different customer cannot take an already-booked slot | PASS | 3 |  |
| B07 | Booking | Past date is rejected | PASS | 2 |  |
| B08 | Booking | Impossible date (31 Feb) and bad formats are rejected | PASS | 10 |  |
| B09 | Booking | Unknown service returns 404 | PASS | 2 |  |
| B10 | Booking | A forged customerId in the body is ignored (booking belongs to the session user) | PASS | 9 |  |
| B11 | History | Booking history shows only the customer's own bookings | PASS | 7 |  |
| B12 | Cancel | Cancel a booking: succeeds and writes a cancellation notification | PASS | 6 |  |
| B13 | Cancel | Cancelling twice returns 409 | PASS | 2 |  |
| B14 | Cancel | A customer cannot cancel someone else's booking (404) | PASS | 5 |  |
| B15 | Cancel | A cancelled slot can be booked again | PASS | 3 |  |
| B16 | Duplicate | Race: 5 customers book the same slot at once -> exactly one wins | PASS | 716 |  |
| B17 | Notify | Notifications can be marked as read | PASS | 32 |  |
| B18 | Booking | GET on a write endpoint returns 405, not a crash | PASS | 3 |  |
| G01 | Gallery | Public gallery lists seeded images | PASS | 2 |  |
| G02 | Gallery | Anonymous and customer uploads are refused | PASS | 5 |  |
| G03 | Gallery | Admin uploads a valid image; it is served back as an image | PASS | 8 |  |
| G04 | Gallery | A script disguised as an image (fake PNG) is rejected | PASS | 2 |  |
| G05 | Gallery | Non-image data URL and image over 5 MB are rejected | PASS | 139 |  |
| G06 | Gallery | Missing title is rejected | PASS | 4 |  |
| G07 | Gallery | Admin deletes the image (record and file removed) | PASS | 9 |  |
| G08 | Admin | Admin can add then delete a service with an image | PASS | 7 |  |
| G09 | Admin | Reports return totals; cancelled bookings are excluded from revenue | PASS | 6 |  |
| G10 | Admin | Admin can update site details (logo/owner text) | PASS | 8 |  |
| E01 | Errors | Database outage returns a clear JSON message (not a blank/HTML page) | PASS | 1213 |  |
| E02 | Errors | Unreachable server fails fast with a network error (client can show a message) | PASS | 1 |  |
