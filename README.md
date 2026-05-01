# Roulette Strategy Simulator

A vectorised Monte Carlo simulator for testing the **Martingale betting strategy** on roulette. Runs thousands of simultaneous sessions, computes risk metrics, and visualises results through a React web app.

---

## What it simulates

The classic Martingale: bet on even/odd, double your bet after every loss, reset to base bet after any win. A single win always recovers all losses from the current streak plus one unit of profit — but exponentially growing bets mean a long enough losing streak will bust any finite bankroll.

**Bust logic:**
- If your bankroll falls below the current bet, you go all-in
- If you lose all-in, bankroll hits $0 (bust)
- If you win all-in, bankroll doubles and bet resets to base

---

## Getting started

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```bash
git clone <repo>
cd roulette
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API docs (Swagger) | http://localhost:8000/docs |

---

## Architecture

```
roulette/
├── docker-compose.yml
├── backend/
│   ├── simulation/
│   │   ├── engine.py      # vectorised NumPy simulation loop
│   │   └── metrics.py     # risk metrics, histogram, trace sampling
│   └── api/
│       ├── main.py        # FastAPI — /simulate, /session/{index}, /explore
│       └── models.py      # Pydantic request/response models
└── frontend/
    └── src/
        ├── components/
        │   ├── ConfigPanel.tsx       # simulation config + stop condition toggles
        │   ├── MetricsGrid.tsx       # risk metric tiles
        │   ├── BankrollChart.tsx     # percentile bands + session trace fan
        │   ├── BetSizeChart.tsx      # bet size traces over time
        │   ├── TerminalHistogram.tsx # distribution of final bankrolls
        │   ├── SessionInspector.tsx  # per-session round-by-round detail
        │   ├── ExplorePanel.tsx      # parameter space explorer + heatmap
        │   └── InfoPanel.tsx         # collapsible strategy explainer
        ├── hooks/useSimulate.ts      # API hooks
        └── types/api.ts              # TypeScript types
```

**Tech stack:** Python 3.12 · NumPy · FastAPI · Uvicorn · React 18 · TypeScript · Vite · Recharts

---

## Simulation tab

### Config panel

| Setting | Description |
|---|---|
| Roulette Type | European (18/37 ≈ 48.65%) or American (18/38 ≈ 47.37%) |
| Initial Bankroll | Starting funds per session |
| Base Bet | Starting bet size; shown as % of bankroll for transparency |
| Stop at win target | Toggle — session stops when bankroll reaches target multiplier × initial |
| Win Target (× initial) | e.g. 2.0 = stop when bankroll doubles; only active when toggle is on |
| Stop on bust | Toggle — session stops when bankroll hits $0 |
| Sessions | Number of parallel walkers to simulate |
| Sample Traces | How many individual session lines to draw on the chart (0–500) |
| Max Rounds | Hard round limit per session |
| Random Seed | Optional seed for reproducibility |

If neither stop condition is toggled on, sessions always run to max rounds.

### Risk metrics

| Metric | Definition |
|---|---|
| EV | (mean final bankroll − initial) / initial |
| Bust Rate | Fraction of sessions that hit $0 |
| Win Rate | Fraction of sessions that ended with more than they started |
| Inconclusive | Alive at termination but down or flat |
| Mean Final | Average final bankroll across all sessions |
| Avg Max Drawdown | Average of per-session peak-to-trough drops, as % of peak (standard MDD definition — always ≤ 100%) |
| Rounds to Bust | Median rounds until bust (only shown when bust stop is on) |
| Rounds to Win Target | Median rounds to hit target (only shown when win target stop is on) |
| Max Losing Streak | Longest consecutive loss sequence across all sessions |
| 10-Loss Streak Exposure | Fraction of sessions that faced ≥10 losses in a row |

### Charts

- **Bankroll Percentile Bands** — 5th/25th/50th/75th/95th percentile bankroll at each round
- **Sample Session Traces** — individual session lines coloured green (ended in profit), red (loss), dark red (bust); lines end at termination, no ghost flat tails
- **Bet Size Traces** — step chart of bet size per round on a linear scale; green = ended at/below base bet, red = ended mid-streak
- **Terminal Value Distribution** — histogram of final bankrolls; bust sessions shown as a separate leftmost bar; bins above starting bankroll coloured green, below red
- **Session Inspector** — enter any session index (0 to N−1) to see its full round-by-round bankroll and bet size on a combined chart

---

## Parameter Explorer tab

Sweeps combinations of base bet sizes and target multipliers to find optimal configurations.

### Config

| Setting | Description |
|---|---|
| Sessions per config | Walkers per combination (lower than main sim for speed) |
| Max rounds | Round limit per session |
| Stop conditions | Win target and/or bust toggles, same as main sim |
| Wheel | European, American, or Both (runs both and shows tabs) |
| Base bet values | Comma-separated list, e.g. `5,10,25,50,100` |
| Target multipliers | Comma-separated list, e.g. `1.5,2.0,3.0` |

### Outputs

**Heatmap** — base bet × target multiplier grid coloured by any selectable metric (EV, bust rate, win rate, drawdown, rounds to bust/win, losing streak). Green = better, red = worse. When both wheel types are selected, tabs switch between them.

**Results table** — all combinations with columns for bust %, win %, EV, avg drawdown, median rounds to bust/win, and average losing streak.

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/simulate` | Run a simulation, returns metrics + chart data |
| `GET` | `/session/{index}` | Per-round detail for session index from the last run |
| `POST` | `/explore` | Sweep base bet × target multiplier grid |

Full request/response schemas available at http://localhost:8000/docs.

---

## Scaling

The engine runs a Python loop over rounds with each iteration operating on all N sessions simultaneously via NumPy — effectively O(rounds) Python iterations regardless of session count. 10,000 sessions × 500 rounds runs in under a second.

For 1M+ sessions, GPU acceleration via PyTorch is the planned next step — the stateless per-round vectorised design maps directly onto tensor operations with no architectural changes required.

---

## Key findings (typical European wheel, $1000 bankroll, 2× target)

- EV is always negative (~−2% to −5% depending on config) — the house edge cannot be overcome
- Win rate can appear high (e.g. 40–60%) because most sessions end in small profits before an eventual bust
- A 1% base bet ($10 on $1000) gives the highest win rate but the slowest expected bust — it just delays the inevitable
- A 5–10% base bet ($50–$100) maximises short-term win probability but sharply increases bust rate
- 10 consecutive losses — which requires only ~0.15% probability per spin — occur in a significant fraction of sessions over 500 rounds
