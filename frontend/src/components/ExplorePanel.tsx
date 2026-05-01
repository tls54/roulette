import React, { useState } from "react";
import { ExploreRow, ExploreResponse, TerminationMode } from "../types/api";

// ── Types ────────────────────────────────────────────────────────────────────

type MetricKey =
  | "ev" | "bust_rate" | "win_rate" | "inconclusive_rate"
  | "mean_max_drawdown_pct" | "mean_rounds_to_bust" | "median_rounds_to_bust"
  | "mean_rounds_to_win" | "median_rounds_to_win" | "mean_max_losing_streak";

const METRIC_LABELS: Record<MetricKey, string> = {
  ev: "EV",
  bust_rate: "Bust Rate",
  win_rate: "Win Rate",
  inconclusive_rate: "Inconclusive Rate",
  mean_max_drawdown_pct: "Avg Max Drawdown",
  mean_rounds_to_bust: "Mean Rounds to Bust",
  median_rounds_to_bust: "Median Rounds to Bust",
  mean_rounds_to_win: "Mean Rounds to Win",
  median_rounds_to_win: "Median Rounds to Win",
  mean_max_losing_streak: "Mean Max Losing Streak",
};

// higher = better for these metrics (used for colour direction)
const HIGHER_IS_BETTER = new Set<MetricKey>(["ev", "win_rate", "mean_rounds_to_bust", "median_rounds_to_bust", "mean_rounds_to_win", "median_rounds_to_win"]);

// ── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  row: { display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" as const, marginBottom: "1rem" },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#aaa" },
  input: { background: "#2a2a38", border: "1px solid #444", borderRadius: 4, padding: "6px 10px", color: "#e0e0e0", fontSize: 13, width: 160 },
  inputNarrow: { background: "#2a2a38", border: "1px solid #444", borderRadius: 4, padding: "6px 10px", color: "#e0e0e0", fontSize: 13, width: 110 },
  select: { background: "#2a2a38", border: "1px solid #444", borderRadius: 4, padding: "6px 10px", color: "#e0e0e0", fontSize: 13 },
  btn: { background: "#6c47ff", border: "none", borderRadius: 4, padding: "8px 18px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 },
  section: { fontSize: 11, color: "#6c47ff", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: "0.5rem", marginTop: "1rem" },
  toggle: (on: boolean): React.CSSProperties => ({
    width: 34, height: 18, borderRadius: 9, border: "none", cursor: "pointer",
    background: on ? "#6c47ff" : "#333", position: "relative", flexShrink: 0,
  }),
  knob: (on: boolean): React.CSSProperties => ({
    position: "absolute", top: 2, left: on ? 16 : 2, width: 14, height: 14,
    borderRadius: "50%", background: "#fff", transition: "left 0.12s",
  }),
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { textAlign: "left" as const, padding: "6px 10px", borderBottom: "1px solid #2a2a38", color: "#666", fontSize: 11, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const },
  td: { padding: "6px 10px", borderBottom: "1px solid #1a1a24", whiteSpace: "nowrap" as const },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(v: number | null) { return v != null ? `${(v * 100).toFixed(1)}%` : "N/A"; }
function fmt(v: number | null, dec = 1) { return v != null ? v.toFixed(dec) : "N/A"; }

function lerp(t: number, a: string, b: string) {
  // simple two-colour lerp via hex
  const parse = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const ac = parse(a), bc = parse(b);
  const r = Math.round(ac[0] + t * (bc[0] - ac[0]));
  const g = Math.round(ac[1] + t * (bc[1] - ac[1]));
  const bl = Math.round(ac[2] + t * (bc[2] - ac[2]));
  return `rgb(${r},${g},${bl})`;
}

function cellColor(val: number | null, min: number, max: number, higherBetter: boolean) {
  if (val == null || max === min) return "#1a1a24";
  const t = (val - min) / (max - min);
  const good = "#166534", bad = "#7f1d1d", mid = "#1a1a24";
  if (higherBetter) return t > 0.5 ? lerp((t - 0.5) * 2, mid, good) : lerp(t * 2, bad, mid);
  return t > 0.5 ? lerp((t - 0.5) * 2, mid, bad) : lerp(t * 2, good, mid);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button style={s.toggle(on)} onClick={onClick} type="button">
      <span style={s.knob(on)} />
    </button>
  );
}

