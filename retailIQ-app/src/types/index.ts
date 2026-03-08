export interface NavItem {
  id: number;
  label: string;
  sub: string;
  icon: string;
  color: string;
}

export interface Module {
  id: number;
  icon: string;
  label: string;
  color: string;
  dimColor: string;
  dur: number;
  metrics: Array<{ l: string; v: string }>;
  status: string;
}

export interface SalesDataPoint {
  day: string;
  hist?: number;
  forecast?: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface KPIData {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  highlight?: string;
}

export interface CostPricingIntelligence {
  gross_margin_percent: number;
  cost_to_serve_estimate: number;
  profitability_per_sku: number;
  working_capital_impact: number;
  margin_sensitivity: string;
}

export interface DemandIntelligence {
  demand_trend_14_30_days: string;
  seasonality_pattern: string;
  yoy_demand_comparison: number;
  demand_spike_detection: boolean;
}

export interface InventoryIntelligence {
  inventory_depletion_trend: string;
  days_of_coverage_trend: number;
  overstock_understock_flag: string;
  yoy_inventory_turnover: number;
}

export interface KPISummary {
  cost_pricing_intelligence: CostPricingIntelligence;
  demand_intelligence: DemandIntelligence;
  inventory_intelligence: InventoryIntelligence;
  model_accuracy: number;
  last_retrained: string;
}
