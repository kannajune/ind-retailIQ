import { COLORS } from "../../constants/colors";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
}

export const Badge = ({ children, color = COLORS.blue }: BadgeProps) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 4,
      background: `${color}14`,
      color,
      fontSize: 11,
      fontFamily: COLORS.mono,
      fontWeight: 600,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
      border: `1px solid ${color}22`,
    }}
  >
    {children}
  </span>
);
