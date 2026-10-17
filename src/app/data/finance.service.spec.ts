import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { computeBalances } from './balances';
import { DB, StillwaterDb } from './db';
import { FinanceService, ValidationError } from './finance.service';
import { NewAccount } from './models';

const usd = (name: string, startingBalanceMinor: number): NewAccount => ({
  name,
  type: 'checking',
  currency: 'USD',
  startingBalanceMinor,
  balanceDate: '2026-10-01',
});

describe('FinanceService', () => {
  let db: StillwaterDb;
  let finance: FinanceService;

  beforeEach(() => {
    db = new StillwaterDb(`test-${crypto.randomUUID()}`, { indexedDB, IDBKeyRange });
    TestBed.configureTestingModule({ providers: [{ provide: DB, useValue: db }] });
    finance = TestBed.inject(FinanceService);
  });

  afterEach(() => db.delete());

  const balances = async () =>
    computeBalances(await db.accounts.toArray(), await db.transactions.toArray());

  it('updates both accounts after a transfer', async () => {
    const checking = await finance.addAccount(usd('Checking', 2140_50));
    const savings = await finance.addAccount(usd('Savings', 6000_00));
    await finance.saveTransaction({
      kind: 'transfer',
      accountId: checking,
      toAccountId: savings,
      amountMinor: 300_00,
      date: '2026-10-15',
    });
    const b = await balances();
    expect(b.get(checking)).toBe(1840_50);
    expect(b.get(savings)).toBe(6300_00);
    expect(await db.transactions.count()).toBe(1);
  });

  it('writes nothing when a transfer target is missing', async () => {
    const checking = await finance.addAccount(usd('Checking', 100_00));
    await expect(
      finance.saveTransaction({
        kind: 'transfer',
        accountId: checking,
        toAccountId: 'nope',
        amountMinor: 10_00,
        date: '2026-10-15',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await db.transactions.count()).toBe(0);
  });

  it('requires the received amount for cross-currency transfers', async () => {
    const usdId = await finance.addAccount(usd('Checking', 100_00));
    const php = await finance.addAccount({ ...usd('Wallet', 0), currency: 'PHP' });
    const transfer = {
      kind: 'transfer' as const,
      accountId: usdId,
      toAccountId: php,
      amountMinor: 10_00,
      date: '2026-10-15',
    };
    await expect(finance.saveTransaction(transfer)).rejects.toThrow(/PHP/);
    await finance.saveTransaction({ ...transfer, toAmountMinor: 580_00 });
    expect((await balances()).get(php)).toBe(580_00);
  });

  it('rejects zero, negative and fractional amounts', async () => {
    const a = await finance.addAccount(usd('A', 0));
    for (const amountMinor of [0, -5, 1.5]) {
      await expect(
        finance.saveTransaction({ kind: 'expense', accountId: a, amountMinor, date: '2026-10-15' }),
      ).rejects.toBeInstanceOf(ValidationError);
    }
  });

  it('edits a transaction in place', async () => {
    const a = await finance.addAccount(usd('A', 100_00));
    const id = await finance.saveTransaction({
      kind: 'expense',
      accountId: a,
      amountMinor: 10_00,
      date: '2026-10-15',
      category: 'Transport',
    });
    await finance.saveTransaction(
      { kind: 'expense', accountId: a, amountMinor: 25_00, date: '2026-10-15' },
      id,
    );
    expect(await db.transactions.count()).toBe(1);
    expect((await balances()).get(a)).toBe(75_00);
  });

  it('locks currency and blocks deletion once an account has transactions', async () => {
    const a = await finance.addAccount(usd('A', 0));
    await finance.saveTransaction({
      kind: 'income',
      accountId: a,
      amountMinor: 1,
      date: '2026-10-15',
    });
    await expect(finance.updateAccount(a, { ...usd('A', 0), currency: 'EUR' })).rejects.toThrow(
      /Currency/,
    );
    await expect(finance.deleteAccount(a)).rejects.toBeInstanceOf(ValidationError);
    await finance.updateAccount(a, usd('Renamed', 5_00));
    expect((await db.accounts.get(a))?.name).toBe('Renamed');
  });
});
