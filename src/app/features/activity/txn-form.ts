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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FinanceService, ValidationError } from '../../data/finance.service';
import { NewTxn, TxnKind } from '../../data/models';
import { currencySymbol, minorToInput, parseToMinor } from '../../data/money';
import { BackLink } from '../../shared/back-link';
import { categoriesFor } from '../../shared/categories';
import { todayIso } from '../../shared/dates';
import { findAccount, paramsFromText, Prefill, readPrefill } from '../../shared/prefill';
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
  /** `?account=` (an id or a name) to preselect an account (and return to it) when recording. */
  readonly account = input<string>();

  protected readonly finance = inject(FinanceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
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
  /** The `?account=` account's id, since a Shortcut link may name it instead. */
  protected readonly accountRef = computed(
    () => findAccount(this.finance.accounts() ?? [], this.account())?.id,
  );
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
        this.form.patchValue({
          accountId: this.accountRef() ?? this.accountOptions()[0]?.id ?? '',
          category: this.categories()[0] ?? '',
        });
        this.pickDefaultTo();
        this.applyPrefill(
          readPrefill(this.route.snapshot.queryParamMap, this.finance.accounts() ?? []),
        );
      }
    });
  }

  /** Fills the form from a link or pasted text, and saves it if asked to. */
  private applyPrefill(p: Prefill): void {
    if (p.kind) this.setKind(p.kind);
    if (p.accountId) {
      this.form.controls.accountId.setValue(p.accountId);
      this.onFromChange();
    }
    if (p.toAccountId && p.toAccountId !== this.form.controls.accountId.value) {
      this.form.controls.toAccountId.setValue(p.toAccountId);
    }
    const { amount, category, date, note } = p;
    this.form.patchValue({
      ...(amount && { amount }),
      ...(category && { category }),
      ...(date && { date }),
      ...(note && { note }),
    });
    if (p.problem) this.error.set(p.problem);
    else if (p.save) void this.save({ replaceUrl: true });
  }

  /** Reads a Stillwater link a Shortcut copied, for the Home Screen app that links can't open. */
  protected async pasteFromShortcut(): Promise<void> {
    this.error.set('');
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      this.error.set('Could not read the clipboard. Allow pasting and try again.');
      return;
    }
    const params = paramsFromText(text);
    if (!params.get('amount') && !params.get('type')) {
      this.error.set('The clipboard has no Stillwater transaction in it.');
      return;
    }
    this.applyPrefill(readPrefill(params, this.finance.accounts() ?? []));
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

  /** `replaceUrl` keeps an auto-saving link out of history, so going back can't save it twice. */
  protected async save(nav: { replaceUrl?: boolean } = {}): Promise<void> {
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
      const ref = this.accountRef();
      if (this.id()) await this.router.navigate(['/activity', id], nav);
      else if (ref) await this.router.navigate(['/accounts', ref], nav);
      else await this.router.navigate(['/activity'], nav);
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
