import numpy as np
from dataclasses import dataclass
from typing import Optional
from .engine import SimResults


@dataclass
class RiskMetrics:
    # Session outcome counts
    n_sessions: int
    bust_count: int
    win_count: int
    inconclusive_count: int          # max rounds hit without bust or win

    # Rates
    bust_rate: float                 # fraction that went bust
    win_rate: float                  # fraction that hit target
    inconclusive_rate: float

    # Bankroll stats (final bankroll across all sessions)
    mean_final_bankroll: float
    median_final_bankroll: float
    std_final_bankroll: float

    # Expected value (relative to initial bankroll)
    ev: float                        # mean final / initial - 1 (e.g. -0.03 = -3%)
    ev_absolute: float               # mean final bankroll - initial bankroll

    # Drawdown (peak-to-trough within each session)
    mean_max_drawdown: float         # avg of per-session max drawdown (absolute $)
    median_max_drawdown: float
    worst_max_drawdown: float        # single worst session drawdown

    mean_max_drawdown_pct: float     # as % of initial bankroll
    worst_max_drawdown_pct: float

    # Rounds stats
    median_rounds_to_bust: Optional[float]
    median_rounds_to_win: Optional[float]
    mean_rounds_to_bust: Optional[float]
    mean_rounds_to_win: Optional[float]

    # Longest losing streak across all sessions
    mean_max_losing_streak: float
    worst_max_losing_streak: int

    # Consecutive loss risk: how often did a session face N losses in a row?
    # dict: streak_length -> fraction of sessions that experienced it
    losing_streak_exposure: dict


def compute_metrics(results: SimResults) -> RiskMetrics:
    config = results.config
    N = config.n_sessions
    initial = config.initial_bankroll

    final_bankroll = results.bankroll[:, -1]

    # --- Outcome classification ---
    # bust: ended at zero; win: ended with more than started; inconclusive: broke even or below but not bust
    busted = final_bankroll == 0.0
    won = final_bankroll > initial
    inconclusive = ~busted & ~won  # alive but down or flat

    bust_count = int(busted.sum())
    win_count = int(won.sum())
    inconclusive_count = int(inconclusive.sum())

    # --- EV ---
    mean_final = float(final_bankroll.mean())
    ev = (mean_final - initial) / initial
    ev_absolute = mean_final - initial

    # --- Max drawdown per session ---
    # Standard definition: largest peak-to-trough drop as % of the peak at that point.
    # Using only the active span avoids the forward-filled post-termination flat line
    # inflating peak values for busted sessions.
    active_bankroll = np.where(results.active, results.bankroll[:, 1:], np.nan)  # (N, M)
    # prepend round-0 bankroll so peak accumulation starts from the initial value
    bankroll_active = np.concatenate([results.bankroll[:, :1], active_bankroll], axis=1)  # (N, M+1)

    running_peak = np.fmax.accumulate(bankroll_active, axis=1)   # fmax ignores NaN
    drawdown_abs = running_peak - bankroll_active                 # absolute $ drop
    # As % of the peak at each point (standard MDD definition, always 0–100%)
    with np.errstate(invalid="ignore", divide="ignore"):
        drawdown_pct = np.where(running_peak > 0, drawdown_abs / running_peak * 100, 0.0)

    max_drawdown = np.nanmax(drawdown_abs, axis=1)       # worst absolute $ drop per session
    max_drawdown_pct = np.nanmax(drawdown_pct, axis=1)   # worst % drop per session

    # --- Losing streaks ---
    # outcomes: True=win, False=loss; inactive rounds are False (no problem, streak resets on win)
    # We only consider active rounds to avoid padding zeros inflating streaks
    active = results.active  # (N, M)
    outcomes = results.outcome  # (N, M) bool

    max_streaks = _compute_max_losing_streaks(outcomes, active)

    # Streak exposure: for each threshold, what fraction of sessions hit that streak?
    thresholds = [3, 5, 7, 10, 15, 20]
    streak_exposure = {
        str(t): float((max_streaks >= t).mean()) for t in thresholds
    }

    # --- Rounds to terminal events ---
    # bust_round / win_round are set by the engine only when the event actually occurred (-1 otherwise)
    hit_bust = results.bust_round >= 0
    hit_target = results.win_round >= 0
    bust_rounds = results.bust_round[hit_bust].astype(float) if hit_bust.any() else None
    win_rounds = results.win_round[hit_target].astype(float) if hit_target.any() else None

    return RiskMetrics(
        n_sessions=N,
        bust_count=bust_count,
        win_count=win_count,
        inconclusive_count=inconclusive_count,
        bust_rate=bust_count / N,
        win_rate=win_count / N,
        inconclusive_rate=inconclusive_count / N,
        mean_final_bankroll=mean_final,
        median_final_bankroll=float(np.median(final_bankroll)),
        std_final_bankroll=float(final_bankroll.std()),
        ev=ev,
        ev_absolute=ev_absolute,
        mean_max_drawdown=float(max_drawdown.mean()),
        median_max_drawdown=float(np.median(max_drawdown)),
        worst_max_drawdown=float(max_drawdown.max()),
        mean_max_drawdown_pct=float(max_drawdown_pct.mean()),
        worst_max_drawdown_pct=float(max_drawdown_pct.max()),
        median_rounds_to_bust=float(np.median(bust_rounds)) if bust_rounds is not None else None,
        median_rounds_to_win=float(np.median(win_rounds)) if win_rounds is not None else None,
        mean_rounds_to_bust=float(bust_rounds.mean()) if bust_rounds is not None else None,
        mean_rounds_to_win=float(win_rounds.mean()) if win_rounds is not None else None,
        mean_max_losing_streak=float(max_streaks.mean()),
        worst_max_losing_streak=int(max_streaks.max()),
        losing_streak_exposure=streak_exposure,
    )


