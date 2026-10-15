// SELECT CUTZ - end-to-end API tests (authentication, booking, cancellation, notifications, gallery, error states).
// Runs against ANY deployment:   BASE_URL=http://127.0.0.1:8081/api node tests/api/api-e2e.mjs
// Admin tests need E2E_ADMIN_USER / E2E_ADMIN_PASS (a dedicated test admin - never use the real owner login).
// SMOKE_ONLY=1 runs only the read-only checks, which is what you use against the live hosted site.
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8081/api').replace(/\/$/, '');
const ADMIN_USER = process.env.E2E_ADMIN_USER || '';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || '';
const SMOKE = process.env.SMOKE_ONLY === '1';
const REPORT = process.env.E2E_REPORT || 'docs/evidence/api-e2e-results.md';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const run = Date.now().toString(36);
const results = [];

async function call(path, { method = 'POST', body, token, raw, base = BASE, headers = {} } = {}) {
  const h = { ...headers }; if (token) h['X-Session-Token'] = token;
  if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
  const started = performance.now();
  const res = await fetch(`${base}/${path}`, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text, ms: Math.round(performance.now() - started), headers: res.headers };
}
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || 'expected'}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); };
const ok = (c, msg) => { if (!c) throw new Error(msg || 'assertion failed'); };
async function t(id, area, name, fn, { needsAdmin = false, smoke = false } = {}) {
  if ((SMOKE && !smoke) || (needsAdmin && !ADMIN_USER)) { results.push({ id, area, name, status: 'SKIP', ms: 0, note: SMOKE && !smoke ? 'smoke mode' : 'no admin creds' }); return; }
  const s = performance.now();
  try { await fn(); results.push({ id, area, name, status: 'PASS', ms: Math.round(performance.now() - s), note: '' }); }
  catch (e) { results.push({ id, area, name, status: 'FAIL', ms: Math.round(performance.now() - s), note: String(e.message).slice(0, 220) }); }
}

const pw = 'Passw0rd!x';
const mkEmail = (n) => `e2e.${run}.${n}@example.com`;
const reg = (n, password = pw) => call('auth.php', { body: { action: 'register', fullName: `E2E User ${n}`, email: mkEmail(n), phone: '0821234567', password } });
const login = (n, password = pw) => call('auth.php', { body: { action: 'login', username: mkEmail(n), password, type: 'customer' } });
async function newCustomer(n) { await reg(n); const r = await login(n); return r.json.sessionToken; }
// Far-future slot, unique per test run + index, so reruns never collide.
const day = (offset) => { const d = new Date(Date.now() + (400 + offset + (parseInt(run.slice(-3), 36) % 300)) * 864e5); return d.toISOString().slice(0, 10); };
const book = (token, serviceId, date, time) => call('booking_create.php', { token, body: { customerId: 1, serviceId, date, time } });

let A, B, adminToken, bookingA, galleryId, galleryPath;

// ---------------------------------------------------------------- ONLINE / SMOKE
await t('O01', 'Online', 'Health endpoint reports API + database running', async () => { const r = await call('health.php', { method: 'GET' }); eq(r.status, 200); ok(r.json?.success, 'success flag'); }, { smoke: true });
await t('O02', 'Online', 'Services list returns live records', async () => { const r = await call('services.php', { method: 'GET' }); eq(r.status, 200); ok(Array.isArray(r.json) && r.json.length > 0, 'no services'); ok(r.json[0].ServiceName && r.json[0].Price !== undefined, 'fields missing'); }, { smoke: true });
await t('O03', 'Online', 'Site settings (logo/owner) are served', async () => { const r = await call('settings.php', { method: 'GET' }); eq(r.status, 200); ok(r.json.SiteName && 'OwnerName' in r.json, 'settings fields'); }, { smoke: true });
await t('O04', 'Online', 'Gallery list is public', async () => { const r = await call('gallery.php', { method: 'GET' }); eq(r.status, 200); ok(Array.isArray(r.json), 'array'); }, { smoke: true });
await t('O05', 'Online', 'CORS preflight (OPTIONS) answers 204 for the app origin', async () => { const r = await call('auth.php', { method: 'OPTIONS', headers: { Origin: 'http://localhost' } }); eq(r.status, 204); eq(r.headers.get('access-control-allow-origin'), 'http://localhost'); }, { smoke: true });
await t('O06', 'Online', 'CORS is NOT granted to an unknown origin', async () => { const r = await call('auth.php', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }); eq(r.headers.get('access-control-allow-origin'), null); }, { smoke: true });
await t('O07', 'Online', 'Key read endpoints respond in under 1500 ms', async () => { for (const p of ['health.php', 'services.php', 'settings.php', 'gallery.php']) { const r = await call(p, { method: 'GET' }); ok(r.ms < 1500, `${p} took ${r.ms} ms`); } }, { smoke: true });
await t('O08', 'Online', 'Hosted site uses HTTPS (skipped for local http)', async () => { if (BASE.startsWith('http://127.0.0.1') || BASE.startsWith('http://localhost')) return; ok(BASE.startsWith('https://'), 'API base URL must be https in production'); }, { smoke: true });

