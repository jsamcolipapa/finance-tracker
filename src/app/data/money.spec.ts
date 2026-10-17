import { formatMinor, minorDigits, minorToInput, parseToMinor } from './money';

describe('money', () => {
  it('knows minor digits per currency', () => {
    expect(minorDigits('USD')).toBe(2);
    expect(minorDigits('JPY')).toBe(0);
  });

  it('parses user input into integer minor units', () => {
    expect(parseToMinor('750', 'USD')).toBe(75000);
    expect(parseToMinor('750.5', 'USD')).toBe(75050);
    expect(parseToMinor('1,234.56', 'USD')).toBe(123456);
    expect(parseToMinor(' .99 ', 'USD')).toBe(99);
    expect(parseToMinor('-250.00', 'USD')).toBe(-25000);
    expect(parseToMinor('1200', 'JPY')).toBe(1200);
  });

  it('avoids floating point drift', () => {
    // 0.1 + 0.2 style inputs must land exactly.
    expect(parseToMinor('0.29', 'USD')).toBe(29);
    expect(parseToMinor('1.15', 'USD')).toBe(115);
  });

  it('rejects invalid amounts', () => {
    expect(parseToMinor('', 'USD')).toBeNull();
    expect(parseToMinor('abc', 'USD')).toBeNull();
    expect(parseToMinor('1.234', 'USD')).toBeNull();
    expect(parseToMinor('12.5', 'JPY')).toBeNull();
    expect(parseToMinor('1.2.3', 'USD')).toBeNull();
    expect(parseToMinor('99999999999999999', 'USD')).toBeNull();
  });

  it('round-trips through the edit string', () => {
    for (const minor of [0, 5, 99, 100, 75050, -25000]) {
      expect(parseToMinor(minorToInput(minor, 'USD'), 'USD')).toBe(minor);
    }
    expect(minorToInput(5, 'USD')).toBe('0.05');
    expect(minorToInput(1200, 'JPY')).toBe('1200');
  });

  it('formats with currency and a typographic minus', () => {
    expect(formatMinor(842550, 'USD', { locale: 'en-US' })).toBe('$8,425.50');
    expect(formatMinor(-6840, 'USD', { locale: 'en-US', signed: true })).toBe('−$68.40');
    expect(formatMinor(125000, 'USD', { locale: 'en-US', signed: true })).toBe('+$1,250.00');
    expect(formatMinor(1200, 'JPY', { locale: 'en-US' })).toBe('¥1,200');
  });
});
