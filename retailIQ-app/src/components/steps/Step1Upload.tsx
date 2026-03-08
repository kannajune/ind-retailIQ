import { useState } from "react";
import { COLORS } from "../../constants/colors";
import { FieldLabel } from "../common/FieldLabel";
import { KpiCard } from "../common/KpiCard";
import { Upload, CheckCircle2 } from "lucide-react";
import { uploadFiles } from "../../services/api";

interface Step1UploadProps {
  onUploadComplete: (datasetId: string) => void;
  setError: (error: string) => void;
}

export function Step1Upload({ onUploadComplete, setError }: Step1UploadProps) {
  const [posFile, setPosFile] = useState<File | null>(null);
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [posDragging, setPosDragging] = useState(false);
  const [invDragging, setInvDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<any>(null);
  const [toggles, setToggles] = useState({
    festival: true,
    promo: false,
    cash: false,
  });

  const allUploaded = posFile && inventoryFile;

  const handleRun = async () => {
    if (!posFile || !inventoryFile) return;
    
    setUploading(true);
    setError("");
    
    try {
      const response = await uploadFiles(
        posFile,
        inventoryFile,
        toggles.festival,
        toggles.promo,
        toggles.cash
      );
      
      setUploadStats({
        totalSkus: response.total_skus.toLocaleString(),
        transactions: response.total_transactions.toLocaleString(),
        dateRange: response.date_range,
      });
      
      // Wait a moment to show stats
      setTimeout(() => {
        onUploadComplete(response.dataset_id);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload files. Please try again.");
      setUploading(false);
    }
  };

  const Toggle = ({
    k,
    label,
    sub,
  }: {
    k: "festival" | "promo" | "cash";
    label: string;
    sub: string;
  }) => {
    const on = toggles[k];
    return (
      <div
        onClick={() => setToggles((t) => ({ ...t, [k]: !t[k] }))}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 14px",
          borderRadius: 8,
          cursor: "pointer",
          background: on ? COLORS.blueDim : COLORS.bg,
          border: `1px solid ${on ? COLORS.blue + "45" : COLORS.border}`,
          transition: "all 0.15s",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{label}</div>
          <div style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textSub, marginTop: 2 }}>
            {sub}
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 22,
            borderRadius: 11,
            flexShrink: 0,
            background: on ? COLORS.blue : COLORS.textMuted,
            position: "relative",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 3,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#fff",
              left: on ? 21 : 3,
              transition: "left 0.2s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      </div>
    );
  };

  const FileUploadZone = ({
    label,
    file,
    dragging,
    onDragOver,
    onDragLeave,
    onDrop,
  }: {
    label: string;
    file: File | null;
    dragging: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  }) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        id={label.replace(/\s/g, "-")}
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) {
            if (label.includes("POS")) {
              setPosFile(selectedFile);
            } else {
              setInventoryFile(selectedFile);
            }
          }
        }}
      />
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById(label.replace(/\s/g, "-"))?.click()}
        style={{
          border: `2px dashed ${dragging ? COLORS.blue : file ? COLORS.green : COLORS.border}`,
          borderRadius: 10,
          padding: "32px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? COLORS.blueDim : file ? COLORS.greenDim : COLORS.bg,
          transition: "all 0.2s",
        }}
      >
        {file ? (
          <>
            <CheckCircle2 size={32} color={COLORS.green} strokeWidth={2} />
            <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 13, marginTop: 8 }}>
              {file.name}
            </div>
            <div style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textSub, marginTop: 5 }}>
              {(file.size / 1024).toFixed(2)} KB
            </div>
          </>
        ) : (
          <>
            <Upload size={32} color={COLORS.textMuted} strokeWidth={1.5} style={{ opacity: 0.5 }} />
            <div style={{ color: COLORS.textSub, fontWeight: 600, fontSize: 12, marginTop: 8 }}>
              Drop {label} here
            </div>
            <div style={{ fontFamily: COLORS.mono, fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
              or click to browse
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FileUploadZone
          label="POS Data CSV"
          file={posFile}
          dragging={posDragging}
          onDragOver={(e) => {
            e.preventDefault();
            setPosDragging(true);
          }}
          onDragLeave={() => setPosDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setPosDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
              setPosFile(file);
            }
          }}
        />

        <FileUploadZone
          label="Inventory Data CSV"
          file={inventoryFile}
          dragging={invDragging}
          onDragOver={(e) => {
            e.preventDefault();
            setInvDragging(true);
          }}
          onDragLeave={() => setInvDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setInvDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
              setInventoryFile(file);
            }
          }}
        />

        {uploadStats && (
          <div>
            <FieldLabel>Parsed Statistics</FieldLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <KpiCard label="Total SKUs" value={uploadStats.totalSkus} highlight={COLORS.blue} color={COLORS.blue} />
              <KpiCard label="Transactions" value={uploadStats.transactions} highlight={COLORS.green} color={COLORS.green} />
              <KpiCard
                label="Date Range"
                value={uploadStats.dateRange}
                highlight={COLORS.violet}
                color={COLORS.violet}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FieldLabel>Business Signals</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Toggle k="festival" label="Festival Boost" sub="+20% demand multiplier" />
            <Toggle k="promo" label="Promotion Active" sub="Running margin offer" />
            <Toggle k="cash" label="Cash Constraint Mode" sub="Cap reorder at ₹2L" />
          </div>
        </div>

        <div style={{ marginTop: "auto" }}>
          <button
            onClick={allUploaded && !uploading ? handleRun : undefined}
            disabled={!allUploaded || uploading}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 8,
              border: "none",
              background: allUploaded && !uploading ? COLORS.blue : COLORS.border,
              color: allUploaded && !uploading ? "#fff" : COLORS.textSub,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: COLORS.sans,
              cursor: allUploaded && !uploading ? "pointer" : "not-allowed",
              boxShadow: allUploaded && !uploading ? `0 4px 16px ${COLORS.blue}35` : "none",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {uploading ? (
              <>
                <div style={{ animation: "spin 1s linear infinite" }}>⟳</div>
                Uploading...
              </>
            ) : (
              <>
                <span>▶</span> Run Intelligence Engine
              </>
            )}
          </button>
          {!allUploaded && (
            <div
              style={{
                textAlign: "center",
                fontFamily: COLORS.mono,
                fontSize: 10,
                color: COLORS.textMuted,
                marginTop: 7,
              }}
            >
              Upload both CSV files to activate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
