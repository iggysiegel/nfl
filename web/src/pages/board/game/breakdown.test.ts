import { describe, expect, it } from 'vitest';
import { game } from '@/lib/fixture';
import { edgeLabel } from '@/lib/format';
import { hasQb, isNeutralSite, matchupRows, qbRatings, type MatchupRow } from './breakdown';

// --- Test setup ---

const LEAGUE_QB = 170;

const totalEdge = (rows: MatchupRow[]) => rows.reduce((sum, row) => sum + row.edge, 0);

const row = (rows: MatchupRow[], label: string) => rows.find((r) => r.label === label);

// --- Tests ---

describe('matchupRows', () => {
  it('has an edge column that sums to the predicted margin', () => {
    // The total under the table is this sum, so it has to add up.
    expect(totalEdge(matchupRows(game(), LEAGUE_QB))).toBeCloseTo(game().predMean, 10);
  });

  it('still sums when the baseline is not the league mean', () => {
    // Only the difference of the two quarterback ratings is identified, so the
    // centring cancels out of the edge and any baseline leaves the total unchanged.
    expect(totalEdge(matchupRows(game(), 0))).toBeCloseTo(game().predMean, 10);
  });

  it('reads the better quarterback as the higher number, whichever side he is on', () => {
    // The whole point of the head-to-head: a stronger starter is a bigger number in
    // his own column, rather than a sign that depends on which team he plays for.
    const rows = matchupRows(game({ homeQbValue: 200, awayQbValue: 140 }), LEAGUE_QB);
    const quarterback = row(rows, 'Quarterback');
    expect(quarterback?.home).toBeGreaterThan(0);
    expect(quarterback?.away).toBeLessThan(0);
  });
});

describe('a game with no rated quarterback', () => {
  // DataLoader fills the rating difference to 0 when either side is missing.
  const unrated = game({ homeQb: null, homeQbValue: null, qbDiff: 0, qbEffect: 0, predMean: 6 });

  it('has no rating on either side, rather than a zero that reads as average', () => {
    expect(qbRatings(unrated, LEAGUE_QB)).toBeNull();
    const quarterback = row(matchupRows(unrated, LEAGUE_QB), 'Quarterback');
    expect(quarterback?.away).toBeNull();
    expect(quarterback?.home).toBeNull();
    expect(quarterback?.edge).toBe(0);
  });

  it('is reported as missing a quarterback', () => {
    expect(hasQb(unrated)).toBe(false);
    expect(hasQb(game())).toBe(true);
  });

  it('still sums to the predicted margin', () => {
    expect(totalEdge(matchupRows(unrated, LEAGUE_QB))).toBeCloseTo(unrated.predMean, 10);
  });
});

describe('a neutral-site game', () => {
  const neutral = game({ homeField: 0, predMean: 3 });

  it('is detected from a home-field term of exactly zero', () => {
    expect(isNeutralSite(neutral)).toBe(true);
    expect(isNeutralSite(game())).toBe(false);
  });

  it('keeps the home-field row so the edges still add up', () => {
    const rows = matchupRows(neutral, LEAGUE_QB);
    expect(row(rows, 'Home field')?.edge).toBe(0);
    expect(totalEdge(rows)).toBeCloseTo(neutral.predMean, 10);
  });
});

describe('edgeLabel', () => {
  it('names the side a contribution favours', () => {
    expect(edgeLabel(1.9, 'HOU', 'BUF')).toBe('HOU 1.9');
    expect(edgeLabel(-4.72, 'HOU', 'BUF')).toBe('BUF 4.7');
  });

  it('dashes rather than naming a side for a contribution that rounds to nothing', () => {
    expect(edgeLabel(0, 'HOU', 'BUF')).toBe('—');
    expect(edgeLabel(0.04, 'HOU', 'BUF')).toBe('—');
  });
});
