import { useState, useEffect } from "react";
import { COLORS } from "../../constants/colors";
import { Badge } from "../common/Badge";
import { Module } from "../../types";
import * as Icons from "lucide-react";
import { getDashboard, runBatchEngine } from "../../services/api";

interface Step2ProcessingProps {
  datasetId: string;
  onComplete: (runId: string, dashboardData: any, allRunIds?: string[]) => void;
  setError: (error: string) => void;
}

const MODULES: Module[] = [
  {
    id: 1,
    icon: "Database",
    label: "Data Parsing",
    color: COLORS.blue,
    dimColor: COLORS.blueDim,
    dur: 1400,
    metrics: [
      { l: "Rows Parsed", v: "92,430" },
      { l: "SKUs Found", v: "1,248" },
      { l: "Columns", v: "18" },
    ],
    status: "Dataset loaded and validated",
  },
  {
    id: 2,
    icon: "TrendingUp",
    label: "Demand Forecast",
    color: COLORS.violet,
    dimColor: COLORS.violetDim,
    dur: 2600,
    metrics: [
      { l: "Model", v: "XGBoost" },
      { l: "MAPE", v: "15.2%" },
      { l: "Confidence", v: "88%" },
    ],
    status: "14-day forecast: 420 units",
  },
  {
    id: 3,
    icon: "AlertTriangle",
    label: "Risk Assessment",
    color: COLORS.red,
    dimColor: COLORS.redDim,
    dur: 1600,
    metrics: [
      { l: "Risk Score", v: "0.82" },
      { l: "Coverage", v: "4 days" },
      { l: "Stockout", v: "94.2%" },
    ],
    status: "HIGH RISK · Stockout in 5 days",
  },
  {
    id: 4,
    icon: "Settings",
    label: "Reorder Optimizer",
    color: COLORS.amber,
    dimColor: COLORS.amberDim,
    dur: 1400,
    metrics: [
      { l: "Reorder Qty", v: "350 u" },
      { l: "Safety Stock", v: "45 u" },
      { l: "Efficiency", v: "+12%" },
    ],
    status: "Capital impact: ₹1.05L",
  },
  {
    id: 5,
    icon: "Sparkles",
    label: "LLM Explanation",
    color: COLORS.violet,
    dimColor: COLORS.violetDim,
    dur: 1800,
    metrics: [
      { l: "Model", v: "Claude" },
      { l: "Tokens", v: "187" },
      { l: "Latency", v: "0.8s" },
    ],
    status: "Bedrock · Explanation generated",
  },
];

const TOTAL_DUR = MODULES.reduce((a, m) => a + m.dur, 0);

