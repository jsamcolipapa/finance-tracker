import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';

/** "‹ Back" to an explicit parent route (history can be empty in a Home Screen app). */
@Component({
  selector: 'app-back-link',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a [routerLink]="to()"><app-icon name="chevron-left" [size]="16" />Back</a>`,
  styles: `
    :host {
      display: block;
      margin-bottom: 24px;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 32px;
      color: var(--muted);
      font-size: 13px;
    }
  `,
})
export class BackLink {
  readonly to = input.required<string | unknown[]>();
}
