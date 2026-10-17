import { Account, Txn } from './models';

/** Signed effect of a transaction on one account, or 0 if it doesn't touch it. */
export function txnEffect(txn: Txn, accountId: string): number {
  if (txn.kind === 'income' && txn.accountId === accountId) return txn.amountMinor;
  if (txn.kind === 'expense' && txn.accountId === accountId) return -txn.amountMinor;
  if (txn.kind === 'transfer') {
    if (txn.accountId === accountId) return -txn.amountMinor;
    if (txn.toAccountId === accountId) return txn.toAmountMinor ?? txn.amountMinor;
  }
  return 0;
}

/** Whether a transaction falls on or after the account's starting-balance date. */
export function countsFor(txn: Txn, account: Account): boolean {
  return txn.date >= account.balanceDate;
}

export function computeBalances(accounts: Account[], txns: Txn[]): Map<string, number> {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const balances = new Map(accounts.map((a) => [a.id, a.startingBalanceMinor]));
  const apply = (accountId: string | undefined, txn: Txn) => {
    const account = accountId ? byId.get(accountId) : undefined;
    if (!account || !countsFor(txn, account)) return;
    balances.set(account.id, balances.get(account.id)! + txnEffect(txn, account.id));
  };
  for (const txn of txns) {
    apply(txn.accountId, txn);
    if (txn.kind === 'transfer') apply(txn.toAccountId, txn);
  }
  return balances;
}

export interface CurrencyTotal {
  currency: string;
  totalMinor: number;
  accountCount: number;
}

/** Totals for active accounts, one entry per currency — never summed across currencies. */
export function totalsByCurrency(
  accounts: Account[],
  balances: Map<string, number>,
): CurrencyTotal[] {
  const totals = new Map<string, CurrencyTotal>();
  for (const account of accounts) {
    if (account.archived) continue;
    const t = totals.get(account.currency) ?? {
      currency: account.currency,
      totalMinor: 0,
      accountCount: 0,
    };
    t.totalMinor += balances.get(account.id) ?? 0;
    t.accountCount++;
    totals.set(account.currency, t);
  }
  return [...totals.values()].sort((a, b) => b.accountCount - a.accountCount);
}