// ---------------------------------------------------------------- AUTHENTICATION
await t('A01', 'Auth', 'Register rejects invalid email', async () => { const r = await call('auth.php', { body: { action: 'register', fullName: 'X', email: 'not-an-email', phone: '0821234567', password: pw } }); eq(r.status, 400); eq(r.json.success, false); });
await t('A02', 'Auth', 'Register rejects short password (<6) and empty name/phone', async () => {
  let r = await call('auth.php', { body: { action: 'register', fullName: 'X', email: mkEmail('short'), phone: '0821234567', password: '123' } }); eq(r.status, 400);
  r = await call('auth.php', { body: { action: 'register', fullName: '', email: mkEmail('noname'), phone: '0821234567', password: pw } }); eq(r.status, 400);
  r = await call('auth.php', { body: { action: 'register', fullName: 'X', email: mkEmail('nophone'), phone: '', password: pw } }); eq(r.status, 400); });
await t('A03', 'Auth', 'Register creates a customer account', async () => { const r = await reg('a'); eq(r.status, 200); ok(r.json.success); });
await t('A04', 'Auth', 'Duplicate email is rejected (case-insensitive)', async () => { const r = await call('auth.php', { body: { action: 'register', fullName: 'Dup', email: mkEmail('a').toUpperCase(), phone: '0821234567', password: pw } }); eq(r.status, 400); ok(/already registered/i.test(r.json.message), r.json.message); });
await t('A05', 'Auth', 'Customer login succeeds and returns a session token', async () => { const r = await login('a'); eq(r.status, 200); ok(r.json.success && r.json.sessionToken?.length >= 16, 'token'); eq(r.json.user.role, 'customer'); A = r.json.sessionToken; });
await t('A06', 'Auth', 'Wrong password returns 401', async () => { const r = await login('a', 'WrongPass1'); eq(r.status, 401); });
await t('A07', 'Auth', 'Unknown user returns the same 401 message (no user enumeration)', async () => { const u = await login('nobody-here'); const w = await login('a', 'WrongPass1'); eq(u.status, 401); eq(u.json.message, w.json.message); });
await t('A08', 'Auth', 'Empty credentials are rejected', async () => { const r = await call('auth.php', { body: { action: 'login', username: '', password: '', type: 'customer' } }); eq(r.status, 400); });
await t('A09', 'Auth', 'Customer credentials do not work on the admin login', async () => { const r = await call('auth.php', { body: { action: 'login', username: mkEmail('a'), password: pw, type: 'admin' } }); eq(r.status, 401); });
await t('A10', 'Auth', 'SQL-injection style username is rejected safely (401, not 500)', async () => { const r = await call('auth.php', { body: { action: 'login', username: "' OR '1'='1", password: "' OR '1'='1", type: 'customer' } }); eq(r.status, 401); });
await t('A11', 'Auth', 'Malformed JSON / unknown action does not crash the API', async () => { let r = await call('auth.php', { raw: '{not json', headers: { 'Content-Type': 'application/json' } }); ok(r.status >= 400 && r.status < 500, `status ${r.status}`); ok(r.json, 'must answer JSON'); r = await call('auth.php', { body: { action: 'nope' } }); eq(r.status, 400); });
await t('A12', 'Auth', 'Admin login succeeds with the test admin', async () => { const r = await call('auth.php', { body: { action: 'login', username: ADMIN_USER, password: ADMIN_PASS, type: 'admin' } }); eq(r.status, 200); eq(r.json.user.role, 'admin'); adminToken = r.json.sessionToken; }, { needsAdmin: true });
await t('A13', 'Auth', 'Admin login rejects a wrong admin password', async () => { const r = await call('auth.php', { body: { action: 'login', username: ADMIN_USER, password: 'wrong-wrong', type: 'admin' } }); eq(r.status, 401); }, { needsAdmin: true });
await t('A14', 'Role', 'Admin endpoints reject anonymous users (401)', async () => { for (const [p, b] of [['admin.php', { action: 'reports' }], ['gallery.php', { action: 'add' }], ['site_update.php', { SiteName: 'x' }]]) eq((await call(p, { body: b })).status, 401, p); });
await t('A15', 'Role', 'Admin endpoints reject a logged-in CUSTOMER (role check)', async () => { for (const [p, b] of [['admin.php', { action: 'reports' }], ['admin.php', { action: 'deleteService', serviceId: 1 }], ['gallery.php', { action: 'add', title: 'x' }], ['site_update.php', { SiteName: 'Hacked' }]]) eq((await call(p, { body: b, token: A })).status, 401, p); });
await t('A16', 'Role', 'Customer endpoints reject anonymous users (401)', async () => { for (const [p, m] of [['customer.php', 'GET'], ['booking_create.php', 'POST'], ['booking_cancel.php', 'POST'], ['notifications_read.php', 'POST']]) eq((await call(p, { method: m, body: m === 'POST' ? {} : undefined })).status, 401, p); });
await t('A17', 'Role', 'Customer endpoints reject an ADMIN session', async () => { eq((await call('customer.php', { method: 'GET', token: adminToken })).status, 401); }, { needsAdmin: true });
await t('A18', 'Auth', 'Logout destroys the session (token no longer works)', async () => { const tok = await newCustomer('lo'); eq((await call('customer.php', { method: 'GET', token: tok })).status, 200); eq((await call('logout.php', { token: tok, body: {} })).status, 200); eq((await call('customer.php', { method: 'GET', token: tok })).status, 401); });
await t('A19', 'Auth', 'A forged / random session token is refused', async () => { eq((await call('customer.php', { method: 'GET', token: 'a'.repeat(32) })).status, 401); });

