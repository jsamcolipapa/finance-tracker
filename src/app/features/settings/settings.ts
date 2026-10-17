import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackupService } from '../../data/backup.service';
import { AppStatus } from '../../shared/app-status.service';
import { Brandline } from '../../shared/brandline';
import { relativeDay, toIsoDay } from '../../shared/dates';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, Brandline, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
})
export class Settings {
  protected readonly status = inject(AppStatus);
  /** Whether the browser has agreed not to evict our storage. */
  protected readonly persisted = signal<boolean | undefined>(undefined);

  protected readonly lastBackup = (() => {
    const last = inject(BackupService).lastBackupAt();
    return last ? relativeDay(toIsoDay(new Date(last))) : null;
  })();

  constructor() {
    navigator.storage
      ?.persisted?.()
      .then((p) => this.persisted.set(p))
      .catch(() => {});
  }
}
