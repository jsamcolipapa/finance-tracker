import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { txnEffect } from '../../data/balances';
import { FinanceService } from '../../data/finance.service';
import { TxnKind } from '../../data/models';
import { Brandline } from '../../shared/brandline';
import { parseIsoDay } from '../../shared/dates';
import { Icon } from '../../shared/icon';
import { TxnRow } from '../../shared/txn-row';
import { toTxnView, TxnView } from '../../shared/txn-view';

const FILTERS: { label: string; kind?: TxnKind }[] = [
  { label: 'All' },
  { label: 'Income', kind: 'income' },
  { label: 'Expenses', kind: 'expense' },
  { label: 'Transfers', kind: 'transfer' },
];

@Component({
  selector: 'app-activity',
  imports: [RouterLink, Brandline, Icon, TxnRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity.html',
})
export class Activity {
  /** Optional `?account=` query param to show one account's activity. */
  readonly account = input<string>();

  protected readonly finance = inject(FinanceService);
  protected readonly filters = FILTERS;
  protected readonly filter = signal(FILTERS[0]);

  protected readonly accountName = computed(() => {
    const id = this.account();
    return id ? this.finance.accountsById().get(id)?.name : undefined;
  });

  /** Filtered transactions grouped by month, newest first. */
  protected readonly months = computed(() => {
    const accountId = this.account();
    const kind = this.filter().kind;
    const accounts = this.finance.accountsById();
    const groups: { label: string; views: TxnView[] }[] = [];
    for (const txn of this.finance.transactions() ?? []) {
      if (kind && txn.kind !== kind) continue;
      if (accountId && txnEffect(txn, accountId) === 0) continue;
      const label = parseIsoDay(txn.date).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
      if (groups.at(-1)?.label !== label) groups.push({ label, views: [] });
      groups.at(-1)!.views.push(toTxnView(txn, accounts, accountId));
    }
    return groups;
  });
}
