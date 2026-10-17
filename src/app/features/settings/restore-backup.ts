import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { type EncryptedEnvelope, WrongPassphraseError } from '../../data/backup-crypto';
import { BackupError, BackupFile, BackupService } from '../../data/backup.service';
import { FinanceService } from '../../data/finance.service';
import { BackLink } from '../../shared/back-link';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-restore-backup',
  imports: [FormsModule, RouterLink, BackLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restore-backup.html',
})
export class RestoreBackup {
  private readonly backup = inject(BackupService);
  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);

  protected readonly fileName = signal('');
  protected readonly envelope = signal<EncryptedEnvelope | undefined>(undefined);
  protected readonly selected = signal<BackupFile | undefined>(undefined);
  protected readonly passphrase = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected readonly hasLocalData = computed(() => (this.finance.accounts() ?? []).length > 0);
  protected readonly createdAt = computed(() => {
    const at = this.selected()?.exportedAt;
    return at
      ? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : 'Unknown';
  });

  protected async choose(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow choosing the same file again
    if (!file) return;
    this.reset();
    this.fileName.set(file.name);
    try {
      const result = this.backup.read(await file.text());
      if ('encrypted' in result) this.envelope.set(result.encrypted);
      else this.selected.set(result.backup);
    } catch (err) {
      this.error.set(err instanceof BackupError ? err.message : "This file couldn't be read.");
    }
  }

  protected async unlock(): Promise<void> {
    const envelope = this.envelope();
    if (!envelope || !this.passphrase()) return;
    this.error.set('');
    this.busy.set(true);
    try {
      this.selected.set(await this.backup.unlock(envelope, this.passphrase()));
      this.envelope.set(undefined);
    } catch (err) {
      this.error.set(
        err instanceof WrongPassphraseError || err instanceof BackupError
          ? err.message
          : 'Could not unlock this backup.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async restore(): Promise<void> {
    const backup = this.selected();
    if (!backup) return;
    if (
      this.hasLocalData() &&
      !confirm('Replace all accounts and transactions on this device with this backup?')
    ) {
      return;
    }
    this.busy.set(true);
    try {
      await this.backup.restore(backup);
      await this.router.navigate(['/']);
    } catch {
      this.error.set('Restoring failed. Nothing on this device was changed.');
    } finally {
      this.busy.set(false);
    }
  }

  private reset(): void {
    this.envelope.set(undefined);
    this.selected.set(undefined);
    this.passphrase.set('');
    this.error.set('');
  }
}
