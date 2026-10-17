import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { encryptText, WrongPassphraseError } from './backup-crypto';
import { BackupError, BackupService } from './backup.service';
import { DB, StillwaterDb } from './db';
import { FinanceService } from './finance.service';

describe('BackupService', () => {
  let db: StillwaterDb;
  let backup: BackupService;
  let finance: FinanceService;

  beforeEach(async () => {
    db = new StillwaterDb(`test-${crypto.randomUUID()}`, { indexedDB, IDBKeyRange });
    TestBed.configureTestingModule({ providers: [{ provide: DB, useValue: db }] });
    backup = TestBed.inject(BackupService);
    finance = TestBed.inject(FinanceService);

    const a = await finance.addAccount({
      name: 'Checking',
      type: 'checking',
      currency: 'USD',
      startingBalanceMinor: 1000_00,
      balanceDate: '2026-10-01',
    });
    const b = await finance.addAccount({
      name: 'Savings',
      type: 'savings',
      currency: 'USD',
      startingBalanceMinor: 0,
      balanceDate: '2026-10-01',
    });
    await finance.saveTransaction({
      kind: 'expense',
      accountId: a,
      amountMinor: 68_40,
      date: '2026-10-18',
    });
    await finance.saveTransaction({
      kind: 'transfer',
      accountId: a,
      toAccountId: b,
      amountMinor: 300_00,
      date: '2026-10-15',
    });
  });

  afterEach(() => db.delete());

  async function snapshot() {
    return {
      accounts: await db.accounts.orderBy('id').toArray(),
      transactions: await db.transactions.orderBy('id').toArray(),
    };
  }

  it('restores an export to identical data after the device is wiped', async () => {
    const before = await snapshot();
    const text = await backup.serialize(await backup.createBackup());

    await db.accounts.clear();
    await db.transactions.clear();
    const read = backup.read(text);
    if (!('backup' in read)) throw new Error('expected a plain backup');
    await backup.restore(read.backup);

    expect(await snapshot()).toEqual(before);
  });

  it('replaces (not merges) existing data', async () => {
    const text = await backup.serialize(await backup.createBackup());
    await finance.addAccount({
      name: 'Only on this device',
      type: 'cash',
      currency: 'USD',
      startingBalanceMinor: 0,
      balanceDate: '2026-10-01',
    });
    const read = backup.read(text);
    if (!('backup' in read)) throw new Error('expected a plain backup');
    await backup.restore(read.backup);
    expect(await db.accounts.count()).toBe(2);
  });

  it('round-trips an encrypted backup with the right passphrase only', async () => {
    const before = await snapshot();
    const plain = await backup.serialize(await backup.createBackup());
    // Low iteration count keeps the test fast; real exports use the default.
    const text = JSON.stringify(await encryptText(plain, 'correct horse', 1000));
    expect(text).not.toContain('Checking');

    const read = backup.read(text);
    if (!('encrypted' in read)) throw new Error('expected an encrypted backup');
    await expect(backup.unlock(read.encrypted, 'wrong pass')).rejects.toBeInstanceOf(
      WrongPassphraseError,
    );

    await db.accounts.clear();
    await db.transactions.clear();
    await backup.restore(await backup.unlock(read.encrypted, 'correct horse'));
    expect(await snapshot()).toEqual(before);
  });

  it('rejects files that are not valid backups', async () => {
    expect(() => backup.read('not json')).toThrow(BackupError);
    expect(() => backup.read('{"app":"other"}')).toThrow(/Stillwater/);
    expect(() =>
      backup.read(
        JSON.stringify({ app: 'stillwater', schemaVersion: 99, accounts: [], transactions: [] }),
      ),
    ).toThrow(/newer version/);

    const good = JSON.parse(await backup.serialize(await backup.createBackup()));
    good.transactions[0].amountMinor = 1.5;
    expect(() => backup.read(JSON.stringify(good))).toThrow(/Transaction #1/);

    const orphan = JSON.parse(await backup.serialize(await backup.createBackup()));
    orphan.accounts = orphan.accounts.slice(0, 1);
    expect(() => backup.read(JSON.stringify(orphan))).toThrow(/missing/);
  });
});
