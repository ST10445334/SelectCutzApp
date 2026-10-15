import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { ApiError, ApiService } from './api.service';

describe('ApiService (timeouts, offline and error states)', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { vi.useRealTimers(); http.verify(); });

  it('turns a silent server into a timeout error after 6 seconds', () => {
    vi.useFakeTimers();
    let error: ApiError | undefined;
    api.services().subscribe({ error: e => error = e });
    http.expectOne(r => r.url.includes('services.php'));
    vi.advanceTimersByTime(5900);
    expect(error).toBeUndefined();
    vi.advanceTimersByTime(200);
    expect(error).toBeInstanceOf(ApiError);
    expect(error?.kind).toBe('timeout');
    expect(error?.message).toMatch(/took too long/i);
  });

  it('reports an offline server (status 0) with a clear message', () => {
    let error: ApiError | undefined;
    api.createBooking(1, 1, '2030-01-01', '10:00').subscribe({ error: e => error = e });
    http.expectOne(r => r.url.includes('booking_create.php')).error(new ProgressEvent('error'), { status: 0 });
    expect(error?.kind).toBe('offline');
    expect(error?.message).toMatch(/cannot reach|unavailable/i);
  });

  it('passes the server message and status through for HTTP errors (e.g. 409 duplicate)', () => {
    let error: ApiError | undefined;
    api.createBooking(1, 1, '2030-01-01', '10:00').subscribe({ error: e => error = e });
    http.expectOne(r => r.url.includes('booking_create.php'))
      .flush({ success: false, message: 'This time slot is already booked. Please choose another time.' }, { status: 409, statusText: 'Conflict' });
    expect(error?.kind).toBe('http');
    expect(error?.status).toBe(409);
    expect(error?.message).toContain('already booked');
  });

  it('keeps the session token after login and sends it on later requests', () => {
    api.login('a@b.com', 'secret1', 'customer').subscribe();
    http.expectOne(r => r.url.includes('auth.php')).flush({ success: true, sessionToken: 'tok-1234567890abcdef', user: { id: 1, name: 'A' } });
    expect(localStorage.getItem('selectcutz_session')).toBe('tok-1234567890abcdef');

    api.customerData(1).subscribe();
    const req = http.expectOne(r => r.url.includes('customer.php'));
    expect(req.request.headers.get('X-Session-Token')).toBe('tok-1234567890abcdef');
    req.flush({ bookings: [], notifications: [] });
  });

  it('removes the session token on logout', () => {
    localStorage.setItem('selectcutz_session', 'tok-1234567890abcdef');
    api.logout().subscribe();
    http.expectOne(r => r.url.includes('logout.php')).flush({ success: true });
    expect(localStorage.getItem('selectcutz_session')).toBeNull();
  });

  it('posts a booking with service, date and time', () => {
    api.createBooking(7, 3, '2030-05-06', '09:30').subscribe();
    const req = http.expectOne(r => r.url.includes('booking_create.php'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ customerId: 7, serviceId: 3, date: '2030-05-06', time: '09:30' });
    req.flush({ success: true, bookingId: 1 });
  });

  it('uploads gallery images with the add action', () => {
    api.addGalleryImage({ title: 'T', caption: 'C', imageData: 'data:image/png;base64,AA==', imageName: 'a.png' }).subscribe();
    const req = http.expectOne(r => r.url.includes('gallery.php'));
    expect(req.request.body.action).toBe('add');
    req.flush({ success: true });
  });
});
