import type { Game } from '@/data/types';
import { BoardRow } from './BoardRow';
import s from './BoardTable.module.css';

interface BoardTableProps {
  games: Game[];
  onOpen: (gameId: string) => void;
}

export function BoardTable({ games, onOpen }: BoardTableProps) {
  return (
    <section className="card">
      <div className="scroll">
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.game}>Game</th>
              <th className={s.head}>
                <span className={s.long}>Market</span>
                <span className={s.short}>Mkt</span>
              </th>
              <th className={s.head}>Model</th>
              <th className={`${s.head} ${s.disagreement}`}>Disagreement</th>
              <th className={s.confidence}>
                <span className={s.long}>Confidence</span>
                <span className={s.short}>Conf</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <BoardRow key={game.gameId} game={game} onOpen={onOpen} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
