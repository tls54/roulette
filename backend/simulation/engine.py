import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class RouletteType(str, Enum):
    EUROPEAN = "european"  # 37 slots: 18 red, 18 black, 1 zero
    AMERICAN = "american"  # 38 slots: 18 red, 18 black, 2 zeros


class TerminationMode(str, Enum):
    MAX_ROUNDS = "max_rounds"
    ON_BUST = "on_bust"
    ON_WIN_TARGET = "on_win_target"
    ON_BUST_OR_WIN = "on_bust_or_win"


@dataclass
class SimConfig:
    n_sessions: int
    n_rounds: int
    initial_bankroll: float
    base_bet: float
    target_multiplier: float        # e.g. 2.0 → stop when bankroll >= 2x initial
    roulette_type: RouletteType
    termination_mode: TerminationMode
    seed: Optional[int] = None

    def __post_init__(self):
        if self.base_bet <= 0:
            raise ValueError("base_bet must be positive")
        if self.initial_bankroll <= 0:
            raise ValueError("initial_bankroll must be positive")
        if self.base_bet > self.initial_bankroll:
            raise ValueError("base_bet cannot exceed initial_bankroll")
        if self.target_multiplier <= 1.0:
            raise ValueError("target_multiplier must be > 1.0")

    @property
    def win_probability(self) -> float:
        return 18 / 37 if self.roulette_type == RouletteType.EUROPEAN else 18 / 38

    @property
    def target_bankroll(self) -> float:
        return self.initial_bankroll * self.target_multiplier

    @property
    def base_bet_pct(self) -> float:
        return self.base_bet / self.initial_bankroll * 100


@dataclass
class SimResults:
    """
    bankroll:  (n_sessions, n_rounds+1) — bankroll at start of each round + final state
    bet:       (n_sessions, n_rounds)   — bet placed each round (0 if session inactive)
    outcome:   (n_sessions, n_rounds)   — True = win, False = loss (False if inactive)
    active:    (n_sessions, n_rounds)   — True if session was live this round
    bust_round: (n_sessions,)           — round index of bust, -1 if never bust
    win_round:  (n_sessions,)           — round index of hitting target, -1 if never hit
    config: the config used
    """
    bankroll: np.ndarray
    bet: np.ndarray
    outcome: np.ndarray
    active: np.ndarray
    bust_round: np.ndarray
    win_round: np.ndarray
    config: SimConfig


def run_simulation(config: SimConfig) -> SimResults:
    """
    Vectorized martingale simulation (even/odd bet, 1:1 payout).

    Bust logic:
      - If bankroll < current_bet: go all-in (bet = bankroll)
      - If all-in and lose: bankroll = 0 → bust
      - If all-in and win: bankroll doubles, reset bet to base_bet

    Martingale:
      - Win: reset bet to base_bet
      - Lose (not all-in): double the bet
    """
    rng = np.random.default_rng(config.seed)

    N = config.n_sessions
    M = config.n_rounds
    p = config.win_probability
    target = config.target_bankroll

    bankroll = np.full(N, config.initial_bankroll, dtype=np.float64)
    current_bet = np.full(N, config.base_bet, dtype=np.float64)
    active = np.ones(N, dtype=bool)

    bankroll_hist = np.empty((N, M + 1), dtype=np.float64)
    bet_hist = np.zeros((N, M), dtype=np.float64)
    outcome_hist = np.zeros((N, M), dtype=bool)
    active_hist = np.zeros((N, M), dtype=bool)

    bust_round = np.full(N, -1, dtype=np.int32)
    win_round = np.full(N, -1, dtype=np.int32)

    bankroll_hist[:, 0] = bankroll

    for r in range(M):
        if not np.any(active):
            break

        # All-in flag: bankroll below current bet for active sessions
        all_in = active & (bankroll < current_bet)

        # Effective bet
        bet = np.where(active, np.where(all_in, bankroll, current_bet), 0.0)

        # Spin — pre-generate for all sessions, only apply to active
        won = (rng.random(N) < p) & active

        # Bankroll update
        bankroll = np.where(active & won, bankroll + bet, bankroll)
        bankroll = np.where(active & ~won, bankroll - bet, bankroll)
        # Floating point guard: bust sessions should be exactly 0
        bankroll = np.where(active & all_in & ~won, 0.0, bankroll)

        # Martingale bet update
        current_bet = np.where(active & won, config.base_bet, current_bet)
        current_bet = np.where(active & ~won & ~all_in, current_bet * 2.0, current_bet)

        # Record
        bet_hist[:, r] = bet
        outcome_hist[:, r] = won
        active_hist[:, r] = active
        bankroll_hist[:, r + 1] = bankroll

        # Detect terminal events (first occurrence only)
        newly_bust = active & (bankroll == 0.0) & (bust_round == -1)
        newly_won = active & (bankroll >= target) & (win_round == -1)
        bust_round = np.where(newly_bust, r, bust_round)
        win_round = np.where(newly_won, r, win_round)

        # Advance active mask based on termination mode
        mode = config.termination_mode
        if mode == TerminationMode.ON_BUST:
            active = active & (bankroll > 0.0)
        elif mode == TerminationMode.ON_WIN_TARGET:
            active = active & (bankroll < target)
        elif mode == TerminationMode.ON_BUST_OR_WIN:
            active = active & (bankroll > 0.0) & (bankroll < target)
        # MAX_ROUNDS: active unchanged until loop ends

    # Forward-fill any columns left uninitialized by an early break.
    # When all sessions terminate before n_rounds the loop exits before writing
    # bankroll_hist[:, r+1:], leaving np.empty garbage that corrupts all metrics.
    bankroll_hist[:, r + 1:] = bankroll_hist[:, r : r + 1]

    return SimResults(
        bankroll=bankroll_hist,
        bet=bet_hist,
        outcome=outcome_hist,
        active=active_hist,
        bust_round=bust_round,
        win_round=win_round,
        config=config,
    )
