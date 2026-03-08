import { COLORS } from "../../constants/colors";

interface FieldLabelProps {
  children: React.ReactNode;
  color?: string;
}

export const FieldLabel = ({ children, color = COLORS.textSub }: FieldLabelProps) => (
  <div
    style={{
      fontFamily: COLORS.mono,
      fontSize: 10,
      color,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginBottom: 8,
    }}
  >
    {children}
  </div>
);
