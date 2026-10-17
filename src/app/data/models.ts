/** Amounts are always stored as integers in the currency's minor unit (e.g. cents). */
export type AccountType = 'checking' | 'savings' | 'cash' | 'credit' | 'other';

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit card' },
  { value: 'other', label: 'Other' },
];

export const ACCOUNT_TYPE_LABELS = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.value, t.label]),
) as Record<AccountType, string>;

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** ISO 4217 code, e.g. "USD". */
  currency: string;
  /** Balance on `balanceDate`, before any tracked transactions. */
  startingBalanceMinor: number;
  /** Local date, YYYY-MM-DD. Transactions dated before this are not counted. */
  balanceDate: string;
  createdAt: string;
  archived?: boolean;
}

export type TxnKind = 'income' | 'expense' | 'transfer';

export interface Txn {
  id: string;
  kind: TxnKind;
  /** The account money goes into (income), comes out of (expense), or leaves (transfer). */
  accountId: string;
  /** Transfers only: the receiving account. */
  toAccountId?: string;
  /** Always positive; `kind` decides the sign. In `accountId`'s currency. */
  amountMinor: number;
  /** Transfers between different currencies: amount received, in `toAccountId`'s currency. */
  toAmountMinor?: number;
  /** Local date, YYYY-MM-DD. */
  date: string;
  category?: string;
  note?: string;
  createdAt: string;
}

export type NewAccount = Omit<Account, 'id' | 'createdAt'>;
export type NewTxn = Omit<Txn, 'id' | 'createdAt'>;
