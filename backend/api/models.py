from pydantic import BaseModel, Field, field_validator
from typing import Optional
from simulation.engine import RouletteType, TerminationMode


class SimRequest(BaseModel):
    n_sessions: int = Field(1000, ge=1, le=1_000_000)
    n_rounds: int = Field(500, ge=1, le=10_000)
    initial_bankroll: float = Field(1000.0, gt=0)
    base_bet: float = Field(10.0, gt=0)
    target_multiplier: float = Field(2.0, gt=1.0)
    roulette_type: RouletteType = RouletteType.EUROPEAN
    termination_mode: TerminationMode = TerminationMode.ON_BUST_OR_WIN
    seed: Optional[int] = None
    # Chart options
    n_sample_traces: int = Field(150, ge=0, le=500)
    percentiles: list[int] = Field(default=[5, 25, 50, 75, 95])

    @field_validator("base_bet")
    @classmethod
    def bet_lte_bankroll(cls, v, info):
        bankroll = info.data.get("initial_bankroll")
        if bankroll is not None and v > bankroll:
            raise ValueError("base_bet cannot exceed initial_bankroll")
        return v


class RiskMetricsResponse(BaseModel):
    n_sessions: int
    bust_count: int
    win_count: int
    inconclusive_count: int
    bust_rate: float
    win_rate: float
    inconclusive_rate: float
    mean_final_bankroll: float
    median_final_bankroll: float
    std_final_bankroll: float
    ev: float
    ev_absolute: float
    mean_max_drawdown: float
    median_max_drawdown: float
    worst_max_drawdown: float
    mean_max_drawdown_pct: float
    worst_max_drawdown_pct: float
    median_rounds_to_bust: Optional[float]
    median_rounds_to_win: Optional[float]
    mean_rounds_to_bust: Optional[float]
    mean_rounds_to_win: Optional[float]
    mean_max_losing_streak: float
    worst_max_losing_streak: int
    losing_streak_exposure: dict[str, float]


class SimResponse(BaseModel):
    config: dict
    metrics: RiskMetricsResponse
    bankroll_percentiles: dict[str, list[float]]
    sample_traces: list[list[float | None]]    # bankroll per round, null after termination
    sample_bets: list[list[float | None]]      # bet size per round, null after termination
    round_labels: list[int]
    terminal_histogram: dict
    n_sessions: int                            # total sessions stored in cache


class SessionDetail(BaseModel):
    session_index: int
    bankroll: list[float]                      # per round (length n_rounds+1)
    bet: list[float]                           # per round (length n_rounds)
    outcome: list[bool]                        # per round
    active: list[bool]                         # per round
    bust_round: int                            # -1 if never
    win_round: int                             # -1 if never
    final_bankroll: float
    initial_bankroll: float
    round_labels: list[int]


class ExploreRequest(BaseModel):
    # Sim config
    n_sessions: int = Field(500, ge=1, le=100_000)
    n_rounds: int = Field(500, ge=1, le=10_000)
    initial_bankroll: float = Field(1000.0, gt=0)
    termination_mode: TerminationMode = TerminationMode.ON_BUST_OR_WIN
    roulette_types: list[RouletteType] = Field(default=[RouletteType.EUROPEAN])
    seed: Optional[int] = 42

    # Sweep axes
    base_bet_values: list[float] = Field(default=[5, 10, 25, 50, 100])
    target_multiplier_values: list[float] = Field(default=[2.0])


class ExploreRow(BaseModel):
    base_bet: float
    base_bet_pct: float
    target_multiplier: float
    roulette_type: str
    bust_rate: float
    win_rate: float
    inconclusive_rate: float
    ev: float
    ev_absolute: float
    mean_max_drawdown_pct: float
    worst_max_drawdown_pct: float
    mean_rounds_to_bust: Optional[float]
    median_rounds_to_bust: Optional[float]
    mean_rounds_to_win: Optional[float]
    median_rounds_to_win: Optional[float]
    mean_max_losing_streak: float


class ExploreResponse(BaseModel):
    results: list[ExploreRow]
    base_bet_values: list[float]
    target_multiplier_values: list[float]
    roulette_types: list[str]
