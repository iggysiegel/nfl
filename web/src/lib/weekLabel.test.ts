import { describe, expect, it } from 'vitest';
import { weekLabel } from '@/lib/weekLabel';

// --- Tests ---

describe('weekLabel', () => {
  it('names the playoff rounds a week earlier before the 18-week season', () => {
    // 2020 played 17 regular weeks, 2024 plays 18.
    expect(weekLabel(2020, 18)).toBe('Wild Card');
    expect(weekLabel(2024, 18)).toBe('Week 18');
    expect(weekLabel(2024, 19)).toBe('Wild Card');
  });

  it('names the last week of each era the Super Bowl', () => {
    expect(weekLabel(2020, 21)).toBe('Super Bowl');
    expect(weekLabel(2024, 22)).toBe('Super Bowl');
  });
});
