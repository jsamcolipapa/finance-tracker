import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackupService } from '../../data/backup.service';
import { FinanceService } from '../../data/finance.service';
import { ACCOUNT_TYPE_LABELS } from '../../data/models';
import { formatMinor } from '../../data/money';
import { Brandline } from '../../shared/brandline';
import { daysBetween, longDay, todayIso } from '../../shared/dates';
import { ACCOUNT_ICONS, Icon } from '../../shared/icon';
import { TxnRow } from '../../shared/txn-row';
import { toTxnView } from '../../shared/txn-view';

const BACKUP_REMINDER_DAYS = 14;

@Component({
  selector: 'app-overview',
  imports: [RouterLink, Brandline, Icon, TxnRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.html',
})
export class Overview {
  protected readonly finance = inject(FinanceService);
  private readonly backup = inject(BackupService);

  protected readonly today = longDay(todayIso());
  protected readonly accountIcons = ACCOUNT_ICONS;
  protected readonly typeLabels = ACCOUNT_TYPE_LABELS;

  protected readonly recent = computed(() => {
    const accounts = this.finance.accountsById();
    return (this.finance.transactions() ?? []).slice(0, 3).map((t) => toTxnView(t, accounts));
  });

  /** Remind once there's data worth losing and no backup in the last two weeks. */
  protected readonly needsBackup = computed(() => {
    if ((this.finance.transactions() ?? []).length === 0) return false;
    const last = this.backup.lastBackupAt();
    return !last || daysBetween(last.slice(0, 10), todayIso()) > BACKUP_REMINDER_DAYS;
  });

  protected readonly format = formatMinor;
}
