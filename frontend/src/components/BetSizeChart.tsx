import React from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { SimResponse } from "../types/api";

interface Props {
  result: SimResponse;
}

export const BetSizeChart = React.memo(function BetSizeChart({ result }: Props) {
  const roundLabels = result.round_labels;
  const sampleBets = result.sample_bets;
  const baseBet = result.config.base_bet as number;

  const data = roundLabels.slice(1).map((r, i) => {
    const point: Record<string, number | null> = { round: r };
    sampleBets.forEach((trace, j) => { point[`t${j}`] = trace[i] ?? null; });
    return point;
  });

  const terminalBet = (trace: (number | null)[]) =>
    [...trace].reverse().find(v => v !== null) ?? 0;

  const finalBets = sampleBets.map(terminalBet);
  const winCount = finalBets.filter(v => v <= baseBet).length;
  const lossCount = finalBets.filter(v => v > baseBet).length;

  const traceColors = sampleBets.map(trace =>
    terminalBet(trace) <= baseBet ? "#4ade80" : "#f87171"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "1.25rem", fontSize: 12, alignItems: "center" }}>
        <span><span style={{ color: "#4ade80", fontWeight: 600 }}>{winCount}</span> ended at/below base bet</span>
        <span><span style={{ color: "#f87171", fontWeight: 600 }}>{lossCount}</span> ended mid-streak</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
          <XAxis dataKey="round" stroke="#555" tick={{ fontSize: 11 }} />
          <YAxis stroke="#555" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} domain={[0, "auto"]} />
          <ReferenceLine y={baseBet} stroke="#818cf8" strokeDasharray="4 4"
            label={{ value: "Base", fill: "#818cf8", fontSize: 11, position: "right" }} />
          {sampleBets.map((_, j) => (
            <Line key={j} type="stepAfter" dataKey={`t${j}`}
              stroke={traceColors[j]} dot={false} strokeWidth={1} opacity={0.4} legendType="none" connectNulls={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
