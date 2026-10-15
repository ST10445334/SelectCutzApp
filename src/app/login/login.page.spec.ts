import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPage } from './login.page';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AuthService } from '../core/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear(); sessionStorage.clear();
    await TestBed.configureTestingModule({ imports: [LoginPage], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => { http.match(() => true); vi.restoreAllMocks(); });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('rejects empty credentials without calling the server', () => {
    component.submit();
    expect(component.error).toMatch(/enter your username\/email and password/i);
    http.expectNone(r => r.url.includes('auth.php'));
  });

  it('logs a customer in, stores the user and goes to the dashboard', () => {
    component.username = ' Test@Example.com '; component.password = 'secret1';
    component.submit();
    const req = http.expectOne(r => r.url.includes('auth.php'));
    expect(req.request.body).toEqual({ action: 'login', username: 'Test@Example.com', password: 'secret1', type: 'customer' });
    req.flush({ success: true, sessionToken: 'tok-1234567890abcdef', user: { id: 5, name: 'Test', role: 'customer' } });
    expect(TestBed.inject(AuthService).user?.id).toBe(5);
    expect(localStorage.getItem('selectcutz_session')).toBe('tok-1234567890abcdef');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('logs an admin in as admin', () => {
    component.type = 'admin'; component.username = 'tshego@selectcutz'; component.password = 'x1y2z3';
    component.submit();
    http.expectOne(r => r.url.includes('auth.php')).flush({ success: true, sessionToken: 'tok-1234567890abcdef', user: { id: 1, name: 'Tshego', role: 'admin' } });
    expect(TestBed.inject(AuthService).user?.type).toBe('admin');
  });

  it('shows the server message for a wrong password (401) and does not log in', () => {
    component.username = 'a@b.com'; component.password = 'wrong';
    component.submit();
    http.expectOne(r => r.url.includes('auth.php')).flush({ success: false, message: 'Invalid login. Please check the account type, email/username, and password.' }, { status: 401, statusText: 'Unauthorized' });
    expect(component.error).toContain('Invalid login');
    expect(TestBed.inject(AuthService).user).toBeNull();
    expect(component.busy).toBe(false);
  });

  it('shows a connection message when the server is unreachable and stops loading', () => {
    component.username = 'a@b.com'; component.password = 'secret1';
    component.submit();
    http.expectOne(r => r.url.includes('auth.php')).error(new ProgressEvent('error'), { status: 0 });
    expect(component.error).toMatch(/cannot reach|unavailable/i);
    expect(component.busy).toBe(false);
  });

  it('ignores a second tap while the first login request is running', () => {
    component.username = 'a@b.com'; component.password = 'secret1';
    component.submit(); component.submit();
    http.expectOne(r => r.url.includes('auth.php')); // exactly one
  });

  it('logout clears the user and the session token', () => {
    const auth = TestBed.inject(AuthService);
    auth.setUser({ id: 1, name: 'A', type: 'customer', username: 'a' });
    localStorage.setItem('selectcutz_session', 'tok-1234567890abcdef');
    auth.logout();
    http.expectOne(r => r.url.includes('logout.php')).flush({ success: true });
    expect(auth.user).toBeNull();
    expect(localStorage.getItem('selectcutz_session')).toBeNull();
  });
});
