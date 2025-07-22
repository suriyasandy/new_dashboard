import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useDashboard() {
  const queryClient = useQueryClient();

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['/api/dashboard/config'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/config');
      return response.json();
    }
  });

  // Check if thresholds have been uploaded
  const { data: thresholds = [], isLoading: thresholdsLoading, refetch: refetchThresholds } = useQuery({
    queryKey: ['/api/thresholds', config?.thresholdMode || 'group'],
    queryFn: async () => {
      const mode = config?.thresholdMode || 'group';
      console.log('Fetching thresholds with mode:', mode);
      const response = await fetch(`/api/thresholds?mode=${mode}`);
      const data = await response.json();
      console.log('Thresholds received:', data.length, 'items');
      return data;
    },
    enabled: false // Don't auto-fetch until user uploads and runs analysis
  });

  // Only fetch trades after impact analysis is run
  const { data: trades, isLoading: tradesLoading, refetch: refetchTrades } = useQuery({
    queryKey: ['/api/trades'],
    queryFn: async () => {
      const response = await fetch('/api/trades');
      return response.json();
    },
    enabled: false // Don't auto-fetch until impact analysis is run
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: any) => {
      const response = await apiRequest("POST", "/api/dashboard/config", newConfig);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/config'] });
    }
  });

  const updateConfig = (newConfig: any) => {
    updateConfigMutation.mutate(newConfig);
  };

  const hasThresholds = thresholds && thresholds.length > 0;
  const hasAnalysisRun = config?.analysisRun || false;

  const runImpactAnalysis = () => {
    // Update config to mark analysis as run
    updateConfig({ ...config, analysisRun: true });
    // Then fetch data
    refetchThresholds();
    refetchTrades();
  };

  return {
    config,
    trades: hasAnalysisRun ? trades : [],
    thresholds: hasThresholds ? thresholds : [],
    updateConfig,
    refetchTrades,
    refetchThresholds,
    runImpactAnalysis,
    hasThresholds,
    hasAnalysisRun,
    isLoading: configLoading || (hasAnalysisRun && (tradesLoading || thresholdsLoading))
  };
}
