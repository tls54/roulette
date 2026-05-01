import React, { useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from "recharts";
import { SessionDetail } from "../types/api";
import { useSession } from "../hooks/useSimulate";

const s: Record<string, React.CSSProperties> = {
  row: { display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "1.25rem", flexWrap: "wrap" as const },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#aaa" },
  input: { background: "#2a2a38", border: "1px solid #444", borderRadius: 4, padding: "6px 10px", color: "#e0e0e0", fontSize: 14, width: 120 },
  btn: { background: "#6c47ff", border: "none", borderRadius: 4, padding: "8px 16px", color: "#fff", fontSize: 13, cursor: "pointer" },
  tag: (color: string): React.CSSProperties => ({ background: color, color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600 }),
  stat: { fontSize: 12, color: "#888" },
  statVal: { color: "#e0e0e0", fontWeight: 600 },
  error: { color: "#f87171", fontSize: 13 },
};

function outcomeTag(detail: SessionDetail) {
  if (detail.bust_round >= 0) return <span style={s.tag("#7f1d1d")}>BUST (round {detail.bust_round})</span>;
  if (detail.final_bankroll > detail.initial_bankroll) return <span style={s.tag("#166534")}>WIN — ${detail.final_bankroll.toFixed(2)}</span>;
  return <span style={s.tag("#78350f")}>LOSS — ${detail.final_bankroll.toFixed(2)}</span>;
}

function SessionChart({ detail }: { detail: SessionDetail }) {
  const activeRounds = detail.round_labels.slice(1).filter((_, i) => detail.active[i]);
  const lastActive = activeRounds.length > 0 ? Math.max(...activeRounds) : detail.round_labels[detail.round_labels.length - 1];

  const data = detail.round_labels.slice(0, lastActive + 2).map((r, i) => ({
    round: r,
    bankroll: detail.bankroll[i],
    bet: i > 0 ? detail.bet[i - 1] : null,
    win: i > 0 && detail.outcome[i - 1] ? detail.bankroll[i] : null,
    loss: i > 0 && !detail.outcome[i - 1] && detail.active[i - 1] ? detail.bankroll[i] : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
        <XAxis dataKey="round" stroke="#555" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="bankroll" stroke="#555" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
        <YAxis yAxisId="bet" orientation="right" stroke="#555" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
        <Tooltip
          contentStyle={{ background: "#1a1a24", border: "1px solid #444", fontSize: 12 }}
          formatter={(v: number, name: string) => [`$${(+v).toFixed(2)}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine yAxisId="bankroll" y={detail.initial_bankroll} stroke="#555" strokeDasharray="4 4"
          label={{ value: "Start", fill: "#555", fontSize: 11 }} />
        <Line yAxisId="bankroll" type="monotone" dataKey="bankroll" stroke="#818cf8"
          dot={false} strokeWidth={2} name="Bankroll" />
        <Bar yAxisId="bet" dataKey="bet" fill="#6c47ff" opacity={0.35} name="Bet size" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

interface Props {
  nSessions: number;
}

export function SessionInspector({ nSessions }: Props) {
  const [index, setIndex] = useState(0);
  const { fetch, loading, error, result } = useSession();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={s.row}>
        <label style={s.label}>
          Session index (0 – {nSessions - 1})
          <input style={s.input} type="number" min={0} max={nSessions - 1}
            value={index} onChange={e => setIndex(Math.max(0, Math.min(nSessions - 1, +e.target.value)))} />
        </label>
        <button style={s.btn} onClick={() => fetch(index)} disabled={loading}>
          {loading ? "Loading…" : "Inspect"}
        </button>
        {result && outcomeTag(result)}
      </div>

      {error && <div style={s.error}>{error}</div>}

      {result && (
        <>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" as const, fontSize: 13 }}>
            <span style={s.stat}>Final bankroll: <span style={s.statVal}>${result.final_bankroll.toFixed(2)}</span></span>
            <span style={s.stat}>Bust round: <span style={s.statVal}>{result.bust_round >= 0 ? result.bust_round : "—"}</span></span>
            <span style={s.stat}>Win round: <span style={s.statVal}>{result.win_round >= 0 ? result.win_round : "—"}</span></span>
            <span style={s.stat}>
              Active rounds: <span style={s.statVal}>{result.active.filter(Boolean).length}</span>
            </span>
            <span style={s.stat}>
              Wins: <span style={{ color: "#4ade80", fontWeight: 600 }}>{result.outcome.filter((o, i) => o && result.active[i]).length}</span>
              {" / "}
              Losses: <span style={{ color: "#f87171", fontWeight: 600 }}>{result.outcome.filter((o, i) => !o && result.active[i]).length}</span>
            </span>
          </div>
          <SessionChart detail={result} />
        </>
      )}
    </div>
  );
}
