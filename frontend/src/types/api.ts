export type RouletteType = "european" | "american";
export type TerminationMode = "max_rounds" | "on_bust" | "on_win_target" | "on_bust_or_win";

export interface SimRequest {
  n_sessions: number;
  n_rounds: number;
  initial_bankroll: number;
  base_bet: number;
  target_multiplier: number;
  roulette_type: RouletteType;
  termination_mode: TerminationMode;
  seed?: number;
  n_sample_traces: number;
  percentiles: number[];
}

export interface RiskMetrics {
  n_sessions: number;
  bust_count: number;
  win_count: number;
  inconclusive_count: number;
  bust_rate: number;
  win_rate: number;
  inconclusive_rate: number;
  mean_final_bankroll: number;
  median_final_bankroll: number;
  std_final_bankroll: number;
  ev: number;
  ev_absolute: number;
  mean_max_drawdown: number;
  median_max_drawdown: number;
  worst_max_drawdown: number;
  mean_max_drawdown_pct: number;
  worst_max_drawdown_pct: number;
  median_rounds_to_bust: number | null;
  median_rounds_to_win: number | null;
  mean_rounds_to_bust: number | null;
  mean_rounds_to_win: number | null;
  mean_max_losing_streak: number;
  worst_max_losing_streak: number;
  losing_streak_exposure: Record<string, number>;
}

export interface SimResponse {
  config: Record<string, unknown>;
  metrics: RiskMetrics;
  bankroll_percentiles: Record<string, number[]>;
  sample_traces: (number | null)[][];
  sample_bets: (number | null)[][];
  round_labels: number[];
  terminal_histogram: Record<string, unknown>;
  n_sessions: number;
}

export interface SessionDetail {
  session_index: number;
  bankroll: number[];
  bet: number[];
  outcome: boolean[];
  active: boolean[];
  bust_round: number;
  win_round: number;
  final_bankroll: number;
  initial_bankroll: number;
  round_labels: number[];
}

export interface ExploreRequest {
  n_sessions: number;
  n_rounds: number;
  initial_bankroll: number;
  termination_mode: TerminationMode;
  roulette_types: RouletteType[];
  seed?: number;
  base_bet_values: number[];
  target_multiplier_values: number[];
}

export interface ExploreRow {
  base_bet: number;
  base_bet_pct: number;
  target_multiplier: number;
  roulette_type: string;
  bust_rate: number;
  win_rate: number;
  inconclusive_rate: number;
  ev: number;
  ev_absolute: number;
  mean_max_drawdown_pct: number;
  worst_max_drawdown_pct: number;
  mean_rounds_to_bust: number | null;
  median_rounds_to_bust: number | null;
  mean_rounds_to_win: number | null;
  median_rounds_to_win: number | null;
  mean_max_losing_streak: number;
}

export interface ExploreResponse {
  results: ExploreRow[];
  base_bet_values: number[];
  target_multiplier_values: number[];
  roulette_types: string[];
}