function Heatmap({ rows, betValues, targetValues, metric, rouletteType }: {
  rows: ExploreRow[];
  betValues: number[];
  targetValues: number[];
  metric: MetricKey;
  rouletteType: string;
}) {
  const filtered = rows.filter(r => r.roulette_type === rouletteType);
  const vals = filtered.map(r => r[metric] as number | null).filter(v => v != null) as number[];
  const min = Math.min(...vals), max = Math.max(...vals);
  const hib = HIGHER_IS_BETTER.has(metric);

  const lookup = new Map(filtered.map(r => [`${r.base_bet}|${r.target_multiplier}`, r]));

  const cellStyle = (val: number | null): React.CSSProperties => ({
    background: cellColor(val, min, max, hib),
    padding: "10px 6px", textAlign: "center", fontSize: 11,
    color: val != null ? "#e0e0e0" : "#444", minWidth: 72,
    border: "1px solid #0f0f13",
  });

  const fmt2 = (val: number | null) => {
    if (val == null) return "—";
    if (metric === "ev" || metric.includes("rate")) return `${(val * 100).toFixed(1)}%`;
    if (metric.includes("drawdown")) return `${val.toFixed(1)}%`;
    return val.toFixed(1);
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...s.th, background: "#0f0f13", padding: "8px 12px" }}>
              Target ↓ / Bet →
            </th>
            {betValues.map(b => (
              <th key={b} style={{ ...s.th, background: "#0f0f13", textAlign: "center", padding: "8px 10px" }}>
                ${b}<br /><span style={{ color: "#555", fontWeight: 400 }}>({b})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {targetValues.map(t => (
            <tr key={t}>
              <td style={{ ...s.td, background: "#0f0f13", fontWeight: 600, paddingRight: 16 }}>{t}×</td>
              {betValues.map(b => {
                const row = lookup.get(`${b}|${t}`);
                const val = row ? (row[metric] as number | null) : null;
                return <td key={b} style={cellStyle(val)}>{fmt2(val)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialBankroll: number;
  onExplore: (req: {
    base_bet_values: number[];
    target_multiplier_values: number[];
    roulette_types: string[];
    n_sessions: number;
    n_rounds: number;
    termination_mode: TerminationMode;
  }) => void;
  loading: boolean;
  result: ExploreResponse | null;
}

const WIN_TARGET_MODES = new Set<TerminationMode>(["on_win_target", "on_bust_or_win"]);
const BUST_MODES = new Set<TerminationMode>(["on_bust", "on_bust_or_win"]);

export function ExplorePanel({ initialBankroll, onExplore, loading, result }: Props) {
  const [betsInput, setBetsInput] = useState("5,10,25,50,100");
  const [targetsInput, setTargetsInput] = useState("1.5,2.0,3.0");
  const [sessions, setSessions] = useState(500);
  const [rounds, setRounds] = useState(500);
  const [wheelMode, setWheelMode] = useState<"european" | "american" | "both">("european");
  const [terminationMode, setTerminationMode] = useState<TerminationMode>("on_bust_or_win");
  const [metric, setMetric] = useState<MetricKey>("ev");
  const [selectedWheel, setSelectedWheel] = useState<string>("european");

  const winTargetOn = WIN_TARGET_MODES.has(terminationMode);
  const bustOn = BUST_MODES.has(terminationMode);

  const toggleWin = () => {
    const next = !winTargetOn;
    if (next && bustOn) setTerminationMode("on_bust_or_win");
    else if (next) setTerminationMode("on_win_target");
    else if (bustOn) setTerminationMode("on_bust");
    else setTerminationMode("max_rounds");
  };
  const toggleBust = () => {
    const next = !bustOn;
    if (next && winTargetOn) setTerminationMode("on_bust_or_win");
    else if (next) setTerminationMode("on_bust");
    else if (winTargetOn) setTerminationMode("on_win_target");
    else setTerminationMode("max_rounds");
  };

  const handleRun = () => {
    const parseBets = betsInput.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && v > 0 && v < initialBankroll);
    const parseTargets = targetsInput.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && v > 1.0);
    const types = wheelMode === "both" ? ["european", "american"] : [wheelMode];
    if (!parseBets.length || !parseTargets.length) return;

    onExplore({
      base_bet_values: parseBets,
      target_multiplier_values: parseTargets,
      roulette_types: types,
      n_sessions: sessions,
      n_rounds: rounds,
      termination_mode: terminationMode,
    });
    if (types.length > 0) setSelectedWheel(types[0]);
  };

  const showWheelTabs = result && result.roulette_types.length > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Config ── */}
      <div style={{ background: "#1a1a24", borderRadius: 8, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={s.section}>Sim Config</div>
        <div style={s.row}>
          <label style={s.label}>Sessions per config
            <input style={s.inputNarrow} type="number" min={50} max={100_000} value={sessions} onChange={e => setSessions(+e.target.value)} />
          </label>
          <label style={s.label}>Max rounds
            <input style={s.inputNarrow} type="number" min={10} max={10_000} value={rounds} onChange={e => setRounds(+e.target.value)} />
          </label>
          <label style={s.label}>
            <span style={{ marginBottom: 4 }}>Stop conditions</span>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: winTargetOn ? "#e0e0e0" : "#555" }}>
                <Toggle on={winTargetOn} onClick={toggleWin} />Win target
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: bustOn ? "#e0e0e0" : "#555" }}>
                <Toggle on={bustOn} onClick={toggleBust} />Bust
              </div>
            </div>
          </label>
          <label style={s.label}>
            <span style={{ marginBottom: 4 }}>Wheel</span>
            <div style={{ display: "flex", gap: 0, border: "1px solid #444", borderRadius: 4, overflow: "hidden" }}>
              {(["european", "american", "both"] as const).map(opt => (
                <button key={opt} type="button" onClick={() => setWheelMode(opt)} style={{
                  padding: "5px 10px", fontSize: 12, border: "none", cursor: "pointer",
                  background: wheelMode === opt ? "#6c47ff" : "#2a2a38",
                  color: wheelMode === opt ? "#fff" : "#888",
                }}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</button>
              ))}
            </div>
          </label>
        </div>

        <div style={s.section}>Sweep Axes</div>
        <div style={s.row}>
          <label style={s.label}>Base bet values (comma-separated)
            <input style={s.input} value={betsInput} onChange={e => setBetsInput(e.target.value)} />
          </label>
          <label style={s.label}>Target multipliers (comma-separated)
            <input style={s.input} value={targetsInput} onChange={e => setTargetsInput(e.target.value)} />
          </label>
          <button style={{ ...s.btn, alignSelf: "flex-end" }} onClick={handleRun} disabled={loading}>
            {loading ? "Running…" : "Run Explorer"}
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {result && (
        <>
          {/* Metric selector */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 12, color: "#888" }}>Heatmap metric:</span>
            <select style={s.select} value={metric} onChange={e => setMetric(e.target.value as MetricKey)}>
              {(Object.keys(METRIC_LABELS) as MetricKey[]).map(k => (
                <option key={k} value={k}>{METRIC_LABELS[k]}</option>
              ))}
            </select>
            {showWheelTabs && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 0, border: "1px solid #444", borderRadius: 4, overflow: "hidden" }}>
                {result.roulette_types.map(rt => (
                  <button key={rt} onClick={() => setSelectedWheel(rt)} style={{
                    padding: "5px 14px", fontSize: 12, border: "none", cursor: "pointer",
                    background: selectedWheel === rt ? "#6c47ff" : "#2a2a38",
                    color: selectedWheel === rt ? "#fff" : "#888",
                  }}>{rt.charAt(0).toUpperCase() + rt.slice(1)}</button>
                ))}
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: "0.5rem" }}>
              {METRIC_LABELS[metric]} — {selectedWheel}
              {" "}<span style={{ fontSize: 11, color: "#555" }}>(green = better, red = worse)</span>
            </div>
            <Heatmap
              rows={result.results}
              betValues={result.base_bet_values}
              targetValues={result.target_multiplier_values}
              metric={metric}
              rouletteType={selectedWheel}
            />
          </div>

          {/* Full results table */}
          <div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: "0.5rem" }}>All results</div>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {result.roulette_types.length > 1 && <th style={s.th}>Wheel</th>}
                    <th style={s.th}>Base Bet</th>
                    <th style={s.th}>% Bank</th>
                    <th style={s.th}>Target</th>
                    <th style={s.th}>Bust %</th>
                    <th style={s.th}>Win %</th>
                    <th style={s.th}>EV</th>
                    <th style={s.th}>Avg Drawdown</th>
                    <th style={s.th}>Median → Bust</th>
                    <th style={s.th}>Median → Win</th>
                    <th style={s.th}>Avg Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row, i) => (
                    <tr key={i}>
                      {result.roulette_types.length > 1 && (
                        <td style={{ ...s.td, color: "#818cf8" }}>{row.roulette_type}</td>
                      )}
                      <td style={s.td}>${row.base_bet}</td>
                      <td style={s.td}>{row.base_bet_pct.toFixed(1)}%</td>
                      <td style={s.td}>{row.target_multiplier}×</td>
                      <td style={{ ...s.td, color: row.bust_rate > 0.5 ? "#f87171" : "#e0e0e0" }}>{pct(row.bust_rate)}</td>
                      <td style={{ ...s.td, color: "#4ade80" }}>{pct(row.win_rate)}</td>
                      <td style={{ ...s.td, color: row.ev >= 0 ? "#4ade80" : "#f87171" }}>{pct(row.ev)}</td>
                      <td style={s.td}>{fmt(row.mean_max_drawdown_pct)}%</td>
                      <td style={s.td}>{fmt(row.median_rounds_to_bust, 0)}</td>
                      <td style={s.td}>{fmt(row.median_rounds_to_win, 0)}</td>
                      <td style={s.td}>{fmt(row.mean_max_losing_streak)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
