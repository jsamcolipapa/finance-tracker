import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { computeBalances, totalsByCurrency } from './balances';
import { DB, newId } from './db';
import { Account, NewAccount, NewTxn, Txn } from './models';

export class ValidationError extends Error {}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly db = inject(DB);

  /** `undefined` until the first IndexedDB read completes. */
  readonly accounts = toSignal(
    from(liveQuery(() => this.db.accounts.orderBy('createdAt').toArray())),
  );
  /** Newest first. */
  readonly transactions = toSignal(
    from(
      liveQuery(async () => {
        const txns = await this.db.transactions.orderBy('date').reverse().toArray();
        // Same-day entries: most recently created first.
        return txns.sort(
          (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
        );
      }),
    ),
  );

  readonly loaded = computed(
    () => this.accounts() !== undefined && this.transactions() !== undefined,
  );
  readonly activeAccounts = computed(() => (this.accounts() ?? []).filter((a) => !a.archived));
  readonly accountsById = computed(() => new Map((this.accounts() ?? []).map((a) => [a.id, a])));
  readonly balances = computed(() =>
    computeBalances(this.accounts() ?? [], this.transactions() ?? []),
  );
  readonly totals = computed(() => totalsByCurrency(this.accounts() ?? [], this.balances()));

  async addAccount(input: NewAccount): Promise<string> {
    const account: Account = { ...this.cleanAccount(input), id: newId(), createdAt: nowIso() };
    await this.db.accounts.add(account);
    requestPersistentStorage();
    return account.id;
  }

  async updateAccount(id: string, input: NewAccount): Promise<void> {
    await this.db.transaction('rw', this.db.accounts, this.db.transactions, async () => {
      const existing = await this.db.accounts.get(id);
      if (!existing) throw new ValidationError('That account no longer exists.');
      const clean = this.cleanAccount(input);
      if (clean.currency !== existing.currency && (await this.txnCount(id)) > 0) {
        throw new ValidationError("Currency can't change once an account has transactions.");
      }
      await this.db.accounts.put({ ...existing, ...clean });
    });
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.db.accounts.update(id, { archived });
  }

  /** Only accounts without transactions can be deleted; others should be archived. */
  async deleteAccount(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.accounts, this.db.transactions, async () => {
      if ((await this.txnCount(id)) > 0) {
        throw new ValidationError('Archive this account instead — it has transactions.');
      }
      await this.db.accounts.delete(id);
    });
  }

  async txnCount(accountId: string): Promise<number> {
    const [out, inbound] = await Promise.all([
      this.db.transactions.where('accountId').equals(accountId).count(),
      this.db.transactions.where('toAccountId').equals(accountId).count(),
    ]);
    return out + inbound;
  }

  /**
   * Saves an income, expense or transfer. A transfer is one record that debits the
   * source and credits the destination, validated and written in a single DB transaction.
   */
  async saveTransaction(input: NewTxn, id?: string): Promise<string> {
    return this.db.transaction('rw', this.db.accounts, this.db.transactions, async () => {
      const txn = await this.validateTxn(input);
      if (id) {
        const existing = await this.db.transactions.get(id);
        if (!existing) throw new ValidationError('That transaction no longer exists.');
        await this.db.transactions.put({ ...txn, id, createdAt: existing.createdAt });
        return id;
      }
      const newTxn: Txn = { ...txn, id: newId(), createdAt: nowIso() };
      await this.db.transactions.add(newTxn);
      return newTxn.id;
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.db.transactions.delete(id);
  }

  private cleanAccount(input: NewAccount): NewAccount {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Give the account a name.');
    if (!Number.isSafeInteger(input.startingBalanceMinor)) {
      throw new ValidationError('Enter a valid starting balance.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.balanceDate)) {
      throw new ValidationError('Enter the date of the starting balance.');
    }
    return { ...input, name };
  }

  private async validateTxn(input: NewTxn): Promise<NewTxn> {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new ValidationError('Enter an amount greater than zero.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new ValidationError('Pick a date.');
    const account = await this.db.accounts.get(input.accountId);
    if (!account) throw new ValidationError('Choose an account.');

    const txn: NewTxn = {
      kind: input.kind,
      accountId: input.accountId,
      amountMinor: input.amountMinor,
      date: input.date,
    };
    const note = input.note?.trim();
    if (note) txn.note = note;

    if (input.kind !== 'transfer') {
      const category = input.category?.trim();
      if (category) txn.category = category;
      return txn;
    }

    if (!input.toAccountId || input.toAccountId === input.accountId) {
      throw new ValidationError('Choose a different account to transfer to.');
    }
    const to = await this.db.accounts.get(input.toAccountId);
    if (!to) throw new ValidationError('The destination account no longer exists.');
    txn.toAccountId = to.id;
    if (to.currency !== account.currency) {
      const received = input.toAmountMinor;
      if (received === undefined || !Number.isSafeInteger(received) || received <= 0) {
        throw new ValidationError(`Enter the amount received in ${to.currency}.`);
      }
      txn.toAmountMinor = received;
    }
    return txn;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Ask the browser not to evict our data under storage pressure. Best effort. */
function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {});
}
