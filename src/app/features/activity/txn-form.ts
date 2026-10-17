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
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FinanceService, ValidationError } from '../../data/finance.service';
import { NewTxn, TxnKind } from '../../data/models';
import { currencySymbol, minorToInput, parseToMinor } from '../../data/money';
import { BackLink } from '../../shared/back-link';
import { categoriesFor } from '../../shared/categories';
import { todayIso } from '../../shared/dates';
import { KIND_LABELS } from '../../shared/txn-view';

@Component({
  selector: 'app-txn-form',
  imports: [ReactiveFormsModule, RouterLink, BackLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './txn-form.html',
})
export class TxnForm {
  /** Route param when editing. */
  readonly id = input<string>();
  /** `?account=` to preselect an account (and return to it) when recording. */
  readonly account = input<string>();

  protected readonly finance = inject(FinanceService);
  private readonly router = inject(Router);
  protected readonly kinds: TxnKind[] = ['expense', 'income', 'transfer'];
  protected readonly kindLabels = KIND_LABELS;

  protected readonly kind = signal<TxnKind>('expense');
  protected readonly form = inject(NonNullableFormBuilder).group({
    amount: [''],
    accountId: [''],
    toAccountId: [''],
    toAmount: [''],
    category: [''],
    date: [todayIso()],
    note: [''],
  });
  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly existing = computed(() => {
    const id = this.id();
    return id ? (this.finance.transactions() ?? []).find((t) => t.id === id) : undefined;
  });
  protected readonly notFound = computed(
    () => !!this.id() && this.finance.loaded() && !this.existing(),
  );

  /** Active accounts, plus the one already on this transaction if it's since been archived. */
  protected readonly accountOptions = computed(() => {
    const keep = new Set([this.existing()?.accountId, this.existing()?.toAccountId]);
    return (this.finance.accounts() ?? []).filter((a) => !a.archived || keep.has(a.id));
  });
  protected readonly toOptions = computed(() =>
    this.accountOptions().filter((a) => a.id !== this.value().accountId),
  );
  protected readonly from = computed(() =>
    this.finance.accountsById().get(this.value().accountId ?? ''),
  );
  protected readonly to = computed(() =>
    this.finance.accountsById().get(this.value().toAccountId ?? ''),
  );
  protected readonly crossCurrency = computed(
    () =>
      this.kind() === 'transfer' &&
      !!this.from() &&
      !!this.to() &&
      this.from()!.currency !== this.to()!.currency,
  );
  protected readonly categories = computed(() => {
    const options = categoriesFor(this.kind()).map((c) => c.name);
    const current = this.existing()?.category;
    return current && !options.includes(current) ? [current, ...options] : options;
  });
  protected readonly symbol = (currency?: string) => (currency ? currencySymbol(currency) : '');

  protected readonly error = signal('');
  protected readonly saving = signal(false);
  private populated = false;

  constructor() {
    effect(() => {
      if (this.populated || !this.finance.loaded()) return;
      const txn = this.existing();
      if (this.id() && !txn) return;
      this.populated = true;
      if (txn) {
        const from = this.finance.accountsById().get(txn.accountId);
        const to = txn.toAccountId ? this.finance.accountsById().get(txn.toAccountId) : undefined;
        this.kind.set(txn.kind);
        this.form.reset({
          amount: from ? minorToInput(txn.amountMinor, from.currency) : '',
          accountId: txn.accountId,
          toAccountId: txn.toAccountId ?? '',
          toAmount:
            to && txn.toAmountMinor !== undefined
              ? minorToInput(txn.toAmountMinor, to.currency)
              : '',
          category: txn.category ?? '',
          date: txn.date,
          note: txn.note ?? '',
        });
      } else {
        const options = this.accountOptions();
        const preselected = options.find((a) => a.id === this.account()) ?? options[0];
        this.form.patchValue({
          accountId: preselected?.id ?? '',
          category: this.categories()[0] ?? '',
        });
        this.pickDefaultTo();
      }
    });
  }

  protected setKind(kind: TxnKind): void {
    this.kind.set(kind);
    this.form.controls.category.setValue(this.categories()[0] ?? '');
    if (kind === 'transfer') this.pickDefaultTo();
    this.error.set('');
  }

  protected onFromChange(): void {
    if (this.value().toAccountId === this.value().accountId) {
      this.form.controls.toAccountId.setValue('');
    }
    this.pickDefaultTo();
  }

  private pickDefaultTo(): void {
    if (!this.form.controls.toAccountId.value) {
      this.form.controls.toAccountId.setValue(this.toOptions()[0]?.id ?? '');
    }
  }

  protected async save(): Promise<void> {
    this.error.set('');
    const v = this.form.getRawValue();
    const from = this.from();
    if (!from) {
      this.error.set('Choose an account.');
      return;
    }
    const amountMinor = parseToMinor(v.amount, from.currency);
    if (amountMinor === null || amountMinor <= 0) {
      this.error.set(
        `Enter an amount greater than zero, like ${minorToInput(1250, from.currency)}.`,
      );
      return;
    }
    const txn: NewTxn = {
      kind: this.kind(),
      accountId: from.id,
      amountMinor,
      date: v.date,
      note: v.note,
    };
    if (txn.kind === 'transfer') {
      txn.toAccountId = v.toAccountId;
      if (this.crossCurrency()) {
        const received = parseToMinor(v.toAmount, this.to()!.currency);
        if (received === null || received <= 0) {
          this.error.set(`Enter the amount received in ${this.to()!.currency}.`);
          return;
        }
        txn.toAmountMinor = received;
      }
    } else {
      txn.category = v.category;
    }

    this.saving.set(true);
    try {
      const id = await this.finance.saveTransaction(txn, this.id());
      if (this.id()) await this.router.navigate(['/activity', id]);
      else if (this.account()) await this.router.navigate(['/accounts', this.account()]);
      else await this.router.navigate(['/activity']);
    } catch (err) {
      this.error.set(err instanceof ValidationError ? err.message : 'Could not save.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const id = this.id();
    if (!id || !confirm("Delete this transaction? This can't be undone.")) return;
    await this.finance.deleteTransaction(id);
    await this.router.navigate(['/activity']);
  }
}
