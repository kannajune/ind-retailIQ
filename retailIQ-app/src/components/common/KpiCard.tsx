import { COLORS } from "../../constants/colors";
import type { KPIData } from "../../types";

export const KpiCard = ({ label, value, sub, color = COLORS.text, highlight }: KPIData) => (
  <div
    style={{
      background: COLORS.surface,
      border: `1px solid ${highlight ? highlight + "28" : COLORS.border}`,
      borderTop: `3px solid ${highlight || COLORS.border}`,
      borderRadius: 8,
      padding: "14px 16px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}
  >
    <div
      style={{
        fontFamily: COLORS.mono,
        fontSize: 10,
        color: COLORS.textSub,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          fontSize: 11,
          color: COLORS.textSub,
          marginTop: 5,
          fontFamily: COLORS.mono,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);
