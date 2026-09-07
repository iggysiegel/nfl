/* Every number a human is expected to change lives here. Nothing else needs editing
   to retune how the site picks and reports bets. */

/** Where the source lives. Shown in the header, and the only external link on the site. */
export const REPO_URL = 'https://github.com/iggysiegel/nfl';

/* --- Betting rules ---
   Confidence is how far the market's line sits from the centre of the model's
   predictive distribution: 0 when the line lands on the model's median, 1 when it sits
   outside the model's whole distribution. */

/** The model backs a side only once confidence reaches this. Raise it to bet less often
 *  and more selectively, lower it to bet more. Must be one of `CONFIDENCE_CUTS`, so that
 *  every band is either wholly bet or wholly not; a test enforces that. */
export const BET_THRESHOLD = 0.2;

/** The cover rate needed to break even at standard -110 juice on both sides (11/21).
 *  Drawn as the baseline on the About page's chart. */
export const BREAK_EVEN = 0.524;

/** Lower bound of each confidence band on the About page's cover-rate chart, ascending
 *  and starting at 0. The final band runs open-ended to the top. Band labels, and which
 *  bands count as bets, are both derived from these — change the numbers and the page
 *  follows. */
export const CONFIDENCE_CUTS = [0, 0.05, 0.1, 0.15, 0.2];