export function Step2Processing({ datasetId, onComplete, setError }: Step2ProcessingProps) {
  const [phase, setPhase] = useState(0);
  const [counter, setCounter] = useState(0);
  const [runId, setRunId] = useState<string>("");
  const [allRunIds, setAllRunIds] = useState<string[]>([]);

  const allDone = phase >= MODULES.length;
  const runIdx = allDone ? MODULES.length - 1 : phase;
  const runMod = MODULES[runIdx];
  const doneIdxs = Array.from({ length: Math.min(phase, MODULES.length) }, (_, i) => i);

  // Call API when processing starts
  useEffect(() => {
    if (!runId && datasetId) {
      console.log("Starting batch engine for ALL SKUs from uploaded dataset:", datasetId);
      
      // Use batch processing to handle all SKUs efficiently
      runBatchEngine(datasetId)
        .then((response) => {
          console.log("Batch processing completed:", response);
          const runIds = response.run_ids;
          setAllRunIds(runIds);
          setRunId(runIds[0]); // Set first run_id for dashboard display
        })
        .catch((err) => {
          console.error("Batch engine failed:", err);
          setError(err.response?.data?.detail || err.message || "Failed to start batch engine");
        });
    }
  }, [runId, datasetId, setError]);

  // Fetch dashboard data when all modules are done
  useEffect(() => {
    if (allDone && runId && allRunIds.length > 0) {
      console.log("Fetching dashboard data for run_id:", runId);
      getDashboard(runId)
        .then((data) => {
          console.log("Dashboard data received:", data);
          setTimeout(() => {
            onComplete(runId, data, allRunIds);
          }, 500);
        })
        .catch((err) => {
          console.error("Failed to fetch dashboard:", err);
          setError(err.response?.data?.detail || err.message || "Failed to load dashboard");
        });
    }
  }, [allDone, runId, allRunIds, onComplete, setError]);

  useEffect(() => {
    if (allDone) return;
    setCounter(0);
    const steps = 40;
    const interval = runMod.dur / steps;
    let s = 0;
    const t = setInterval(() => {
      s++;
      setCounter(Math.round((s / steps) * 100));
      if (s >= steps) clearInterval(t);
    }, interval);
    return () => clearInterval(t);
  }, [phase, allDone, runMod.dur]);

  useEffect(() => {
    if (allDone) return;
    const t = setTimeout(() => setPhase((p) => p + 1), runMod.dur + 200);
    return () => clearTimeout(t);
  }, [phase, allDone, runMod.dur]);

  const elapsedMs = doneIdxs.reduce((a, i) => a + MODULES[i].dur, 0);
  const inProgressMs = allDone ? 0 : (counter / 100) * runMod.dur;
  const pct = allDone ? 100 : Math.min(99, Math.round(((elapsedMs + inProgressMs) / TOTAL_DUR) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.4; }
        }
      `}</style>

      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
            {allDone ? "Pipeline Complete ✓" : `Running: ${runMod.label}...`}
          </div>
          <span
            style={{
              fontFamily: COLORS.mono,
              fontSize: 13,
              color: allDone ? COLORS.green : COLORS.blue,
              fontWeight: 700,
            }}
          >
            {pct}%
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: COLORS.bg, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              borderRadius: 4,
              width: `${pct}%`,
              background: allDone ? COLORS.green : `linear-gradient(90deg,${COLORS.blue},#4d96ff)`,
              transition: "width 0.4s ease, background 0.5s",
              boxShadow: allDone ? `0 0 10px ${COLORS.green}50` : `0 0 10px ${COLORS.blue}40`,
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
          {MODULES.map((m, i) => {
            const IconComponent = Icons[m.icon as keyof typeof Icons] as any;
            return (
              <div
                key={m.id}
                style={{ display: "flex", alignItems: "center", flex: i < MODULES.length - 1 ? 1 : 0 }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    transition: "all 0.3s",
                    background: doneIdxs.includes(i)
                      ? m.color
                      : !allDone && i === phase
                      ? m.dimColor
                      : COLORS.bg,
                    border: `2px solid ${
                      doneIdxs.includes(i) ? m.color : !allDone && i === phase ? m.color : COLORS.border
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: !allDone && i === phase ? `0 0 10px ${m.color}50` : "none",
                  }}
                >
                  {doneIdxs.includes(i) ? (
                    <Icons.Check size={14} color="#fff" strokeWidth={3} />
                  ) : (
                    <IconComponent
                      size={14}
                      color={!allDone && i === phase ? m.color : COLORS.textSub}
                      strokeWidth={2}
                    />
                  )}
                </div>
                {i < MODULES.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      margin: "0 2px",
                      transition: "background 0.4s",
                      background: doneIdxs.includes(i) ? m.color : COLORS.border,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          {MODULES.map((m) => (
            <div
              key={m.id}
              style={{
                fontFamily: COLORS.mono,
                fontSize: 9,
                color: COLORS.textSub,
                textAlign: "center",
                minWidth: 60,
              }}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {MODULES.map((m, i) => {
          const done = doneIdxs.includes(i);
          const running = !allDone && i === phase;
          const pending = !done && !running;
          const IconComponent = Icons[m.icon as keyof typeof Icons] as any;
          
          return (
            <div
              key={m.id}
              style={{
                background: COLORS.surface,
                borderRadius: 10,
                padding: "16px",
                borderLeft: `1px solid ${done ? m.color + "30" : running ? m.color + "50" : COLORS.border}`,
                borderRight: `1px solid ${done ? m.color + "30" : running ? m.color + "50" : COLORS.border}`,
                borderBottom: `1px solid ${done ? m.color + "30" : running ? m.color + "50" : COLORS.border}`,
                borderTop: `3px solid ${done ? m.color : running ? m.color : COLORS.border}`,
                opacity: pending ? 0.45 : 1,
                transition: "all 0.4s",
                boxShadow: running
                  ? `0 4px 16px ${m.color}18`
                  : "0 1px 4px rgba(0,0,0,0.05)",
                transform: running ? "translateY(-2px)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: done ? m.color : running ? m.dimColor : COLORS.bg,
                      border: `1px solid ${done ? m.color : running ? m.color + "40" : COLORS.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s",
                    }}
                  >
                    {done ? (
                      <Icons.Check size={18} color="#fff" strokeWidth={3} />
                    ) : (
                      <IconComponent
                        size={18}
                        color={running ? m.color : COLORS.textSub}
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: done ? m.color : running ? m.color : COLORS.textSub,
                    }}
                  >
                    {m.label}
                  </div>
                </div>
                {running && (
                  <div style={{ display: "flex", gap: 3 }}>
                    {[0, 1, 2].map((d) => (
                      <div
                        key={d}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: m.color,
                          animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}
                {done && <Badge color={m.color}>Done</Badge>}
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: COLORS.bg,
                  marginBottom: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: m.color,
                    transition: running ? "width 0.3s ease" : "none",
                    width: done ? "100%" : running ? `${counter}%` : "0%",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {m.metrics.map((mt) => (
                  <div key={mt.l} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textSub }}>
                      {mt.l}
                    </span>
                    <span
                      style={{
                        fontFamily: COLORS.mono,
                        fontSize: 10,
                        fontWeight: 700,
                        color: done ? m.color : COLORS.textMuted,
                        transition: "color 0.3s",
                      }}
                    >
                      {done ? mt.v : "—"}
                    </span>
                  </div>
                ))}
              </div>
              {done && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "5px 8px",
                    borderRadius: 5,
                    background: m.dimColor,
                    fontFamily: COLORS.mono,
                    fontSize: 9,
                    color: m.color,
                    fontWeight: 600,
                  }}
                >
                  {m.status}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <button
          disabled
          style={{
            padding: "14px 0",
            borderRadius: 8,
            border: "none",
            background: COLORS.blue,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "default",
            fontFamily: COLORS.sans,
            boxShadow: `0 4px 16px ${COLORS.blue}35`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div className="animate-spin">⟳</div>
          {runId ? "Loading Dashboard Data..." : "Starting Engine..."}
        </button>
      )}
    </div>
  );
}
