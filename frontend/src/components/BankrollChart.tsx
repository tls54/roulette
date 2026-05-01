import React from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { SimResponse } from "../types/api";

interface Props {
  result: SimResponse;
}

export const BankrollChart = React.memo(function BankrollChart({ result }: Props) {
  const { round_labels, bankroll_percentiles, sample_traces } = result;
  const initialBankroll = result.config.initial_bankroll as number;
  const targetBankroll = result.config.target_bankroll as number;

  // Build chart data: one object per round with percentile bands + traces
  const data = round_labels.map((r, i) => {
    const point: Record<string, number> = { round: r };
    for (const [k, vals] of Object.entries(bankroll_percentiles)) {
      point[`p${k}`] = vals[i];
    }
    return point;
  });

  const bandColors: Record<string, string> = {
    p5: "#3b3b6b", p25: "#5050a0", p50: "#818cf8", p75: "#5050a0", p95: "#3b3b6b",
  };
  const bandLabels: Record<string, string> = {
    p5: "5th %ile", p25: "25th %ile", p50: "Median", p75: "75th %ile", p95: "95th %ile",
  };

  const displayTraces = sample_traces.slice(0, 150);

  // Colour each trace by terminal value — find last non-null entry since traces are clipped
  const terminalValue = (trace: (number | null)[]) =>
    [...trace].reverse().find(v => v !== null) ?? 0;

  const traceColors = displayTraces.map(trace => {
    const final = terminalValue(trace);
    if (final === 0) return "#7f1d1d";
    if (final >= initialBankroll) return "#4ade80";
    return "#f87171";
  });

  // Build separate line chart data for traces
  const traceData = round_labels.map((r, i) => {
    const point: Record<string, number> = { round: r };
    displayTraces.forEach((trace, j) => {
      point[`t${j}`] = trace[i];
    });
    return point;
  });

  const winCount = traceColors.filter(c => c === "#4ade80").length;
  const lossCount = traceColors.filter(c => c === "#f87171").length;
  const bustCount = traceColors.filter(c => c === "#7f1d1d").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{ fontSize: 14, color: "#888", marginBottom: "0.75rem" }}>Bankroll Percentile Bands</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
            <XAxis dataKey="round" stroke="#555" tick={{ fontSize: 11 }} />
            <YAxis stroke="#555" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: "#1a1a24", border: "1px solid #444", fontSize: 12 }}
              formatter={(v: number, name: string) => [`$${v.toFixed(0)}`, bandLabels[name] ?? name]}
            />
            <Legend formatter={k => bandLabels[k] ?? k} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={initialBankroll} stroke="#555" strokeDasharray="4 4" label={{ value: "Start", fill: "#555", fontSize: 11 }} />
            <ReferenceLine y={targetBankroll} stroke="#4ade80" strokeDasharray="4 4" label={{ value: "Target", fill: "#4ade80", fontSize: 11 }} />
            {Object.keys(bankroll_percentiles).map(k => (
              <Line key={k} type="monotone" dataKey={`p${k}`} stroke={bandColors[`p${k}`] ?? "#818cf8"}
                dot={false} strokeWidth={k === "50" ? 2 : 1} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 style={{ fontSize: 14, color: "#888", marginBottom: "0.5rem" }}>
          Sample Session Traces ({displayTraces.length} shown)
        </h3>
        <div style={{ display: "flex", gap: "1.25rem", fontSize: 12, marginBottom: "0.75rem" }}>
          <span><span style={{ color: "#4ade80", fontWeight: 600 }}>{winCount}</span> ended in profit</span>
          <span><span style={{ color: "#f87171", fontWeight: 600 }}>{lossCount}</span> ended in loss</span>
          <span><span style={{ color: "#7f1d1d", fontWeight: 600 }}>{bustCount}</span> busted</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={traceData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
            <XAxis dataKey="round" stroke="#555" tick={{ fontSize: 11 }} />
            <YAxis stroke="#555" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
            <ReferenceLine y={initialBankroll} stroke="#aaa" strokeDasharray="4 4" label={{ value: "Start", fill: "#aaa", fontSize: 11 }} />
            <ReferenceLine y={targetBankroll} stroke="#4ade80" strokeDasharray="4 4" label={{ value: "Target", fill: "#4ade80", fontSize: 11 }} />
            {displayTraces.map((_, j) => (
              <Line key={j} type="monotone" dataKey={`t${j}`}
                stroke={traceColors[j]} dot={false} strokeWidth={1}
                opacity={0.4} legendType="none" connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
