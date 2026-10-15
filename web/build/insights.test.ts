import { afterEach, describe, expect, it, vi } from 'vitest';
import { prediction } from '@/lib/fixture';
import {
  type AskModel,
  type Complete,
  generateInsights,
  type Injuries,
  type Search,
  upcoming,
  withFallback,
} from './insights';

// --- Test setup ---

const noInjuries: Injuries = async () => ({});
const noNews: Search = async () => '';
const failing: Complete = async () => {
  throw new Error('service unavailable');
};
const reply = (games: { homeTeam: string; awayTeam: string; insight: string }[]): Complete =>
  async () => JSON.stringify({ games });

/** A model service where only the `answering` models reply; every ask lands in `calls`. */
function service(answering: string[], calls: string[]): AskModel {
  return async (model) => {
    calls.push(model);
    if (!answering.includes(model)) throw new Error('503 high demand');
    return `reply from ${model}`;
  };
}

// --- Tests ---

describe('generateInsights', () => {
  it('returns no insights, without throwing, when a call fails', async () => {
    // A failed call must leave the deploy to publish the site without insights.
    await expect(generateInsights([prediction()], noInjuries, noNews, failing)).resolves.toEqual(
      [],
    );
  });

  it('drops entries for games it was not asked about', async () => {
    // The model echoes team codes back; a garbled code must not reach some other game.
    const insights = await generateInsights(
      [prediction()],
      noInjuries,
      noNews,
      reply([
        { homeTeam: 'SEA', awayTeam: 'NE', insight: 'kept' },
        { homeTeam: 'KC', awayTeam: 'BAL', insight: 'dropped' },
      ]),
    );
    expect(insights.map((entry) => entry.insight)).toEqual(['kept']);
  });

  it("lists each team's injuries under that team", async () => {
    // Injuries that never reach the prompt, or land under the opponent, would still
    // read as a fluent insight, just a wrong one.
    let prompt = '';
    const capture: Complete = async (_system, user) => {
      prompt = user;
      return JSON.stringify({ games: [] });
    };
    const injuries: Injuries = async () => ({
      SEA: ['- QB Home Passer: Out'],
      NE: ['- WR Away Receiver: Questionable'],
    });
    await generateInsights([prediction()], injuries, noNews, capture);
    expect(prompt).toContain('SEA injuries:\n- QB Home Passer: Out');
    expect(prompt).toContain('NE injuries:\n- WR Away Receiver: Questionable');
  });
});

describe('withFallback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to the next model when one is overloaded', async () => {
    // A 503 from the first model must not cost the slate its insights.
    const calls: string[] = [];
    const complete = withFallback(service(['spare'], calls), ['busy', 'spare', 'unused']);
    await expect(complete('system', 'user')).resolves.toBe('reply from spare');
    expect(calls).toEqual(['busy', 'spare']);
  });

  it('goes back through the list after a wait, then gives up', async () => {
    // An outage that outlasts every round must end the step, not hang the deploy.
    vi.useFakeTimers();
    const calls: string[] = [];
    const complete = withFallback(service([], calls), ['busy', 'down']);
    const settled = expect(complete('system', 'user')).rejects.toThrow('no model answered');
    await vi.runAllTimersAsync();
    await settled;
    expect(calls).toEqual(['busy', 'down', 'busy', 'down', 'busy', 'down']);
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
