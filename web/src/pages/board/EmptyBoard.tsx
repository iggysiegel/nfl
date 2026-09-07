import s from './EmptyBoard.module.css';

/** The offseason, and the gap between a season's last game and the next schedule. */
export function EmptyBoard() {
  return (
    <section className={`card ${s.empty}`}>
      <span className={s.title}>No games this week</span>
      <span className={s.note}>The model runs again once the next slate is scheduled.</span>
    </section>
  );
}
