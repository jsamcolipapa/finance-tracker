import { IconName, TXN_ICONS } from './icon';
import { TxnKind } from '../data/models';

export const EXPENSE_CATEGORIES: { name: string; icon: IconName }[] = [
  { name: 'Food & groceries', icon: 'shopping-basket' },
  { name: 'Dining & coffee', icon: 'coffee' },
  { name: 'Transport', icon: 'car' },
  { name: 'Housing', icon: 'house' },
  { name: 'Bills & utilities', icon: 'receipt' },
  { name: 'Health', icon: 'heart-pulse' },
  { name: 'Shopping', icon: 'shopping-bag' },
  { name: 'Entertainment', icon: 'clapperboard' },
  { name: 'Travel', icon: 'plane' },
  { name: 'Education', icon: 'graduation-cap' },
  { name: 'Gifts', icon: 'gift' },
  { name: 'Other', icon: 'arrow-up-right' },
];

export const INCOME_SOURCES: { name: string; icon: IconName }[] = [
  { name: 'Salary', icon: 'arrow-down-left' },
  { name: 'Freelance', icon: 'arrow-down-left' },
  { name: 'Gift', icon: 'gift' },
  { name: 'Interest', icon: 'arrow-down-left' },
  { name: 'Refund', icon: 'arrow-down-left' },
  { name: 'Other', icon: 'arrow-down-left' },
];

export function categoriesFor(kind: TxnKind) {
  return kind === 'income' ? INCOME_SOURCES : kind === 'expense' ? EXPENSE_CATEGORIES : [];
}

export function txnIcon(kind: TxnKind, category?: string): IconName {
  return categoriesFor(kind).find((c) => c.name === category)?.icon ?? TXN_ICONS[kind];
}
