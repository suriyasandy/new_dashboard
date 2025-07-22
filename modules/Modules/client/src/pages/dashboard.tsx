import { useState } from "react";
import Header from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import DeviationAnalysis from "@/components/dashboard/deviation-analysis";
import ThresholdManagement from "@/components/dashboard/threshold-management";
import AlertDrilldown from "@/components/dashboard/alert-drilldown";
import ExportReports from "@/components/dashboard/export-reports";
import TradeConsolidation from "@/components/dashboard/trade-consolidation";
import { Card } from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-dashboard";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("threshold-management"); // Start with threshold management
  const { 
    config, 
    updateConfig, 
    trades, 
    thresholds, 
    refetchTrades,
    refetchThresholds,
    runImpactAnalysis,
    hasThresholds,
    hasAnalysisRun
  } = useDashboard();

  const summaryCards = [
    { 
      label: "Total Trades", 
      value: hasAnalysisRun ? (trades?.length || 0) : "—", 
      icon: "chart-line", 
      change: hasAnalysisRun ? "+2.4%" : "—" 
    },
    { 
      label: "Active Alerts", 
      value: hasAnalysisRun ? (trades?.filter((t: any) => t.alertDescription)?.length || 0) : "—", 
      icon: "exclamation-triangle", 
      change: hasAnalysisRun ? "+5.2%" : "—" 
    },
    { 
      label: "Threshold Violations", 
      value: hasAnalysisRun ? (trades?.filter((t: any) => parseFloat(t.deviationPercent || "0") > 0.5)?.length || 0) : "—", 
      icon: "warning", 
      change: hasAnalysisRun ? "-1.8%" : "—" 
    },
    { 
      label: "Processing Rate", 
      value: hasAnalysisRun ? "98.7%" : "—", 
      icon: "check-circle", 
      change: hasAnalysisRun ? "+0.3%" : "—" 
    }
  ];

  const tabs = [
    { id: "threshold-management", label: "Threshold Management" },
    { id: "trade-consolidation", label: "Trade Consolidation" },
    { id: "deviation-analysis", label: "Deviation Analysis" },
    { id: "alert-drilldown", label: "Alert Drill-down" },
    { id: "export-options", label: "Export & Reports" }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "threshold-management":
        return <ThresholdManagement 
          thresholds={thresholds} 
          onUpdate={refetchThresholds} 
          hasThresholds={hasThresholds}
          onRunAnalysis={runImpactAnalysis}
        />;
      case "trade-consolidation":
        return <TradeConsolidation hasConsolidationRun={hasAnalysisRun} />;
      case "deviation-analysis":
        return <DeviationAnalysis 
          trades={trades} 
          thresholds={thresholds} 
          config={config} 
          hasAnalysisRun={hasAnalysisRun}
          onRunAnalysis={runImpactAnalysis}
        />;
      case "alert-drilldown":
        return <AlertDrilldown trades={trades} hasAnalysisRun={hasAnalysisRun} />;
      case "export-options":
        return <ExportReports hasAnalysisRun={hasAnalysisRun} />;
      default:
        return <ThresholdManagement 
          thresholds={thresholds} 
          onUpdate={refetchThresholds} 
          hasThresholds={hasThresholds}
          onRunAnalysis={runImpactAnalysis}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-background font-inter">
      <Header onRefresh={() => { refetchTrades(); refetchThresholds(); }} />
      
      <div className="flex min-h-screen">
        <Sidebar config={config} onConfigChange={updateConfig} />
        
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryCards.map((card, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className={`fas fa-${card.icon} text-xl text-primary`}></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-emerald-600 text-sm font-medium">{card.change}</span>
                  <span className="text-muted-foreground text-sm ml-2">vs previous period</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Tabs and Content */}
          <Card className="shadow-sm">
            <div className="border-b border-border">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {renderTabContent()}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
