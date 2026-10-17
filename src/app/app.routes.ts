import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { DB } from './data/db';

/** First run (no accounts yet) starts on the welcome screen. */
const hasAccounts = async () => {
  // Inject before awaiting: inject() only works synchronously inside the guard.
  const db = inject(DB);
  const router = inject(Router);
  return (await db.accounts.count()) > 0 || router.createUrlTree(['/welcome']);
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Stillwater',
    canActivate: [hasAccounts],
    loadComponent: () => import('./features/overview/overview').then((m) => m.Overview),
  },
  {
    path: 'welcome',
    title: 'Welcome · Stillwater',
    loadComponent: () => import('./features/welcome/welcome').then((m) => m.Welcome),
  },
  {
    path: 'accounts',
    children: [
      {
        path: '',
        title: 'Accounts · Stillwater',
        loadComponent: () => import('./features/accounts/accounts').then((m) => m.Accounts),
      },
      {
        path: 'new',
        title: 'Add account · Stillwater',
        loadComponent: () => import('./features/accounts/account-form').then((m) => m.AccountForm),
      },
      {
        path: ':id',
        title: 'Account · Stillwater',
        loadComponent: () =>
          import('./features/accounts/account-detail').then((m) => m.AccountDetail),
      },
      {
        path: ':id/edit',
        title: 'Edit account · Stillwater',
        loadComponent: () => import('./features/accounts/account-form').then((m) => m.AccountForm),
      },
    ],
  },
  {
    path: 'activity',
    children: [
      {
        path: '',
        title: 'Activity · Stillwater',
        loadComponent: () => import('./features/activity/activity').then((m) => m.Activity),
      },
      {
        path: 'new',
        title: 'Record transaction · Stillwater',
        loadComponent: () => import('./features/activity/txn-form').then((m) => m.TxnForm),
      },
      {
        path: ':id',
        title: 'Transaction · Stillwater',
        loadComponent: () => import('./features/activity/txn-detail').then((m) => m.TxnDetail),
      },
      {
        path: ':id/edit',
        title: 'Edit transaction · Stillwater',
        loadComponent: () => import('./features/activity/txn-form').then((m) => m.TxnForm),
      },
    ],
  },
  {
    path: 'settings',
    children: [
      {
        path: '',
        title: 'Settings & backup · Stillwater',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'export',
        title: 'Export backup · Stillwater',
        loadComponent: () =>
          import('./features/settings/export-backup').then((m) => m.ExportBackup),
      },
      {
        path: 'restore',
        title: 'Restore backup · Stillwater',
        loadComponent: () =>
          import('./features/settings/restore-backup').then((m) => m.RestoreBackup),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
