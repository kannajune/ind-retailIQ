import { useState, useEffect } from "react";
import { COLORS } from "../../constants/colors";
import { FieldLabel } from "../common/FieldLabel";
import { Badge } from "../common/Badge";
import { FileText, Bell, BarChart3, RefreshCw, Check } from "lucide-react";
import { getSummary, triggerRetraining, type DashboardData, type KPISummary } from "../../services/api";

interface Step6SummaryProps {
  runId: string;
  datasetId: string;
  dashboardData: DashboardData | null;
}

export function Step6Summary({ runId, datasetId, dashboardData }: Step6SummaryProps) {
  const [retrained, setRetrained] = useState(false);
  const [training, setTraining] = useState(false);
  const [kpiData, setKpiData] = useState<KPISummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getSummary(runId);
        setKpiData(data);
      } catch (err) {
        console.error("Failed to fetch summary:", err);
      } finally {
        setLoading(false);
      }
    };

    if (runId) {
      fetchSummary();
    }
  }, [runId]);

  const retrain = async () => {
    if (training || retrained) return;
    setTraining(true);
    
    try {
      await triggerRetraining(datasetId);
      // Refetch summary after retraining
      const data = await getSummary(runId);
      setKpiData(data);
      setRetrained(true);
    } catch (err) {
      console.error("Failed to retrain:", err);
    } finally {
      setTraining(false);
    }
  };

  if (loading || !kpiData || !dashboardData) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: COLORS.textSub }}>
        Loading summary data...
      </div>
    );
  }

  const { cost_pricing_intelligence, demand_intelligence, inventory_intelligence } = kpiData;

  // Get real data from dashboardData
  const recommendedQty = dashboardData?.optimization?.recommended_order_qty || 0;
  const orderByDays = dashboardData?.optimization?.order_by_days || 0;
  const skuName = dashboardData?.sku || "Unknown SKU";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Execution Status</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              {
                icon: <FileText size={24} />,
                l: "PO Generated",
                v: runId ? `Run: ${runId.substring(0, 12)}...` : "Pending",
                sub: `${skuName} · ${recommendedQty}u`,
                c: COLORS.green,
                bg: COLORS.greenDim,
              },
              {
                icon: <Bell size={24} />,
                l: "Alert Created",
                v: "Active",
                sub: `Restock T-${orderByDays} days`,
                c: COLORS.amber,
                bg: COLORS.amberDim,
              },
              {
                icon: <BarChart3 size={24} />,
                l: "Report Updated",
                v: "Synced",
                sub: "Weekly log updated",
                c: COLORS.blue,
                bg: COLORS.blueDim,
              },
            ].map((x) => (
              <div
                key={x.l}
                style={{
                  background: x.bg,
                  border: `1px solid ${x.c}20`,
                  borderTop: `3px solid ${x.c}`,
                  borderRadius: 8,
                  padding: "14px",
                }}
              >
                <div style={{ color: x.c, marginBottom: 8 }}>{x.icon}</div>
                <div
                  style={{
                    fontFamily: COLORS.mono,
                    fontSize: 9,
                    color: x.c,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 5,
                  }}
                >
                  {x.l}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: x.c, marginBottom: 4 }}>
                  {x.v}
                </div>
                <div style={{ fontSize: 11, color: COLORS.textSub, fontFamily: COLORS.mono }}>
                  {x.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Intelligence Blocks */}
        <div>
          <FieldLabel>Cost & Pricing Intelligence</FieldLabel>
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${COLORS.amber}`,
              borderRadius: "0 10px 10px 0",
              padding: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { l: "Gross Margin %", v: `${cost_pricing_intelligence.gross_margin_percent.toFixed(2)}%` },
                { l: "Cost-to-Serve", v: `₹${cost_pricing_intelligence.cost_to_serve_estimate.toFixed(0)}` },
                { l: "Profitability/SKU", v: `₹${cost_pricing_intelligence.profitability_per_sku.toFixed(0)}` },
              ].map((x) => (
                <div key={x.l}>
                  <div
                    style={{
                      fontFamily: COLORS.mono,
                      fontSize: 9,
                      color: COLORS.textSub,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 4,
                    }}
                  >
                    {x.l}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.amber }}>
                    {x.v}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${COLORS.border}`,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: COLORS.mono,
                    fontSize: 9,
                    color: COLORS.textSub,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  Working Capital Impact
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                  ₹{cost_pricing_intelligence.working_capital_impact.toFixed(0)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: COLORS.mono,
                    fontSize: 9,
                    color: COLORS.textSub,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  Margin Sensitivity
                </div>
                <div style={{ fontSize: 11, color: COLORS.red, fontWeight: 600 }}>
                  {cost_pricing_intelligence.margin_sensitivity}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Demand Intelligence</FieldLabel>
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${COLORS.blue}`,
              borderRadius: "0 10px 10px 0",
              padding: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { l: "Demand Trend (14-30d)", v: demand_intelligence.demand_trend_14_30_days },
                { l: "Seasonality Pattern", v: demand_intelligence.seasonality_pattern },
                { l: "YoY Demand Comparison", v: `+${demand_intelligence.yoy_demand_comparison.toFixed(1)}%` },
                { l: "Demand Spike Detection", v: demand_intelligence.demand_spike_detection ? "Active" : "None" },
              ].map((x) => (
                <div key={x.l}>
                  <div
                    style={{
                      fontFamily: COLORS.mono,
                      fontSize: 9,
                      color: COLORS.textSub,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 4,
                    }}
                  >
                    {x.l}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.blue }}>
                    {x.v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Inventory Intelligence</FieldLabel>
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${COLORS.green}`,
              borderRadius: "0 10px 10px 0",
              padding: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { l: "Inventory Depletion", v: inventory_intelligence.inventory_depletion_trend, c: COLORS.red },
                { l: "Days of Coverage Trend", v: `${inventory_intelligence.days_of_coverage_trend.toFixed(1)} days`, c: COLORS.amber },
                { l: "Stock Status Flag", v: inventory_intelligence.overstock_understock_flag, c: COLORS.red },
                { l: "YoY Inventory Turnover", v: `+${inventory_intelligence.yoy_inventory_turnover.toFixed(2)}%`, c: COLORS.green },
              ].map((x) => (
                <div key={x.l}>
                  <div
                    style={{
                      fontFamily: COLORS.mono,
                      fontSize: 9,
                      color: COLORS.textSub,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 4,
                    }}
                  >
                    {x.l}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <FieldLabel>KPI Impact · Before vs After</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            {[
              { l: "Coverage Before", v: `${dashboardData.inventory.days_of_coverage} days`, c: COLORS.red, hl: COLORS.red },
              { l: "Coverage After", v: `${dashboardData.inventory.days_of_coverage + 13} days`, c: COLORS.green, hl: COLORS.green },
              { l: "Capital Impact", v: `${dashboardData.optimization.working_capital_impact_percent}%`, c: COLORS.amber, hl: COLORS.amber },
              { l: "Order Urgency", v: `${dashboardData.optimization.order_by_days} days`, c: COLORS.blue, hl: COLORS.blue },
            ].map((x) => (
              <div
                key={x.l}
                style={{
                  padding: "12px",
                  background: COLORS.bg,
                  borderRadius: 8,
                  borderTop: `3px solid ${x.hl}`,
                }}
              >
                <div
                  style={{
                    fontFamily: COLORS.mono,
                    fontSize: 9,
                    color: COLORS.textSub,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 5,
                  }}
                >
                  {x.l}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <FieldLabel>Continuous Learning</FieldLabel>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: COLORS.mono,
                fontSize: 10,
                color: COLORS.textSub,
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Model Accuracy
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: retrained ? COLORS.green : COLORS.text,
                transition: "color 0.5s",
                lineHeight: 1,
              }}
            >
              {(kpiData.model_accuracy * 100).toFixed(1)}%
            </div>
            {retrained && (
              <div style={{ marginTop: 7 }}>
                <Badge color={COLORS.green}>↑ Improved</Badge>
              </div>
            )}
          </div>
          {[
            { l: "Last Retrained", v: retrained ? "Just now" : new Date(kpiData.last_retrained).toLocaleDateString() },
            { l: "Feedback Loop", v: "Active" },
            { l: "Training Rows", v: dashboardData.forecast.forecast_data.length.toLocaleString() },
          ].map((x) => (
            <div
              key={x.l}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <span style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textSub }}>
                {x.l}
              </span>
              <span
                style={{
                  fontFamily: COLORS.mono,
                  fontSize: 10,
                  color: COLORS.text,
                  fontWeight: 700,
                }}
              >
                {x.v}
              </span>
            </div>
          ))}
          <button
            onClick={retrain}
            disabled={retrained}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "10px 0",
              borderRadius: 8,
              border: `1px solid ${retrained ? COLORS.green + "40" : COLORS.border}`,
              background: retrained ? COLORS.greenDim : training ? COLORS.blueDim : COLORS.bg,
              color: retrained ? COLORS.green : training ? COLORS.blue : COLORS.textSub,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: COLORS.sans,
              cursor: retrained ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {retrained ? (
              <>
                <Check size={14} /> Retraining Complete
              </>
            ) : training ? (
              <>
                <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Training model...
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Trigger Retraining
              </>
            )}
          </button>
        </div>

        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "14px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <FieldLabel>Feedback Signals</FieldLabel>
          {[
            { l: "New PO data ingested", done: true },
            { l: "Sales variance logged", done: true },
            { l: "User override tracked", done: false },
            { l: "Retraining queued", done: retrained },
          ].map((x) => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  flexShrink: 0,
                  background: x.done ? COLORS.greenDim : COLORS.bg,
                  border: `1px solid ${x.done ? COLORS.green + "40" : COLORS.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: x.done ? COLORS.green : COLORS.textMuted,
                }}
              >
                {x.done && <Check size={12} strokeWidth={3} />}
              </div>
              <div style={{ fontSize: 12, color: x.done ? COLORS.text : COLORS.textSub }}>
                {x.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
