from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import dataclasses
import logging

logger = logging.getLogger("roulette")

from simulation.engine import SimConfig, SimResults, run_simulation
from simulation.metrics import compute_metrics, bankroll_percentiles, sampled_sessions, sampled_bets, terminal_histogram
from api.models import (
    SimRequest, SimResponse, RiskMetricsResponse,
    ExploreRequest, ExploreResponse, ExploreRow,
    SessionDetail,
)

app = FastAPI(title="Roulette Strategy Simulator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Last simulation results cached in memory for session inspector
_cached_results: SimResults | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/simulate", response_model=SimResponse)
def simulate(req: SimRequest):
    global _cached_results

    try:
        config = SimConfig(
            n_sessions=req.n_sessions,
            n_rounds=req.n_rounds,
            initial_bankroll=req.initial_bankroll,
            base_bet=req.base_bet,
            target_multiplier=req.target_multiplier,
            roulette_type=req.roulette_type,
            termination_mode=req.termination_mode,
            seed=req.seed,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    logger.info(
        "RUN | wheel=%-8s  termination=%-16s  sessions=%7d  rounds=%5d  "
        "bankroll=%8.2f  base_bet=%7.2f (%.1f%%)  target=%.1fx  seed=%s",
        config.roulette_type.value,
        config.termination_mode.value,
        config.n_sessions,
        config.n_rounds,
        config.initial_bankroll,
        config.base_bet,
        config.base_bet_pct,
        config.target_multiplier,
        config.seed if config.seed is not None else "random",
    )

    results = run_simulation(config)
    _cached_results = results

    metrics = compute_metrics(results)
    percentiles = bankroll_percentiles(results, req.percentiles)
    idx, traces = sampled_sessions(results, n=req.n_sample_traces)
    bet_traces = sampled_bets(results, idx)

    config_dict = {
        **dataclasses.asdict(config),
        "win_probability": config.win_probability,
        "target_bankroll": config.target_bankroll,
        "base_bet_pct": config.base_bet_pct,
    }

    return SimResponse(
        config=config_dict,
        metrics=RiskMetricsResponse(**dataclasses.asdict(metrics)),
        bankroll_percentiles={str(k): v for k, v in percentiles.items()},
        sample_traces=traces,
        sample_bets=bet_traces,
        round_labels=list(range(config.n_rounds + 1)),
        terminal_histogram=terminal_histogram(results),
        n_sessions=config.n_sessions,
    )


@app.get("/session/{index}", response_model=SessionDetail)
def get_session(index: int):
    if _cached_results is None:
        raise HTTPException(status_code=404, detail="No simulation has been run yet")

    n = _cached_results.config.n_sessions
    if index < 0 or index >= n:
        raise HTTPException(status_code=400, detail=f"Session index must be 0–{n - 1}")

    r = _cached_results
    return SessionDetail(
        session_index=index,
        bankroll=r.bankroll[index].tolist(),
        bet=r.bet[index].tolist(),
        outcome=r.outcome[index].tolist(),
        active=r.active[index].tolist(),
        bust_round=int(r.bust_round[index]),
        win_round=int(r.win_round[index]),
        final_bankroll=float(r.bankroll[index, -1]),
        initial_bankroll=r.config.initial_bankroll,
        round_labels=list(range(r.config.n_rounds + 1)),
    )


@app.post("/explore", response_model=ExploreResponse)
def explore(req: ExploreRequest):
    rows: list[ExploreRow] = []

    valid_targets = [t for t in req.target_multiplier_values if t > 1.0]

    for roulette_type in req.roulette_types:
        for target_multiplier in valid_targets:
            for base_bet in req.base_bet_values:
                if base_bet >= req.initial_bankroll:
                    continue
                try:
                    config = SimConfig(
                        n_sessions=req.n_sessions,
                        n_rounds=req.n_rounds,
                        initial_bankroll=req.initial_bankroll,
                        base_bet=base_bet,
                        target_multiplier=target_multiplier,
                        roulette_type=roulette_type,
                        termination_mode=req.termination_mode,
                        seed=req.seed,
                    )
                except ValueError:
                    continue

                results = run_simulation(config)
                m = compute_metrics(results)

                rows.append(ExploreRow(
                    base_bet=base_bet,
                    base_bet_pct=config.base_bet_pct,
                    target_multiplier=target_multiplier,
                    roulette_type=roulette_type.value,
                    bust_rate=m.bust_rate,
                    win_rate=m.win_rate,
                    inconclusive_rate=m.inconclusive_rate,
                    ev=m.ev,
                    ev_absolute=m.ev_absolute,
                    mean_max_drawdown_pct=m.mean_max_drawdown_pct,
                    worst_max_drawdown_pct=m.worst_max_drawdown_pct,
                    mean_rounds_to_bust=m.mean_rounds_to_bust,
                    median_rounds_to_bust=m.median_rounds_to_bust,
                    mean_rounds_to_win=m.mean_rounds_to_win,
                    median_rounds_to_win=m.median_rounds_to_win,
                    mean_max_losing_streak=m.mean_max_losing_streak,
                ))

    return ExploreResponse(
        results=rows,
        base_bet_values=sorted(set(req.base_bet_values)),
        target_multiplier_values=sorted(set(valid_targets)),
        roulette_types=[rt.value for rt in req.roulette_types],
    )
