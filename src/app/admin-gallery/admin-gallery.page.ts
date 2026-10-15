import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { ApiService, GalleryItem } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { serviceImage } from '../core/catalog';
import { optimizedImageData } from '../core/image-upload';
import { SiteHeaderComponent } from '../shared/site-header.component';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-admin-gallery', standalone: true,
  imports: [CommonModule, FormsModule, IonButton, RouterLink, SiteHeaderComponent],
  templateUrl: './admin-gallery.page.html',
  styleUrls: ['../dashboard/dashboard.page.scss', './admin-gallery.page.scss']
})
export class AdminGalleryPage implements OnInit {
  items: GalleryItem[] = [];
  model = { title: '', caption: '', imageData: '', imageName: '' };
  preview = '';
  loading = true; busy = false; deletingId = 0; error = ''; message = '';

  constructor(public auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    if (this.auth.user?.type !== 'admin') { this.router.navigateByUrl('/login'); return; }
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.gallery().subscribe({
      next: data => { this.items = Array.isArray(data) ? data : []; this.loading = false; },
      error: err => { this.error = err.message; this.loading = false; }
    });
  }

  /** Returns an error message for an unacceptable file, or '' when it can be uploaded. */
  fileProblem(file: { type: string; size: number }): string {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Select a JPG, PNG or WebP image.';
    if (file.size > MAX_IMAGE_BYTES) return 'The image must be smaller than 5 MB.';
    return '';
  }

  async selectImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.error = '';
    if (!file) return;
    const problem = this.fileProblem(file);
    if (problem) { this.error = problem; input.value = ''; this.preview = ''; this.model.imageData = ''; return; }
    try {
      this.preview = await optimizedImageData(file);
      this.model.imageData = this.preview;
      this.model.imageName = file.name;
    } catch (error) { this.error = (error as Error).message; }
  }

  upload(): void {
    if (this.busy) return;
    this.error = ''; this.message = '';
    if (!this.model.title.trim()) { this.error = 'Please enter a title for the image.'; return; }
    if (!this.model.imageData) { this.error = 'Please choose an image to upload.'; return; }
    this.busy = true;
    this.api.addGalleryImage({ ...this.model, title: this.model.title.trim(), caption: this.model.caption.trim() }).subscribe({
      next: response => {
        this.busy = false;
        if (!response?.success) { this.error = response?.message || 'Upload failed.'; return; }
        this.message = response.message || 'Gallery image uploaded.';
        this.model = { title: '', caption: '', imageData: '', imageName: '' };
        this.preview = '';
        this.load();
      },
      error: err => { this.busy = false; this.error = err.message; }
    });
  }

  remove(item: GalleryItem): void {
    if (this.deletingId || !confirm(`Delete "${item.Title}" from the gallery?`)) return;
    this.deletingId = Number(item.GalleryID);
    this.api.deleteGalleryImage(Number(item.GalleryID)).subscribe({
      next: r => { this.deletingId = 0; this.message = r.message || 'Gallery image deleted.'; this.load(); },
      error: e => { this.deletingId = 0; this.error = e.message; }
    });
  }

  imageUrl(path?: string): string { return serviceImage(path); }
  imageError(event: Event): void { (event.target as HTMLImageElement).src = 'assets/logo.jpg'; }
  logout(): void { this.auth.logout(); this.router.navigateByUrl('/home'); }
}
