import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Upload, FileText, Database, Play, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TradeConsolidationProps {
  hasConsolidationRun?: boolean;
}

export default function TradeConsolidation({ hasConsolidationRun }: TradeConsolidationProps) {
  const [uploadEnvironment, setUploadEnvironment] = useState<'UAT' | 'PROD'>('UAT');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch uploaded files
  const { data: uploadedFiles = [] } = useQuery({
    queryKey: ['/api/files/uploads'],
    enabled: true
  });

  // Fetch consolidated datasets
  const { data: consolidatedDatasets = [] } = useQuery({
    queryKey: ['/api/consolidation/datasets'],
    enabled: true
  });

  // Type guard for arrays
  const uploadedFilesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [];
  const consolidatedDatasetsArray = Array.isArray(consolidatedDatasets) ? consolidatedDatasets : [];

  // File upload mutation
  const fileUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Files uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/files/uploads'] });
      setSelectedFiles([]);
    },
    onError: () => {
      toast({ title: "Error", description: "File upload failed", variant: "destructive" });
    }
  });

  // Consolidation mutation
  const consolidationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/consolidation/create", {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Trade consolidation completed" });
      queryClient.invalidateQueries({ queryKey: ['/api/consolidation/datasets'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Consolidation failed", variant: "destructive" });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast({ title: "Error", description: "Please select files to upload", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('environment', uploadEnvironment);
    selectedFiles.forEach((file, index) => {
      formData.append(`files`, file);
    });

    fileUploadMutation.mutate(formData);
  };

  const parseFileName = (filename: string) => {
    // Extract ProductType_LegalEntity_SourceSystem_Date from filename
    const nameWithoutExt = filename.replace(/\.(csv|xlsx)$/i, '');
    const parts = nameWithoutExt.split('_');
    if (parts.length >= 4) {
      return {
        productType: parts[0],
        legalEntity: parts[1],
        sourceSystem: parts[2],
        date: parts[3]
      };
    }
    return null;
  };

  const uploadColumns = [
    {
      accessorKey: "filename",
      header: "File Name",
    },
    {
      accessorKey: "environment",
      header: "Environment",
      cell: ({ row }: any) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.getValue("environment") === 'UAT' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {row.getValue("environment")}
        </span>
      ),
    },
    {
      accessorKey: "productType",
      header: "Product Type",
    },
    {
      accessorKey: "legalEntity", 
      header: "Legal Entity",
    },
    {
      accessorKey: "sourceSystem",
      header: "Source System",
    },
    {
      accessorKey: "uploadDate",
      header: "Upload Date",
      cell: ({ row }: any) => new Date(row.getValue("uploadDate")).toLocaleDateString(),
    },
    {
      accessorKey: "recordCount",
      header: "Records",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.getValue("status");
        const statusConfig = {
          uploaded: { color: "blue", icon: FileText },
          processed: { color: "yellow", icon: AlertCircle },
          consolidated: { color: "green", icon: CheckCircle }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        const Icon = config?.icon || FileText;
        
        return (
          <div className="flex items-center space-x-2">
            <Icon className={`w-4 h-4 text-${config?.color || 'gray'}-600`} />
            <span className="capitalize">{status}</span>
          </div>
        );
      },
    },
  ];

  const datasetColumns = [
    {
      accessorKey: "datasetName",
      header: "Dataset Name",
      cell: ({ row }: any) => (
        <div className="font-medium text-primary">
          {row.getValue("datasetName")}
        </div>
      ),
    },
    {
      accessorKey: "productType",
      header: "Product Type",
    },
    {
      accessorKey: "legalEntity",
      header: "Legal Entity", 
    },
    {
      accessorKey: "sourceSystem",
      header: "Source System",
    },
    {
      accessorKey: "dateRange",
      header: "Date Range",
      cell: ({ row }: any) => {
        const start = new Date(row.original.startDate).toLocaleDateString();
        const end = new Date(row.original.endDate).toLocaleDateString();
        return start === end ? start : `${start} - ${end}`;
      },
    },
    {
      accessorKey: "totalUatTrades",
      header: "UAT Trades",
    },
    {
      accessorKey: "totalProdTrades", 
      header: "PROD Trades",
    },
    {
      accessorKey: "matchedTrades",
      header: "Matched",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.getValue("status");
        const statusColors = {
          pending: "yellow",
          processing: "blue", 
          completed: "green",
          failed: "red"
        };
        const color = statusColors[status as keyof typeof statusColors] || "gray";
        
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium bg-${color}-100 text-${color}-800`}>
            {status}
          </span>
        );
      },
    },
  ];

  if (!hasConsolidationRun && uploadedFilesArray.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Trade Data Available</h3>
            <p className="text-muted-foreground mb-6">
              Upload UAT and PROD trade files to create consolidated datasets for analysis. Files should follow the naming convention: ProductType_LegalEntity_SourceSystem_Date.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Trade Data Upload</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="environment">Environment:</Label>
              <Select value={uploadEnvironment} onValueChange={(value: 'UAT' | 'PROD') => setUploadEnvironment(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAT">UAT</SelectItem>
                  <SelectItem value="PROD">PROD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Trade Files</h3>
              <p className="text-muted-foreground mb-4">
                Select CSV or XLSX files following naming convention: ProductType_LegalEntity_SourceSystem_Date
              </p>
              <Input
                type="file"
                multiple
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="max-w-md mx-auto"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Selected {selectedFiles.length} file(s) for {uploadEnvironment} environment:
                  </p>
                  <div className="text-sm">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="text-left bg-muted p-2 rounded mb-1">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedFiles.length > 0 && (
                <Button
                  onClick={handleUpload}
                  disabled={fileUploadMutation.isPending}
                  className="mt-4"
                >
                  {fileUploadMutation.isPending ? "Uploading..." : "Upload Files"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Uploaded Files Table */}
      {uploadedFilesArray.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Uploaded Files</h3>
            <Button
              onClick={() => consolidationMutation.mutate()}
              disabled={consolidationMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {consolidationMutation.isPending ? "Creating..." : "Create Consolidated Datasets"}
            </Button>
          </div>
          <DataTable
            columns={uploadColumns}
            data={uploadedFilesArray}
          />
        </Card>
      )}

      {/* Consolidated Datasets Table */}
      {consolidatedDatasetsArray.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Consolidated Datasets</h3>
            <div className="text-sm text-muted-foreground">
              Total datasets: {consolidatedDatasetsArray.length}
            </div>
          </div>
          <DataTable
            columns={datasetColumns}
            data={consolidatedDatasetsArray}
          />
        </Card>
      )}
    </div>
  );
}