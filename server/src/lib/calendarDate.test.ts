import { describe, it, expect } from 'vitest';
import { parseCalendarDate } from './calendarDate';

describe('parseCalendarDate', () => {
  it('parses YYYY-MM-DD to UTC midnight', () => {
    expect(parseCalendarDate('2024-03-15')?.toISOString()).toBe('2024-03-15T00:00:00.000Z');
  });
  it.each(['foo', '', '2024-3-15', '2024-03-15T22:00:00-05:00', '2024-02-30', '2024-13-01', 42, null, undefined])(
    'rejects %s',
    (v) => {
      expect(parseCalendarDate(v)).toBeNull();
    },
  );
});
