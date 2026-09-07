import { useState } from 'react';
import { SegmentedControl } from '@/components/SegmentedControl';
import { BREAK_EVEN } from '@/config';
import { history } from '@/data';
import type { MarketLine } from '@/data/types';
import { precisePercent } from '@/lib/format';
import s from './AboutPage.module.css';
import { ConfidenceBandChart } from './ConfidenceBandChart';
import { ConfidenceFigure } from './ConfidenceFigure';
import { SeasonTable } from './SeasonTable';

const LINE_OPTIONS = [
  { value: 'closing', label: 'Closing' },
  { value: 'opening', label: 'Opening' },
] as const satisfies readonly { value: MarketLine; label: string }[];

/* All of the site's prose lives here. Headings and paragraphs take their styling from
   AboutPage.module.css, so the words can be edited without touching anything else. */
export function AboutPage() {
  const [line, setLine] = useState<MarketLine>('closing');

  return (
    <main className={s.page}>
      <article className={s.article}>
        <h1>About This Site</h1>
        <p>
          This website is a personal project for predicting NFL game outcomes compared to market
          odds. The site updates every Tuesday afternoon and pulls in the latest odds daily. Check
          out the Games page to see the latest predictions. Check out the data branch of the GitHub
          repo to see the model's historical predictions going back to 2015.
        </p>

        <h2>Overview</h2>
        <p>
          The underlying prediction model is based on the work of Glickman-Stern, which develops a
          Bayesian state-space model that tracks team strengths as they evolve over time, accounting
          for both week-to-week changes due to injuries, and season-to-season changes due to roster
          turnover.
        </p>
        <p>
          I think the biggest weakness of the original model is its inability to capture individual
          quarterback effects. When Patrick Mahomes is injured, the model does not immediately
          recognize the injury or know how much to penalize the Kansas City Chiefs for that injury.
          It takes several weeks for the team strengths to adjust. By the time Mahomes is back, the
          model has the opposite problem underestimating the Chiefs. In my extension of the model, I
          add a quarterback term to immediately capture changes at the position.
        </p>

        <h2>Confidence</h2>
        <p>
          Unlike simpler rating systems, the fully Bayesian model has an advantage. Instead of a
          single point estimate for the outcome of a game, there is a full distribution of outcomes
          that represents the probability of different outcomes occurring. The following figure
          represents this idea.
        </p>
        <div className={s.chart}>
          <div className={s.chartHead}>
            <span className="label">Example: Spread within Model's Predicted Distribution</span>
          </div>
          <ConfidenceFigure />
        </div>
        <p>
          The blue curve represents the model's probability distribution of outcomes, and the dashed
          red line shows where the actual market odds fall within that distribution. In this
          example, the market odds lie far to the right of the model's predicted distribution. This
          indicates that the market may be overestimating the home team's advantage, and the model
          would favor a bet on the away team. To express this idea in a more precise way, the site
          uses a metric called confidence with values ranging from zero to one representing the
          magnitude of difference between the model's prediction and the market odds.
        </p>

        <h2>Results</h2>
        <p>
          To test whether confidence -- and the model in general -- is actually useful, let's see
          how it performs historically with the following betting strategy. Define a minimum
          confidence threshold (side note, my threshold optimizations found 20% to be the best
          number). Only games where the model's confidence exceeds this threshold are considered for
          betting. For each qualifying game, bet on whichever team the model favors. Compute against
          the spread (ATS) accuracy using actual game results.
        </p>
        <p>
          If the model is useful, we would expect to see high performance at high confidence. The
          following figure shows the results of the betting simulation using historical data
          starting in 2015.
        </p>
        <div className={s.chart}>
          <div className={s.chartHead}>
            <span className="label">ATS cover rate by model confidence</span>
            <div className={s.chartControls}>
              <SegmentedControl options={LINE_OPTIONS} value={line} onChange={setLine} size="sm" />
              <span className={s.breakEven}>-- break-even {precisePercent(BREAK_EVEN)}</span>
            </div>
          </div>
          <ConfidenceBandChart bands={history.bands[line]} />
        </div>
        <p>
          As seen in the figure, ATS accuracy generally increases as model confidence increases. The
          figure also shows the model does a much better job predicting against the opening odds
          than it does against the closing odds. However, there is a caveat to the opening odds
          performance. Due to data availability, I was only able to find quarterback data for the
          player that actually started the game. In other words, the opening odds performance is
          probably inflated in games where the market did not know which quarterback was going to
          start.
        </p>
        <p>
          The chart also shows how few games qualify for betting. At the 20% confidence cutoff,
          there are only about two bets in a typical week. It also shows the amount of variability
          in betting. A small edge might take multiple seasons to be profitable.
        </p>
        <SeasonTable seasons={history.seasons} allTime={history.allTime} />

        <h2>Future Work</h2>
        <p>
          The model shows signal but is far from a perfect system. It does not account for
          situational factors like rest advantage or travel, it does not account for mid-week
          developments or motivational factors such as if a team has been eliminated from the
          playoffs, and probably most importantly, it does not account for injuries to any positions
          other than quarterback. In the future I'd like to implement some time series deep learning
          approaches that could capture interactions between features. But this is ultimately a
          tough problem finding the right data. In the meantime there is something nice about having
          a simple, interpretable model.
        </p>
        <p>
          In my opinion, the market odds seem extremely efficient, especially toward the end of the
          week. I'm not entirely a believer in the efficient market hypothesis, but I also think
          there are better places to search than the NFL spread. As a disclaimer, this project is
          purely for personal interest. I do not encourage sports betting and if you are using the
          website to sports bet proceed carefully. This is a simple model that just tracks team
          strengths well. When unusual circumstances arise, it's best to either skip the game
          entirely or adjust your confidence accordingly. Simple statistical models work best under
          "normal" conditions where historical patterns prevail.
        </p>
      </article>
    </main>
  );
}
