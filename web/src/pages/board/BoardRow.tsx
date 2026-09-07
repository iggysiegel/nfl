import { ProbBar } from '@/components/ProbBar';
import type { Game } from '@/data/types';
import { isBet } from '@/lib/ats';
import { edge, modelSide } from '@/lib/confidence';
import { DASH, kickoffLabel, kickoffShort, marketSpread, percent } from '@/lib/format';
import s from './BoardRow.module.css';

interface BoardRowProps {
  game: Game;
  onOpen: (gameId: string) => void;
}

export function BoardRow({ game, onOpen }: BoardRowProps) {
  const value = game.confidence;
  const disagreement = edge(game);
  // Most games are not bet, and an unbet game gets no accent anywhere on the row.
  const live = isBet(value);
  const side = live ? modelSide(game) : null;
  const tone = live ? s.live : s.quiet;
  const bar = (isSide: boolean) => `${s.bar} ${isSide ? s.barOn : ''}`;

  return (
    <tr className={s.row} onClick={() => onOpen(game.gameId)}>
      <td className={s.cell}>
        {/* The row is the mouse target; this button is how a keyboard reaches it. It
            needs no handler of its own — Enter and Space fire a click that bubbles. */}
        <button type="button" className={s.open} aria-label={`${game.awayTeam} at ${game.homeTeam}`}>
          <span className={s.matchup}>
            <span className={s.teams}>
              <span className={bar(side === 'away')} />
              <span className={s.team}>{game.awayTeam}</span>
              <span className={s.at}>at</span>
              <span className={bar(side === 'home')} />
              <span className={s.team}>{game.homeTeam}</span>
            </span>
            <span className={s.kickoff}>
              <span className={s.long}>{kickoffLabel(game.kickoff)}</span>
              <span className={s.short}>{kickoffShort(game.kickoff)}</span>
            </span>
          </span>
        </button>
      </td>
      <td className={`${s.numeric} ${s.market}`}>
        {game.spreadClose === null ? DASH : marketSpread(game.homeTeam, game.spreadClose)}
      </td>
      <td className={`${s.numeric} ${s.model}`}>{marketSpread(game.homeTeam, game.predMean)}</td>
      <td className={`${s.numeric} ${s.disagreement} ${tone}`}>
        {disagreement === null ? DASH : `${Math.abs(disagreement).toFixed(1)} pts`}
      </td>
      <td className={s.cell}>
        <span className={s.confidence}>
          <span className={`${s.value} ${tone}`}>{value === null ? DASH : percent(value)}</span>
          {value !== null && (
            <ProbBar value={value * 100} tone={live ? 'accent' : 'neutral'} className={s.probBar} />
          )}
        </span>
      </td>
    </tr>
  );
}
