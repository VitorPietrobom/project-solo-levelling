import { describe, it, expect } from 'vitest';
import { localISODate, mondayOf, currentMonday } from './localDate';

describe('localDate', () => {
  it('localISODate uses local date parts', () => {
    expect(localISODate(new Date(2026, 9, 20, 23, 30))).toBe('2026-10-20');
    expect(localISODate(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
  it('mondayOf handles every weekday and month/year boundaries', () => {
    expect(mondayOf('2026-10-19')).toBe('2026-10-19');
    expect(mondayOf('2026-10-25')).toBe('2026-10-19');
    expect(mondayOf('2026-10-21')).toBe('2026-10-19');
    expect(mondayOf('2027-01-01')).toBe('2026-12-28');
  });
  it('currentMonday is local-based late in the evening', () => {
    expect(currentMonday(new Date(2026, 9, 25, 23, 59))).toBe('2026-10-19');
    expect(currentMonday(new Date(2026, 9, 19, 0, 1))).toBe('2026-10-19');
  });
});
