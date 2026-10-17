import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Connectivity, offline-readiness (service worker) and pending app updates. */
@Injectable({ providedIn: 'root' })
export class AppStatus {
  private readonly swUpdate = inject(SwUpdate);
  readonly online = signal(navigator.onLine);
  readonly offlineReady = signal(false);
  readonly updateReady = signal(false);

  readonly label = computed(() => {
    if (!this.online()) return 'Offline · saved on device';
    return this.offlineReady() ? 'Offline ready' : 'Saved on device';
  });

  constructor() {
    const setOnline = () => this.online.set(navigator.onLine);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOnline);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOnline);
    });

    if (this.swUpdate.isEnabled) {
      navigator.serviceWorker.ready.then(() => this.offlineReady.set(true));
      this.swUpdate.versionUpdates
        .pipe(filter((e) => e.type === 'VERSION_READY'))
        .subscribe(() => this.updateReady.set(true));
      this.swUpdate.unrecoverable.subscribe(() => location.reload());
    }
  }
}
