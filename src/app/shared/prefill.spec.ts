import { Account } from '../data/models';
import { paramsFromText, readPrefill } from './prefill';

const account = (id: string, name: string, archived = false): Account => ({
  id,
  name,
  type: 'savings',
  currency: 'PHP',
  startingBalanceMinor: 0,
  balanceDate: '2026-10-01',
  createdAt: '2026-10-01T00:00:00Z',
  archived,
});

const accounts = [account('a1', 'BDO Savings'), account('a2', 'GCash'), account('a3', 'Old', true)];
const read = (query: string) => readPrefill(new URLSearchParams(query), accounts);

describe('readPrefill', () => {
  it('reads a transfer, matching accounts by name and ignoring case', () => {
    expect(
      read('type=Transfer&amount=PHP%205,000.00&account=bdo%20savings&to=GCASH&note=Rent&save=1'),
    ).toEqual({
      kind: 'transfer',
      amount: '5,000.00',
      accountId: 'a1',
      toAccountId: 'a2',
      category: undefined,
      date: undefined,
      note: 'Rent',
      save: true,
    });
  });

  it('matches accounts by id and categories by name', () => {
    const p = read('type=expense&account=a2&category=transport&date=2026-10-17');
    expect(p).toMatchObject({ accountId: 'a2', category: 'Transport', date: '2026-10-17' });
    expect(p.save).toBe(false);
  });

  it('leaves out anything it does not recognise', () => {
    expect(read('type=refund&to=Nope&category=Bogus&date=17/10/2026&amount=abc')).toEqual({
      save: false,
    });
  });

  it('accepts from as another name for account', () => {
    expect(read('type=transfer&from=gcash&to=BDO%20Savings')).toMatchObject({
      accountId: 'a2',
      toAccountId: 'a1',
    });
  });

  it('reports accounts it cannot use instead of guessing', () => {
    expect(read('from=Old&save=1').problem).toBe('No account named "Old".');
    expect(read('type=transfer&from=GCash&to=Nope').problem).toBe('No account named "Nope".');
    expect(read('type=transfer&from=GCash&to=gcash').problem).toBe(
      'The From and To accounts are the same.',
    );
    expect(read('type=expense&from=GCash&to=Nope').problem).toBeUndefined();
  });
});

describe('paramsFromText', () => {
  it('accepts a full link or just a query string', () => {
    expect(paramsFromText('https://x.test/activity/new?amount=12&type=income').get('type')).toBe(
      'income',
    );
    expect(paramsFromText('?amount=12').get('amount')).toBe('12');
    expect(paramsFromText('amount=12&note=hi').get('note')).toBe('hi');
  });
});
