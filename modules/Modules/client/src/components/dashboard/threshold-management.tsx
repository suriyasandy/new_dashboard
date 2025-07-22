import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Save, RotateCcw, Settings, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ThresholdManagementProps {
  thresholds: any[];
  onUpdate: () => void;
  hasThresholds?: boolean;
  onRunAnalysis?: () => void;
}

export default function ThresholdManagement({ thresholds, onUpdate, hasThresholds, onRunAnalysis }: ThresholdManagementProps) {
  const [editedThresholds, setEditedThresholds] = useState<{[key: number]: any}>({});
  const [thresholdMode, setThresholdMode] = useState<'group' | 'currency'>('group');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Refetch thresholds when mode changes
  const handleModeChange = (newMode: 'group' | 'currency') => {
    setThresholdMode(newMode);
    // Clear edited thresholds when switching modes
    setEditedThresholds({});
    // Invalidate queries with the specific mode
    queryClient.invalidateQueries({ queryKey: ['/api/thresholds'] });
    onUpdate();
  };

  const updateThresholdMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`http://localhost:5001/api/thresholds/${id}?mode=${thresholdMode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Threshold updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/thresholds'] });
      onUpdate();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update threshold", variant: "destructive" });
    }
  });

  const impactMutation = useMutation({
    mutationFn: async ({ thresholdId, newThreshold }: { thresholdId: number; newThreshold: number }) => {
      const response = await apiRequest("POST", "/api/analysis/impact", {
        thresholdId,
        newThreshold
      });
      return response.json();
    }
  });

  const handleThresholdChange = (id: number, field: string, value: any) => {
    const current = editedThresholds[id] || {};
    setEditedThresholds({
      ...editedThresholds,
      [id]: {
        ...current,
        [field]: value
      }
    });

    // Calculate impact for threshold changes
    if (field === 'adjustedThreshold') {
      impactMutation.mutate({ thresholdId: id, newThreshold: parseFloat(value) });
    }
  };

  const handleSaveChanges = async () => {
    for (const [id, updates] of Object.entries(editedThresholds)) {
      await updateThresholdMutation.mutateAsync({ id: parseInt(id), updates });
    }
    setEditedThresholds({});
  };

  const handleResetToProposed = () => {
    setEditedThresholds({});
    toast({ title: "Reset", description: "All changes reset to proposed values" });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('threshold_mode', thresholdMode);
      
      fetch('http://localhost:5001/api/thresholds/upload', {
        method: 'POST',
        body: formData,
      })
      .then(response => {
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
      })
      .then(() => {
        toast({ title: "Success", description: "Threshold file uploaded successfully" });
        queryClient.invalidateQueries({ queryKey: ['/api/thresholds'] });
        onUpdate();
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to upload threshold file", variant: "destructive" });
      });
    }
  };

  const getDisplayValue = (threshold: any, field: string) => {
    const id = threshold.id;
    const value = editedThresholds[id]?.[field] ?? threshold[field];
    // Convert string values to numbers for threshold fields
    if (field.includes('Threshold') && typeof value === 'string') {
      return parseFloat(value) || 0;
    }
    return value;
  };

  const getImpactDisplay = (thresholdId: number) => {
    // Mock impact calculation
    const change = Math.floor(Math.random() * 30) - 15;
    const color = change > 0 ? "text-amber-600 bg-amber-100" : "text-emerald-600 bg-emerald-100";
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {change > 0 ? '+' : ''}{change} alerts
      </span>
    );
  };

  const thresholdColumns = [
    {
      accessorKey: "legalEntity",
      header: "Legal Entity",
    },
    {
      accessorKey: "currency",
      header: "Currency",
    },
    {
      accessorKey: "originalGroup",
      header: "Original Group",
    },
    {
      accessorKey: "originalThreshold",
      header: "Original Threshold",
      cell: ({ row }: any) => `${parseFloat(row.getValue("originalThreshold")) || 0}%`,
    },
    {
      accessorKey: "proposedGroup",
      header: "Proposed Group",
    },
    {
      accessorKey: "proposedThreshold",
      header: "Proposed Threshold",
      cell: ({ row }: any) => `${parseFloat(row.getValue("proposedThreshold")) || 0}%`,
    },
    {
      accessorKey: "adjustedGroup",
      header: "Adjusted Group",
      cell: ({ row }: any) => (
        <Select
          value={getDisplayValue(row.original, 'adjustedGroup')}
          onValueChange={(value) => handleThresholdChange(row.original.id, 'adjustedGroup', value)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Group 1">Group 1</SelectItem>
            <SelectItem value="Group 2">Group 2</SelectItem>
            <SelectItem value="Group 3">Group 3</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "adjustedThreshold",
      header: "Adjusted Threshold",
      cell: ({ row }: any) => (
        <Input
          type="number"
          step="0.1"
          value={getDisplayValue(row.original, 'adjustedThreshold')}
          onChange={(e) => handleThresholdChange(row.original.id, 'adjustedThreshold', e.target.value)}
          className="w-20"
        />
      ),
    },
    {
      accessorKey: "impact",
      header: "Impact",
      cell: ({ row }: any) => getImpactDisplay(row.original.id),
    },
  ];

  const groupColumns = [
    {
      accessorKey: "group",
      header: "Group",
      cell: ({ row }: any) => row.getValue("group") || `Group ${row.original.id}`,
    },
    {
      accessorKey: "originalThreshold",
      header: "Original Threshold",
      cell: ({ row }: any) => `${parseFloat(row.getValue("originalThreshold")) || 0}%`,
    },
    {
      accessorKey: "proposedThreshold", 
      header: "Proposed Threshold",
      cell: ({ row }: any) => `${parseFloat(row.getValue("proposedThreshold")) || 0}%`,
    },
    {
      accessorKey: "adjustedThreshold",
      header: "Adjusted Threshold (Editable)",
      cell: ({ row }: any) => (
        <Input
          type="number"
          step="0.1"
          value={getDisplayValue(row.original, 'adjustedThreshold')}
          onChange={(e) => handleThresholdChange(row.original.id, 'adjustedThreshold', e.target.value)}
          className="w-24"
        />
      ),
    },
    {
      accessorKey: "impact",
      header: "Impact",
      cell: ({ row }: any) => getImpactDisplay(row.original.id),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Threshold Management</h3>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleSaveChanges}
            disabled={Object.keys(editedThresholds).length === 0 || updateThresholdMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button 
            variant="outline"
            onClick={handleResetToProposed}
            disabled={Object.keys(editedThresholds).length === 0}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Proposed
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Threshold Mode:</span>
            <Select value={thresholdMode} onValueChange={handleModeChange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Group-wise</SelectItem>
                <SelectItem value="currency">Currency-wise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline" 
              size="sm"
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV</span>
            </Button>
            
            {hasThresholds && onRunAnalysis && (
              <Button 
                onClick={onRunAnalysis}
                variant="default" 
                size="sm"
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="w-4 h-4" />
                <span>Run Impact Analysis</span>
              </Button>
            )}
          </div>
        </div>

        {thresholdMode === 'group' ? (
          <div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Group-wise Mode:</strong> Thresholds are applied at the group level. 
                For trades, we use max_group_threshold(base, quote). Each group can contain multiple currencies.
              </p>
            </div>
            <DataTable 
              data={thresholds}
              columns={groupColumns}
            />
          </div>
        ) : (
          <div>
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Currency-wise Mode:</strong> Thresholds are applied at the individual currency level. 
                Each currency has its own threshold value.
              </p>
            </div>
            <DataTable 
              data={thresholds}
              columns={thresholdColumns}
            />
          </div>
        )}
      </Card>

      {/* Hidden file input for CSV upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {Object.keys(editedThresholds).length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Unsaved changes:</strong> {Object.keys(editedThresholds).length} threshold(s) modified. 
            Click "Save Changes" to apply or "Reset to Proposed" to discard.
          </p>
        </div>
      )}
    </div>
  );
}
