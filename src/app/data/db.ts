import { InjectionToken } from '@angular/core';
import Dexie, { type DexieOptions, type Table } from 'dexie';
import { Account, Txn } from './models';

export class StillwaterDb extends Dexie {
  declare accounts: Table<Account, string>;
  declare transactions: Table<Txn, string>;

  constructor(name = 'stillwater', options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({
      accounts: 'id, createdAt',
      transactions: 'id, accountId, toAccountId, date',
    });
  }
}

export const DB = new InjectionToken<StillwaterDb>('StillwaterDb', {
  providedIn: 'root',
  factory: () => new StillwaterDb(),
});

export function newId(): string {
  return crypto.randomUUID();
}
