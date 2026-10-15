/* Write a short paragraph per upcoming game on injuries and news the model cannot see.
 *
 * A pipeline, not an agent: one injury report for the league, one news search per game,
 * then one chat call for the whole slate. Each is passed in as a plain function, so any
 * source and any OpenAI-compatible model can stand behind them, and tests can stub them.
 */
import type { GameInsight, Prediction } from '@/data/types';
import { kickoffLabel } from '@/lib/format';
import { weekLabel } from '@/lib/weekLabel';
import { TEAM_NAMES } from './teams';

/** Returns this week's injury lines for every team, keyed by team code. */
export type Injuries = () => Promise<Record<string, string[]>>;

/** Runs one news search and returns the results as plain text. */
export type Search = (query: string) => Promise<string>;

/** Sends a system and a user prompt to a chat model and returns its JSON reply. */
export type Complete = (system: string, user: string) => Promise<string>;

/** Like `Complete`, for the named model. */
export type AskModel = (model: string, system: string, user: string) => Promise<string>;

/** An overloaded model can return 503s for hours, longer than the client's own retries,
 *  so the whole model list is tried again after a wait. */
const MODEL_ROUNDS = 3;
const ROUND_WAIT_MS = 5 * 60 * 1000;

const NOTHING_NEW = 'Neither team reports a notable absence or news the model cannot see.';

const MAX_WORDS = 100;

const SYSTEM_PROMPT = `You write the "AI Insights" note for each game on a website that shows an NFL prediction model's point spreads next to the betting market's.

About the model:
- It rates each team's overall strength from past results, adds a home-field advantage, and adjusts for each team's projected starting quarterback using a quarterback rating.
- It knows nothing else. It cannot see injuries or absences at any other position, suspensions, trades, weather, rest, travel, or coaching changes.
- A player who has been out for several games is already partly reflected in the team's results. A new absence is not reflected at all.

The note is a neutral briefing on what the model cannot see. Readers weigh the model against the market themselves, so the note describes and never judges: it does not say which team the news favors or hurts more, which team the model overrates or underrates, or which side to take.

For each game you get its kickoff, the projected starting quarterbacks, each team's injury list, and news from the past week. Each injury line gives the player's position, name, status, injury, the date of its latest update, and a short note.

Write two or three sentences, at most ${MAX_WORDS} words, covering both teams:
1. Name the absences that matter most on each side, and what each changes on the field. Favor new absences over ones that have lasted several games.
2. If a projected starting quarterback is out or doubtful, or the news names a different starter, lead with that: the model's quarterback adjustment is then wrong.
3. Add other news only if the model cannot see it, such as a suspension, a trade, a coaching change, or severe weather.

Rules:
- Take each player's status from the injury list; it is more current than the news. Use the news only for what the list does not cover.
- Use only facts from the injury lists and news. You may use general knowledge to judge how much a listed player matters, but do not add players, injuries, or roster moves from memory; your knowledge of rosters may be out of date.
- Never mention spreads, odds, ratings, predictions, picks, or fantasy advice, even when the news does. Ignore news about other teams, other games, or earlier seasons.
- Write plain prose with no markdown or lists, and add no disclaimers about betting.
- Vary your wording from game to game.
- If neither team has a notable absence and the news holds nothing the model cannot see, write exactly: "${NOTHING_NEW}"

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

/** Injuries come from the injury report, so the search asks for the rest of the news.
 *  Naming the week steers it to this week's game. */
function searchQuery(game: Prediction): string {
  const week = weekLabel(game.season, game.week);
  return `${teamName(game.awayTeam)} at ${teamName(game.homeTeam)} ${game.season} ${week} news`;
}

/** One game as the model reads it. No spreads or ratings, so it has no side to argue. */
function describe(game: Prediction, injuries: Record<string, string[]>, news: string): string {
  const { homeTeam, awayTeam } = game;
  const injuryList = (team: string) => `${team} injuries:\n${injuries[team]?.join('\n') || 'None listed.'}`;
  return [
    // The date lets the model tell a new absence from an old one by the injury dates.
    `${awayTeam} (${teamName(awayTeam)}) at ${homeTeam} (${teamName(homeTeam)}), ${game.kickoff.slice(0, 10)} ${kickoffLabel(game.kickoff)}`,
    `Projected starting QBs: ${game.awayQb ?? 'not named'} (${awayTeam}), ${game.homeQb ?? 'not named'} (${homeTeam})`,
    injuryList(awayTeam),
    injuryList(homeTeam),
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ask each model in turn until one answers, starting over after a wait.
 *
 * The news is searched before the first ask, so going round again spends no searches.
 */
export function withFallback(ask: AskModel, models: string[]): Complete {
  return async (system, user) => {
    for (let round = 1; round <= MODEL_ROUNDS; round++) {
      if (round > 1) await sleep(ROUND_WAIT_MS);
      for (const model of models) {
        try {
          const reply = await ask(model, system, user);
          console.log(`insights: written by ${model}`);
          return reply;
        } catch (error) {
          console.warn(`insights: ${model} failed in round ${round} of ${MODEL_ROUNDS}, ${error}`);
        }
      }
    }
    throw new Error(`no model answered in ${MODEL_ROUNDS} rounds`);
  };
}

/** Read the injuries, search the news for each game, and ask for the slate's insights.
 *
 * Any failure (the injuries, a search, the model call, or an unreadable reply) logs a
 * warning and returns no insights, so the site still ships, just without them. The
 * injuries come first, so a failure there spends no searches.
 */
export async function generateInsights(
  games: Prediction[],
  injuries: Injuries,
  search: Search,
  complete: Complete,
): Promise<GameInsight[]> {
  if (games.length === 0) return [];
  try {
    const injured = await injuries();
    const news = await Promise.all(games.map((game) => search(searchQuery(game))));
    const described = games.map((game, i) => describe(game, injured, news[i] ?? ''));
    const user = [...described, checklist(games)].join('\n\n');
    return parseReply(await complete(SYSTEM_PROMPT, user), games);
  } catch (error) {
    console.warn(`insights: skipped, ${error}`);
    return [];
  }
}
