/* Write the AI insights for the board's upcoming games to src/data/insights.json.
 *
 * Usage: npm run build:insights
 * The deploy runs it before `npm run build`; local builds never call it on their own.
 * Reads LLM_BASE_URL, LLM_MODEL, LLM_API_KEY and TAVILY_API_KEY. Without them, or when
 * nothing comes back, it writes nothing and the site ships without insights.
 */
import { writeFileSync } from 'node:fs';
import OpenAI from 'openai';
import type { SlateInsights } from '@/data/types';
import { latestWeek, weekGames } from './aggregate';
import { type Complete, generateInsights, INSIGHTS_SCHEMA, type Search, upcoming } from './insights';
import { INSIGHTS_PATH, PREDICTIONS_DIR } from './paths';
import { readPredictions } from './readPredictions';

const TAVILY_URL = 'https://api.tavily.com/search';
const RESULTS_PER_GAME = 8;

interface TavilyResult {
  title: string;
  content: string;
  published_date?: string;
}

function tavilySearch(apiKey: string): Search {
  return async (query) => {
    const response = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, topic: 'news', time_range: 'week', max_results: RESULTS_PER_GAME }),
    });
    if (!response.ok) throw new Error(`Tavily returned ${response.status}: ${await response.text()}`);
    const { results } = (await response.json()) as { results: TavilyResult[] };
    // The date lets the model prefer the latest report when two disagree.
    return results
      .map((result) => `- ${result.title} (${result.published_date ?? 'undated'}): ${result.content}`)
      .join('\n');
  };
}

function chatComplete(client: OpenAI, model: string): Complete {
  return async (system, user) => {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'insights', schema: INSIGHTS_SCHEMA, strict: true },
      },
    });
    const reply = completion.choices[0]?.message.content;
    if (!reply) throw new Error('the model returned no content');
    return reply;
  };
}

const { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY, TAVILY_API_KEY } = process.env;

if (!LLM_MODEL || !LLM_API_KEY || !TAVILY_API_KEY) {
  console.log('insights: LLM_MODEL, LLM_API_KEY or TAVILY_API_KEY not set, skipping');
} else {
  const predictions = readPredictions(PREDICTIONS_DIR);
  const week = latestWeek(predictions);
  const games = upcoming(weekGames(predictions, week), new Date());
  // An unset GitHub variable arrives as '', which the client would take as a URL.
  const client = new OpenAI({ apiKey: LLM_API_KEY, baseURL: LLM_BASE_URL || undefined });
  const insights = await generateInsights(
    games,
    tavilySearch(TAVILY_API_KEY),
    chatComplete(client, LLM_MODEL),
  );

  if (insights.length > 0) {
    const slate: SlateInsights = { ...week, games: insights };
    writeFileSync(INSIGHTS_PATH, `${JSON.stringify(slate)}\n`);
  }
  console.log(`insights: ${insights.length} of ${games.length} upcoming games`);
}
