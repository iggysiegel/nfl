import { describe, expect, it } from 'vitest';
import { prediction } from '@/lib/fixture';
import { buildBoard, buildHistory, totals } from './aggregate';

// --- Test setup ---

const played = (overrides: Parameters<typeof prediction>[0]) =>
  prediction({ margin: 0, ...overrides });

// --- Tests ---

describe('totals', () => {
  it('scores only played games', () => {
    // An unplayed game has no result to score, and must not dilute the record.
    const result = totals([played({ margin: 7 }), prediction({ margin: null })]);
    expect(result.atsClosing).toEqual({ wins: 1, losses: 0 });
  });

  it('records only the games the model actually backed', () => {
    // A line at 50 sits mid-distribution, so the model passes and it is not wagered.
    const result = totals([
      played({ gameId: 'bet', margin: 7, spreadClose: 100 }),
      played({ gameId: 'pass', margin: 7, spreadClose: 50 }),
    ]);
    expect(result.atsClosing.wins + result.atsClosing.losses).toBe(1);
  });

  it("picks each record's bets with the line that record is graded against", () => {
    // The fixture grid runs 1..99. This line opened at 100 — outside the model's whole
    // distribution, so the model backed it — then closed at 50, on the model's median,
    // where there is no bet. Only the opening record may count it; selecting on the
    // close would credit a bet nobody could have placed at the open.
    const moved = played({ margin: 7, spreadOpen: 100, spreadClose: 50 });
    const result = totals([moved]);
    expect(result.atsOpening.wins + result.atsOpening.losses).toBe(1);
    expect(result.atsClosing).toEqual({ wins: 0, losses: 0 });
  });

  it('measures error over every game, not just the bets', () => {
    // Accuracy is a different question from how the bets went, so it is not filtered.
    // Only one of these two is backed, but both count toward the error.
    const result = totals([
      played({ gameId: 'bet', margin: 7, spreadClose: 100 }),
      played({ gameId: 'pass', margin: 7, spreadClose: 50 }),
    ]);
    expect(result.atsClosing.wins + result.atsClosing.losses).toBe(1);
    expect(result.modelMae).toBeCloseTo(2, 10);
  });

  it('leaves closing line value out when no opening line was posted', () => {
    expect(totals([played({ margin: 7, spreadOpen: null })]).clv).toBeNull();
  });

  it('measures the model and the market against the same games', () => {
    // The gap between these two is the headline claim, so they cannot be computed
    // over different sets.
    const result = totals([played({ margin: 10, predMean: 5, spreadClose: 3.5 })]);
    expect(result.modelMae).toBeCloseTo(5, 10);
    expect(result.marketMae).toBeCloseTo(6.5, 10);
  });
});

describe('buildHistory', () => {
  it('puts every decided game in exactly one confidence band, for either line', () => {
    // No gaps and no overlaps in the cuts. None of these pushes, so the band counts —
    // which hold decided games only — must add back up to all three.
    const games = [
      played({ gameId: 'a', margin: 7, spreadClose: 50 }),
      played({ gameId: 'b', margin: 7, spreadClose: 100 }),
      played({ gameId: 'c', margin: 10, spreadClose: 3 }),
    ];
    const history = buildHistory(games);
    const counted = (bands: typeof history.bands.closing) =>
      bands.reduce((sum, band) => sum + band.games, 0);
    expect(counted(history.bands.closing)).toBe(games.length);
    expect(counted(history.bands.opening)).toBe(games.length);
  });

  it('buckets each line by its own confidence, not the closing line', () => {
    // The grid runs 1..99. This game opened at 50 — the model's median, its weakest
    // disagreement — then closed at 100, outside the distribution entirely. It belongs
    // in the bottom band for the opening line and the top band for the closing one.
    const history = buildHistory([played({ margin: 7, spreadOpen: 50, spreadClose: 100 })]);
    expect(history.bands.closing.at(-1)?.games).toBe(1);
    expect(history.bands.opening[0]?.games).toBe(1);
  });

  it('reports a season row per season, newest first', () => {
    const history = buildHistory([
      played({ gameId: 'a', season: 2024, margin: 7 }),
      played({ gameId: 'b', season: 2025, margin: 7 }),
    ]);
    expect(history.seasons.map((row) => row.season)).toEqual([2025, 2024]);
    // All-time rolls both seasons up rather than reporting only the newest.
    expect(history.allTime.atsClosing).toEqual({ wins: 2, losses: 0 });
  });
});

describe('buildBoard', () => {
  it('shows the latest week, and only that week', () => {
    const board = buildBoard(
      [
        played({ gameId: 'old', season: 2025, week: 22, margin: 7 }),
        prediction({ gameId: 'new', season: 2026, week: 1 }),
      ],
      '2026-09-05T00:00:00Z',
    );
    expect(board.season).toBe(2026);
    expect(board.week).toBe(1);
    expect(board.games.map((g) => g.gameId)).toEqual(['new']);
  });

  it('has an empty season record before the new season has decided anything', () => {
    // Week 1 legitimately has nothing to report, and must not borrow last season's.
    const board = buildBoard(
      [
        played({ gameId: 'old', season: 2025, week: 22, margin: 7 }),
        prediction({ gameId: 'new', season: 2026, week: 1 }),
      ],
      '2026-09-05T00:00:00Z',
    );
    expect(board.seasonAts.closing).toEqual({ wins: 0, losses: 0 });
  });
});
