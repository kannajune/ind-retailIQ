import { COLORS } from "../../constants/colors";
import { FieldLabel } from "../common/FieldLabel";
import { Package, AlertCircle, Check, Pause, RotateCcw } from "lucide-react";
import type { DashboardData } from "../../services/api";
import { submitDecision } from "../../services/api";
import { useState } from "react";

interface RightSidebarProps {
  step: number;
  pipelineDone: boolean;
  approved: boolean;
  dashboardData: DashboardData | null;
  selectedProductForDecision?: any;
  decisionAction?: string | null;
  decisionQty?: number;
  onDecisionActionChange?: (action: string | null) => void;
  onDecisionQtyChange?: (qty: number) => void;
}

export function RightSidebar({ 
  step, 
  pipelineDone, 
  approved, 
  dashboardData,
  selectedProductForDecision,
  decisionAction,
  decisionQty,
  onDecisionActionChange,
  onDecisionQtyChange,
}: RightSidebarProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // For Step 5, use selectedProductForDecision; otherwise use dashboardData
  const displayData = step === 5 && selectedProductForDecision ? selectedProductForDecision : dashboardData;
  // Hide sidebar only for Step 6 (summary has its own layout)
  if (step === 6) {
    return null;
  }

  if (!pipelineDone || step < 3) {
    return (
      <div
        style={{
          width: 240,
          flexShrink: 0,
          background: COLORS.surface,
          borderLeft: `1px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <FieldLabel>Context Panel</FieldLabel>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <Package size={40} color={COLORS.textMuted} strokeWidth={1.5} />
          <div
            style={{
              fontFamily: COLORS.mono,
              fontSize: 11,
              textAlign: "center",
              color: COLORS.textSub,
              lineHeight: 1.7,
            }}
          >
            Run pipeline to
            <br />
            populate context
          </div>
        </div>
      </div>
    );
  }

  const handleDecisionAction = async (action: "approve" | "modify" | "hold") => {
    if (!selectedProductForDecision || !onDecisionActionChange) return;
    
    onDecisionActionChange(action);
    setSubmitting(true);
    setError("");

    try {
      await submitDecision(
        selectedProductForDecision.run_id,
        action,
        action === "modify" && decisionQty ? decisionQty : undefined
      );
      
      // Success - you might want to add a success message or callback here
      setTimeout(() => {
        setSubmitting(false);
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit decision");
      setSubmitting(false);
    }
  };

  // Step 5: Show selected product from decision table
  if (step === 5 && selectedProductForDecision) {
    const product = selectedProductForDecision;
    const getRiskColor = (risk: string) => {
      switch (risk?.toLowerCase()) {
        case "high": return COLORS.red;
        case "medium": return COLORS.amber;
        case "low": return COLORS.green;
        default: return COLORS.textSub;
      }
    };

    return (
      <div
        style={{
          width: 280,
          flexShrink: 0,
          background: COLORS.surface,
          borderLeft: `1px solid ${COLORS.border}`,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <FieldLabel>Selected Product</FieldLabel>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginTop: 6 }}>
            {product.sku_name}
          </div>
          <div style={{ fontFamily: COLORS.mono, fontSize: 11, color: COLORS.textSub, marginTop: 2 }}>
            {product.sku_id}
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <FieldLabel>Risk Status</FieldLabel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              background: `${getRiskColor(product.risk_level)}15`,
              border: `1px solid ${getRiskColor(product.risk_level)}25`,
              marginTop: 8,
            }}
          >
            <AlertCircle size={20} color={getRiskColor(product.risk_level)} />
            <div>
              <div style={{ color: getRiskColor(product.risk_level), fontWeight: 700, fontSize: 13 }}>
                {product.risk_level?.toUpperCase() || "UNKNOWN"} RISK
              </div>
              <div style={{ fontFamily: COLORS.mono, fontSize: 10, color: `${getRiskColor(product.risk_level)}aa` }}>
                {product.days_of_coverage || 0} days coverage
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <FieldLabel>Product Details</FieldLabel>
          {[
            { l: "Current Stock", v: `${product.current_stock || 0} units`, c: COLORS.amber },
            { l: "Days Coverage", v: `${product.days_of_coverage || 0} days`, c: COLORS.red },
            { l: "14d Forecast", v: `${product.forecast_next_14_days || 0} units`, c: COLORS.blue },
            { l: "Confidence", v: `${Math.round((product.confidence || 0) * 100)}%`, c: COLORS.green },
            { l: "Reorder Qty", v: `${product.recommended_order_qty || 0} units`, c: COLORS.violet },
            { l: "Order By", v: `${product.order_by_days || 0} days`, c: COLORS.amber },
            { l: "Capital Impact", v: `${product.working_capital_impact_percent || 0}%`, c: COLORS.amber },
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
                style={{ fontFamily: COLORS.mono, fontSize: 10, color: x.c, fontWeight: 700 }}
              >
                {x.v}
              </span>
            </div>
          ))}
        </div>

        {decisionAction === "modify" && onDecisionQtyChange && (
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <FieldLabel>Adjust Quantity</FieldLabel>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: COLORS.mono, fontSize: 13, color: COLORS.amber, fontWeight: 700 }}>
                {decisionQty || 0} units
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={Math.max(600, (product.recommended_order_qty || 0) + 200)}
              step={10}
              value={decisionQty || 0}
              onChange={(e) => onDecisionQtyChange(Number(e.target.value))}
              style={{ width: "100%", accentColor: COLORS.blue }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontFamily: COLORS.mono, fontSize: 9, color: COLORS.textMuted }}>50</span>
              <span style={{ fontFamily: COLORS.mono, fontSize: 9, color: COLORS.textMuted }}>
                {Math.max(600, (product.recommended_order_qty || 0) + 200)}
              </span>
            </div>
          </div>
        )}

        <div style={{ padding: "14px 16px" }}>
          <FieldLabel>Take Action</FieldLabel>
          {error && (
            <div style={{ 
              fontSize: 11, 
              color: COLORS.red, 
              marginTop: 8, 
              marginBottom: 8,
              padding: "8px",
              background: COLORS.redDim,
              borderRadius: 6,
            }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => handleDecisionAction("approve")}
              disabled={submitting}
              style={{
                padding: "10px 0",
                borderRadius: 8,
                border: `1px solid ${decisionAction === "approve" ? COLORS.green + "50" : COLORS.border}`,
                background: decisionAction === "approve" ? COLORS.greenDim : COLORS.surface,
                color: decisionAction === "approve" ? COLORS.green : COLORS.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: COLORS.sans,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <Check size={14} strokeWidth={2.5} />
              Approve
            </button>
            <button
              onClick={() => handleDecisionAction("modify")}
              disabled={submitting}
              style={{
                padding: "10px 0",
                borderRadius: 8,
                border: `1px solid ${decisionAction === "modify" ? COLORS.amber + "50" : COLORS.border}`,
                background: decisionAction === "modify" ? COLORS.amberDim : COLORS.surface,
                color: decisionAction === "modify" ? COLORS.amber : COLORS.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: COLORS.sans,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <RotateCcw size={14} strokeWidth={2} />
              Modify
            </button>
            <button
              onClick={() => handleDecisionAction("hold")}
              disabled={submitting}
              style={{
                padding: "10px 0",
                borderRadius: 8,
                border: `1px solid ${decisionAction === "hold" ? COLORS.textSub + "50" : COLORS.border}`,
                background: decisionAction === "hold" ? COLORS.bg : COLORS.surface,
                color: COLORS.textSub,
                fontSize: 12,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: COLORS.sans,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <Pause size={14} strokeWidth={2} />
              Hold
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Steps 3-4: Show dashboard data
  const sku = displayData?.sku || displayData?.sku_name || "Loading...";
  const riskLevel = displayData?.inventory?.risk_level || displayData?.risk_level || "HIGH";
  const daysOfCoverage = displayData?.inventory?.days_of_coverage || displayData?.days_of_coverage || 0;

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: COLORS.surface,
        borderLeft: `1px solid ${COLORS.border}`,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
        <FieldLabel>Active SKU</FieldLabel>
        <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 6 }}>
          {sku}
        </div>
      </div>

      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
        <FieldLabel>Risk Status</FieldLabel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 8,
            background: COLORS.redDim,
            border: `1px solid ${COLORS.red}25`,
            marginBottom: 12,
          }}
        >
          <AlertCircle size={20} color={COLORS.red} />
          <div>
            <div style={{ color: COLORS.red, fontWeight: 700, fontSize: 13 }}>
              {riskLevel.toUpperCase()} RISK
            </div>
            <div style={{ fontFamily: COLORS.mono, fontSize: 10, color: `${COLORS.red}aa` }}>
              {daysOfCoverage} days coverage
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
        <FieldLabel>Analysis Snapshot</FieldLabel>
        {[
          { l: "Current Stock", v: `${displayData?.inventory?.current_stock || 0} units`, c: COLORS.amber },
          { l: "Days Coverage", v: `${daysOfCoverage} days`, c: COLORS.red },
          { l: "14d Forecast", v: `${displayData?.forecast?.next_14_days || 0} units`, c: COLORS.blue },
          { l: "Confidence", v: `${Math.round((displayData?.forecast?.confidence || 0) * 100)}%`, c: COLORS.green },
          { l: "Reorder Qty", v: `${displayData?.optimization?.recommended_order_qty || 0} units`, c: COLORS.violet },
          { l: "Capital Impact", v: `${displayData?.optimization?.working_capital_impact_percent || 0}%`, c: COLORS.amber },
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
              style={{ fontFamily: COLORS.mono, fontSize: 10, color: x.c, fontWeight: 700 }}
            >
              {x.v}
            </span>
          </div>
        ))}
      </div>

      {approved && (
        <div style={{ padding: "14px 16px" }}>
          <FieldLabel color={COLORS.green}>PO Generated</FieldLabel>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: COLORS.greenDim,
              border: `1px solid ${COLORS.green}30`,
            }}
          >
            {[
              { l: "Vendor", v: "XYZ Traders" },
              { l: "Qty", v: `${displayData?.optimization?.recommended_order_qty || 0} units` },
              { l: "Order By", v: `${displayData?.optimization?.order_by_days || 1} days` },
              { l: "PO#", v: "PO-2025-0394" },
            ].map((x) => (
              <div
                key={x.l}
                style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
              >
                <span style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textSub }}>
                  {x.l}
                </span>
                <span
                  style={{
                    fontFamily: COLORS.mono,
                    fontSize: 10,
                    color: COLORS.green,
                    fontWeight: 700,
                  }}
                >
                  {x.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
