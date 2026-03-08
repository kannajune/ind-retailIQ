import { COLORS } from "../../constants/colors";
import { Badge } from "../common/Badge";
import { LogOut, User } from "lucide-react";

interface HeaderProps {
  step: number;
  username?: string;
  onLogout?: () => void;
}

const STEP_LABELS = [
  "Data Upload",
  "Processing",
  "Dashboard",
  "AI Chat",
  "Decision",
  "Summary",
];

export const Header = ({ step, username, onLogout }: HeaderProps) => {
  return (
    <div
      style={{
        height: 52,
        background: COLORS.surface,
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ width: 220, flexShrink: 0, paddingInline: 16 }}>
        <span style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textSub }}>
          Step {step} of 6
        </span>
      </div>
      <div
        style={{
          flex: 1,
          paddingInline: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 3 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              style={{
                width: 30,
                height: 4,
                borderRadius: 2,
                background: n <= step ? COLORS.blue : COLORS.border,
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
          {STEP_LABELS[step - 1]}
        </span>
      </div>
      <div
        style={{
          width: 300,
          flexShrink: 0,
          paddingInline: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <Badge color={COLORS.green}>● Active</Badge>
        {username && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: COLORS.textSub }}>
              <User size={14} />
              <span>{username}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  color: COLORS.textSub,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = COLORS.red}
                onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textSub}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
