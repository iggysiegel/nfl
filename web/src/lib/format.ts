/** The em dash the site shows wherever a number does not exist. */
export const DASH = '—';

const KICKOFF_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** A signed, one-decimal number: "+3.5", "-1.0", "0.0". */
export function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

/** A spread in market convention, where a favoured home team shows negative. */
export function marketSpread(homeTeam: string, homeMinusAway: number): string {
  return `${homeTeam} ${signed(-homeMinusAway)}`;
}

/** A [0, 1] share as a whole percent. */
export function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** A one-decimal percent, for rates read closely against a break-even line. */
export function precisePercent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

/** "Sun 4:25pm ET" — lowercase meridiem, no leading zero on the hour. */
export function kickoffLabel(iso: string): string {
  const parts = new Map(KICKOFF_PARTS.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  const meridiem = (parts.get('dayPeriod') ?? '').toLowerCase();
  return `${parts.get('weekday')} ${parts.get('hour')}:${parts.get('minute')}${meridiem} ET`;
}

/** "Sun 1pm" — the same stamp with the timezone and a round hour's minutes dropped. */
export function kickoffShort(iso: string): string {
  return kickoffLabel(iso).replace(/ ET$/, '').replace(':00', '');
}

/** "141–120", em-dashed the way the design system writes records. */
export function recordLabel(wins: number, losses: number): string {
  return `${wins}–${losses}`;
}

const UPDATED_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "tue sep 16, 7:10am ET" — the board's quiet last-updated stamp. */
export function updatedLabel(iso: string): string {
  const parts = new Map(UPDATED_PARTS.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  // Everything is lowercase except the timezone, which the design system capitalises.
  const weekday = (parts.get('weekday') ?? '').toLowerCase();
  const month = (parts.get('month') ?? '').toLowerCase();
  const meridiem = (parts.get('dayPeriod') ?? '').toLowerCase();
  return `${weekday} ${month} ${parts.get('day')}, ${parts.get('hour')}:${parts.get('minute')}${meridiem} ET`;
}

/** "HOU 1.9" — which side a contribution favours, and by how much.
 *
 * A dash when it rounds to nothing, which covers both a neutral site's home-field row
 * and an unrated quarterback without either needing a special case at the call site.
 */
export function edgeLabel(edge: number, homeTeam: string, awayTeam: string): string {
  if (Math.abs(edge) < 0.05) return '—';
  return `${edge > 0 ? homeTeam : awayTeam} ${Math.abs(edge).toFixed(1)}`;
}
