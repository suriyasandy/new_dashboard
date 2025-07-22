import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, Clock, AlertCircle, FileText, Database } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ManualUploadProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export default function ManualUpload({ config, onConfigChange }: ManualUploadProps) {
  const [uatFiles, setUatFiles] = useState<File[]>([]);
  const [prodFiles, setProdFiles] = useState<File[]>([]);
  const [thresholdFile, setThresholdFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState(1);
  
  const uatInputRef = useRef<HTMLInputElement>(null);
  const prodInputRef = useRef<HTMLInputElement>(null);
  const thresholdInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query uploaded files to show processing status
  const { data: uploadedFiles = [] } = useQuery({
    queryKey: ['/api/files/uploads'],
    queryFn: async () => {
      const response = await fetch('/api/files/uploads');
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    },
  });

  // Query thresholds to check if threshold file uploaded
  const { data: thresholds = [] } = useQuery({
    queryKey: ['/api/thresholds'],
    queryFn: async () => {
      const response = await fetch('/api/thresholds');
      if (!response.ok) throw new Error('Failed to fetch thresholds');
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ files, environment }: { files: File[], environment: string }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('environment', environment);
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Files uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/files/uploads'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload files", variant: "destructive" });
    }
  });

  const thresholdUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/thresholds/upload', {
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

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSourceMode: 'manual',
          thresholdMode: config?.thresholdMode || 'group'
        }),
      });
      if (!response.ok) throw new Error('Analysis failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Impact analysis completed" });
      queryClient.invalidateQueries({ queryKey: ['/api/analysis'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run analysis", variant: "destructive" });
    }
  });

  const handleUatUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUatFiles(files);
    if (files.length > 0) {
      uploadMutation.mutate({ files, environment: 'UAT' });
      setUploadStep(2);
    }
  };

  const handleProdUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setProdFiles(files);
    if (files.length > 0) {
      uploadMutation.mutate({ files, environment: 'PROD' });
      setUploadStep(3);
    }
  };

  const handleThresholdUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setThresholdFile(file);
      thresholdUploadMutation.mutate(file);
      setUploadStep(4);
    }
  };

  const handleRunAnalysis = () => {
    runAnalysisMutation.mutate();
  };

  const getStepStatus = (step: number) => {
    switch (step) {
      case 1:
        return uploadedFiles.filter((f: any) => f.environment === 'UAT').length > 0 ? "completed" : "pending";
      case 2:
        return uploadedFiles.filter((f: any) => f.environment === 'PROD').length > 0 ? "completed" : "pending";
      case 3:
        return thresholds.length > 0 ? "completed" : "pending";
      case 4:
        const hasUat = uploadedFiles.filter((f: any) => f.environment === 'UAT').length > 0;
        const hasProd = uploadedFiles.filter((f: any) => f.environment === 'PROD').length > 0;
        const hasThresholds = thresholds.length > 0;
        return hasUat && hasProd && hasThresholds ? "ready" : "pending";
      default:
        return "pending";
    }
  };

  const getStepIcon = (step: number) => {
    const status = getStepStatus(step);
    if (status === "completed") return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === "ready") return <Database className="w-5 h-5 text-blue-500" />;
    return <AlertCircle className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Manual Data Upload</h3>
      
      {/* Threshold Mode Selection */}
      <Card className="p-4">
        <Label className="text-sm font-medium">Threshold Mode</Label>
        <Select 
          value={config?.thresholdMode || 'group'} 
          onValueChange={(value) => onConfigChange({ ...config, thresholdMode: value })}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select threshold mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="group">Group-wise (3 groups averaged)</SelectItem>
            <SelectItem value="currency">Currency-wise (12 individual)</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Upload Steps */}
      <div className="space-y-3">
        {/* Step 1: UAT Files */}
        <Card className={`p-4 ${getStepStatus(1) === 'completed' ? 'border-green-500' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium flex items-center">
              {getStepIcon(1)}
              <span className="ml-2">Step 1: Upload UAT Data</span>
            </h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Upload UAT trade files (Format: ProductType_LegalEntity_SourceSystem_Date.csv)
          </p>
          
          {/* Show uploaded UAT files */}
          {uploadedFiles.filter((f: any) => f.environment === 'UAT').length > 0 && (
            <div className="mb-3 p-2 bg-green-50 rounded-md border border-green-200">
              <div className="text-xs font-medium text-green-800 mb-1">Uploaded UAT Files:</div>
              {uploadedFiles.filter((f: any) => f.environment === 'UAT').map((file: any, idx: number) => (
                <div key={idx} className="text-xs text-green-700 flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  {file.filename} ({file.recordCount || 0} records)
                </div>
              ))}
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => uatInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="w-4 h-4 mr-2" />
            {getStepStatus(1) === 'completed' ? 'Upload More UAT Files' : 'Select UAT Files'}
          </Button>
          <input
            ref={uatInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx"
            onChange={handleUatUpload}
            className="hidden"
          />
        </Card>
        
        {/* Step 2: PROD Files */}
        <Card className={`p-4 ${getStepStatus(2) === 'completed' ? 'border-green-500' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium flex items-center">
              {getStepIcon(2)}
              <span className="ml-2">Step 2: Upload PROD Data</span>
            </h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Upload PROD trade files (Format: ProductType_LegalEntity_SourceSystem_Date.csv)
          </p>
          
          {/* Show uploaded PROD files */}
          {uploadedFiles.filter((f: any) => f.environment === 'PROD').length > 0 && (
            <div className="mb-3 p-2 bg-green-50 rounded-md border border-green-200">
              <div className="text-xs font-medium text-green-800 mb-1">Uploaded PROD Files:</div>
              {uploadedFiles.filter((f: any) => f.environment === 'PROD').map((file: any, idx: number) => (
                <div key={idx} className="text-xs text-green-700 flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  {file.filename} ({file.recordCount || 0} records)
                </div>
              ))}
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => prodInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="w-4 h-4 mr-2" />
            {getStepStatus(2) === 'completed' ? 'Upload More PROD Files' : 'Select PROD Files'}
          </Button>
          <input
            ref={prodInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx"
            onChange={handleProdUpload}
            className="hidden"
          />
        </Card>
        
        {/* Step 3: Threshold File */}
        <Card className={`p-4 ${getStepStatus(3) === 'completed' ? 'border-green-500' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium flex items-center">
              {getStepIcon(3)}
              <span className="ml-2">Step 3: Upload Threshold File</span>
            </h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            CSV format: LegalEntity, CCY, Original_Group, Original_Threshold, Proposed_Group, Proposed_Threshold
          </p>
          
          {/* Show threshold upload status */}
          {thresholds.length > 0 && (
            <div className="mb-3 p-2 bg-green-50 rounded-md border border-green-200">
              <div className="text-xs font-medium text-green-800 mb-1">
                Threshold file uploaded: {thresholds.length} thresholds configured
              </div>
              <div className="text-xs text-green-700">
                Mode: {config?.thresholdMode === 'group' ? 'Group-wise (3 groups)' : 'Currency-wise (12 currencies)'}
              </div>
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => thresholdInputRef.current?.click()}
            disabled={thresholdUploadMutation.isPending}
          >
            <Upload className="w-4 h-4 mr-2" />
            {getStepStatus(3) === 'completed' ? 'Replace Threshold File' : 'Select Threshold File'}
          </Button>
          <input
            ref={thresholdInputRef}
            type="file"
            accept=".csv"
            onChange={handleThresholdUpload}
            className="hidden"
          />
        </Card>
        
        {/* Step 4: Run Analysis */}
        <Card className={`p-4 ${getStepStatus(4) === 'ready' ? 'border-blue-500' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium flex items-center">
              {getStepIcon(4)}
              <span className="ml-2">Step 4: Run Impact Analysis</span>
            </h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Analyze threshold deviations with uploaded data
          </p>
          
          {/* Show data summary before analysis */}
          {getStepStatus(4) === 'ready' && (
            <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
              <div className="text-xs font-medium text-blue-800 mb-1">Ready to analyze:</div>
              <div className="text-xs text-blue-700 space-y-0.5">
                <div>• UAT files: {uploadedFiles.filter((f: any) => f.environment === 'UAT').length}</div>
                <div>• PROD files: {uploadedFiles.filter((f: any) => f.environment === 'PROD').length}</div>
                <div>• Thresholds: {thresholds.length} configured</div>
                <div>• Mode: {config?.thresholdMode === 'group' ? 'Group-wise' : 'Currency-wise'}</div>
              </div>
            </div>
          )}
          
          <Button 
            className="w-full"
            onClick={handleRunAnalysis}
            disabled={runAnalysisMutation.isPending || getStepStatus(4) === 'pending'}
          >
            {runAnalysisMutation.isPending ? 'Running Analysis...' : 'Run Impact Analysis'}
          </Button>
        </Card>
      </div>
    </div>
  );
}