// ---------------------------------------------------------------- BOOKING
B = await newCustomer('b').catch(() => undefined);
await t('B01', 'Booking', 'Booking without login is refused (401)', async () => eq((await book(undefined, 1, day(1), '10:00')).status, 401));
await t('B02', 'Booking', 'Customer can create a booking (confirmed, id returned)', async () => { const r = await book(A, 1, day(2), '10:00'); eq(r.status, 200); ok(r.json.bookingId > 0); ok(/confirmed/i.test(r.json.message)); bookingA = r.json.bookingId; });
await t('B03', 'Booking', 'Booking creates a notification for the customer', async () => { const r = await call('customer.php', { method: 'GET', token: A }); ok(r.json.notifications.some(n => /confirmed/i.test(n.Message)), 'no confirmation notification'); ok(r.json.unreadCount >= 1); });
await t('B04', 'Duplicate', 'Same customer, same slot again (double-tap / retry) -> 409, still ONE booking', async () => { const r = await book(A, 1, day(2), '10:00'); eq(r.status, 409); const h = await call('customer.php', { method: 'GET', token: A }); eq(h.json.bookings.filter(b => b.BookingDate === day(2) && b.BookingTime.startsWith('10:00')).length, 1); });
await t('B05', 'Duplicate', 'Same customer cannot hold two services at one date+time', async () => { eq((await book(A, 2, day(2), '10:00')).status, 409); });
await t('B06', 'Duplicate', 'A different customer cannot take an already-booked slot', async () => { const r = await book(B, 1, day(2), '10:00'); eq(r.status, 409); ok(/already booked/i.test(r.json.message)); });
await t('B07', 'Booking', 'Past date is rejected', async () => eq((await book(A, 1, '2020-01-01', '10:00')).status, 400));
await t('B08', 'Booking', 'Impossible date (31 Feb) and bad formats are rejected', async () => { eq((await book(A, 1, '2027-02-31', '10:00')).status, 400); eq((await book(A, 1, '12/05/2027', '10:00')).status, 400); eq((await book(A, 1, day(3), '25:99')).status, 400); eq((await book(A, 1, day(3), '')).status, 400); });
await t('B09', 'Booking', 'Unknown service returns 404', async () => eq((await book(A, 99999, day(3), '11:00')).status, 404));
await t('B10', 'Booking', 'A forged customerId in the body is ignored (booking belongs to the session user)', async () => { const r = await call('booking_create.php', { token: B, body: { customerId: 1, serviceId: 3, date: day(4), time: '09:00' } }); eq(r.status, 200); const mine = await call('customer.php', { method: 'GET', token: B }); ok(mine.json.bookings.some(b => b.BookingID === r.json.bookingId), 'not in B history'); const a = await call('customer.php', { method: 'GET', token: A }); ok(!a.json.bookings.some(b => b.BookingID === r.json.bookingId), 'leaked into A history'); });
await t('B11', 'History', 'Booking history shows only the customer\'s own bookings', async () => { const a = await call('customer.php', { method: 'GET', token: A }); const b = await call('customer.php', { method: 'GET', token: B }); const ids = new Set(a.json.bookings.map(x => x.BookingID)); ok(!b.json.bookings.some(x => ids.has(x.BookingID)), 'overlap between customers'); ok(a.json.bookings[0].ServiceName, 'service name'); });
await t('B12', 'Cancel', 'Cancel a booking: succeeds and writes a cancellation notification', async () => { const r = await call('booking_cancel.php', { token: A, body: { bookingId: bookingA } }); eq(r.status, 200); const h = await call('customer.php', { method: 'GET', token: A }); eq(h.json.bookings.find(b => b.BookingID === bookingA).BookingStatus, 'Cancelled'); ok(h.json.notifications.some(n => /cancelled/i.test(n.Message))); });
await t('B13', 'Cancel', 'Cancelling twice returns 409', async () => eq((await call('booking_cancel.php', { token: A, body: { bookingId: bookingA } })).status, 409));
await t('B14', 'Cancel', 'A customer cannot cancel someone else\'s booking (404)', async () => { const r = await book(B, 1, day(5), '12:00'); eq((await call('booking_cancel.php', { token: A, body: { bookingId: r.json.bookingId } })).status, 404); });
await t('B15', 'Cancel', 'A cancelled slot can be booked again', async () => { const r = await book(B, 1, day(2), '10:00'); eq(r.status, 200, 'rebook after cancel'); });
await t('B16', 'Duplicate', 'Race: 5 customers book the same slot at once -> exactly one wins', async () => {
  const toks = await Promise.all([1, 2, 3, 4, 5].map(i => newCustomer(`race${i}`)));
  const rs = await Promise.all(toks.map(tok => book(tok, 4, day(6), '15:00')));
  const wins = rs.filter(r => r.status === 200).length; const conflicts = rs.filter(r => r.status === 409).length;
  eq(wins, 1, `winners (statuses: ${rs.map(r => r.status)})`); eq(conflicts, 4, 'conflicts'); });
