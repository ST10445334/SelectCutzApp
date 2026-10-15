import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GalleryPage } from './gallery.page';

describe('GalleryPage', () => {
  let fixture: ComponentFixture<GalleryPage>;
  let component: GalleryPage;
  let http: HttpTestingController;
  const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };
  const load = () => http.expectOne(r => r.url.includes('gallery.php'));

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GalleryPage], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GalleryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => http.match(r => r.url.includes('settings.php')));

  it('shows a loading state, then the live records', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading gallery');
    load().flush([{ GalleryID: 1, Title: 'Classic Fade', Caption: 'Sharp', ImagePath: 'assets/classic-fade.jpeg' }, { GalleryID: 2, Title: 'Wave Cut', ImagePath: 'uploads/gallery-abc.png' }]);
    render();
    expect(fixture.nativeElement.querySelectorAll('figure').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Wave Cut');
  });

  it('shows an empty state when there are no images', () => {
    load().flush([]); render();
    expect(fixture.nativeElement.textContent).toContain('No gallery images yet');
  });

  it('shows an error with a retry when the server is unreachable', () => {
    load().error(new ProgressEvent('error'), { status: 0 }); render();
    expect(fixture.nativeElement.querySelector('.error')).toBeTruthy();
    component.load();
    load().flush([]);
    expect(component.error).toBe('');
  });

  it('falls back to the logo when an image is missing', () => {
    const img = document.createElement('img'); img.src = 'http://localhost/uploads/missing.png';
    component.imageError({ target: img } as unknown as Event);
    expect(img.src.endsWith('assets/logo.jpg')).toBe(true);
  });
});
