import { Dialog } from '@/components/Dialog';
import { PosteriorChart } from '@/components/PosteriorChart';
import type { Game } from '@/data/types';
import { marketSpread } from '@/lib/format';
import { ContributionTable } from './ContributionTable';
import s from './GameDialog.module.css';
import { GameFootnotes } from './GameFootnotes';
import { GameStats } from './GameStats';

export function GameDialog({ game, onClose }: { game: Game | null; onClose: () => void }) {
  if (!game) return null;
  return (
    <Dialog open title={`${game.awayTeam} at ${game.homeTeam}`} onClose={onClose} width={680}>
      <div className={s.content}>
        <GameStats game={game} />

        <div className={s.section}>
          <span className="label">Predictive distribution</span>
          <PosteriorChart
            mean={-game.predMean}
            sd={game.predSd}
            marketLine={game.spreadClose === null ? null : -game.spreadClose}
            modelLabel={marketSpread(game.homeTeam, game.predMean)}
            marketLabel={
              game.spreadClose === null ? undefined : marketSpread(game.homeTeam, game.spreadClose)
            }
            width={620}
            height={150}
          />
        </div>

        <div className={s.breakdown}>
          <span className="label">Contributions to the spread</span>
          <span className={s.note}>
            Points relative to league average. The edge column is what reaches the spread.
          </span>
          <ContributionTable game={game} />
          <GameFootnotes game={game} />
        </div>
      </div>
    </Dialog>
  );
}
