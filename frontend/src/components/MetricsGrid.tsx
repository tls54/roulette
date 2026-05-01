import React from "react";
import { RiskMetrics } from "../types/api";

const s: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" },
  card: { background: "#1a1a24", borderRadius: 8, padding: "1rem", display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 11, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  value: { fontSize: 22, fontWeight: 700, color: "#e0e0e0" },
  sub: { fontSize: 12, color: "#666" },
  pos: { color: "#4ade80" },
  neg: { color: "#f87171" },
  warn: { color: "#fb923c" },
};

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={s.card}>
      <span style={s.label}>{label}</span>
      <span style={{ ...s.value, ...(color ? { color } : {}) }}>{value}</span>
      {sub && <span style={s.sub}>{sub}</span>}
    </div>
  );
}

function pct(v: number, decimals = 1) { return `${(v * 100).toFixed(decimals)}%`; }
function money(v: number) { return `$${v.toFixed(2)}`; }
function rounds(v: number | null) { return v != null && v >= 0 ? v.toFixed(0) : "N/A"; }

const WIN_TARGET_MODES = new Set(["on_win_target", "on_bust_or_win"]);

interface Props {
  m: RiskMetrics;
  terminationMode: string;
}

export function MetricsGrid({ m, terminationMode }: Props) {
  const evColor = m.ev >= 0 ? s.pos.color : s.neg.color;
  const bustColor = m.bust_rate > 0.5 ? s.neg.color : m.bust_rate > 0.2 ? s.warn.color : s.pos.color;
  const showWinTarget = WIN_TARGET_MODES.has(terminationMode);

  return (
    <div style={s.grid}>
      <Tile label="EV" value={pct(m.ev)} sub={`${m.ev >= 0 ? "+" : ""}${money(m.ev_absolute)} per session`} color={evColor} />
      <Tile label="Bust Rate" value={pct(m.bust_rate)} sub={`${m.bust_count.toLocaleString()} sessions`} color={bustColor} />
      <Tile label="Win Rate" value={pct(m.win_rate)} sub={`${m.win_count.toLocaleString()} ended in profit`} color={s.pos.color} />
      <Tile label="Inconclusive" value={pct(m.inconclusive_rate)} sub="alive but down or flat" />
      <Tile label="Mean Final" value={money(m.mean_final_bankroll)} sub={`median ${money(m.median_final_bankroll)}`} />
      <Tile label="Avg Max Drawdown" value={`${m.mean_max_drawdown_pct.toFixed(1)}%`} sub={`worst ${m.worst_max_drawdown_pct.toFixed(1)}% — % of peak`} color={s.warn.color} />
      <Tile label="Rounds to Bust" value={rounds(m.median_rounds_to_bust)} sub="median" />
      {showWinTarget && (
        <Tile label="Rounds to Win Target" value={rounds(m.median_rounds_to_win)} sub={m.median_rounds_to_win != null ? "median" : "no sessions hit target"} />
      )}
      <Tile label="Max Losing Streak" value={m.worst_max_losing_streak.toString()} sub={`avg ${m.mean_max_losing_streak.toFixed(1)}`} color={s.warn.color} />
      <Tile
        label="10-Loss Streak Exposure"
        value={pct(m.losing_streak_exposure["10"] ?? 0)}
        sub="sessions hit ≥10 in a row"
      />
    </div>
  );
}
