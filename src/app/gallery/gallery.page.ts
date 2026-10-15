import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular';
import { ApiService, GalleryItem } from '../core/api.service';
import { SiteHeaderComponent } from '../shared/site-header.component';
import { SiteFooterComponent } from '../shared/site-footer.component';
import { serviceImage } from '../core/catalog';

@Component({
  selector: 'app-gallery',
  standalone: true,
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.scss'],
  imports: [CommonModule, IonContent, SiteHeaderComponent, SiteFooterComponent]
})
export class GalleryPage implements OnInit {
  items: GalleryItem[] = [];
  loading = true;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.gallery().subscribe({
      next: data => { this.items = Array.isArray(data) ? data : []; this.loading = false; },
      error: err => { this.error = err.message; this.loading = false; }
    });
  }

  imageUrl(path?: string): string { return serviceImage(path); }

  /** A missing or broken image falls back to the logo instead of a broken-image icon. */
  imageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.endsWith('assets/logo.jpg')) img.src = 'assets/logo.jpg';
  }
}