await t('B17', 'Notify', 'Notifications can be marked as read', async () => { const before = (await call('customer.php', { method: 'GET', token: A })).json.unreadCount; ok(before > 0, 'expected unread'); eq((await call('notifications_read.php', { token: A, body: {} })).status, 200); eq((await call('customer.php', { method: 'GET', token: A })).json.unreadCount, 0); });
await t('B18', 'Booking', 'GET on a write endpoint returns 405, not a crash', async () => eq((await call('booking_create.php', { method: 'GET', token: A })).status, 405));

// ---------------------------------------------------------------- GALLERY + ADMIN
await t('G01', 'Gallery', 'Public gallery lists seeded images', async () => { const r = await call('gallery.php', { method: 'GET' }); ok(r.json.length >= 1); ok(r.json[0].ImagePath && r.json[0].Title); });
await t('G02', 'Gallery', 'Anonymous and customer uploads are refused', async () => { eq((await call('gallery.php', { body: { action: 'add', title: 'x', imageData: PNG } })).status, 401); eq((await call('gallery.php', { token: A, body: { action: 'add', title: 'x', imageData: PNG } })).status, 401); });
await t('G03', 'Gallery', 'Admin uploads a valid image; it is served back as an image', async () => { const r = await call('gallery.php', { token: adminToken, body: { action: 'add', title: `E2E ${run}`, caption: 'automated test', imageData: PNG, imageName: 't.png' } }); eq(r.status, 200); ok(/^uploads\/gallery-[a-f0-9]+\.png$/.test(r.json.imagePath), r.json.imagePath); galleryId = r.json.galleryId; galleryPath = r.json.imagePath; const img = await fetch(`${BASE}/${galleryPath}`); eq(img.status, 200); ok((img.headers.get('content-type') || '').startsWith('image/'), 'content-type ' + img.headers.get('content-type')); const list = await call('gallery.php', { method: 'GET' }); ok(list.json.some(g => Number(g.GalleryID) === Number(galleryId)), 'not listed'); }, { needsAdmin: true });
await t('G04', 'Gallery', 'A script disguised as an image (fake PNG) is rejected', async () => { const fake = 'data:image/png;base64,' + Buffer.from('<?php echo "pwned"; ?>').toString('base64'); const r = await call('gallery.php', { token: adminToken, body: { action: 'add', title: 'fake', imageData: fake } }); eq(r.status, 400); }, { needsAdmin: true });
await t('G05', 'Gallery', 'Non-image data URL and image over 5 MB are rejected', async () => { let r = await call('gallery.php', { token: adminToken, body: { action: 'add', title: 'pdf', imageData: 'data:application/pdf;base64,JVBERi0=' } }); eq(r.status, 400); const big = 'data:image/png;base64,' + Buffer.concat([Buffer.from(PNG.split(',')[1], 'base64'), Buffer.alloc(5.5 * 1024 * 1024)]).toString('base64'); r = await call('gallery.php', { token: adminToken, body: { action: 'add', title: 'big', imageData: big } }); eq(r.status, 400); }, { needsAdmin: true });
await t('G06', 'Gallery', 'Missing title is rejected', async () => eq((await call('gallery.php', { token: adminToken, body: { action: 'add', title: '  ', imageData: PNG } })).status, 400), { needsAdmin: true });
await t('G07', 'Gallery', 'Admin deletes the image (record and file removed)', async () => { eq((await call('gallery.php', { token: adminToken, body: { action: 'delete', galleryId } })).status, 200); const list = await call('gallery.php', { method: 'GET' }); ok(!list.json.some(g => Number(g.GalleryID) === Number(galleryId))); eq((await fetch(`${BASE}/${galleryPath}`)).status, 404); eq((await call('gallery.php', { token: adminToken, body: { action: 'delete', galleryId } })).status, 404); }, { needsAdmin: true });
await t('G08', 'Admin', 'Admin can add then delete a service with an image', async () => { const add = await call('admin.php', { token: adminToken, body: { action: 'addService', name: `E2E Cut ${run}`, description: 'test', price: 99, duration: 20, category: 'Test', imageData: PNG, imageName: 's.png' } }); eq(add.status, 200); const list = await call('services.php', { method: 'GET' }); const s = list.json.find(x => x.ServiceName === `E2E Cut ${run}`); ok(s, 'service listed'); eq((await call('admin.php', { token: adminToken, body: { action: 'deleteService', serviceId: Number(s.ServiceID) } })).status, 200); }, { needsAdmin: true });
await t('G09', 'Admin', 'Reports return totals; cancelled bookings are excluded from revenue', async () => { const r = await call('admin.php', { token: adminToken, body: { action: 'reports' } }); eq(r.status, 200); ok(Number(r.json.summary.TotalBookings) >= 3); ok(Array.isArray(r.json.popularServices) && Array.isArray(r.json.customerActivity)); const all = await call('admin.php', { token: adminToken, body: { action: 'allBookings' } }); const live = all.json.filter(b => b.BookingStatus !== 'Cancelled').reduce((s, b) => s + Number(b.BookingAmount), 0); eq(Number(r.json.summary.TotalRevenue), live, 'revenue'); }, { needsAdmin: true });
await t('G10', 'Admin', 'Admin can update site details (logo/owner text)', async () => { const cur = (await call('settings.php', { method: 'GET' })).json; eq((await call('site_update.php', { token: adminToken, body: { ...cur, SiteName: cur.SiteName, logoData: PNG, logoName: 'l.png' } })).status, 200); ok(/uploads\/logo-/.test((await call('settings.php', { method: 'GET' })).json.LogoPath)); eq((await call('site_update.php', { token: adminToken, body: { ...cur, SiteName: '' } })).status, 400); }, { needsAdmin: true });

