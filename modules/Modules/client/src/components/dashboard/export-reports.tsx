import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileText, Plus, Edit } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ExportReportsProps {
  hasAnalysisRun?: boolean;
}

export default function ExportReports({ hasAnalysisRun }: ExportReportsProps) {
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch(`/api/export/${type}`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Export failed');
      return response.blob();
    },
    onSuccess: (blob, type) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Export completed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async (type: string) => {
      // Mock report generation
      return new Promise(resolve => setTimeout(resolve, 2000));
    },
    onSuccess: (_, type) => {
      toast({ title: "Success", description: `${type} report generated successfully` });
    },
    onError: () => {
      toast({ title: "Error", description: "Report generation failed", variant: "destructive" });
    }
  });

  const handleExport = (type: string) => {
    exportMutation.mutate(type);
  };

  const handleGenerateReport = (type: string) => {
    generateReportMutation.mutate(type);
  };

  const dataExports = [
    { type: "alerts", label: "All Alerts Data", icon: "file-csv", count: "247 records", color: "text-emerald-600" },
    { type: "thresholds", label: "Threshold Configuration", icon: "file-csv", count: "48 rows", color: "text-emerald-600" },
    { type: "summary", label: "Deviation Summary", icon: "file-csv", count: "Statistical summary", color: "text-emerald-600" }
  ];

  const reportTypes = [
    { type: "executive", label: "Executive Summary", icon: "file-pdf", format: "PDF", color: "text-red-600" },
    { type: "detailed", label: "Detailed Analysis", icon: "file-pdf", format: "PDF", color: "text-red-600" },
    { type: "compliance", label: "Compliance Report", icon: "file-excel", format: "XLSX", color: "text-emerald-600" }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Export & Reports</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Exports */}
        <Card className="p-6">
          <h4 className="text-md font-semibold text-foreground mb-4">Data Exports</h4>
          <div className="space-y-3">
            {dataExports.map((item) => (
              <Button
                key={item.type}
                variant="ghost"
                className="w-full justify-between h-auto p-4 bg-muted/50 hover:bg-muted"
                onClick={() => handleExport(item.type)}
                disabled={exportMutation.isPending}
              >
                <span className="flex items-center">
                  <i className={`fas fa-${item.icon} ${item.color} mr-3 text-lg`}></i>
                  <span className="font-medium">{item.label}</span>
                </span>
                <span className="text-muted-foreground text-sm">{item.count}</span>
              </Button>
            ))}
          </div>
        </Card>

        {/* Report Generation */}
        <Card className="p-6">
          <h4 className="text-md font-semibold text-foreground mb-4">Report Generation</h4>
          <div className="space-y-3">
            {reportTypes.map((item) => (
              <Button
                key={item.type}
                variant="ghost"
                className="w-full justify-between h-auto p-4 bg-muted/50 hover:bg-muted"
                onClick={() => handleGenerateReport(item.type)}
                disabled={generateReportMutation.isPending}
              >
                <span className="flex items-center">
                  <i className={`fas fa-${item.icon} ${item.color} mr-3 text-lg`}></i>
                  <span className="font-medium">{item.label}</span>
                </span>
                <span className="text-muted-foreground text-sm">{item.format}</span>
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Scheduled Reports */}
      <Card className="p-6">
        <h4 className="text-md font-semibold text-foreground mb-4">Scheduled Reports</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Daily Deviation Summary</p>
              <p className="text-sm text-muted-foreground">Sent to risk-alerts@company.com at 9:00 AM UTC</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-emerald-600 font-medium">Active</span>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Scheduled Report
          </Button>
        </div>
      </Card>
    </div>
  );
}
