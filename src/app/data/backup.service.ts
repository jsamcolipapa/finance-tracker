import { inject, Injectable } from '@angular/core';
import {
  decryptText,
  encryptText,
  isEncryptedEnvelope,
  type EncryptedEnvelope,
} from './backup-crypto';
import { DB } from './db';
import { Account, ACCOUNT_TYPES, Txn } from './models';
import { todayIso } from '../shared/dates';

export const BACKUP_APP = 'stillwater';
export const BACKUP_SCHEMA_VERSION = 1;
const LAST_BACKUP_KEY = 'stillwater.lastBackupAt';

export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  accounts: Account[];
  transactions: Txn[];
}

/** A backup file as read from disk: either ready to restore, or waiting for its passphrase. */
export type ReadBackup = { backup: BackupFile } | { encrypted: EncryptedEnvelope };

export class BackupError extends Error {}

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly db = inject(DB);

  async createBackup(): Promise<BackupFile> {
    return this.db.transaction('r', this.db.accounts, this.db.transactions, async () => ({
      app: BACKUP_APP,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      accounts: await this.db.accounts.toArray(),
      transactions: await this.db.transactions.toArray(),
    }));
  }

  async serialize(backup: BackupFile, passphrase?: string): Promise<string> {
    const json = JSON.stringify(backup, null, 2);
    return passphrase ? JSON.stringify(await encryptText(json, passphrase), null, 2) : json;
  }

  /**
   * Exports a backup via the share sheet (iOS: "Save to Files") or a file download.
   * With a passphrase, the file is encrypted.
   */
  async exportBackup(passphrase?: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
    const backup = await this.createBackup();
    const file = new File([await this.serialize(backup, passphrase)], backupFilename(), {
      type: 'application/json',
    });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        this.markBackedUp();
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
        // Fall through to a regular download if sharing isn't permitted.
      }
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    this.markBackedUp();
    return 'downloaded';
  }

  /** Reads a chosen file's text. Encrypted backups need `unlock()` before restoring. */
  read(text: string): ReadBackup {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new BackupError("This file isn't a valid backup (it's not JSON).");
    }
    return isEncryptedEnvelope(data) ? { encrypted: data } : { backup: this.validate(data) };
  }

  async unlock(envelope: EncryptedEnvelope, passphrase: string): Promise<BackupFile> {
    const text = await decryptText(envelope, passphrase);
    const backup = this.read(text);
    if (!('backup' in backup)) throw new BackupError('This backup is damaged.');
    return backup.backup;
  }

  /** Validates parsed backup data. Throws BackupError with a readable message. */
  private validate(data: unknown): BackupFile {
    if (!isRecord(data) || data['app'] !== BACKUP_APP) {
      throw new BackupError("This file isn't a Stillwater backup.");
    }
    const version = data['schemaVersion'];
    if (typeof version !== 'number' || version > BACKUP_SCHEMA_VERSION) {
      throw new BackupError('This backup was made by a newer version of the app. Update first.');
    }
    const accounts = data['accounts'];
    const transactions = data['transactions'];
    if (!Array.isArray(accounts) || !Array.isArray(transactions)) {
      throw new BackupError('This backup is missing its accounts or transactions.');
    }
    accounts.forEach((a, i) => {
      if (!isAccount(a)) throw new BackupError(`Account #${i + 1} in the backup is invalid.`);
    });
    transactions.forEach((t, i) => {
      if (!isTxn(t)) throw new BackupError(`Transaction #${i + 1} in the backup is invalid.`);
    });
    const ids = new Set(accounts.map((a) => a.id));
    if (
      transactions.some((t) => !ids.has(t.accountId) || (t.toAccountId && !ids.has(t.toAccountId)))
    ) {
      throw new BackupError('This backup has transactions for accounts that are missing.');
    }
    return {
      app: BACKUP_APP,
      schemaVersion: version,
      exportedAt: typeof data['exportedAt'] === 'string' ? data['exportedAt'] : '',
      accounts,
      transactions,
    };
  }

  /**
   * Replaces everything on this device with the backup, in one DB transaction —
   * if anything fails, the existing data is left untouched.
   */
  async restore(backup: BackupFile): Promise<void> {
    await this.db.transaction('rw', this.db.accounts, this.db.transactions, async () => {
      await this.db.transactions.clear();
      await this.db.accounts.clear();
      await this.db.accounts.bulkAdd(backup.accounts);
      await this.db.transactions.bulkAdd(backup.transactions);
    });
    navigator.storage?.persist?.().catch(() => {});
  }

  lastBackupAt(): string | null {
    try {
      return localStorage.getItem(LAST_BACKUP_KEY);
    } catch {
      return null;
    }
  }

  private markBackedUp(): void {
    try {
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    } catch {
      // Storage unavailable; the reminder will just keep showing.
    }
  }
}

export function backupFilename(): string {
  return `stillwater-backup-${todayIso()}.json`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isInt = (v: unknown) => Number.isSafeInteger(v);
const isPositiveInt = (v: unknown) => isInt(v) && (v as number) > 0;
const isOptionalString = (v: unknown) => v === undefined || typeof v === 'string';

function isAccount(v: unknown): v is Account {
  return (
    isRecord(v) &&
    typeof v['id'] === 'string' &&
    typeof v['name'] === 'string' &&
    ACCOUNT_TYPES.some((t) => t.value === v['type']) &&
    typeof v['currency'] === 'string' &&
    /^[A-Z]{3}$/.test(v['currency']) &&
    isInt(v['startingBalanceMinor']) &&
    isDate(v['balanceDate']) &&
    typeof v['createdAt'] === 'string' &&
    (v['archived'] === undefined || typeof v['archived'] === 'boolean')
  );
}

function isTxn(v: unknown): v is Txn {
  if (
    !isRecord(v) ||
    typeof v['id'] !== 'string' ||
    !['income', 'expense', 'transfer'].includes(v['kind'] as string) ||
    typeof v['accountId'] !== 'string' ||
    !isPositiveInt(v['amountMinor']) ||
    !isDate(v['date']) ||
    typeof v['createdAt'] !== 'string' ||
    !isOptionalString(v['category']) ||
    !isOptionalString(v['note'])
  ) {
    return false;
  }
  if (v['kind'] === 'transfer') {
    return (
      typeof v['toAccountId'] === 'string' &&
      v['toAccountId'] !== v['accountId'] &&
      (v['toAmountMinor'] === undefined || isPositiveInt(v['toAmountMinor']))
    );
  }
  return true;
}
