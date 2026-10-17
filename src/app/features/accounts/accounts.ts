import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../data/finance.service';
import { ACCOUNT_TYPE_LABELS } from '../../data/models';
import { formatMinor } from '../../data/money';
import { Brandline } from '../../shared/brandline';
import { ACCOUNT_ICONS, Icon } from '../../shared/icon';

@Component({
  selector: 'app-accounts',
  imports: [RouterLink, Brandline, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts.html',
})
export class Accounts {
  protected readonly finance = inject(FinanceService);
  protected readonly accountIcons = ACCOUNT_ICONS;
  protected readonly typeLabels = ACCOUNT_TYPE_LABELS;

  protected readonly archived = computed(() =>
    (this.finance.accounts() ?? []).filter((a) => a.archived),
  );

  protected readonly format = formatMinor;
}
