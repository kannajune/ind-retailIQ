import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { COLORS } from "../../constants/colors";
import { FieldLabel } from "../common/FieldLabel";
import { Badge } from "../common/Badge";
import { KpiCard } from "../common/KpiCard";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardData } from "../../services/api";
import { useState } from "react";
import { getDashboard } from "../../services/api";

interface Step3DashboardProps {
  dashboardData: DashboardData | null;
  allRunIds?: string[];
  currentRunId?: string;
  onRunIdChange?: (runId: string) => void;
  onDashboardDataChange?: (dashboardData: DashboardData) => void;
  onChatOpen: () => void;
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontFamily: COLORS.mono,
        fontSize: 11,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ color: COLORS.textSub, marginBottom: 4 }}>{label}</div>
      {payload.map(
        (p: any) =>
          p.value != null && (
            <div
              key={p.dataKey}
              style={{
                color: p.dataKey === "hist" ? COLORS.blue : COLORS.green,
                fontWeight: 700,
              }}
            >
              {p.dataKey === "hist" ? "Actual" : "Forecast"}: {p.value} units
            </div>
          )
      )}
    </div>
  );
};

export function Step3Dashboard({ dashboardData: initialData, allRunIds = [], onRunIdChange, onDashboardDataChange, onChatOpen }: Step3DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasMultipleProducts = allRunIds.length > 1;

  const handlePrevious = async () => {
    if (currentIndex > 0 && allRunIds.length > 0) {
      const newIndex = currentIndex - 1;
      const newRunId = allRunIds[newIndex];
      setCurrentIndex(newIndex);
      await loadDashboard(newRunId);
    }
  };

  const handleNext = async () => {
    if (currentIndex < allRunIds.length - 1) {
      const newIndex = currentIndex + 1;
      const newRunId = allRunIds[newIndex];
      setCurrentIndex(newIndex);
      await loadDashboard(newRunId);
    }
  };

  const loadDashboard = async (runId: string) => {
    setLoading(true);
    try {
      const data = await getDashboard(runId);
      setDashboardData(data);
      if (onRunIdChange) {
        onRunIdChange(runId);
      }
      if (onDashboardDataChange) {
        onDashboardDataChange(data);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!dashboardData) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: COLORS.textSub }}>
        Loading dashboard data...
      </div>
    );
  }

  const { forecast, inventory, optimization, llm_insight, sku } = dashboardData;

  // Transform forecast data for chart
  const chartData = forecast.historical_data.map((hist, i) => ({
    day: `Day ${i + 1}`,
    hist: Math.round(hist),
    forecast: i < forecast.forecast_data.length ? forecast.forecast_data[i] : null,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {hasMultipleProducts && (
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0 || loading}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: `1px solid ${COLORS.border}`,
              background: currentIndex === 0 ? COLORS.bg : COLORS.surface,
              color: currentIndex === 0 ? COLORS.textMuted : COLORS.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: currentIndex === 0 || loading ? "not-allowed" : "pointer",
              fontFamily: COLORS.sans,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: COLORS.mono, fontSize: 12, color: COLORS.textSub }}>
              Product {currentIndex + 1} of {allRunIds.length}
            </span>
            <Badge color={COLORS.blue}>{sku}</Badge>
          </div>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === allRunIds.length - 1 || loading}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: `1px solid ${COLORS.border}`,
              background: currentIndex === allRunIds.length - 1 ? COLORS.bg : COLORS.surface,
              color: currentIndex === allRunIds.length - 1 ? COLORS.textMuted : COLORS.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: currentIndex === allRunIds.length - 1 || loading ? "not-allowed" : "pointer",
              fontFamily: COLORS.sans,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      
      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          padding: "18px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div>
            <FieldLabel>Demand Forecast · {sku}</FieldLabel>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: COLORS.text,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              14-day Prediction:{" "}
              <span style={{ color: COLORS.green, fontWeight: 800, fontSize: 16 }}>
                {forecast.next_14_days} units
              </span>
              <Badge color={COLORS.green}>{Math.round(forecast.confidence * 100)}% confidence</Badge>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, height: 2, background: COLORS.blue }} />
              <span style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textSub }}>
                Historical
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 18, borderTop: `2px dashed ${COLORS.green}`, height: 0 }} />
              <span style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textSub }}>
                Forecast
              </span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={175}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#E4E6EB" />
            <XAxis
              dataKey="day"
              tick={{ fill: COLORS.textSub, fontSize: 10, fontFamily: "IBM Plex Mono" }}
              tickLine={false}
              axisLine={{ stroke: COLORS.border }}
              interval={3}
            />
            <YAxis
              tick={{ fill: COLORS.textSub, fontSize: 10, fontFamily: "IBM Plex Mono" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTip />} />
            <Area
              type="monotone"
              dataKey="hist"
              stroke={COLORS.blue}
              strokeWidth={2.5}
              fill={`${COLORS.blue}0F`}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={COLORS.green}
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <KpiCard
          label="Current Stock"
          value={`${inventory.current_stock} units`}
          sub={`${inventory.days_of_coverage} days coverage`}
          highlight={COLORS.amber}
          color={COLORS.amber}
        />
        <KpiCard
          label="Risk Level"
          value={inventory.risk_level.toUpperCase()}
          sub={`${inventory.expiry_risk} expiry risk`}
          highlight={COLORS.red}
          color={COLORS.red}
        />
        <KpiCard
          label="Reorder Qty"
          value={`${optimization.recommended_order_qty} units`}
          sub={`Order within ${optimization.order_by_days} days`}
          highlight={COLORS.blue}
          color={COLORS.blue}
        />
        <KpiCard
          label="Capital Impact"
          value={`${optimization.working_capital_impact_percent}%`}
          sub="Working capital"
          highlight={COLORS.green}
          color={COLORS.green}
        />
      </div>

      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderLeft: `4px solid ${COLORS.blue}`,
          borderRadius: "0 10px 10px 0",
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge color={COLORS.blue}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Sparkles size={12} />
                <span>AI Insight</span>
              </div>
            </Badge>
          </div>
          <button
            onClick={onChatOpen}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${COLORS.blue}`,
              background: COLORS.blueDim,
              color: COLORS.blue,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: COLORS.sans,
            }}
          >
            Ask AI →
          </button>
        </div>
        <div style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.8 }}>
          {llm_insight.summary}
        </div>
      </div>
    </div>
  );
}
