import React, { useState } from "react";
import { ConfigPanel } from "./ConfigPanel";
import { MetricsGrid } from "./MetricsGrid";
import { BankrollChart } from "./BankrollChart";
import { BetSizeChart } from "./BetSizeChart";
import { TerminalHistogram } from "./TerminalHistogram";
import { SessionInspector } from "./SessionInspector";
import { ExplorePanel } from "./ExplorePanel";
import { InfoPanel } from "./InfoPanel";
import { useSimulate, useExplore } from "../hooks/useSimulate";
import { SimRequest, ExploreRequest, RouletteType, TerminationMode } from "../types/api";

const defaultConfig: SimRequest = {
  n_sessions: 1000,
  n_rounds: 500,
  initial_bankroll: 1000,
  base_bet: 10,
  target_multiplier: 2.0,
  roulette_type: "european",
  termination_mode: "on_bust_or_win",
  n_sample_traces: 150,
  percentiles: [5, 25, 50, 75, 95],
};

const s: Record<string, React.CSSProperties> = {
  app: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { padding: "1rem 2rem", borderBottom: "1px solid #1a1a24", display: "flex", alignItems: "center", gap: "1rem" },
  title: { fontSize: 18, fontWeight: 700, color: "#818cf8" },
  subtitle: { fontSize: 12, color: "#555" },
  body: { display: "flex", flex: 1, gap: 0 },
  sidebar: { width: 300, borderRight: "1px solid #1a1a24", padding: "1.5rem", flexShrink: 0 },
  main: { flex: 1, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem", overflowX: "auto" as const },
  tabs: { display: "flex", gap: 0, borderBottom: "1px solid #1a1a24", marginBottom: "1.5rem" },
  tab: (active: boolean): React.CSSProperties => ({
    padding: "8px 20px", fontSize: 13, cursor: "pointer", border: "none", background: "none",
    color: active ? "#818cf8" : "#666",
    borderBottom: active ? "2px solid #818cf8" : "2px solid transparent",
  }),
  error: { background: "#3b1a1a", border: "1px solid #7f1d1d", borderRadius: 6, padding: "0.75rem 1rem", color: "#fca5a5", fontSize: 13 },
  section: { fontSize: 14, color: "#818cf8", fontWeight: 600, marginBottom: "0.5rem" },
  empty: { color: "#555", fontSize: 14, padding: "2rem 0" },
};

type Tab = "simulate" | "explore";

export default function App() {
  const [config, setConfig] = useState<SimRequest>(defaultConfig);
  const [tab, setTab] = useState<Tab>("simulate");
  const sim = useSimulate();
  const exp = useExplore();

  const handleExplore = (params: {
    base_bet_values: number[];
    target_multiplier_values: number[];
    roulette_types: string[];
    n_sessions: number;
    n_rounds: number;
    termination_mode: TerminationMode;
  }) => {
    const req: ExploreRequest = {
      n_sessions: params.n_sessions,
      n_rounds: params.n_rounds,
      initial_bankroll: config.initial_bankroll,
      termination_mode: params.termination_mode,
      roulette_types: params.roulette_types as RouletteType[],
      base_bet_values: params.base_bet_values,
      target_multiplier_values: params.target_multiplier_values,
    };
    exp.run(req);
  };


  return (
    <div style={s.app}>
      <header style={s.header}>
        <div>
          <div style={s.title}>Roulette Strategy Simulator</div>
          <div style={s.subtitle}>Martingale (even/odd) · Vectorized Monte Carlo</div>
        </div>
      </header>
      <InfoPanel />

      <div style={s.body}>
        <aside style={s.sidebar}>
          <ConfigPanel config={config} onChange={setConfig} onRun={() => sim.run(config)} loading={sim.loading} />
        </aside>

        <main style={s.main}>
          <div style={s.tabs}>
            <button style={s.tab(tab === "simulate")} onClick={() => setTab("simulate")}>Simulation</button>
            <button style={s.tab(tab === "explore")} onClick={() => setTab("explore")}>Parameter Explorer</button>
          </div>

          {tab === "simulate" && (
            <>
              {sim.error && <div style={s.error}>Error: {sim.error}</div>}

              {!sim.result && !sim.loading && (
                <div style={s.empty}>Configure a simulation on the left and click Run.</div>
              )}

              {sim.result && (
                <>
                  <div>
                    <div style={s.section}>Risk Metrics</div>
                    <MetricsGrid m={sim.result.metrics} terminationMode={sim.result.config.termination_mode as string} />
                  </div>
                  <div>
                    <div style={s.section}>Bankroll Trajectories</div>
                    <BankrollChart result={sim.result} />
                  </div>
                  <div>
                    <div style={s.section}>Bet Size Traces</div>
                    <BetSizeChart result={sim.result} />
                  </div>
                  <div>
                    <div style={s.section}>Terminal Value Distribution</div>
                    <TerminalHistogram data={sim.result.terminal_histogram as any} n_sessions={sim.result.metrics.n_sessions} />
                  </div>
                  <div>
                    <div style={s.section}>Session Inspector</div>
                    <SessionInspector nSessions={sim.result.n_sessions} />
                  </div>
                </>
              )}
            </>
          )}

          {tab === "explore" && (
            <>
              {exp.error && <div style={s.error}>Error: {exp.error}</div>}
              <div style={s.section}>Parameter Space Explorer</div>
              <ExplorePanel
                initialBankroll={config.initial_bankroll}
                onExplore={handleExplore}
                loading={exp.loading}
                result={exp.result}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
