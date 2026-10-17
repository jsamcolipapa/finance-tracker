import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService, ValidationError } from '../../data/finance.service';
import { ACCOUNT_TYPES, AccountType } from '../../data/models';
import { CURRENCIES, currencySymbol, minorToInput, parseToMinor } from '../../data/money';
import { BackLink } from '../../shared/back-link';
import { todayIso } from '../../shared/dates';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, BackLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-form.html',
})
export class AccountForm {
  /** Route param; absent when adding a new account. */
  readonly id = input<string>();

  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);
  protected readonly types = ACCOUNT_TYPES;
  protected readonly currencies = CURRENCIES;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    type: ['checking' as AccountType],
    currency: ['USD'],
    startingBalance: ['', Validators.required],
    balanceDate: [todayIso(), Validators.required],
  });

  private readonly currency = toSignal(this.form.controls.currency.valueChanges, {
    initialValue: this.form.controls.currency.value,
  });
  protected readonly symbol = computed(() => currencySymbol(this.currency()));
  protected readonly account = computed(() => {
    const id = this.id();
    return id ? this.finance.accountsById().get(id) : undefined;
  });
  protected readonly notFound = computed(
    () => !!this.id() && this.finance.loaded() && !this.account(),
  );
  protected readonly hasTxns = signal(false);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  private populated = false;

  constructor() {
    effect(() => {
      if (this.populated || !this.finance.loaded()) return;
      const account = this.account();
      if (account) {
        this.populated = true;
        this.form.reset({
          name: account.name,
          type: account.type,
          currency: account.currency,
          startingBalance: minorToInput(account.startingBalanceMinor, account.currency),
          balanceDate: account.balanceDate,
        });
        this.finance.txnCount(account.id).then((n) => this.hasTxns.set(n > 0));
      } else if (!this.id()) {
        this.populated = true;
        // Default new accounts to the currency already used most.
        const top = this.finance.totals()[0]?.currency;
        if (top) this.form.controls.currency.setValue(top);
      }
    });
  }

  protected async save(): Promise<void> {
    this.error.set('');
    const v = this.form.getRawValue();
    const startingBalanceMinor = parseToMinor(v.startingBalance, v.currency);
    if (!v.name.trim()) {
      this.error.set('Give the account a name.');
      return;
    }
    if (startingBalanceMinor === null) {
      this.error.set(`Enter the starting balance, like ${minorToInput(125000, v.currency)}.`);
      return;
    }
    if (!v.balanceDate) {
      this.error.set('Enter the date of the starting balance.');
      return;
    }
    const input = {
      name: v.name,
      type: v.type,
      currency: v.currency,
      startingBalanceMinor,
      balanceDate: v.balanceDate,
      archived: this.account()?.archived,
    };
    this.saving.set(true);
    try {
      const id = this.id();
      if (id) {
        await this.finance.updateAccount(id, input);
        await this.router.navigate(['/accounts', id]);
      } else {
        await this.finance.addAccount(input);
        await this.router.navigate(['/accounts']);
      }
    } catch (err) {
      this.error.set(err instanceof ValidationError ? err.message : 'Could not save the account.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleArchived(): Promise<void> {
    const account = this.account();
    if (!account) return;
    await this.finance.setArchived(account.id, !account.archived);
    await this.router.navigate(['/accounts']);
  }

  protected async remove(): Promise<void> {
    const account = this.account();
    if (!account || !confirm(`Delete "${account.name}"? This can't be undone.`)) return;
    try {
      await this.finance.deleteAccount(account.id);
      await this.router.navigate(['/accounts']);
    } catch (err) {
      this.error.set(
        err instanceof ValidationError ? err.message : 'Could not delete the account.',
      );
    }
  }
}
