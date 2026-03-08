import { useState, useEffect } from "react";
import { COLORS } from "../../constants/colors";
import { FieldLabel } from "../common/FieldLabel";
import { Badge } from "../common/Badge";
import { Check, Pause, AlertTriangle, TrendingUp, Package } from "lucide-react";
import { 
  submitDecision, 
  getProductRecommendations,
  type ProductRecommendation 
} from "../../services/api";

interface Step5DecisionProps {
  runId: string;
  datasetId: string;
  onApprove: () => void;
  setError: (error: string) => void;
  onProductSelect: (product: ProductRecommendation | null) => void;
}

export function Step5Decision({ datasetId, onApprove, setError, onProductSelect }: Step5DecisionProps) {
  const [products, setProducts] = useState<ProductRecommendation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<ProductRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [datasetId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await getProductRecommendations(datasetId);
      
      const needsReorder = response.recommendations.filter(p => 
        p.risk_level === "HIGH" || 
        p.risk_level === "MEDIUM" || 
        p.days_of_coverage < 7 ||
        p.recommended_order_qty > 0
      );
      
      setProducts(needsReorder);
      if (needsReorder.length > 0) {
        setSelectedProduct(needsReorder[0]);
        onProductSelect(needsReorder[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load product recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (product: ProductRecommendation) => {
    setSelectedProduct(product);
    onProductSelect(product);
  };

  const toggleSelect = (runId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.run_id)));
    }
  };

  const handleBulkAction = async (action: "approve" | "hold") => {
    if (selectedIds.size === 0) return;
    
    setSubmitting(true);
    setError("");

    try {
      const promises = Array.from(selectedIds).map(runId =>
        submitDecision(runId, action)
      );
      
      await Promise.all(promises);
      
      setProducts(prev => prev.map(p => 
        selectedIds.has(p.run_id) 
          ? { ...p, status: action }
          : p
      ));
      
      setSelectedIds(new Set());
      
      if (action === "approve") {
        setTimeout(() => {
          onApprove();
        }, 800);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit decisions");
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high": return COLORS.red;
      case "medium": return COLORS.amber;
      case "low": return COLORS.green;
      default: return COLORS.textSub;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approve":
        return <Badge color={COLORS.green}>Approved</Badge>;
      case "hold":
        return <Badge color={COLORS.textSub}>On Hold</Badge>;
      default:
        return <Badge color={COLORS.blue}>Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: COLORS.textSub }}>
        Loading product recommendations...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "60px 40px",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
      }}>
        <Package size={48} color={COLORS.green} style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
          All Products Have Sufficient Stock
        </div>
        <div style={{ fontSize: 14, color: COLORS.textSub }}>
          No reorder recommendations at this time. All inventory levels are healthy.
        </div>
      </div>
    );
  }

  const allSelected = selectedIds.size === products.length && products.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <FieldLabel>Reorder Recommendations</FieldLabel>
          <div style={{ fontSize: 13, color: COLORS.textSub }}>
            {products.length} products require review
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => handleBulkAction("approve")}
            disabled={selectedIds.size === 0 || submitting}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px solid ${COLORS.green}`,
              background: selectedIds.size > 0 ? COLORS.green : COLORS.surface,
              color: selectedIds.size > 0 ? "#fff" : COLORS.textSub,
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedIds.size > 0 && !submitting ? "pointer" : "not-allowed",
              fontFamily: COLORS.sans,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            Approve Selected ({selectedIds.size})
          </button>
          
          <button
            onClick={() => handleBulkAction("hold")}
            disabled={selectedIds.size === 0 || submitting}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              color: selectedIds.size > 0 ? COLORS.text : COLORS.textSub,
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedIds.size > 0 && !submitting ? "pointer" : "not-allowed",
              fontFamily: COLORS.sans,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            <Pause size={16} strokeWidth={2} />
            Hold Selected
          </button>
        </div>
      </div>

      <div style={{ 
        flex: 1,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ 
          overflowX: "auto",
          overflowY: "auto",
          flex: 1,
        }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            fontSize: 13,
          }}>
            <thead>
              <tr style={{ 
                background: COLORS.bg,
                borderBottom: `2px solid ${COLORS.border}`,
              }}>
                <th style={{ 
                  padding: "12px 16px", 
                  textAlign: "left",
                  fontWeight: 600,
                  color: COLORS.text,
                  position: "sticky",
                  top: 0,
                  background: COLORS.bg,
                  zIndex: 10,
                  width: 40,
                }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    style={{ 
                      cursor: "pointer",
                      width: 16,
                      height: 16,
                      accentColor: COLORS.blue,
                    }}
                  />
                </th>
                <th style={{ 
                  padding: "12px 16px", 
                  textAlign: "left",
                  fontWeight: 600,
                  color: COLORS.text,
                  position: "sticky",
                  top: 0,
                  background: COLORS.bg,
                  zIndex: 10,
                  fontFamily: COLORS.mono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  SKU
                </th>
                <th style={{ 
                  padding: "12px 16px", 
                  textAlign: "left",
                  fontWeight: 600,
                  color: COLORS.text,
                  position: "sticky",
                  top: 0,
                  background: COLORS.bg,
                  zIndex: 10,
                  fontFamily: COLORS.mono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  Product Name
                </th>
                <th style={{ 
                  padding: "12px 16px", 
                  textAlign: "right",
                  fontWeight: 600,
                  color: COLORS.text,
                  position: "sticky",
                  top: 0,
                  background: COLORS.bg,
                  zIndex: 10,
                  fontFamily: COLORS.mono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  Stock
                </th>
                <th style={{ 
                  padding: "12px 16px", 
                  textAlign: "right",
                  fontWeight: 600,
                  color: COLORS.text,
                  position: "sticky",
                  top: 0,
                  background: COLORS.bg,
                  zIndex: 10,
                  fontFamily: COLORS.mono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  Order Qty
                </th>
                <th style={{ 
                  padding: "12px 16px", 
                  textAlign: "center",
                  fontWeight: 600,
                  color: COLORS.text,
                  position: "sticky",
                  top: 0,
                  background: COLORS.bg,
                  zIndex: 10,
                  fontFamily: COLORS.mono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  Risk
                </th>
                <th style={{ 
                  padding: "12px 16px", 
                  textAlign: "center",
                  fontWeight: 600,
                  color: COLORS.text,
                  position: "sticky",
                  top: 0,
                  background: COLORS.bg,
                  zIndex: 10,
                  fontFamily: COLORS.mono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => (
                <tr 
                  key={product.run_id}
                  onClick={() => handleRowClick(product)}
                  style={{ 
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: selectedProduct?.run_id === product.run_id 
                      ? COLORS.blueDim 
                      : selectedIds.has(product.run_id) 
                      ? `${COLORS.blue}10`
                      : idx % 2 === 0 ? COLORS.surface : COLORS.bg,
                    transition: "background 0.15s",
                    cursor: "pointer",
                  }}
                >
                  <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.run_id)}
                      onChange={() => toggleSelect(product.run_id)}
                      style={{ 
                        cursor: "pointer",
                        width: 16,
                        height: 16,
                        accentColor: COLORS.blue,
                      }}
                    />
                  </td>
                  <td style={{ 
                    padding: "12px 16px",
                    fontFamily: COLORS.mono,
                    fontSize: 12,
                    color: COLORS.textSub,
                  }}>
                    {product.sku_id}
                  </td>
                  <td style={{ 
                    padding: "12px 16px",
                    fontWeight: 600,
                    color: COLORS.text,
                  }}>
                    {product.sku_name}
                  </td>
                  <td style={{ 
                    padding: "12px 16px",
                    textAlign: "right",
                    fontFamily: COLORS.mono,
                    color: COLORS.text,
                  }}>
                    {product.current_stock}
                  </td>
                  <td style={{ 
                    padding: "12px 16px",
                    textAlign: "right",
                    fontFamily: COLORS.mono,
                    fontWeight: 600,
                    color: COLORS.blue,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                      <TrendingUp size={14} color={COLORS.blue} />
                      {product.recommended_order_qty}
                    </div>
                  </td>
                  <td style={{ 
                    padding: "12px 16px",
                    textAlign: "center",
                  }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: COLORS.mono,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      background: `${getRiskColor(product.risk_level)}15`,
                      color: getRiskColor(product.risk_level),
                    }}>
                      {product.risk_level === "HIGH" && <AlertTriangle size={12} />}
                      {product.risk_level}
                    </span>
                  </td>
                  <td style={{ 
                    padding: "12px 16px",
                    textAlign: "center",
                  }}>
                    {getStatusBadge(product.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
