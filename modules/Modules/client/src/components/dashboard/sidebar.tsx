import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, CloudUpload, Download, Database } from "lucide-react";
import ManualUpload from "./manual-upload";
import { useRef, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export default function Sidebar({ config, onConfigChange }: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [downloadTrades, setDownloadTrades] = useState(true);
  const [downloadExceptions, setDownloadExceptions] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const fetchDataMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await fetch("http://localhost:5001/api/data/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Download failed');
      return response.json();
    },
    onSuccess: (data) => {
      setRequestId(data.request_id);
      toast({ title: "Success", description: "Data download started" });
      // Start polling for status
      pollProcessingStatus(data.request_id);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start data download", variant: "destructive" });
    }
  });

  const uploadThresholdMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('threshold_mode', config?.thresholdMode || 'group');
      const response = await fetch('http://localhost:5001/api/thresholds/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Threshold file uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/thresholds'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload threshold file", variant: "destructive" });
    }
  });

  const pollProcessingStatus = (reqId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/data/status/${reqId}`);
        const status = await response.json();
        setProcessingStatus(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          if (status.status === 'completed') {
            toast({ title: "Success", description: "Data processing completed" });
          } else {
            toast({ title: "Error", description: "Data processing failed", variant: "destructive" });
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 2000);
  };

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    onConfigChange(newConfig);
  };

  const handleEntityToggle = (entity: string) => {
    setSelectedEntities(prev => 
      prev.includes(entity) 
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    );
  };

  const handleSystemToggle = (system: string) => {
    setSelectedSystems(prev => 
      prev.includes(system) 
        ? prev.filter(s => s !== system)
        : [...prev, system]
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadThresholdMutation.mutate(file);
    }
  };

  const handleFetchData = () => {
    if (selectedEntities.length === 0 || selectedSystems.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please select at least one legal entity and source system", 
        variant: "destructive" 
      });
      return;
    }

    fetchDataMutation.mutate({
      product_type: config?.productType || 'FX_SPOT',
      legal_entities: selectedEntities,
      source_systems: selectedSystems,
      start_date: config?.startDate || '2024-01-01',
      end_date: config?.endDate || new Date().toISOString().split('T')[0],
      download_trades: downloadTrades,
      download_exceptions: downloadExceptions
    });
  };

  return (
    <aside className="w-80 bg-surface shadow-lg border-r border-border flex-shrink-0">
      <div className="p-6 space-y-6">
        {/* Data Source Mode Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Data Source Mode</h3>
          <Select 
            value={config?.dataSourceMode || 'api'} 
            onValueChange={(value) => handleConfigChange('dataSourceMode', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select data source mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>API Data Download</span>
                </div>
              </SelectItem>
              <SelectItem value="manual">
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Manual File Upload</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {config?.dataSourceMode === 'manual' 
              ? 'Upload UAT/PROD files manually and set thresholds'
              : 'Download data from UAT/PROD APIs automatically'
            }
          </p>
        </div>

        {/* Data Source Configuration */}
        {config?.dataSourceMode === 'api' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">API Data Configuration</h3>
          
          <div>
            <Label htmlFor="productType">Product Type</Label>
            <Select 
              value={config?.productType || 'FX_SPOT'} 
              onValueChange={(value) => handleConfigChange('productType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FX_SPOT">FX_SPOT</SelectItem>
                <SelectItem value="FX_FORWARD">FX_FORWARD</SelectItem>
                <SelectItem value="FX_SWAP">FX_SWAP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Legal Entities (Multiple Selection)</Label>
            <div className="space-y-2 border rounded-md p-3">
              {['GSLB', 'GSI', 'HBAP'].map((entity) => (
                <div key={entity} className="flex items-center space-x-2">
                  <Checkbox
                    id={entity}
                    checked={selectedEntities.includes(entity)}
                    onCheckedChange={() => handleEntityToggle(entity)}
                  />
                  <Label htmlFor={entity} className="text-sm font-normal">
                    {entity}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <Label>Source Systems (Multiple Selection)</Label>
            <div className="space-y-2 border rounded-md p-3">
              {['SLANG', 'SIGMA', 'SECDB'].map((system) => (
                <div key={system} className="flex items-center space-x-2">
                  <Checkbox
                    id={system}
                    checked={selectedSystems.includes(system)}
                    onCheckedChange={() => handleSystemToggle(system)}
                  />
                  <Label htmlFor={system} className="text-sm font-normal">
                    {system}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Download Options</Label>
            <div className="space-y-2 border rounded-md p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trades"
                  checked={downloadTrades}
                  onCheckedChange={(checked) => setDownloadTrades(checked === true)}
                />
                <Label htmlFor="trades" className="text-sm font-normal">
                  Trade Data
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exceptions"
                  checked={downloadExceptions}
                  onCheckedChange={(checked) => setDownloadExceptions(checked === true)}
                />
                <Label htmlFor="exceptions" className="text-sm font-normal">
                  Exception Data
                </Label>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleFetchData} 
            disabled={fetchDataMutation.isPending || (selectedEntities.length === 0 || selectedSystems.length === 0)}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {fetchDataMutation.isPending ? "Starting Download..." : "Download Data"}
          </Button>

          {/* Processing Status */}
          {processingStatus && (
            <div className="mt-4 p-3 border rounded-md">
              <h4 className="text-sm font-semibold mb-2">Processing Status</h4>
              <div className="text-sm text-muted-foreground">
                Status: <span className="font-medium">{processingStatus.status}</span>
              </div>
              
              {processingStatus.statuses && (
                <div className="mt-2 space-y-1">
                  {processingStatus.statuses.map((status: any, idx: number) => (
                    <div key={idx} className="text-xs">
                      <span className="font-mono">
                        {status.legal_entity}/{status.source_system}/{status.environment}
                      </span>
                      : <span className={`font-semibold ${
                        status.status === 'completed' ? 'text-green-600' : 
                        status.status === 'failed' ? 'text-red-600' : 
                        'text-yellow-600'
                      }`}>
                        {status.status}
                      </span>
                      {status.records_count > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({status.records_count} records)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {processingStatus.matching_results && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1">Matching Results</h5>
                  {Object.entries(processingStatus.matching_results).map(([key, result]: [string, any]) => (
                    <div key={key} className="text-xs">
                      <span className="font-mono">{key.replace('_', '/')}</span>:
                      {result.matching && (
                        <span className="ml-1">
                          Matched: {result.matching.matched_count}, 
                          Unmatched: {result.matching.unmatched_count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Date Range */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Date Range</h3>
          
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input 
              type="date" 
              value={config?.startDate || '2024-01-01'}
              onChange={(e) => handleConfigChange('startDate', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input 
              type="date" 
              value={config?.endDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => handleConfigChange('endDate', e.target.value)}
            />
          </div>
        </div>

        {/* Manual Upload Section */}
        {config?.dataSourceMode === 'manual' && (
          <ManualUpload config={config} onConfigChange={onConfigChange} />
        )}

        {/* API Mode Threshold Configuration */}
        {config?.dataSourceMode === 'api' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Threshold Settings</h3>
          
          {/* File Upload Zone */}
          <Card className="border-2 border-dashed border-muted-foreground/25 p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
            <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Upload Threshold File</p>
            <p className="text-xs text-muted-foreground/75">CSV format: LegalEntity, CCY, Original_Group, Original_Threshold, Proposed_Group, Proposed_Threshold</p>
            <Button 
              className="mt-3" 
              disabled={uploadThresholdMutation.isPending}
            >
              {uploadThresholdMutation.isPending ? "Uploading..." : "Select File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </Card>
        </div>
        )}

        {/* API Processing Status - Only show for API mode */}
        {config?.dataSourceMode === 'api' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">API Processing Status</h3>
          
          {processingStatus ? (
            <Card className="p-4">
              <div className="text-sm mb-2">
                Request ID: <span className="font-mono text-xs">{requestId}</span>
              </div>
              <div className="text-sm mb-2">
                Status: <span className="font-medium">{processingStatus.status}</span>
              </div>
              
              {processingStatus.statuses && (
                <div className="mt-2 space-y-1">
                  {processingStatus.statuses.map((status: any, idx: number) => (
                    <div key={idx} className="text-xs">
                      <span className="font-mono">
                        {status.legal_entity}/{status.source_system}/{status.environment}
                      </span>
                      : <span className={`font-semibold ${
                        status.status === 'completed' ? 'text-green-600' : 
                        status.status === 'failed' ? 'text-red-600' : 
                        'text-yellow-600'
                      }`}>
                        {status.status}
                      </span>
                      {status.records_count > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({status.records_count} records)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {processingStatus.matching_results && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1">Matching Results</h5>
                  {Object.entries(processingStatus.matching_results).map(([key, result]: [string, any]) => (
                    <div key={key} className="text-xs">
                      <span className="font-mono">{key.replace('_', '/')}</span>:
                      {result.matching && (
                        <span className="ml-1">
                          Matched: {result.matching.matched_count}, 
                          Unmatched: {result.matching.unmatched_count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">
                No active API processing. Click "Fetch Data" to start downloading from UAT/PROD APIs.
              </div>
            </Card>
          )}
        </div>
        )}
      </div>
    </aside>
  );
}
