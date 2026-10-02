import { describe, expect, it } from 'vitest';
import { prediction } from '@/lib/fixture';
import { type Complete, generateInsights, type Search, upcoming } from './insights';

// --- Test setup ---

const noNews: Search = async () => '';
const failing: Complete = async () => {
  throw new Error('service unavailable');
};
const reply = (games: { homeTeam: string; awayTeam: string; insight: string }[]): Complete =>
  async () => JSON.stringify({ games });

// --- Tests ---

describe('generateInsights', () => {
  it('returns no insights, without throwing, when a call fails', async () => {
    // A failed call must leave the deploy to publish the site without insights.
    await expect(generateInsights([prediction()], noNews, failing)).resolves.toEqual([]);
  });

  it('drops entries for games it was not asked about', async () => {
    // The model echoes team codes back; a garbled code must not reach some other game.
    const insights = await generateInsights(
      [prediction()],
      noNews,
      reply([
        { homeTeam: 'SEA', awayTeam: 'NE', insight: 'kept' },
        { homeTeam: 'KC', awayTeam: 'BAL', insight: 'dropped' },
      ]),
    );
    expect(insights.map((entry) => entry.insight)).toEqual(['kept']);
  });

  it('tells the model which side each number favors', async () => {
    // Margins are home minus away. A flipped sign here would have every insight argue
    // the wrong direction, and nothing else would catch it.
    let prompt = '';
    const capture: Complete = async (_system, user) => {
      prompt = user;
      return JSON.stringify({ games: [] });
    };
    await generateInsights([prediction({ predMean: 5, spreadClose: -2.5 })], noNews, capture);
    expect(prompt).toContain(
      'Model favors SEA by 5.0. Market favors NE by 2.5. Compared with the model, the market leans toward NE by 7.5.',
    );
  });
});

describe('upcoming', () => {
  it('leaves out games that have already kicked off', () => {
    // A started game must never be searched or sent, or its insight could cite the result.
    const started = prediction({ gameId: 'started', kickoff: '2026-10-01T20:15:00-0400' });
    const later = prediction({ gameId: 'later', kickoff: '2026-10-04T13:00:00-0400' });
    const now = new Date('2026-10-02T10:00:00Z');
    expect(upcoming([started, later], now).map((game) => game.gameId)).toEqual(['later']);
  });
});
