# Stillwater

An offline finance tracker for iPhone, built as an Angular PWA. Track what's left in each account. Your records are stored only on your device, in IndexedDB.

**Live app:** https://jsamcolipapa.github.io/finance-tracker/

## Features

- Accounts with a name, type, currency, starting balance, and the date of that balance
- Income, expenses, and transfers. A transfer is saved as a single record, so both accounts always update together.
- Totals are kept separate for each currency
- Works offline after the first visit, using Angular's service worker
- Backup and restore through a JSON file, with an optional passphrase (AES-GCM encryption)

Amounts are stored as integers in each currency's smallest unit, such as cents. A transaction dated before an account's starting-balance date is shown as "not counted" and doesn't change that account's balance.

## Install on iPhone

1. Open the live app in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open Stillwater from the Home Screen and **set up your accounts there**. The Home Screen app and Safari keep separate storage.
4. To check offline support, turn on airplane mode, reopen the app, and record a transaction.

### Backups

iOS can clear browser storage, so export a backup regularly from **Settings & backup → Export backup**. The share sheet lets you save the file to Files. To move to another device, restore that file there. Restoring replaces all data on that device.

If you set a passphrase, you'll need it to restore. It can't be recovered.

## Development

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm start            # dev server at http://localhost:4200 (service worker disabled)
npm test             # unit tests (Vitest)
npm run build        # production build in dist/stillwater/browser
```

To test the service worker locally, serve a production build:

```bash
npm run build && npx http-server dist/stillwater/browser -p 8080 -c-1
```

### Code layout

- `src/app/data/`: models, the Dexie database, balance math, money parsing and formatting, and backup with encryption
- `src/app/features/`: the screens (welcome, overview, accounts, activity, settings)
- `src/app/shared/`: icons (Lucide), dates, the shell's status, and the transaction row

## Deployment

Each push to `main` runs the tests, builds with `--base-href /finance-tracker/`, and deploys to GitHub Pages (`.github/workflows/deploy.yml`). One-time setup: in the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**.
