import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { backupFilename, BackupService } from '../../data/backup.service';
import { FinanceService } from '../../data/finance.service';
import { BackLink } from '../../shared/back-link';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-export-backup',
  imports: [FormsModule, RouterLink, BackLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './export-backup.html',
})
export class ExportBackup {
  private readonly backup = inject(BackupService);
  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);

  protected readonly filename = backupFilename();
  protected readonly summary = computed(() => {
    const a = this.finance.accounts()?.length ?? 0;
    const t = this.finance.transactions()?.length ?? 0;
    return `${a} ${a === 1 ? 'account' : 'accounts'} · ${t} ${t === 1 ? 'transaction' : 'transactions'}`;
  });

  protected readonly passphrase = signal('');
  protected readonly confirmation = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected async save(): Promise<void> {
    this.error.set('');
    const pass = this.passphrase();
    if (pass && pass.length < 8) {
      this.error.set('Use at least 8 characters for the passphrase.');
      return;
    }
    if (pass !== this.confirmation()) {
      this.error.set("The passphrases don't match.");
      return;
    }
    this.busy.set(true);
    try {
      const result = await this.backup.exportBackup(pass || undefined);
      if (result !== 'cancelled') await this.router.navigate(['/settings']);
    } catch {
      this.error.set('Could not create the backup.');
    } finally {
      this.busy.set(false);
    }
  }
}
