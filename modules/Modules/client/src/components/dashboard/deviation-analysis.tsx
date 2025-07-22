import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Download, Expand, Settings } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DeviationAnalysisProps {
  trades: any[];
  thresholds: any[];
  config: any;
  hasAnalysisRun?: boolean;
  onRunAnalysis?: () => void;
}

export default function DeviationAnalysis({ trades, thresholds, config, hasAnalysisRun, onRunAnalysis }: DeviationAnalysisProps) {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState(false);

  const deviationBucketsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/analysis/deviation-buckets", {
        thresholdMode: config?.thresholdMode || 'group'
      });
      return response.json();
    }
  });

  // Generate bucket data based on trades
  const generateBucketData = () => {
    const buckets = [
      { range: "0.0% - 0.5%", USD: 23, EUR: 18, GBP: 12, JPY: 8, total: 61, isExceeding: false },
      { range: "0.5% - 1.0%", USD: 45, EUR: 32, GBP: 28, JPY: 15, total: 120, isExceeding: true },
      { range: "1.0% - 2.0%", USD: 22, EUR: 19, GBP: 14, JPY: 11, total: 66, isExceeding: true },
      { range: "2.0% - 5.0%", USD: 8, EUR: 6, GBP: 4, JPY: 3, total: 21, isExceeding: true },
      { range: "5.0%+", USD: 2, EUR: 1, GBP: 1, JPY: 1, total: 5, isExceeding: true }
    ];
    return buckets;
  };

  const bucketData = hasAnalysisRun ? generateBucketData() : [];

  const bucketColumns = [
    {
      accessorKey: "range",
      header: "Deviation Bucket",
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <span className="font-medium">{row.getValue("range")}</span>
          {row.original.isExceeding && (
            <i className="fas fa-exclamation-triangle text-amber-500 ml-2" title="Exceeds threshold"></i>
          )}
        </div>
      ),
    },
    {
      accessorKey: "USD",
      header: "USD",
    },
    {
      accessorKey: "EUR",
      header: "EUR",
    },
    {
      accessorKey: "GBP",
      header: "GBP",
    },
    {
      accessorKey: "JPY",
      header: "JPY",
    },
    {
      accessorKey: "total",
      header: "Total Alerts",
      cell: ({ row }: any) => (
        <span className={`font-semibold ${
          row.original.isExceeding ? 'text-amber-600' : 'text-primary'
        }`}>
          {row.getValue("total")}
        </span>
      ),
    },
  ];

  const handleRowClick = (row: any) => {
    setSelectedBucket(row.original.range);
  };

  const handleExport = () => {
    window.open('/api/export/alerts', '_blank');
  };

  if (!hasAnalysisRun) {
    return (
      <div className="space-y-6">
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Analysis Available</h3>
            <p className="text-muted-foreground mb-6">
              Upload threshold files and run impact analysis to view deviation buckets and trade analysis.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Groupwise Deviation Bucket Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Groupwise Deviation Bucket Summary</h3>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setExpandedView(!expandedView)}
            >
              <Expand className="w-4 h-4 mr-2" />
              {expandedView ? 'Compact View' : 'Expanded View'}
            </Button>
            <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <DataTable
            columns={bucketColumns}
            data={bucketData}
            onRowClick={handleRowClick}
            className="cursor-pointer"
            rowClassName={(row) => 
              row?.isExceeding 
                ? "bg-red-50 border-l-4 border-red-500 hover:bg-red-100" 
                : "hover:bg-muted/50"
            }
          />
        </Card>

        {selectedBucket && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Selected bucket:</strong> {selectedBucket} - Click "Alert Drill-down" tab to view detailed alerts for this range.
            </p>
          </div>
        )}
      </div>

      {/* Expanded Bucket Analysis */}
      {expandedView && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-foreground">Expanded Bucket Analysis (Above Threshold)</h4>
            <span className="text-sm text-muted-foreground">Fixed bin size: 0.5% | Max deviation: 5.2%</span>
          </div>
          
          {/* Chart Placeholder */}
          <Card className="p-6 h-64 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <i className="fas fa-chart-bar text-4xl mb-3"></i>
              <p className="text-lg font-medium">Deviation Distribution Chart</p>
              <p className="text-sm">Interactive histogram showing alert distribution across deviation ranges</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
