import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { DashboardPage } from './dashboard.page';
import { AuthService } from '../core/auth.service';

const future = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
const DATA = {
  bookings: [
    { BookingID: 11, ServiceName: 'Classic Fade', BookingDate: future, BookingTime: '10:00:00', BookingStatus: 'Confirmed', BookingAmount: 150 },
    { BookingID: 10, ServiceName: 'Wave Cut', BookingDate: '2020-01-01', BookingTime: '09:00:00', BookingStatus: 'Confirmed', BookingAmount: 180 },
    { BookingID: 9, ServiceName: 'Low Fade', BookingDate: future, BookingTime: '11:00:00', BookingStatus: 'Cancelled', BookingAmount: 160 }
  ],
  notifications: [
    { NotificationID: 2, Message: 'Your booking for Classic Fade is confirmed.', NotificationDate: '2026-10-11 10:00:00', NotificationStatus: 'Unread' },
    { NotificationID: 1, Message: 'Old one', NotificationDate: '2026-10-01 10:00:00', NotificationStatus: 'Read' }
  ]
};

describe('DashboardPage (customer: history, cancellation, notifications)', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let component: DashboardPage;
  let http: HttpTestingController;
  // The real HttpClient schedules change detection itself; the testing backend does not, so do it explicitly.
  const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [DashboardPage], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AuthService).setUser({ id: 5, name: 'Test Customer', type: 'customer', username: 't@example.com' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(r => r.url.includes('customer.php')).flush(DATA);
    render();
  });
  afterEach(() => { vi.restoreAllMocks(); http.match(r => /settings\.php|logout\.php/.test(r.url)); /* header logo + logout requests */ http.verify(); });

  it('shows booking history with times trimmed to HH:MM', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Classic Fade');
    const firstRow = (fixture.nativeElement.querySelector('tbody tr') as HTMLElement).textContent as string;
    expect(firstRow).toContain('10:00');
    expect(firstRow).not.toContain('10:00:00'); // database returns HH:MM:SS, the screen shows HH:MM
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(3);
  });

  it('only offers Cancel for upcoming, non-cancelled bookings', () => {
    expect(component.isPast(DATA.bookings[0])).toBe(false);
    expect(component.isPast(DATA.bookings[1])).toBe(true);
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button.table-action')) as HTMLButtonElement[];
    expect(buttons.length).toBe(1); // upcoming + confirmed only
  });

  it('does nothing when the user declines the cancel confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.cancel(11);
    http.expectNone(r => r.url.includes('booking_cancel.php'));
  });

  it('cancels, shows the message and reloads the history + notifications', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.cancel(11);
    component.cancel(11); // second tap while in flight is ignored
    const req = http.expectOne(r => r.url.includes('booking_cancel.php'));
    expect(req.request.body.bookingId).toBe(11);
    req.flush({ success: true, message: 'Booking cancelled successfully.' });
    expect(component.message).toContain('cancelled');
    http.expectOne(r => r.url.includes('customer.php')).flush(DATA);
  });

  it('shows the server reason when a cancellation is refused', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.cancel(10);
    http.expectOne(r => r.url.includes('booking_cancel.php')).flush({ success: false, message: 'Past bookings cannot be cancelled.' }, { status: 409, statusText: 'Conflict' });
    expect(component.error).toBe('Past bookings cannot be cancelled.');
    expect(component.cancellingId).toBe(0);
  });

  it('counts unread notifications and clears them with "Mark all as read"', () => {
    expect(component.unreadCount).toBe(1);
    component.markAllRead();
    http.expectOne(r => r.url.includes('notifications_read.php')).flush({ success: true });
    expect(component.unreadCount).toBe(0);
    expect(component.notifications.every(n => n.NotificationStatus === 'Read')).toBe(true);
  });

  it('sends a logged-out visitor to login', () => {
    TestBed.inject(AuthService).logout();
    http.match(() => true); // logout request
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.ngOnInit();
    expect(spy).toHaveBeenCalledWith('/login');
  });
});
