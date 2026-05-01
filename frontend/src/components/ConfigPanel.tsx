import React from "react";
import { SimRequest, RouletteType, TerminationMode } from "../types/api";

const WIN_TARGET_MODES = new Set<TerminationMode>(["on_win_target", "on_bust_or_win"]);
const BUST_MODES = new Set<TerminationMode>(["on_bust", "on_bust_or_win"]);

const s: Record<string, React.CSSProperties> = {
  panel: { background: "#1a1a24", padding: "1.5rem", borderRadius: 8, display: "flex", flexDirection: "column", gap: "1rem", minWidth: 280 },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#aaa" },
  input: { background: "#2a2a38", border: "1px solid #444", borderRadius: 4, padding: "6px 10px", color: "#e0e0e0", fontSize: 14, width: "100%" },
  inputDisabled: { background: "#1a1a24", border: "1px solid #333", borderRadius: 4, padding: "6px 10px", color: "#555", fontSize: 14, width: "100%" },
  select: { background: "#2a2a38", border: "1px solid #444", borderRadius: 4, padding: "6px 10px", color: "#e0e0e0", fontSize: 14, width: "100%" },
  hint: { fontSize: 11, color: "#666", marginTop: 2 },
  btn: { background: "#6c47ff", border: "none", borderRadius: 4, padding: "10px", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600, marginTop: 8 },
  section: { fontSize: 11, color: "#6c47ff", textTransform: "uppercase" as const, letterSpacing: 1, marginTop: 4 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  toggle: (on: boolean): React.CSSProperties => ({
    width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
    background: on ? "#6c47ff" : "#333", position: "relative", flexShrink: 0,
    transition: "background 0.15s",
  }),
  knob: (on: boolean): React.CSSProperties => ({
    position: "absolute", top: 3, left: on ? 18 : 3, width: 14, height: 14,
    borderRadius: "50%", background: "#fff", transition: "left 0.15s",
  }),
};

interface Props {
  config: SimRequest;
  onChange: (c: SimRequest) => void;
  onRun: () => void;
  loading: boolean;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button style={s.toggle(on)} onClick={onClick} type="button">
      <span style={s.knob(on)} />
    </button>
  );
}

export function ConfigPanel({ config, onChange, onRun, loading }: Props) {
  const set = <K extends keyof SimRequest>(k: K, v: SimRequest[K]) =>
    onChange({ ...config, [k]: v });

  const basePct = ((config.base_bet / config.initial_bankroll) * 100).toFixed(1);
  const winTargetOn = WIN_TARGET_MODES.has(config.termination_mode);
  const bustOn = BUST_MODES.has(config.termination_mode);

  const toggleWinTarget = () => {
    const next = !winTargetOn;
    if (next && bustOn) set("termination_mode", "on_bust_or_win");
    else if (next) set("termination_mode", "on_win_target");
    else if (bustOn) set("termination_mode", "on_bust");
    else set("termination_mode", "max_rounds");
  };

  const toggleBust = () => {
    const next = !bustOn;
    if (next && winTargetOn) set("termination_mode", "on_bust_or_win");
    else if (next) set("termination_mode", "on_bust");
    else if (winTargetOn) set("termination_mode", "on_win_target");
    else set("termination_mode", "max_rounds");
  };

  return (
    <div style={s.panel}>
      <div style={s.section}>Wheel</div>

      <label style={s.label}>
        Roulette Type
        <select style={s.select} value={config.roulette_type} onChange={e => set("roulette_type", e.target.value as RouletteType)}>
          <option value="european">European (18/37 ≈ 48.65%)</option>
          <option value="american">American (18/38 ≈ 47.37%)</option>
        </select>
      </label>

      <div style={s.section}>Bankroll</div>

      <label style={s.label}>
        Initial Bankroll
        <input style={s.input} type="number" min={1} value={config.initial_bankroll}
          onChange={e => set("initial_bankroll", +e.target.value)} />
      </label>

      <label style={s.label}>
        Base Bet
        <input style={s.input} type="number" min={1} max={config.initial_bankroll} value={config.base_bet}
          onChange={e => set("base_bet", +e.target.value)} />
        <span style={s.hint}>{basePct}% of bankroll</span>
      </label>

      <div style={s.section}>Stop Conditions</div>

      <div style={s.row}>
        <span style={{ fontSize: 13, color: winTargetOn ? "#e0e0e0" : "#555" }}>Stop at win target</span>
        <Toggle on={winTargetOn} onClick={toggleWinTarget} />
      </div>

      <label style={{ ...s.label, opacity: winTargetOn ? 1 : 0.35 }}>
        Win Target (× initial)
        <input style={winTargetOn ? s.input : s.inputDisabled} type="number" min={1.01} step={0.1}
          value={config.target_multiplier} disabled={!winTargetOn}
          onChange={e => set("target_multiplier", +e.target.value)} />
        <span style={s.hint}>
          {winTargetOn
            ? `Stop when bankroll reaches $${(config.target_multiplier * config.initial_bankroll).toFixed(0)}`
            : "Enable toggle to use win target"}
        </span>
      </label>

      <div style={s.row}>
        <span style={{ fontSize: 13, color: bustOn ? "#e0e0e0" : "#555" }}>Stop on bust</span>
        <Toggle on={bustOn} onClick={toggleBust} />
      </div>

      <div style={s.section}>Simulation</div>

      <label style={s.label}>
        Sessions
        <input style={s.input} type="number" min={1} max={1_000_000} value={config.n_sessions}
          onChange={e => set("n_sessions", +e.target.value)} />
      </label>

      <label style={s.label}>
        Sample Traces (chart lines)
        <input style={s.input} type="number" min={0} max={500} value={config.n_sample_traces}
          onChange={e => set("n_sample_traces", +e.target.value)} />
        <span style={s.hint}>Lines shown in session trace chart (max 500)</span>
      </label>

      <label style={s.label}>
        Max Rounds per Session
        <input style={s.input} type="number" min={1} max={10_000} value={config.n_rounds}
          onChange={e => set("n_rounds", +e.target.value)} />
      </label>

      <label style={s.label}>
        Random Seed (optional)
        <input style={s.input} type="number" placeholder="none"
          value={config.seed ?? ""} onChange={e => set("seed", e.target.value ? +e.target.value : undefined)} />
      </label>

      <button style={s.btn} onClick={onRun} disabled={loading}>
        {loading ? "Running…" : "Run Simulation"}
      </button>
    </div>
  );
}
