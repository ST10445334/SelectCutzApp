import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton } from '@ionic/angular';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError, ApiService, ServiceItem } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SiteHeaderComponent } from '../shared/site-header.component';
import { SiteFooterComponent } from '../shared/site-footer.component';
import { Subscription, finalize } from 'rxjs';

/** Today's date as YYYY-MM-DD in the phone's local time (toISOString() would give the UTC date). */
export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, RouterLink, SiteHeaderComponent, SiteFooterComponent]
})
export class BookingPage implements OnInit, OnDestroy {
  services: ServiceItem[] = [];
  serviceId = 0;
  date = '';
  time = '';
  error = '';
  message = '';
  busy = false;
  loadingServices = false;
  servicesError = '';
  /** Set after a timeout: the booking may have been saved, so the user must check before retrying. */
  uncertain = false;
  minDate = localDate();
  private requestedServiceId = 0;
  private bookingRequest?: Subscription;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get selectedService(): ServiceItem | undefined {
    return this.services.find(item => Number(item.ServiceID) === Number(this.serviceId));
  }

  ngOnInit(): void {
    if (!this.auth.user || this.auth.user.type !== 'customer') {
      sessionStorage.setItem('selectcutz_return_url', '/booking');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/booking' } });
      return;
    }
    // The Services page sends ?service=<id> so the chosen haircut is already selected here.
    this.requestedServiceId = Number(this.route.snapshot.queryParamMap.get('service')) || 0;
    this.serviceId = 0;
    this.loadServices();
  }

  ngOnDestroy(): void {
    this.bookingRequest?.unsubscribe();
  }

  loadServices(): void {
    this.loadingServices = true;
    this.servicesError = '';
    this.api.services().pipe(finalize(() => this.loadingServices = false)).subscribe({
      next: data => {
        this.services = Array.isArray(data) ? data : [];
        if (this.requestedServiceId && this.services.some(s => Number(s.ServiceID) === this.requestedServiceId)) {
          this.serviceId = this.requestedServiceId;
        }
      },
      // No offline fallback catalogue here: its IDs can differ from the database, which could book the wrong service.
      error: err => { this.services = []; this.servicesError = err.message; }
    });
  }

  /** Returns a validation message, or '' when the form is acceptable. */
  validate(now = new Date()): string {
    if (!this.serviceId || !this.date || !this.time) return 'Please select a service, date and time.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.date) || !/^\d{2}:\d{2}$/.test(this.time)) return 'Please enter a valid date and time.';
    if (this.date < localDate(now)) return 'Please choose today or a future date.';
    const when = new Date(`${this.date}T${this.time}:00`);
    if (isNaN(when.getTime())) return 'Please enter a valid date and time.';
    if (when.getTime() <= now.getTime()) return 'That time has already passed. Please choose a later time.';
    return '';
  }

  submit(): void {
    if (this.busy) return; // blocks double taps while a request is in flight
    this.error = '';
    this.message = '';
    this.uncertain = false;
    const user = this.auth.user;

    if (!user || user.type !== 'customer') {
      sessionStorage.setItem('selectcutz_return_url', '/booking');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/booking' } });
      return;
    }
    const problem = this.validate();
    if (problem) { this.error = problem; return; }

    this.busy = true;
    this.bookingRequest = this.api.createBooking(user.id, this.serviceId, this.date, this.time).pipe(
      finalize(() => this.busy = false)
    ).subscribe({
      next: response => {
        if (!response?.success) {
          this.error = response?.message || 'Booking could not be created.';
          return;
        }
        const service = this.selectedService;
        const confirmation = {
          bookingId: Number(response.bookingId || 0),
          customerName: user.name,
          serviceName: service?.ServiceName || 'Selected service',
          price: service?.Price ?? '',
          date: this.date,
          time: this.time,
          status: 'Confirmed',
          message: response.message || 'Booking confirmed successfully.'
        };
        sessionStorage.setItem('selectcutz_booking_confirmation', JSON.stringify(confirmation));
        this.router.navigateByUrl('/booking-confirmation');
      },
      error: (err: ApiError) => {
        if (err.kind === 'timeout' || err.kind === 'offline') {
          // The server may have saved the booking before the connection dropped. Do not invite a blind retry.
          this.uncertain = true;
          this.error = `${err.message} Your booking may still have been saved, so please check My Bookings before trying again.`;
        } else if (err.status === 401) {
          this.auth.logout();
          sessionStorage.setItem('selectcutz_return_url', '/booking');
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/booking' } });
        } else {
          this.error = err.message;
        }
      }
    });
  }
}
