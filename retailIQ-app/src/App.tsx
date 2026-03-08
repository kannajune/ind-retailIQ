import { useState, useEffect } from "react";
import { COLORS } from "./constants/colors";
import { Header } from "./components/layout/Header";
import { LeftNav } from "./components/layout/LeftNav";
import { RightSidebar } from "./components/layout/RightSidebar";
import { Login } from "./components/Login";
import { isAuthenticated, logout } from "./services/api";
import { Step1Upload } from "./components/steps/Step1Upload";
import { Step2Processing } from "./components/steps/Step2Processing";
import { Step3Dashboard } from "./components/steps/Step3Dashboard";
import { Step4AIChat } from "./components/steps/Step4AIChat";
import { Step5Decision } from "./components/steps/Step5Decision";
import { Step6Summary } from "./components/steps/Step6Summary";

export default function App() {
  const [step, setStep] = useState(1);
  const [pipelineDone, setPipelineDone] = useState(false);
  const [approved, setApproved] = useState(false);
  
  // API state
  const [datasetId, setDatasetId] = useState<string>("");
  const [runId, setRunId] = useState<string>("");
  const [allRunIds, setAllRunIds] = useState<string[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [selectedProductForDecision, setSelectedProductForDecision] = useState<any>(null);
  const [decisionAction, setDecisionAction] = useState<string | null>(null);
  const [decisionQty, setDecisionQty] = useState<number>(0);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      setIsLoggedIn(true);
      setUsername(localStorage.getItem('username') || 'User');
    }
  }, []);

  const handleLoginSuccess = (_token: string, user: string) => {
    setIsLoggedIn(true);
    setUsername(user);
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUsername("");
    setStep(1);
    setDatasetId("");
    setRunId("");
    setAllRunIds([]);
    setDashboardData(null);
    setPipelineDone(false);
    setApproved(false);
  };

  // Show login page if not authenticated
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      style={{
        height: "100vh",
        background: COLORS.bg,
        fontFamily: COLORS.sans,
        color: COLORS.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #CDD1D7; border-radius: 2px; }
        button { outline: none; font-family: inherit; }
        input { outline: none; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
      
      <Header step={step} username={username} onLogout={handleLogout} />
      
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <LeftNav 
          step={step} 
          setStep={(newStep: number) => {
            // Clear state when going back to Step 1 (upload)
            if (newStep === 1) {
              setDatasetId("");
              setRunId("");
              setAllRunIds([]);
              setDashboardData(null);
              setPipelineDone(false);
              setApproved(false);
              setError("");
            }
            setStep(newStep);
          }} 
          pipelineDone={pipelineDone} 
        />
        
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
          {error && (
            <div
              style={{
                background: COLORS.redDim,
                border: `1px solid ${COLORS.red}`,
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 16,
                color: COLORS.red,
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: COLORS.red,
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                ✕
              </button>
            </div>
          )}
          
          {step === 1 && (
            <Step1Upload
              onUploadComplete={(dataset_id: string) => {
                // Clear all previous state when uploading new data
                setDatasetId(dataset_id);
                setRunId("");
                setAllRunIds([]);
                setDashboardData(null);
                setPipelineDone(false);
                setApproved(false);
                setError("");
                setStep(2);
              }}
              setError={setError}
            />
          )}
          {step === 2 && (
            <Step2Processing
              datasetId={datasetId}
              onComplete={(run_id: string, dashboard_data: any, all_run_ids?: string[]) => {
                setRunId(run_id);
                setDashboardData(dashboard_data);
                if (all_run_ids) {
                  setAllRunIds(all_run_ids);
                }
                setPipelineDone(true);
                setError("");
                setStep(3);
              }}
              setError={setError}
            />
          )}
          {step === 3 && (
            <Step3Dashboard
              dashboardData={dashboardData}
              allRunIds={allRunIds}
              currentRunId={runId}
              onRunIdChange={(newRunId: string) => {
                setRunId(newRunId);
              }}
              onDashboardDataChange={(newDashboardData: any) => {
                setDashboardData(newDashboardData);
              }}
              onChatOpen={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <Step4AIChat
              runId={runId}
              dashboardData={dashboardData}
            />
          )}
          {step === 5 && (
            <Step5Decision
              runId={runId}
              datasetId={datasetId}
              onApprove={() => {
                setApproved(true);
                setStep(6);
              }}
              setError={setError}
              onProductSelect={(product: any) => {
                setSelectedProductForDecision(product);
                setDecisionQty(product?.recommended_order_qty || 0);
                setDecisionAction(null);
              }}
            />
          )}
          {step === 6 && (
            <Step6Summary
              runId={runId}
              datasetId={datasetId}
              dashboardData={dashboardData}
            />
          )}
        </div>
        
        <RightSidebar
          step={step}
          pipelineDone={pipelineDone}
          approved={approved}
          dashboardData={dashboardData}
          selectedProductForDecision={selectedProductForDecision}
          decisionAction={decisionAction}
          decisionQty={decisionQty}
          onDecisionActionChange={setDecisionAction}
          onDecisionQtyChange={setDecisionQty}
        />
      </div>
    </div>
  );
}
