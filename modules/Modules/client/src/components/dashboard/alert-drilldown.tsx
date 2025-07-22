import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface AlertDrilldownProps {
  trades: any[];
  hasAnalysisRun?: boolean;
}

export default function AlertDrilldown({ trades, hasAnalysisRun }: AlertDrilldownProps) {
  const [filters, setFilters] = useState({
    currencyPair: '',
    tradeDate: '',
    minDeviation: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBucket] = useState("0.5% - 1.0%"); // This would come from props in real implementation

  // Filter alerts based on current filters
  const filteredAlerts = (trades || []).filter(trade => {
    if (filters.currencyPair && trade.ccyPair !== filters.currencyPair) return false;
    if (filters.tradeDate && trade.tradeDate !== filters.tradeDate) return false;
    if (filters.minDeviation && parseFloat(trade.deviationPercent || '0') < parseFloat(filters.minDeviation)) return false;
    return true;
  });

  const itemsPerPage = 25;
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically, this could trigger API call in real implementation
    console.log('Applying filters:', filters);
  };

  const alertColumns = [
    {
      accessorKey: "tradeId",
      header: "Trade ID",
      cell: ({ row }: any) => (
        <span className="font-mono text-xs">{row.getValue("tradeId")}</span>
      ),
    },
    {
      accessorKey: "ccyPair",
      header: "Currency Pair",
    },
    {
      accessorKey: "tradeDate",
      header: "Trade Date",
      cell: ({ row }: any) => {
        const date = new Date(row.getValue("tradeDate"));
        return date.toLocaleDateString();
      },
    },
    {
      accessorKey: "deviationPercent",
      header: "Deviation %",
      cell: ({ row }: any) => (
        <span className="font-semibold text-amber-600">
          {parseFloat(row.getValue("deviationPercent") || '0').toFixed(2)}%
        </span>
      ),
    },
    {
      accessorKey: "threshold",
      header: "Threshold %",
      cell: () => <span>0.50%</span>, // This would be calculated based on currency and threshold rules
    },
    {
      accessorKey: "alertDescription",
      header: "Alert Description",
      cell: ({ row }: any) => (
        <span className="text-muted-foreground">
          {row.getValue("alertDescription") || "Price deviation exceeds threshold"}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <Button variant="ghost" size="sm">
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Alert Drill-down</h3>
        <div className="text-sm text-muted-foreground">
          Selected bucket: <span className="font-medium text-primary">{selectedBucket}</span>
          | <span className="font-medium">{filteredAlerts.length}</span> alerts
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Currency Pair</label>
            <Select value={filters.currencyPair} onValueChange={(value) => handleFilterChange('currencyPair', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="EURUSD">EURUSD</SelectItem>
                <SelectItem value="GBPUSD">GBPUSD</SelectItem>
                <SelectItem value="USDJPY">USDJPY</SelectItem>
                <SelectItem value="USDCHF">USDCHF</SelectItem>
                <SelectItem value="USDCAD">USDCAD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Trade Date</label>
            <Input 
              type="date" 
              value={filters.tradeDate}
              onChange={(e) => handleFilterChange('tradeDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Minimum Deviation</label>
            <Input 
              type="number" 
              step="0.1" 
              placeholder="0.5"
              value={filters.minDeviation}
              onChange={(e) => handleFilterChange('minDeviation', e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleApplyFilters} className="w-full">
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Alert Details Table */}
      <Card className="overflow-hidden">
        <DataTable
          columns={alertColumns}
          data={paginatedAlerts}
        />
        
        {/* Pagination */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
            <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredAlerts.length)}</span> of{' '}
            <span className="font-medium">{filteredAlerts.length}</span> results
          </div>
          <nav className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </Card>
    </div>
  );
}
