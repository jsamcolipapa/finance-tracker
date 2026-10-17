import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStatus } from './app-status.service';

@Component({
  selector: 'app-brandline',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="brand" routerLink="/">
      <span class="mark">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M3.5 12a8.5 8.5 0 0 0 17 0z" fill="currentColor" />
        </svg>
      </span>
      stillwater
    </a>
    <span class="status" [class.offline]="!status.online()">
      <span class="dot"></span>{{ status.label() }}
    </span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 28px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: -0.04em;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: var(--deep);
      color: var(--deep-text);
    }
    .status {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
    }
    .offline .dot {
      background: var(--warn);
    }
  `,
})
export class Brandline {
  protected readonly status = inject(AppStatus);
}
