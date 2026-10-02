/* Write a short paragraph per upcoming game on news the model cannot see.
 *
 * A pipeline, not an agent: one news search per game, then one chat call for the whole
 * slate. Both are passed in as plain functions, so any search API and any
 * OpenAI-compatible model can stand behind them, and tests can stub them.
 */
import type { GameInsight, Prediction } from '@/data/types';
import { kickoffLabel, signed } from '@/lib/format';
import { weekLabel } from '@/lib/weekLabel';
import { TEAM_NAMES } from './teams';

/** Runs one news search and returns the results as plain text. */
export type Search = (query: string) => Promise<string>;

/** Sends a system and a user prompt to a chat model and returns its JSON reply. */
export type Complete = (system: string, user: string) => Promise<string>;

const NOTHING_NEW = 'No notable injuries or news beyond what the model already reflects.';

const MAX_WORDS = 100;

const SYSTEM_PROMPT = `You write the "AI Insights" note for each game on a website that shows an NFL prediction model's point spreads next to the betting market's.

About the model:
- It rates each team's overall strength from past results, adds a home-field advantage, and adjusts for each team's projected starting quarterback using a quarterback rating.
- It knows nothing else. It cannot see injuries or absences at any other position, suspensions, weather, rest, travel, coaching changes, or motivational factors such as elimination from playoffs.
- The betting market sees all of that, so when the model and the market disagree, news the model cannot see is often why.

For each game you get the projected starting quarterbacks, the model's and the market's favorite, which team the market leans toward compared with the model, the parts of the model's prediction, and news search results from the past week.

Write two or three sentences, at most ${MAX_WORDS} words, for a reader who can already see both numbers:
1. Name the most important news the model cannot see: who is out or limited, and what it changes on the field.
2. Say which team the news helps on net, and so which team the model likely overrates or underrates. A spread compares the two teams, so never say the model overrates both.
3. Mention the market only if the news explains its lean: news that hurts a team explains a market leaning toward its opponent. Otherwise leave the market out.

Rules:
- Use only facts stated in the news results. Do not add players, injuries, or roster moves from memory; your knowledge of rosters may be out of date.
- Ignore results about other teams, other games, or earlier seasons.
- If the news names a different likely starting quarterback than the one listed, lead with that: the model's quarterback adjustment is then wrong.
- Do not quote spreads, ratings, or point values.
- Write plain prose with no markdown or lists. Do not recommend bets, and add no disclaimers about betting.
- Vary your wording from game to game.
- If the news holds nothing the model misses, or only minor or offsetting injuries, write exactly: "${NOTHING_NEW}"

Return one entry per game, using the team codes exactly as given.`;

/** The reply's shape, as an OpenAI-style `response_format` JSON schema. */
export const INSIGHTS_SCHEMA = {
  type: 'object',
  properties: {
    games: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          homeTeam: { type: 'string' },
          awayTeam: { type: 'string' },
          insight: { type: 'string' },
        },
        required: ['homeTeam', 'awayTeam', 'insight'],
        additionalProperties: false,
      },
    },
  },
  required: ['games'],
  additionalProperties: false,
};

/** Games not yet kicked off. A started game gets no insight. */
export function upcoming(games: Prediction[], now: Date): Prediction[] {
  return games.filter((game) => new Date(game.kickoff) > now);
}

const teamName = (code: string) => TEAM_NAMES[code] ?? code;

/** Naming the week steers the search to this week's injury reports. */
function searchQuery(game: Prediction): string {
  const week = weekLabel(game.season, game.week);
  return `${teamName(game.awayTeam)} at ${teamName(game.homeTeam)} ${game.season} ${week} injuries news`;
}

/** "SEA by 3.5" for a home-minus-away margin. Spelled out so the model never has to
 *  read a spread's sign convention. */
function favorite(game: Prediction, homeMinusAway: number): string {
  const points = Math.abs(homeMinusAway).toFixed(1);
  if (points === '0.0') return 'neither team';
  const team = homeMinusAway > 0 ? game.homeTeam : game.awayTeam;
  return `${team} by ${points}`;
}

/** One game as the model reads it. */
function describe(game: Prediction, news: string): string {
  const { homeTeam, awayTeam, spreadClose } = game;
  const market =
    spreadClose === null
      ? 'Market: no line posted.'
      : `Market favors ${favorite(game, spreadClose)}. ` +
        `Compared with the model, the market leans toward ${favorite(game, spreadClose - game.predMean)}.`;
  return [
    `${awayTeam} (${teamName(awayTeam)}) at ${homeTeam} (${teamName(homeTeam)}), ${kickoffLabel(game.kickoff)}`,
    `Projected starting QBs: ${game.awayQb ?? 'not named'} (${awayTeam}), ${game.homeQb ?? 'not named'} (${homeTeam})`,
    `Model favors ${favorite(game, game.predMean)}. ${market}`,
    `Team strength vs league average: ${homeTeam} ${signed(game.homeStrength)}, ${awayTeam} ${signed(game.awayStrength)}.`,
    `Points toward ${homeTeam}: home field ${signed(game.homeField)}, QB effect ${signed(game.qbEffect)}.`,
    `News:\n${news || 'No results.'}`,
  ].join('\n');
}

/** Ends the prompt: with a long slate, the model otherwise tends to drop games. */
function checklist(games: Prediction[]): string {
  const matchups = games.map((game) => `${game.awayTeam} at ${game.homeTeam}`).join(', ');
  return `Write exactly ${games.length} entries, one for each game: ${matchups}.`;
}

/** Keep the reply's entries that name a game we asked about. */
function parseReply(reply: string, games: Prediction[]): GameInsight[] {
  const { games: entries } = JSON.parse(reply) as { games: GameInsight[] };
  return entries.filter((entry) =>
    games.some((game) => game.homeTeam === entry.homeTeam && game.awayTeam === entry.awayTeam),
  );
}

/** Search the news for each game and ask the model for the slate's insights.
 *
 * Any failure (a search, the model call, or an unreadable reply) logs a warning and
 * returns no insights, so the site still ships, just without them.
 */
export async function generateInsights(
  games: Prediction[],
  search: Search,
  complete: Complete,
): Promise<GameInsight[]> {
  if (games.length === 0) return [];
  try {
    const news = await Promise.all(games.map((game) => search(searchQuery(game))));
    const described = games.map((game, i) => describe(game, news[i] ?? ''));
    const user = [...described, checklist(games)].join('\n\n');
    return parseReply(await complete(SYSTEM_PROMPT, user), games);
  } catch (error) {
    console.warn(`insights: skipped, ${error}`);
    return [];
  }
}
