import { COLORS } from "./colors";
import type { NavItem } from "../types";

export const NAV_ITEMS: NavItem[] = [
  {
    id: 1,
    label: "Data Upload",
    sub: "POS + Inventory",
    icon: "Upload",
    color: COLORS.green,
  },
  {
    id: 2,
    label: "Processing",
    sub: "All Products",
    icon: "Zap",
    color: COLORS.blue,
  },
  {
    id: 3,
    label: "Dashboard",
    sub: "Overview",
    icon: "BarChart3",
    color: COLORS.blue,
  },
  {
    id: 4,
    label: "AI Chat",
    sub: "(Single product only)",
    icon: "MessageSquare",
    color: COLORS.violet,
  },
  {
    id: 5,
    label: "Review Products",
    sub: "Approve / Modify",
    icon: "CheckCircle",
    color: COLORS.amber,
  },
  {
    id: 6,
    label: "Summary",
    sub: "KPI & Learning",
    icon: "TrendingUp",
    color: COLORS.green,
  },
];
