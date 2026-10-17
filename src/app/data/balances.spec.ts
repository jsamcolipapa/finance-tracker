import { computeBalances, totalsByCurrency } from './balances';
import { Account, Txn } from './models';

const account = (id: string, over: Partial<Account> = {}): Account => ({
  id,
  name: id,
  type: 'checking',
  currency: 'USD',
  startingBalanceMinor: 100_00,
  balanceDate: '2026-10-01',
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
});

const txn = (over: Partial<Txn>): Txn => ({
  id: crypto.randomUUID(),
  kind: 'expense',
  accountId: 'a',
  amountMinor: 10_00,
  date: '2026-10-10',
  createdAt: '2026-10-10T00:00:00Z',
  ...over,
});

describe('balances', () => {
  it('applies income and expenses to the starting balance', () => {
    const balances = computeBalances(
      [account('a')],
      [txn({ kind: 'income', amountMinor: 50_00 }), txn({ kind: 'expense', amountMinor: 20_00 })],
    );
    expect(balances.get('a')).toBe(130_00);
  });

  it('moves money between both accounts on a transfer', () => {
    const balances = computeBalances(
      [account('a'), account('b', { startingBalanceMinor: 0 })],
      [txn({ kind: 'transfer', accountId: 'a', toAccountId: 'b', amountMinor: 30_00 })],
    );
    expect(balances.get('a')).toBe(70_00);
    expect(balances.get('b')).toBe(30_00);
  });

  it('credits the received amount on a cross-currency transfer', () => {
    const balances = computeBalances(
      [account('a'), account('p', { currency: 'PHP', startingBalanceMinor: 0 })],
      [
        txn({
          kind: 'transfer',
          accountId: 'a',
          toAccountId: 'p',
          amountMinor: 10_00,
          toAmountMinor: 580_00,
        }),
      ],
    );
    expect(balances.get('a')).toBe(90_00);
    expect(balances.get('p')).toBe(580_00);
  });

  it('ignores transactions dated before the starting balance', () => {
    const balances = computeBalances([account('a')], [txn({ date: '2026-09-30' })]);
    expect(balances.get('a')).toBe(100_00);
  });

  it('keeps totals separate per currency and skips archived accounts', () => {
    const accounts = [
      account('a'),
      account('b', { startingBalanceMinor: 50_00 }),
      account('p', { currency: 'PHP', startingBalanceMinor: 1000_00 }),
      account('old', { archived: true }),
    ];
    const totals = totalsByCurrency(accounts, computeBalances(accounts, []));
    expect(totals).toEqual([
      { currency: 'USD', totalMinor: 150_00, accountCount: 2 },
      { currency: 'PHP', totalMinor: 1000_00, accountCount: 1 },
    ]);
  });
});
