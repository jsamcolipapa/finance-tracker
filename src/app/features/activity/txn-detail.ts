import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../data/finance.service';
import { formatMinor } from '../../data/money';
import { BackLink } from '../../shared/back-link';
import { parseIsoDay } from '../../shared/dates';
import { Icon } from '../../shared/icon';
import { KIND_LABELS, toTxnView } from '../../shared/txn-view';

@Component({
  selector: 'app-txn-detail',
  imports: [RouterLink, BackLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './txn-detail.html',
})
export class TxnDetail {
  readonly id = input.required<string>();

  protected readonly finance = inject(FinanceService);
  protected readonly kindLabels = KIND_LABELS;

  protected readonly txn = computed(() =>
    (this.finance.transactions() ?? []).find((t) => t.id === this.id()),
  );
  protected readonly view = computed(() => {
    const txn = this.txn();
    return txn ? toTxnView(txn, this.finance.accountsById()) : undefined;
  });
  protected readonly from = computed(() =>
    this.finance.accountsById().get(this.txn()?.accountId ?? ''),
  );
  protected readonly to = computed(() =>
    this.finance.accountsById().get(this.txn()?.toAccountId ?? ''),
  );

  protected readonly eyebrow = computed(() => {
    const txn = this.txn();
    if (!txn) return '';
    const date = parseIsoDay(txn.date)
      .toLocaleDateString(undefined, { dateStyle: 'medium' })
      .toUpperCase();
    return `${KIND_LABELS[txn.kind].toUpperCase()} · ${date}`;
  });
  protected readonly longDate = computed(() => {
    const txn = this.txn();
    return txn ? parseIsoDay(txn.date).toLocaleDateString(undefined, { dateStyle: 'long' }) : '';
  });
  /** For a cross-currency transfer, what arrived in the destination account. */
  protected readonly received = computed(() => {
    const txn = this.txn();
    const to = this.to();
    return txn?.toAmountMinor !== undefined && to
      ? formatMinor(txn.toAmountMinor, to.currency)
      : undefined;
  });
}
