import type { Game } from '@/data/types';
import { hasQb, isNeutralSite } from './breakdown';
import s from './GameFootnotes.module.css';

/** The two states where a term is zero for a reason the reader cannot see. */
export function GameFootnotes({ game }: { game: Game }) {
  const notes: string[] = [];
  if (!hasQb(game)) {
    notes.push(
      'No starting quarterback listed for this game, so the quarterback adjustment is zero — the prediction is team strength and home field only.',
    );
  }
  if (isNeutralSite(game)) {
    notes.push('Played at a neutral site, so neither team gets the home-field term.');
  }

  return notes.map((note) => (
    <p key={note} className={s.note}>
      {note}
    </p>
  ));
}
