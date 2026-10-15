/* This week's injuries from ESPN, one line per player, keyed by team code.
 *
 * ESPN's league-wide feed is undocumented, but free and keyless. It holds each team's
 * 25 latest entries, newest first, so an absence from weeks ago can drop off it; the
 * team's results already reflect that one.
 */
import { TEAM_NAMES } from './teams';

const ESPN_INJURIES_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries';

/** A player cleared to play. Their entries are mostly box-score notes. */
const HEALTHY = 'Active';

interface EspnInjury {
  status: string;
  date: string;
  shortComment?: string;
  athlete: { displayName: string; position: { abbreviation: string } };
  details?: { type?: string };
}

export interface EspnTeam {
  displayName: string;
  injuries: EspnInjury[];
}

const CODE_BY_NAME = new Map(Object.entries(TEAM_NAMES).map(([code, name]) => [name, code]));
const TEAM_COUNT = CODE_BY_NAME.size;

/** "- CB Pat Surtain II: Out, Ankle (2026-10-14). <ESPN's note>" */
function line({ athlete, status, details, date, shortComment }: EspnInjury): string {
  const injury = details?.type ? `, ${details.type}` : '';
  const note = shortComment ? ` ${shortComment}` : '';
  return `- ${athlete.position.abbreviation} ${athlete.displayName}: ${status}${injury} (${date.slice(0, 10)}).${note}`;
}

/** Every player not cleared to play, by team code.
 *
 * Throws unless every team is present. A renamed team or an empty feed would otherwise
 * read as teams with no injuries, and the insights would say so with confidence.
 */
export function injuryLines(teams: EspnTeam[]): Record<string, string[]> {
  const lines = Object.fromEntries(
    teams.map((team) => {
      const code = CODE_BY_NAME.get(team.displayName);
      if (!code) throw new Error(`ESPN team "${team.displayName}" is not in TEAM_NAMES`);
      return [code, team.injuries.filter((injury) => injury.status !== HEALTHY).map(line)];
    }),
  );
  const listed = Object.keys(lines).length;
  if (listed !== TEAM_COUNT) throw new Error(`ESPN listed ${listed} of ${TEAM_COUNT} teams`);
  return lines;
}

export async function espnInjuries(): Promise<Record<string, string[]>> {
  const response = await fetch(ESPN_INJURIES_URL);
  if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
  const { injuries } = (await response.json()) as { injuries: EspnTeam[] };
  return injuryLines(injuries);
}
