import { describe, expect, it } from 'vitest';
import { BET_THRESHOLD, CONFIDENCE_CUTS } from '@/config';
import {
  atsRecord,
  closingLineValue,
  CONFIDENCE_BANDS,
  coverOutcome,
  coverRate,
  isBet,
  isBetAgainst,
} from '@/lib/ats';
import { confidence } from '@/lib/confidence';
import { prediction } from '@/lib/fixture';

// --- Test setup ---

const closing = (g: { spreadClose: number | null }) => g.spreadClose;

// --- Tests ---

describe('coverOutcome', () => {
  // The model is on the home team: it predicts +5 against a line of +3.5.
  it('scores the model side against the line it was picked on', () => {
    expect(coverOutcome(prediction({ margin: 7 }), 3.5)).toBe('win');
    expect(coverOutcome(prediction({ margin: 1 }), 3.5)).toBe('loss');
  });

  it('calls an exact landing a push', () => {
    expect(coverOutcome(prediction({ margin: 3 }), 3)).toBe('push');
  });

  it('cannot score an unplayed game or one with no line', () => {
    expect(coverOutcome(prediction({ margin: null }), 3.5)).toBeNull();
    expect(coverOutcome(prediction({ margin: 7 }), null)).toBeNull();
  });
});

describe('coverRate', () => {
  it('drops pushes from the record rather than counting them as losses', () => {
    // Three games, one landing exactly on the line: the record holds the other two, so
    // wins + losses is the count the site shows everywhere.
    const games = [prediction({ margin: 7 }), prediction({ margin: 1 }), prediction({ margin: 3, spreadClose: 3 })];
    expect(atsRecord(games, closing)).toEqual({ wins: 1, losses: 1 });
    expect(coverRate({ wins: 1, losses: 1 })).toBe(0.5);
  });

  it('is null when nothing has been decided', () => {
    expect(coverRate({ wins: 0, losses: 0 })).toBeNull();
  });
});

describe('closingLineValue', () => {
  it('is positive when the line moves toward the side the model took', () => {
    // The model backs the home team at +3.5; the line closes at +5.5.
    expect(closingLineValue(prediction({ spreadOpen: 3.5, spreadClose: 5.5 }))).toBeCloseTo(2, 10);
    // Backing the away team, the same move goes against it.
    expect(closingLineValue(prediction({ predMean: 0, spreadOpen: 3.5, spreadClose: 5.5 }))).toBeCloseTo(-2, 10);
  });

  it('is null without an opening line', () => {
    expect(closingLineValue(prediction({ spreadOpen: null }))).toBeNull();
  });
});

describe('isBet', () => {
  // The fixture grid runs 1..99, so the closing line picks the confidence directly.
  it('backs a side only once confidence reaches the threshold', () => {
    const backed = prediction({ spreadClose: 100 });
    const passed = prediction({ spreadClose: 50 });
    expect(confidence(backed)).toBeGreaterThanOrEqual(BET_THRESHOLD);
    expect(confidence(passed)).toBeLessThan(BET_THRESHOLD);
    expect(isBetAgainst(backed, backed.spreadClose)).toBe(true);
    expect(isBetAgainst(passed, passed.spreadClose)).toBe(false);
  });

  it('does not bet a game with no line to disagree with', () => {
    expect(isBet(null)).toBe(false);
    expect(isBetAgainst(prediction({ spreadClose: null }), null)).toBe(false);
  });
});

describe('the betting knobs', () => {
  it('puts the bet threshold on a band boundary', () => {
    // Otherwise a band would be half bet and half not, and the About chart would draw
    // its "bet from here" divider somewhere no band actually begins.
    expect(CONFIDENCE_CUTS).toContain(BET_THRESHOLD);
  });

  it('leaves the top band open, so a market outside the whole distribution still lands', () => {
    expect(CONFIDENCE_BANDS.at(-1)?.max).toBe(Infinity);
  });
});
