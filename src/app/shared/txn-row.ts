import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';
import { TxnView } from './txn-view';

@Component({
  selector: 'app-txn-row',
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <a class="row" [routerLink]="['/activity', view().txn.id]">
      <span class="row-icon"><app-icon [name]="view().icon" [size]="17" /></span>
      <span class="row-copy">
        <strong>{{ view().title }}</strong>
        <small>
          @if (view().uncounted) {
            <span class="tag" title="Dated before the account's starting balance">not counted</span>
          }
          {{ view().meta }}
        </small>
      </span>
      <span class="row-amount" [class]="view().tone">{{ view().amount }}</span>
    </a>
  `,
})
export class TxnRow {
  readonly view = input.required<TxnView>();
}
