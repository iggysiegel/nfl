// The regular season went from 17 weeks to 18 in 2021, so the playoff rounds sit one
// week later from then on: week 18 is Wild Card in 2020 but a regular week in 2024.
const FIRST_18_WEEK_SEASON = 2021;
const ROUNDS = ['Wild Card', 'Divisional Round', 'Conference Championships', 'Super Bowl'];

export function weekLabel(season: number, week: number): string {
  const regularWeeks = season >= FIRST_18_WEEK_SEASON ? 18 : 17;
  return ROUNDS[week - regularWeeks - 1] ?? `Week ${week}`;
}
