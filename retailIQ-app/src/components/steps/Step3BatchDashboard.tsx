import { useState, useEffect } from "react";
import { COLORS } from "../../constants/colors";
import { FieldLabel } from "../common/FieldLabel";
import { KpiCard } from "../common/KpiCard";
import { Package, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { getProductRecommendations } from "../../services/api";

interface Step3BatchDashboardProps {
  datasetId: string;
  totalProducts: number;
  onContinue: () => void;
}

export function Step3BatchDashboard({ datasetId, totalProducts, onContinue }: Step3BatchDashboardProps) {
  const [stats, setStats] = useState({
    total: totalProducts,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    needsReorder: 0,
    healthy: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await getProductRecommendations(datasetId);
        const products = response.recommendations;
        
        const highRisk = products.filter(p => p.risk_level === "HIGH").length;
        const mediumRisk = products.filter(p => p.risk_level === "MEDIUM").length;
        const lowRisk = products.filter(p => p.risk_level === "LOW").length;
        
        const needsReorder = products.filter(p => 
          p.risk_level === "HIGH" || 
          p.risk_level === "MEDIUM" || 
          p.days_of_coverage < 7 ||
          p.recommended_order_qty > 0
        ).length;
        
        const healthy = products.length - needsReorder;
        
        setStats({
          total: products.length,
          highRisk,
          mediumRisk,
          lowRisk,
          needsReorder,
          healthy,
        });
      } catch (err) {
        console.error("Failed to load product stats:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [datasetId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: COLORS.textSub }}>
        Loading batch analysis...
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <FieldLabel>Batch Processing Complete</FieldLabel>
        <div style={{ fontSize: 14, color: COLORS.textSub, marginTop: 4 }}>
          All {stats.total} products have been analyzed. Review the summary below.
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <KpiCard
          label="Total Products"
          value={`${stats.total}`}
          sub="Analyzed"
          highlight={COLORS.blue}
          color={COLORS.blue}
        />
        <KpiCard
          label="High Risk"
          value={`${stats.highRisk}`}
          sub="Need immediate action"
          highlight={COLORS.red}
          color={COLORS.red}
        />
        <KpiCard
          label="Medium Risk"
          value={`${stats.mediumRisk}`}
          sub="Monitor closely"
          highlight={COLORS.amber}
          color={COLORS.amber}
        />
        <KpiCard
          label="Low Risk"
          value={`${stats.lowRisk}`}
          sub="Sufficient stock"
          highlight={COLORS.green}
          color={COLORS.green}
        />
      </div>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={24} color={COLORS.red} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>
                Reorder Recommendations
              </div>
              <div style={{ fontSize: 13, color: COLORS.textSub }}>
                Products requiring immediate attention
              </div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.red, marginBottom: 8 }}>
            {stats.needsReorder} Products
          </div>
          <div style={{ fontSize: 13, color: COLORS.textSub }}>
            Based on current stock levels and sales velocity, {stats.needsReorder} products need reordering within the next 14 days.
          </div>
        </div>

        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <CheckCircle size={24} color={COLORS.green} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>
                Healthy Stock Levels
              </div>
              <div style={{ fontSize: 13, color: COLORS.textSub }}>
                Products with sufficient inventory
              </div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.green, marginBottom: 8 }}>
            {stats.healthy} Products
          </div>
          <div style={{ fontSize: 13, color: COLORS.textSub }}>
            These products have adequate stock coverage for the next 14+ days and don't require immediate action.
          </div>
        </div>
      </div>

      {/* Analysis Details */}
      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderLeft: `4px solid ${COLORS.blue}`,
          borderRadius: "0 10px 10px 0",
          padding: "18px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <TrendingUp size={20} color={COLORS.blue} />
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>
            Analysis Summary
          </div>
        </div>
        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8 }}>
          The system has analyzed 40 days of sales history combined with current inventory levels for all {stats.total} products. 
          Machine learning models have generated 14-day demand forecasts, calculated risk levels, and provided optimization recommendations. 
          Products are categorized by velocity (fast, medium, slow-moving) and stock coverage to prioritize reorder decisions.
        </div>
      </div>

      {/* Action Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          onClick={onContinue}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: `1px solid ${COLORS.blue}`,
            background: COLORS.blue,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: COLORS.sans,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <Package size={18} />
          Review Products →
        </button>
      </div>
    </div>
  );
}
