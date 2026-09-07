import { useMemo, useState } from 'react';
import { SegmentedControl } from '@/components/SegmentedControl';
import { board } from '@/data';
import { BoardHeader } from './BoardHeader';
import s from './BoardPage.module.css';
import { BoardTable } from './BoardTable';
import { EmptyBoard } from './EmptyBoard';
import { GameDialog } from './game/GameDialog';
import { sortGames, type SortKey } from './sortGames';

const SORT_OPTIONS = [
  { value: 'confidence', label: 'Disagreement' },
  { value: 'kickoff', label: 'Kickoff' },
] as const satisfies readonly { value: SortKey; label: string }[];

export function BoardPage() {
  const [sort, setSort] = useState<SortKey>('confidence');
  const [openGameId, setOpenGameId] = useState<string | null>(null);

  const games = useMemo(() => sortGames(board.games, sort), [sort]);
  const openGame = board.games.find((game) => game.gameId === openGameId) ?? null;

  return (
    <main className={s.page}>
      <BoardHeader
        season={board.season}
        week={board.week}
        generatedAt={board.generatedAt}
        seasonAts={board.seasonAts}
      />

      {games.length === 0 ? (
        <EmptyBoard />
      ) : (
        <>
          <SegmentedControl options={SORT_OPTIONS} value={sort} onChange={setSort} size="sm" />
          <BoardTable games={games} onOpen={setOpenGameId} />
        </>
      )}

      <GameDialog game={openGame} onClose={() => setOpenGameId(null)} />
    </main>
  );
}
