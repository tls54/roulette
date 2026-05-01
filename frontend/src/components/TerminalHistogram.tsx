import React from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
} from "recharts";

interface HistogramData {
  bin_edges: number[];
  counts: number[];
  bust_count: number;
  initial_bankroll: number;
}

interface Props {
  data: HistogramData;
  n_sessions: number;
}

export function TerminalHistogram({ data, n_sessions }: Props) {
  const { bin_edges, counts, bust_count, initial_bankroll } = data;

  // Bust bar prepended at $0
  const bustBar = {
    midpoint: 0,
    label: "Bust ($0)",
    count: bust_count,
    pct: bust_count / n_sessions,
    isBust: true,
  };

  const survivorBars = counts.map((count, i) => ({
    midpoint: (bin_edges[i] + bin_edges[i + 1]) / 2,
    label: `$${bin_edges[i].toFixed(0)}–$${bin_edges[i + 1].toFixed(0)}`,
    count,
    pct: count / n_sessions,
    isBust: false,
  }));

  const bars = [bustBar, ...survivorBars];
  const bustPct = (bust_count / n_sessions * 100).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ fontSize: 12, color: "#888" }}>
        <span style={{ color: "#f87171", fontWeight: 600 }}>{bust_count.toLocaleString()} sessions busted</span>
        {` (${bustPct}% of total) — shown as leftmost bar`}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={bars} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
          <XAxis
            dataKey="midpoint"
            stroke="#555"
            tick={{ fontSize: 10 }}
            tickFormatter={v => `$${(v as number).toFixed(0)}`}
            label={{ value: "Terminal Bankroll ($)", position: "insideBottom", offset: -28, fill: "#666", fontSize: 12 }}
          />
          <YAxis
            stroke="#555"
            tick={{ fontSize: 11 }}
            tickFormatter={v => (v as number).toLocaleString()}
            label={{ value: "Sessions", angle: -90, position: "insideLeft", offset: 10, fill: "#666", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: "#1a1a24", border: "1px solid #444", fontSize: 12 }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
            formatter={(v: number, _name: string, props) => [
              `${v.toLocaleString()} (${(props.payload.pct * 100).toFixed(1)}%)`,
              "Sessions",
            ]}
          />
          <ReferenceLine
            x={initial_bankroll}
            stroke="#818cf8"
            strokeDasharray="4 4"
            label={{ value: "Start", fill: "#818cf8", fontSize: 11, position: "top" }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {bars.map((b, i) => (
              <Cell
                key={i}
                fill={b.isBust ? "#7f1d1d" : b.midpoint >= initial_bankroll ? "#4ade80" : "#f87171"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
