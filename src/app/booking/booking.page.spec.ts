import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { BookingPage, localDate } from './booking.page';
import { AuthService } from '../core/auth.service';

const SERVICES = [
  { ServiceID: 1, ServiceName: 'Classic Fade', Description: '', Price: 150, Duration: 30 },
  { ServiceID: 2, ServiceName: 'Wave Cut', Description: '', Price: 180, Duration: 35 }
];

describe('BookingPage', () => {
  let fixture: ComponentFixture<BookingPage>;
  let component: BookingPage;
  let http: HttpTestingController;
  let router: Router;

  function setup(opts: { loggedIn?: boolean; serviceParam?: string } = {}) {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [BookingPage],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(opts.serviceParam ? { service: opts.serviceParam } : {}) } } }
      ]
    });
    if (opts.loggedIn !== false) TestBed.inject(AuthService).setUser({ id: 5, name: 'Test Customer', type: 'customer', username: 't@example.com' });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BookingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
  const servicesReq = () => http.expectOne(r => r.url.includes('services.php'));
  const future = () => { const d = new Date(Date.now() + 3 * 864e5); return localDate(d); };
  function fillValid() { component.serviceId = 1; component.date = future(); component.time = '10:00'; }

  afterEach(() => { vi.useRealTimers(); http?.match(r => /settings\.php|logout\.php/.test(r.url)); /* header logo + logout requests */ http?.verify(); });

  it('sends a logged-out visitor to login and remembers the booking page', () => {
    setup({ loggedIn: false });
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/booking' } });
    http.expectNone(r => r.url.includes('services.php'));
  });

  it('preselects the service chosen on the Services page (?service=2)', () => {
    setup({ serviceParam: '2' });
    servicesReq().flush(SERVICES);
    expect(component.serviceId).toBe(2);
    expect(component.selectedService?.ServiceName).toBe('Wave Cut');
  });

  it('ignores a ?service= that is not in the live list', () => {
    setup({ serviceParam: '99' });
    servicesReq().flush(SERVICES);
    expect(component.serviceId).toBe(0);
  });

  it('shows an error (and no offline catalogue) when services cannot load, then recovers on retry', () => {
    setup();
    servicesReq().error(new ProgressEvent('error'), { status: 0 });
    expect(component.services).toEqual([]);
    expect(component.servicesError).toMatch(/cannot reach|unavailable/i);
    component.loadServices();
    servicesReq().flush(SERVICES);
    expect(component.servicesError).toBe('');
    expect(component.services.length).toBe(2);
  });

  describe('validation', () => {
    beforeEach(() => { setup(); servicesReq().flush(SERVICES); });
    const noon = new Date(2026, 9, 11, 12, 0, 0);

    it('requires service, date and time', () => { expect(component.validate(noon)).toMatch(/select a service, date and time/i); });
    it('rejects a past date', () => { component.serviceId = 1; component.date = '2026-10-10'; component.time = '10:00'; expect(component.validate(noon)).toMatch(/today or a future date/i); });
    it('rejects an earlier time today', () => { component.serviceId = 1; component.date = '2026-10-11'; component.time = '09:00'; expect(component.validate(noon)).toMatch(/already passed/i); });
    it('accepts a later time today and any future day', () => {
      component.serviceId = 1; component.date = '2026-10-11'; component.time = '15:00'; expect(component.validate(noon)).toBe('');
      component.date = '2026-12-24'; component.time = '08:00'; expect(component.validate(noon)).toBe('');
    });
    it('does not call the API when validation fails', () => { component.serviceId = 1; component.date = '2020-01-01'; component.time = '10:00'; component.submit(); http.expectNone(r => r.url.includes('booking_create.php')); expect(component.error).toBeTruthy(); });
  });

  describe('submitting', () => {
    beforeEach(() => { setup(); servicesReq().flush(SERVICES); fillValid(); });

    it('creates the booking once even if the button is tapped repeatedly (duplicate protection)', () => {
      component.submit(); component.submit(); component.submit();
      const req = http.expectOne(r => r.url.includes('booking_create.php')); // would throw if more than one was sent
      expect(component.busy).toBe(true);
      req.flush({ success: true, bookingId: 42, message: 'Your booking is confirmed.' });
      expect(component.busy).toBe(false);
    });

    it('stores the confirmation and opens the confirmation page on success', () => {
      component.submit();
      http.expectOne(r => r.url.includes('booking_create.php')).flush({ success: true, bookingId: 42, message: 'Confirmed!' });
      const saved = JSON.parse(sessionStorage.getItem('selectcutz_booking_confirmation')!);
      expect(saved.bookingId).toBe(42);
      expect(saved.serviceName).toBe('Classic Fade');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/booking-confirmation');
    });

    it('shows the server message for a double booking (409) and re-enables the button', () => {
      component.submit();
      http.expectOne(r => r.url.includes('booking_create.php')).flush({ success: false, message: 'This time slot is already booked. Please choose another time.' }, { status: 409, statusText: 'Conflict' });
      expect(component.error).toContain('already booked');
      expect(component.uncertain).toBe(false);
      expect(component.busy).toBe(false);
    });

    it('after a timeout warns that the booking may be saved and points to My Bookings', () => {
      vi.useFakeTimers();
      component.submit();
      http.expectOne(r => r.url.includes('booking_create.php'));
      vi.advanceTimersByTime(6100);
      expect(component.uncertain).toBe(true);
      expect(component.error).toMatch(/too long/i);
      expect(component.error).toMatch(/check My Bookings/i);
      expect(component.busy).toBe(false);
    });

    it('logs the user out and returns to login when the session has expired (401)', () => {
      component.submit();
      http.expectOne(r => r.url.includes('booking_create.php')).flush({ success: false, message: 'Your customer session has expired.' }, { status: 401, statusText: 'Unauthorized' });
      expect(TestBed.inject(AuthService).user).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/booking' } });
    });
  });
});
