import { countsFor } from '../data/balances';
import { Account, Txn } from '../data/models';
import { formatMinor } from '../data/money';
import { txnIcon } from './categories';
import { relativeDay } from './dates';
import { IconName } from './icon';

export interface TxnView {
  txn: Txn;
  icon: IconName;
  title: string;
  meta: string;
  amount: string;
  tone: 'positive' | 'negative';
  /** True if dated before its account's starting balance, so it isn't counted. */
  uncounted: boolean;
}

export const KIND_LABELS = { income: 'Income', expense: 'Expense', transfer: 'Transfer' } as const;

/**
 * Display data for a transaction row. Transfers are shown from the source account's
 * side (money out), unless `perspective` is the receiving account.
 */
export function toTxnView(txn: Txn, accounts: Map<string, Account>, perspective?: string): TxnView {
  const from = accounts.get(txn.accountId);
  const to = txn.toAccountId ? accounts.get(txn.toAccountId) : undefined;
  const day = relativeDay(txn.date);
  const base = { txn, icon: txnIcon(txn.kind, txn.category) };

  if (txn.kind === 'transfer') {
    const incoming = perspective !== undefined && perspective === txn.toAccountId;
    const amount = incoming
      ? formatMinor(txn.toAmountMinor ?? txn.amountMinor, to?.currency ?? from?.currency ?? 'USD', {
          signed: true,
        })
      : formatMinor(-txn.amountMinor, from?.currency ?? 'USD', { signed: true });
    return {
      ...base,
      title: txn.note || (incoming ? `From ${nameOf(from)}` : `To ${nameOf(to)}`),
      meta: `${incoming ? nameOf(to) : nameOf(from)} · ${day}`,
      amount,
      tone: incoming ? 'positive' : 'negative',
      uncounted: (!!from && !countsFor(txn, from)) || (!!to && !countsFor(txn, to)),
    };
  }

  const sign = txn.kind === 'income' ? 1 : -1;
  return {
    ...base,
    title: txn.note || txn.category || KIND_LABELS[txn.kind],
    meta: `${nameOf(from)} · ${day}`,
    amount: formatMinor(sign * txn.amountMinor, from?.currency ?? 'USD', { signed: true }),
    tone: txn.kind === 'income' ? 'positive' : 'negative',
    uncounted: !!from && !countsFor(txn, from),
  };
}

function nameOf(account: Account | undefined): string {
  return account?.name ?? 'deleted account';
}
