import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AdminGalleryPage, MAX_IMAGE_BYTES } from './admin-gallery.page';
import { AuthService } from '../core/auth.service';

describe('AdminGalleryPage (upload flow)', () => {
  let http: HttpTestingController;
  function setup(type: 'admin' | 'customer') {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [AdminGalleryPage], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AuthService).setUser({ id: 1, name: 'Owner', type, username: 'x' });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AdminGalleryPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  afterEach(() => vi.restoreAllMocks());

  it('keeps customers out (redirects to login, loads nothing)', () => {
    const spy = vi.spyOn(Router.prototype, 'navigateByUrl').mockResolvedValue(true);
    setup('customer');
    expect(spy).toHaveBeenCalledWith('/login');
    http.expectNone(r => r.url.includes('gallery.php'));
  });

  it('accepts JPG/PNG/WebP and rejects other types and files over 5 MB', () => {
    const page = setup('admin'); http.match(() => true);
    expect(page.fileProblem({ type: 'image/png', size: 1000 })).toBe('');
    expect(page.fileProblem({ type: 'image/webp', size: 1000 })).toBe('');
    expect(page.fileProblem({ type: 'application/pdf', size: 1000 })).toMatch(/JPG, PNG or WebP/);
    expect(page.fileProblem({ type: 'image/gif', size: 1000 })).toMatch(/JPG, PNG or WebP/);
    expect(page.fileProblem({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toMatch(/smaller than 5 MB/);
  });

  it('requires a title and an image before calling the API', () => {
    const page = setup('admin'); http.match(() => true);
    page.upload(); expect(page.error).toMatch(/title/i);
    page.model.title = 'Fresh fade'; page.upload(); expect(page.error).toMatch(/choose an image/i);
    http.expectNone(r => r.url.includes('gallery.php') && r.method === 'POST');
  });

  it('uploads once, reports success, clears the form and refreshes the list', () => {
    const page = setup('admin'); http.expectOne(r => r.url.includes('gallery.php')).flush([]);
    page.model = { title: ' Fresh fade ', caption: 'Test', imageData: 'data:image/webp;base64,AAAA', imageName: 'a.webp' };
    page.upload(); page.upload(); // double tap
    const req = http.expectOne(r => r.method === 'POST' && r.url.includes('gallery.php'));
    expect(req.request.body).toMatchObject({ action: 'add', title: 'Fresh fade' });
    req.flush({ success: true, message: 'Gallery image uploaded.' });
    expect(page.message).toContain('uploaded');
    expect(page.model.title).toBe('');
    http.expectOne(r => r.method === 'GET' && r.url.includes('gallery.php')).flush([]);
  });

  it('shows the server error when the upload is refused', () => {
    const page = setup('admin'); http.expectOne(r => r.url.includes('gallery.php')).flush([]);
    page.model = { title: 'x', caption: '', imageData: 'data:image/png;base64,AAAA', imageName: 'a.png' };
    page.upload();
    http.expectOne(r => r.method === 'POST').flush({ success: false, message: 'Please select a valid JPG, PNG or WebP image under 5 MB.' }, { status: 400, statusText: 'Bad Request' });
    expect(page.error).toContain('valid JPG');
    expect(page.busy).toBe(false);
  });
});
