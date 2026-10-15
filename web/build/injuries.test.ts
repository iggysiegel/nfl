import { describe, expect, it } from 'vitest';
import { type EspnTeam, injuryLines } from './injuries';
import { TEAM_NAMES } from './teams';

// --- Test setup ---

/** An ESPN team whose players are given as [name, status] pairs. */
function team(displayName: string, players: [string, string][] = []): EspnTeam {
  return {
    displayName,
    injuries: players.map(([name, status]) => ({
      status,
      date: '2026-10-14T23:56Z',
      athlete: { displayName: name, position: { abbreviation: 'WR' } },
      details: { type: 'Ankle' },
    })),
  };
}

/** The whole league as ESPN lists it, with players for the teams named in `players`. */
function league(players: Record<string, [string, string][]> = {}): EspnTeam[] {
  return Object.values(TEAM_NAMES).map((name) => team(name, players[name]));
}

// --- Tests ---

describe('injuryLines', () => {
  it('keys each team by our franchise code and leaves out cleared players', () => {
    // ESPN abbreviates the Rams "LAR"; matching on the full name must still land on "LA".
    const lines = injuryLines(
      league({
        'Los Angeles Rams': [
          ['Hurt Receiver', 'Out'],
          ['Healthy Receiver', 'Active'],
        ],
      }),
    );
    expect(lines.LA?.join()).toContain('Hurt Receiver');
    expect(lines.LA?.join()).not.toContain('Healthy Receiver');
  });

  it('fails rather than let a missing team read as healthy', () => {
    // A renamed franchise or an empty feed would otherwise give games "None listed."
    expect(() => injuryLines([...league(), team('Washington Football Team')])).toThrow(
      'not in TEAM_NAMES',
    );
    expect(() => injuryLines([])).toThrow('ESPN listed 0 of 32 teams');
  });
});
