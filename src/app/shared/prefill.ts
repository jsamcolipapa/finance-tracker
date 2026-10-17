import { Account, TxnKind } from '../data/models';
import { categoriesFor } from './categories';

/**
 * A new transaction described by a link, so an iOS Shortcut (or anything else) can record one:
 * `/activity/new?type=transfer&amount=5000&account=BDO&to=GCash&note=Rent&save=1`.
 * Accounts and categories match by name, ignoring case. Anything unrecognised is left out.
 */
export interface Prefill {
  kind?: TxnKind;
  amount?: string;
  accountId?: string;
  toAccountId?: string;
  category?: string;
  date?: string;
  note?: string;
  /** Save straight away instead of waiting for the Save button. */
  save: boolean;
}

type Params = { get(key: string): string | null };

const KINDS: TxnKind[] = ['expense', 'income', 'transfer'];

/** Finds an account by id or by name (ignoring case and surrounding spaces). */
export function findAccount(accounts: Account[], ref: string | null | undefined) {
  const key = ref?.trim().toLowerCase();
  if (!key) return undefined;
  const active = accounts.filter((a) => !a.archived);
  return (
    active.find((a) => a.id === ref) ?? active.find((a) => a.name.trim().toLowerCase() === key)
  );
}

export function readPrefill(params: Params, accounts: Account[]): Prefill {
  const text = (key: string) => params.get(key)?.trim() || undefined;
  const type = text('type')?.toLowerCase() as TxnKind | undefined;
  const kind = type && KINDS.includes(type) ? type : undefined;
  const category = text('category')?.toLowerCase();
  const date = text('date');

  return {
    kind,
    // Keep digits, separators and the decimal point, so "PHP 5,000.00" or "₱5,000" both work.
    amount: text('amount')?.replace(/[^\d.,]/g, '') || undefined,
    accountId: findAccount(accounts, text('account'))?.id,
    toAccountId: findAccount(accounts, text('to'))?.id,
    category: category
      ? categoriesFor(kind ?? 'expense').find((c) => c.name.toLowerCase() === category)?.name
      : undefined,
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    note: text('note')?.slice(0, 80),
    save: ['1', 'true', 'yes'].includes(text('save')?.toLowerCase() ?? ''),
  };
}

/** Accepts a full Stillwater link, or just its query string, as copied by a Shortcut. */
export function paramsFromText(text: string): URLSearchParams {
  const s = text.trim();
  try {
    return new URL(s).searchParams;
  } catch {
    return new URLSearchParams(s.slice(s.indexOf('?') + 1));
  }
}