def _compute_max_losing_streaks(outcomes: np.ndarray, active: np.ndarray) -> np.ndarray:
    """
    Compute max consecutive losses per session, counting only active rounds.
    outcomes: (N, M) bool — True=win
    active:   (N, M) bool
    Returns:  (N,) int
    """
    N, M = outcomes.shape
    # Losses in active rounds; inactive rounds treated as streak-break (win)
    losses = active & ~outcomes  # True = active loss

    max_streaks = np.zeros(N, dtype=np.int32)
    current_streak = np.zeros(N, dtype=np.int32)

    for r in range(M):
        current_streak = np.where(losses[:, r], current_streak + 1, 0)
        max_streaks = np.maximum(max_streaks, current_streak)

    return max_streaks


def bankroll_percentiles(results: SimResults, percentiles: list[int] = None) -> dict:
    """
    Returns bankroll at each round for given percentiles across sessions.
    Useful for fan charts. Returns dict: percentile -> (n_rounds+1,) array.
    """
    if percentiles is None:
        percentiles = [5, 25, 50, 75, 95]
    out = {}
    for p in percentiles:
        out[p] = np.percentile(results.bankroll, p, axis=0).tolist()
    return out


def _sample_indices(results: SimResults, n: int, seed: int = 42) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.choice(results.config.n_sessions, size=min(n, results.config.n_sessions), replace=False)


def _clip(values: np.ndarray, active: np.ndarray) -> list:
    """
    Clip a per-round array to the session's active span, filling the tail with None.
    This prevents terminated sessions leaving flat ghost lines on the chart.
    values: length n_rounds+1 (bankroll) or n_rounds (bet)
    active: length n_rounds — True for rounds the session played
    """
    active_idx = np.where(active)[0]
    # last index into `values` we want to show:
    #   bankroll: include the value *after* the last active round (terminal balance)
    #   bet:      include only up to and including the last active round
    offset = 1 if len(values) == len(active) + 1 else 0
    last = (int(active_idx[-1]) + offset) if len(active_idx) > 0 else 0
    return values[:last + 1].tolist() + [None] * (len(values) - last - 1)


def sampled_sessions(results: SimResults, n: int = 50, seed: int = 42) -> tuple[np.ndarray, list[list]]:
    """
    Returns (indices, bankroll_traces) for N randomly sampled sessions.
    Traces are clipped at termination — null-filled after the session ends.
    """
    idx = _sample_indices(results, n, seed)
    traces = [_clip(results.bankroll[i], results.active[i]) for i in idx]
    return idx, traces


def sampled_bets(results: SimResults, idx: np.ndarray) -> list[list]:
    """Bet-size traces for the given session indices, clipped at termination."""
    return [_clip(results.bet[i], results.active[i]) for i in idx]


def terminal_histogram(results: SimResults, n_bins: int = 40) -> dict:
    """
    Histogram of final bankroll values across all sessions.
    Bust sessions (0) are counted separately so they don't skew the bins.
    Returns: { bin_edges, counts, bust_count, initial_bankroll }
    """
    final = results.bankroll[:, -1]
    initial = results.config.initial_bankroll

    bust_mask = final == 0.0
    bust_count = int(bust_mask.sum())
    survivors = final[~bust_mask]

    if len(survivors) == 0:
        return {
            "bin_edges": [0.0],
            "counts": [],
            "bust_count": bust_count,
            "initial_bankroll": initial,
        }

    counts, edges = np.histogram(survivors, bins=n_bins)
    return {
        "bin_edges": edges.tolist(),
        "counts": counts.tolist(),
        "bust_count": bust_count,
        "initial_bankroll": initial,
    }
