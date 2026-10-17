import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../data/finance.service';
import { Brandline } from '../../shared/brandline';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-welcome',
  imports: [RouterLink, Brandline, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class Welcome {
  private readonly finance = inject(FinanceService);
  protected readonly returning = computed(() => (this.finance.accounts() ?? []).length > 0);

  protected readonly steps = [
    { title: 'Add your accounts', text: 'Start with the amount available today.' },
    { title: 'Record money moving', text: 'Expenses, income, and transfers.' },
    { title: 'Keep a backup', text: 'Export your records when you need to.' },
  ];
}
