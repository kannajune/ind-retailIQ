import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication API
export const login = async (username: string, password: string) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    username,
    password
  });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('username');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

// Types
export interface UploadResponse {
  dataset_id: string;
  total_skus: number;
  total_transactions: number;
  date_range: string;
  status: string;
}

export interface EngineRunResponse {
  run_id: string;
  status: string;
}

export interface DashboardData {
  sku: string;
  forecast: {
    next_14_days: number;
    confidence: number;
    historical_data: number[];
    forecast_data: number[];
  };
  inventory: {
    current_stock: number;
    days_of_coverage: number;
    risk_level: string;
    expiry_risk: string;
  };
  optimization: {
    recommended_order_qty: number;
    order_by_days: number;
    working_capital_impact_percent: number;
  };
  llm_insight: {
    summary: string;
  };
}

export interface LLMQueryResponse {
  answer: string;
}

export interface DecisionResponse {
  status: string;
  po_id: string;
}

export interface ProductRecommendation {
  sku_id: string;
  sku_name: string;
  run_id: string;
  current_stock: number;
  recommended_order_qty: number;
  order_by_days: number;
  days_of_coverage: number;
  risk_level: string;
  working_capital_impact_percent: number;
  forecast_next_14_days: number;
  confidence: number;
  status: string;
}

export interface ProductRecommendationsResponse {
  dataset_id: string;
  total_products: number;
  recommendations: ProductRecommendation[];
}

export interface KPISummary {
  cost_pricing_intelligence: {
    gross_margin_percent: number;
    cost_to_serve_estimate: number;
    profitability_per_sku: number;
    working_capital_impact: number;
    margin_sensitivity: string;
  };
  demand_intelligence: {
    demand_trend_14_30_days: string;
    seasonality_pattern: string;
    yoy_demand_comparison: number;
    demand_spike_detection: boolean;
  };
  inventory_intelligence: {
    inventory_depletion_trend: string;
    days_of_coverage_trend: number;
    overstock_understock_flag: string;
    yoy_inventory_turnover: number;
  };
  model_accuracy: number;
  last_retrained: string;
}

// API Functions

export const uploadFiles = async (
  posFile: File,
  inventoryFile: File,
  festivalMode: boolean = false,
  promotionActive: boolean = false,
  cashConstraint: boolean = false
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("pos_file", posFile);
  formData.append("inventory_file", inventoryFile);
  formData.append("festival_mode", festivalMode.toString());
  formData.append("promotion_active", promotionActive.toString());
  formData.append("cash_constraint", cashConstraint.toString());

  const response = await api.post<UploadResponse>("/ingestion/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const runEngine = async (
  datasetId: string,
  skuId: string = "SKU001"
): Promise<EngineRunResponse> => {
  const response = await api.post<EngineRunResponse>("/engine/run", {
    dataset_id: datasetId,
    sku_id: skuId,
  });
  return response.data;
};

export const runBatchEngine = async (
  datasetId: string
): Promise<{ dataset_id: string; total_skus_processed: number; run_ids: string[]; status: string }> => {
  const response = await api.post("/engine/run-batch", {
    dataset_id: datasetId,
  });
  return response.data;
};

export const getDashboard = async (runId: string): Promise<DashboardData> => {
  const response = await api.get<DashboardData>(`/dashboard/${runId}`);
  return response.data;
};

export const queryLLM = async (
  runId: string,
  question: string
): Promise<LLMQueryResponse> => {
  const response = await api.post<LLMQueryResponse>("/llm/query", {
    run_id: runId,
    question,
  });
  return response.data;
};

export const submitDecision = async (
  runId: string,
  action: "approve" | "modify" | "hold",
  modifiedQty?: number
): Promise<DecisionResponse> => {
  const response = await api.post<DecisionResponse>("/decision/action", {
    run_id: runId,
    action,
    modified_qty: modifiedQty,
  });
  return response.data;
};

export const getSummary = async (runId: string): Promise<KPISummary> => {
  const response = await api.get<KPISummary>(`/summary/${runId}`);
  return response.data;
};

export const triggerRetraining = async (datasetId: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/learning/retrain", {
    dataset_id: datasetId,
  });
  return response.data;
};

export default api;

export const getProductRecommendations = async (
  datasetId: string
): Promise<ProductRecommendationsResponse> => {
  const response = await api.get<ProductRecommendationsResponse>(
    `/decision/recommendations/${datasetId}`
  );
  return response.data;
};
