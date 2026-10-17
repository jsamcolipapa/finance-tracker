import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppStatus } from './shared/app-status.service';
import { Icon } from './shared/icon';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly status = inject(AppStatus);
  private readonly router = inject(Router);

  /** The welcome screen is full-bleed, without navigation. */
  protected readonly showTabs = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => !e.urlAfterRedirects.startsWith('/welcome')),
    ),
    { initialValue: false },
  );

  protected reload(): void {
    location.reload();
  }
}
