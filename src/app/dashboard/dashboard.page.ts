import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService, Booking, NotificationItem } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SiteHeaderComponent } from '../shared/site-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  imports: [CommonModule, IonButton, RouterLink, SiteHeaderComponent]
})
export class DashboardPage implements OnInit {
  bookings: Booking[] = [];
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  cancellingId = 0;
  summary: any = null;
  loading = true;
  error = '';
  message = '';

  constructor(public auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    const user = this.auth.user;
    if (!user) { this.router.navigateByUrl('/login'); return; }
    if (user.type === 'admin') this.loadAdmin();
    else this.loadCustomer();
  }

  loadCustomer(): void {
    const user = this.auth.user;
    if (!user) return;
    this.loading = true;
    this.api.customerData(user.id).subscribe({
      next: data => {
        this.bookings = Array.isArray(data?.bookings) ? data.bookings : [];
        this.notifications = Array.isArray(data?.notifications) ? data.notifications : [];
        this.unreadCount = this.notifications.filter(n => n.NotificationStatus === 'Unread').length;
        this.loading = false;
      },
      error: err => { this.error = err.message; this.loading = false; }
    });
  }

  loadAdmin(): void {
    this.loading = true;
    this.api.adminReports().subscribe({
      next: data => {
        this.summary = data?.summary || {};
        this.loading = false;
      },
      error: err => { this.error = err.message; this.loading = false; }
    });
    this.api.adminBookings().subscribe({
      next: data => this.bookings = Array.isArray(data) ? data : [],
      error: err => this.error = err.message
    });
  }

  /** True once the appointment time has passed (past bookings cannot be cancelled). */
  isPast(booking: Booking): boolean {
    const when = new Date(`${booking.BookingDate}T${String(booking.BookingTime).slice(0, 5)}:00`);
    return !isNaN(when.getTime()) && when.getTime() <= Date.now();
  }

  cancel(bookingId: number): void {
    const user = this.auth.user;
    if (!user || this.cancellingId || !confirm('Cancel this booking?')) return;
    this.error = ''; this.message = '';
    this.cancellingId = bookingId;
    this.api.cancelBooking(user.id, bookingId).pipe(finalize(() => this.cancellingId = 0)).subscribe({
      next: response => {
        if (!response?.success) { this.error = response?.message || 'Unable to cancel booking.'; return; }
        this.message = response.message || 'Booking cancelled.';
        this.loadCustomer(); // refresh history and the new cancellation notification
      },
      error: err => this.error = err.message
    });
  }

  markAllRead(): void {
    this.api.markNotificationsRead().subscribe({
      next: () => { this.notifications = this.notifications.map(n => ({ ...n, NotificationStatus: 'Read' })); this.unreadCount = 0; },
      error: err => this.error = err.message
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/home');
  }

}
