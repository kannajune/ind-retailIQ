import { COLORS } from "../../constants/colors";
import { NAV_ITEMS } from "../../constants/navigation";
import * as Icons from "lucide-react";

interface LeftNavProps {
  step: number;
  setStep: (step: number) => void;
  pipelineDone: boolean;
}

export const LeftNav = ({ step, setStep, pipelineDone }: LeftNavProps) => {
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "18px 16px 16px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: COLORS.blue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "#fff",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            R
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>
              RetailIQ
            </div>
            <div
              style={{
                fontFamily: COLORS.mono,
                fontSize: 9,
                color: COLORS.textSub,
              }}
            >
              Demand Planner
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div style={{ flex: 1, padding: "10px 8px" }}>
        <div
          style={{
            fontFamily: COLORS.mono,
            fontSize: 9,
            color: COLORS.textMuted,
            letterSpacing: "0.12em",
            padding: "6px 8px 8px",
          }}
        >
          WORKFLOW
        </div>
        {NAV_ITEMS.map((s) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          const locked = s.id > 2 && !pipelineDone;
          const IconComponent = Icons[s.icon as keyof typeof Icons] as any;

          return (
            <div
              key={s.id}
              onClick={() => !locked && setStep(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px",
                borderRadius: 8,
                marginBottom: 2,
                background: isActive ? COLORS.blueDim : "transparent",
                border: `1px solid ${isActive ? COLORS.blue + "30" : "transparent"}`,
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.4 : 1,
                transition: "background 0.15s",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  flexShrink: 0,
                  background: isActive
                    ? COLORS.blue
                    : isDone
                    ? COLORS.greenDim
                    : COLORS.bg,
                  border: `1px solid ${
                    isActive
                      ? COLORS.blue
                      : isDone
                      ? COLORS.green + "40"
                      : COLORS.border
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isDone ? (
                  <Icons.Check size={14} color={COLORS.green} strokeWidth={3} />
                ) : (
                  <IconComponent
                    size={15}
                    color={isActive ? "#fff" : COLORS.textSub}
                    strokeWidth={2}
                  />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? COLORS.blue : COLORS.text,
                    lineHeight: 1.2,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: COLORS.mono,
                    fontSize: 9,
                    color: COLORS.textSub,
                    marginTop: 1,
                  }}
                >
                  {s.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: COLORS.green,
            }}
          />
          <span
            style={{
              fontFamily: COLORS.mono,
              fontSize: 10,
              color: COLORS.textSub,
            }}
          >
            System Online
          </span>
        </div>
      </div>
    </div>
  );
};
