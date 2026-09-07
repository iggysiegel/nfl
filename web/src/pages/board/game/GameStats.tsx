import { StatBlock } from '@/components/StatBlock';
import type { Game } from '@/data/types';
import { DASH, kickoffLabel, marketSpread, percent } from '@/lib/format';
import { weekLabel } from '@/lib/weekLabel';
import s from './GameStats.module.css';

export function GameStats({ game }: { game: Game }) {
  const value = game.confidence;
  return (
    <div className={s.stats}>
      <span className={s.when}>
        {kickoffLabel(game.kickoff)} · {weekLabel(game.season, game.week).toLowerCase()}
      </span>
      <div className={s.blocks}>
        <StatBlock
          label="Market"
          value={game.spreadClose === null ? DASH : marketSpread(game.homeTeam, game.spreadClose)}
        />
        <StatBlock label="Model" value={marketSpread(game.homeTeam, game.predMean)} />
        <StatBlock label="Confidence" value={value === null ? DASH : percent(value)} />
      </div>
    </div>
  );
}