// ---------------------------------------------------------------- ERROR STATES
await t('E01', 'Errors', 'Database outage returns a clear JSON message (not a blank/HTML page)', async () => {
  if (SMOKE || !BASE.startsWith('http://127.0.0.1')) return;
  const root = process.env.PHP_ROOT || 'backend';
  const srv = spawn('php', ['-S', '127.0.0.1:8082', '-t', root], { env: { ...process.env, DB_NAME: 'does_not_exist' }, stdio: 'ignore' });
  try { await new Promise(r => setTimeout(r, 1200)); const r = await call('health.php', { method: 'GET', base: 'http://127.0.0.1:8082/api' }); eq(r.status, 500); ok(/database is unavailable/i.test(r.json?.message || ''), r.text.slice(0, 120)); } finally { srv.kill(); } });
await t('E02', 'Errors', 'Unreachable server fails fast with a network error (client can show a message)', async () => { let failed = false; try { await fetch('http://127.0.0.1:1/api/health.php', { signal: AbortSignal.timeout(3000) }); } catch { failed = true; } ok(failed); }, { smoke: true });

// ---------------------------------------------------------------- REPORT
const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length, skip = results.filter(r => r.status === 'SKIP').length;
const icon = { PASS: 'PASS', FAIL: 'FAIL', SKIP: 'SKIP' };
console.log(`\nSELECT CUTZ API E2E  |  ${BASE}  |  ${new Date().toISOString()}`);
for (const r of results) console.log(`${icon[r.status].padEnd(4)}  ${r.id.padEnd(4)} ${r.area.padEnd(9)} ${r.name}${r.status === 'FAIL' ? '\n        -> ' + r.note : ''}`);
console.log(`\nTotal ${results.length}: ${pass} passed, ${fail} failed, ${skip} skipped`);
mkdirSync(REPORT.split('/').slice(0, -1).join('/') || '.', { recursive: true });
writeFileSync(REPORT, [`# API end-to-end test evidence`, '', `- Target: \`${BASE}\``, `- Run at: ${new Date().toISOString()}`, `- Mode: ${SMOKE ? 'smoke (read-only)' : 'full'}`, `- Result: **${pass} passed, ${fail} failed, ${skip} skipped** (of ${results.length})`, '', '| ID | Area | Test | Result | ms | Note |', '|---|---|---|---|---|---|', ...results.map(r => `| ${r.id} | ${r.area} | ${r.name.replace(/\|/g, '\\|')} | ${r.status} | ${r.ms} | ${r.note.replace(/\|/g, '\\|')} |`), ''].join('\n'));
process.exit(fail ? 1 : 0);
