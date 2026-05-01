import React, { useState } from "react";

const s: Record<string, React.CSSProperties> = {
  banner: {
    background: "#1a1a24", borderBottom: "1px solid #2a2a38",
    padding: "0.75rem 2rem", display: "flex", alignItems: "center",
    gap: "1rem", fontSize: 13, color: "#888",
  },
  toggle: {
    background: "none", border: "1px solid #444", borderRadius: 4,
    padding: "3px 10px", color: "#818cf8", fontSize: 12, cursor: "pointer",
    flexShrink: 0,
  },
  expanded: {
    background: "#13131c", borderBottom: "1px solid #2a2a38",
    padding: "1.25rem 2rem", display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    display: "flex", flexDirection: "column", gap: "0.4rem",
  },
  cardTitle: { fontSize: 12, color: "#818cf8", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  cardBody: { fontSize: 13, color: "#999", lineHeight: 1.6 },
  seq: {
    fontFamily: "monospace", fontSize: 12, background: "#0f0f13",
    borderRadius: 4, padding: "0.5rem 0.75rem", color: "#e0e0e0",
    lineHeight: 1.8, marginTop: "0.25rem",
  },
  warn: { color: "#fb923c" },
};

export function InfoPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={s.banner}>
        <span>
          <strong style={{ color: "#e0e0e0" }}>Martingale Strategy</strong>
          {" "}— bet on even/odd; double your bet after every loss, reset to base bet after any win.
          Goal: a single win always recovers all streak losses plus one unit of profit.
        </span>
        <button style={s.toggle} onClick={() => setOpen(o => !o)}>
          {open ? "Hide details" : "Learn more"}
        </button>
      </div>

      {open && (
        <div style={s.expanded}>
          <div style={s.card}>
            <div style={s.cardTitle}>How it works</div>
            <div style={s.cardBody}>
              Place a base bet on even or odd (≈48.6% chance on a European wheel).
              After every loss, double the bet. After any win — regardless of how many
              times you've doubled — reset back to the base bet.
            </div>
            <div style={s.seq}>
              Bet $10 → lose → $990{"\n"}
              Bet $20 → lose → $970{"\n"}
              Bet $40 → lose → $930{"\n"}
              Bet $80 → <span style={{ color: "#4ade80" }}>win</span> → $1010 (+$10){"\n"}
              Bet $10 → reset ↺
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Why it seems to work</div>
            <div style={s.cardBody}>
              Each win recovers the entire losing streak plus exactly one unit of base bet profit.
              Short streaks are common, so most sessions end in a small gain — creating the
              illusion of a reliable edge. Win rate can look high even when EV is negative.
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Why it actually doesn't</div>
            <div style={s.cardBody}>
              Bet sizes grow exponentially: 10 consecutive losses turns a $10 base bet
              into a $10,240 required bet. A finite bankroll means a long enough losing
              streak <em>will</em> bust you. The rare catastrophic loss erases all
              accumulated small wins — the house edge of ~1.4% (EU) or ~5.3% (US) is never overcome.
            </div>
            <div style={s.seq}>
              10 losses in a row:{"\n"}
              $10 → $20 → $40 → $80 → $160{"\n"}
              → $320 → $640 → $1,280 → $2,560 → <span style={s.warn}>$5,120</span>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>Key risk metrics to watch</div>
            <div style={s.cardBody}>
              <strong style={{ color: "#e0e0e0" }}>Bust rate</strong> — fraction of sessions that hit $0.{"\n\n"}
              <strong style={{ color: "#e0e0e0" }}>EV</strong> — average final bankroll vs starting bankroll. Should be negative.{"\n\n"}
              <strong style={{ color: "#e0e0e0" }}>Max drawdown</strong> — worst peak-to-trough drop as % of peak.{"\n\n"}
              <strong style={{ color: "#e0e0e0" }}>Losing streak exposure</strong> — how often you face N losses in a row.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
