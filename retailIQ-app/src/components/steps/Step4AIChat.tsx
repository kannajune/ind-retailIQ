import { useState, useEffect, useRef } from "react";
import { COLORS } from "../../constants/colors";
import { Badge } from "../common/Badge";
import { Sparkles, User, Send } from "lucide-react";
import { queryLLM, type DashboardData } from "../../services/api";

interface Step4AIChatProps {
  runId: string;
  dashboardData: DashboardData | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGG = [
  "Why exactly this quantity?",
  "What if demand drops 10%?",
  "Break down the revenue risk.",
  "How reliable is the forecast?",
];

export function Step4AIChat({ runId, dashboardData }: Step4AIChatProps) {
  const [msgs, setMsgs] = useState<Message[]>([
    {
      role: "assistant",
      content: dashboardData
        ? `I've completed the demand analysis for ${dashboardData.sku}. Key finding: ${dashboardData.inventory.days_of_coverage}-day stock coverage puts you at ${dashboardData.inventory.risk_level} risk. I recommend reordering ${dashboardData.optimization.recommended_order_qty} units. What would you like to know?`
        : "I've completed the demand analysis. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setLoading(true);

    try {
      const response = await queryLLM(runId, q);
      setMsgs((m) => [...m, { role: "assistant", content: response.answer }]);
    } catch (err) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: "I'm having trouble connecting to the AI service. Please try again.",
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "calc(100vh - 160px)",
        minHeight: 400,
      }}
    >
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>

      <div
        style={{
          background: COLORS.blueDim,
          border: `1px solid ${COLORS.blue}25`,
          borderRadius: 8,
          padding: "10px 14px",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: COLORS.mono,
            fontSize: 10,
            color: COLORS.blue,
            fontWeight: 700,
          }}
        >
          CONTEXT LOADED
        </span>
        <Badge color={COLORS.textSub}>{dashboardData?.sku || "SKU"}</Badge>
        <Badge color={COLORS.red}>Risk: {dashboardData?.inventory.risk_level.toUpperCase() || "HIGH"}</Badge>
        <Badge color={COLORS.blue}>
          Reorder: {dashboardData?.optimization.recommended_order_qty || 0} units
        </Badge>
        <Badge color={COLORS.amber}>
          {dashboardData?.optimization.working_capital_impact_percent || 0}% capital impact
        </Badge>
      </div>

      <div
        style={{
          flex: 1,
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            background: COLORS.bg,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: COLORS.blue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
              DemandIQ AI Analyst
            </div>
            <div style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.green }}>
              ● Bedrock · Claude · Online
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-start",
              }}
            >
              {m.role === "assistant" && (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: COLORS.blue,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  <Sparkles size={16} />
                </div>
              )}
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  fontSize: 13.5,
                  color: COLORS.text,
                  lineHeight: 1.7,
                  background: m.role === "user" ? COLORS.blueDim : COLORS.surface,
                  border: `1px solid ${m.role === "user" ? COLORS.blue + "30" : COLORS.border}`,
                  borderRadius: 10,
                  borderTopLeftRadius: m.role === "assistant" ? 3 : 10,
                  borderTopRightRadius: m.role === "user" ? 3 : 10,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.textSub,
                  }}
                >
                  <User size={16} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: COLORS.blue,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: "#fff",
                }}
              >
                ✦
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "10px 10px 10px 3px",
                }}
              >
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: COLORS.blue,
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {msgs.length <= 2 && (
          <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
            <div
              style={{
                fontFamily: COLORS.mono,
                fontSize: 9,
                color: COLORS.textSub,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Suggested questions
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SUGG.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 16,
                    cursor: "pointer",
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.surface,
                    color: COLORS.text,
                    fontSize: 12,
                    fontFamily: COLORS.sans,
                    fontWeight: 500,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            padding: "12px 16px",
            borderTop: `1px solid ${COLORS.border}`,
            display: "flex",
            gap: 8,
            flexShrink: 0,
            background: COLORS.bg,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about the forecast, risk, or recommendation..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              color: COLORS.text,
              fontFamily: COLORS.sans,
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: input.trim() && !loading ? COLORS.blue : COLORS.border,
              color: input.trim() && !loading ? "#fff" : COLORS.textSub,
              fontSize: 13,
              fontWeight: 600,
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              fontFamily: COLORS.sans,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
