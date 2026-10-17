import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { txnEffect } from '../../data/balances';
import { FinanceService } from '../../data/finance.service';
import { ACCOUNT_TYPE_LABELS } from '../../data/models';
import { formatMinor } from '../../data/money';
import { BackLink } from '../../shared/back-link';
import { parseIsoDay } from '../../shared/dates';
import { Icon } from '../../shared/icon';
import { TxnRow } from '../../shared/txn-row';
import { toTxnView } from '../../shared/txn-view';

@Component({
  selector: 'app-account-detail',
  imports: [RouterLink, BackLink, Icon, TxnRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-detail.html',
})
export class AccountDetail {
  readonly id = input.required<string>();

  protected readonly finance = inject(FinanceService);
  protected readonly typeLabels = ACCOUNT_TYPE_LABELS;
  protected readonly format = formatMinor;

  protected readonly account = computed(() => this.finance.accountsById().get(this.id()));
  protected readonly balance = computed(() => this.finance.balances().get(this.id()) ?? 0);
  protected readonly trackingSince = computed(() => {
    const a = this.account();
    return a
      ? parseIsoDay(a.balanceDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
      : '';
  });

  protected readonly recent = computed(() => {
    const id = this.id();
    const accounts = this.finance.accountsById();
    return (this.finance.transactions() ?? [])
      .filter((t) => txnEffect(t, id) !== 0)
      .slice(0, 5)
      .map((t) => toTxnView(t, accounts, id));
  });
}
