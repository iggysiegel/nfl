"""Terminal report for a week's predictions.

Internally every margin-like quantity is home-minus-away; for display the signs are
flipped to the market convention (a favored home team shows a negative spread).
"""

import pandas as pd


class Formatter:
    """Render a week's prediction table for the terminal."""

    def confidence(self, row: pd.Series) -> float:
        """How far the market spread sits from the center of the model's distribution.

        Uses the share of the game's predicted percentiles below the closing spread:
        0 means the market agrees with the model's median, 1 means the market is
        outside the model's whole distribution.

        Args:
            row: A prediction row with ``spread_line`` and the quantile grid.

        Returns:
            A confidence in [0, 1], or NaN when the game has no closing spread.
        """
        if pd.isna(row["spread_line"]):
            return float("nan")
        percentiles = row[[f"q{p:02d}" for p in range(1, 100)]].to_numpy(dtype=float)
        below = (percentiles < row["spread_line"]).mean()
        return abs(2 * below - 1)

    def print_report(self, predictions: pd.DataFrame) -> None:
        """Print one week of predictions, most confident first.

        Args:
            predictions: A week's table from ``predict.predict_week``.
        """
        games = predictions.copy()
        games["confidence"] = games.apply(self.confidence, axis=1)
        games = games.sort_values("confidence", ascending=False, na_position="last")

        season = int(games["season"].iloc[0])
        week = int(games["week"].iloc[0])
        print(f"\n{season} Week {week} Predictions")
        print("=" * 62)
        print(f"{'MATCHUP':<24}{'MARKET':>10}{'MODEL':>10}{'CONFIDENCE':>14}")
        print("-" * 62)
        for _, row in games.iterrows():
            self._print_game(row)
        print("-" * 62)
        print("Spreads shown in market convention (negative = home favored).")

    def _print_game(self, row: pd.Series) -> None:
        """Print one game's line, then its spread split into the model's three terms.

        Args:
            row: One game's prediction.
        """
        home, away = row["home_team"], row["away_team"]
        matchup = f"{away} @ {home}"
        market = f"{-row['spread_line']:+.1f}" if pd.notna(row["spread_line"]) else "-"
        model = f"{-row['pred_mean']:+.1f}"
        confidence = f"{row['confidence']:.0%}" if pd.notna(row["confidence"]) else "-"
        print(f"{matchup:<24}{market:>10}{model:>10}{confidence:>14}")

        strength = self._edge(row["home_strength"] - row["away_strength"], home, away)
        qb = self._edge(row["qb_effect"], home, away)
        home_field = self._edge(row["home_field"], home, away)
        away_qb, home_qb = row[["away_qb_name", "home_qb_name"]].fillna("unnamed")
        starters = f"{away_qb} / {home_qb}"
        print(f"    strength {strength} | QB {qb} ({starters}) | home {home_field}")
        if pd.isna(row["home_qb_value"]) or pd.isna(row["away_qb_value"]):
            print("    WARNING: no QB rating for this game; QB signal is zero.")

    def _edge(self, edge: float, home: str, away: str) -> str:
        """A home-minus-away term as the team it favors and by how much.

        Args:
            edge: The term in points, home minus away.
            home: The home team.
            away: The away team.

        Returns:
            For example ``"DEN 1.7"``, or ``"-"`` when it rounds to 0.0.
        """
        points = f"{abs(edge):.1f}"
        if points == "0.0":
            return "-"
        return f"{home if edge > 0 else away} {points}"
