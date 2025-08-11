import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardGrid from "@/components/DashboardGrid";
import DashboardCustomizer from "@/components/DashboardCustomizer";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import type { WidgetConfig, LayoutItem, CaseWithRelations, ActivityLogWithUser } from "@shared/schema";
import { Loader2 } from "lucide-react";

// Default widgets available
const AVAILABLE_WIDGETS: WidgetConfig[] = [
  {
    id: 'stats-1',
    type: 'stats',
    title: 'Estatísticas Gerais',
    refreshInterval: 300000, // 5 minutes
  },
  {
    id: 'recent-cases-1',
    type: 'recent-cases',
    title: 'Processos Recentes',
    refreshInterval: 120000, // 2 minutes
  },
  {
    id: 'chart-status-1',
    type: 'chart',
    title: 'Distribuição por Status',
    data: { chartType: 'pie' },
    refreshInterval: 300000, // 5 minutes
  },
  {
    id: 'activity-feed-1',
    type: 'activity-feed',
    title: 'Atividades Recentes',
    refreshInterval: 60000, // 1 minute
  },
  {
    id: 'quick-actions-1',
    type: 'quick-actions',
    title: 'Ações Rápidas',
  },
  {
    id: 'chart-monthly-1',
    type: 'chart',
    title: 'Processos por Mês',
    data: { chartType: 'bar' },
    refreshInterval: 3600000, // 1 hour
  },
];

// Default layout for new users
const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'stats-1', x: 0, y: 0, w: 6, h: 2 },
    { i: 'quick-actions-1', x: 6, y: 0, w: 6, h: 2 },
    { i: 'chart-status-1', x: 0, y: 2, w: 6, h: 4 },
    { i: 'recent-cases-1', x: 6, y: 2, w: 6, h: 4 },
    { i: 'activity-feed-1', x: 0, y: 6, w: 12, h: 3 },
  ],
  md: [
    { i: 'stats-1', x: 0, y: 0, w: 10, h: 2 },
    { i: 'quick-actions-1', x: 0, y: 2, w: 10, h: 2 },
    { i: 'chart-status-1', x: 0, y: 4, w: 5, h: 4 },
    { i: 'recent-cases-1', x: 5, y: 4, w: 5, h: 4 },
    { i: 'activity-feed-1', x: 0, y: 8, w: 10, h: 3 },
  ],
  sm: [
    { i: 'stats-1', x: 0, y: 0, w: 6, h: 2 },
    { i: 'quick-actions-1', x: 0, y: 2, w: 6, h: 2 },
    { i: 'chart-status-1', x: 0, y: 4, w: 6, h: 3 },
    { i: 'recent-cases-1', x: 0, y: 7, w: 6, h: 3 },
    { i: 'activity-feed-1', x: 0, y: 10, w: 6, h: 3 },
  ],
};

const DEFAULT_ACTIVE_WIDGETS = ['stats-1', 'quick-actions-1', 'chart-status-1', 'recent-cases-1', 'activity-feed-1'];

export default function CustomDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeWidgets, setActiveWidgets] = useState<WidgetConfig[]>(
    AVAILABLE_WIDGETS.filter(w => DEFAULT_ACTIVE_WIDGETS.includes(w.id))
  );
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  // Load user's saved dashboard layout
  useEffect(() => {
    if (user?.id) {
      fetchDashboardLayout();
    }
  }, [user?.id]);

  const fetchDashboardLayout = async () => {
    try {
      const response = await fetch(`/api/dashboard/layout`, {
        credentials: 'include',
      });

      if (response.ok) {
        const savedLayout = await response.json();
        if (savedLayout) {
          setLayouts(savedLayout.layout || DEFAULT_LAYOUTS);
          const savedWidgets = AVAILABLE_WIDGETS.filter(w => 
            savedLayout.widgets?.includes(w.id)
          );
          if (savedWidgets.length > 0) {
            setActiveWidgets(savedWidgets);
          }
        }
      }
    } catch (error) {
      console.error('Error loading dashboard layout:', error);
    }
  };

  const saveDashboardLayout = async () => {
    if (!user?.id || isSavingLayout) return;

    setIsSavingLayout(true);
    try {
      const response = await fetch('/api/dashboard/layout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: layouts,
          widgets: activeWidgets.map(w => w.id),
        }),
      });

      if (response.ok) {
        toast({
          title: "Layout salvo",
          description: "Sua personalização foi salva com sucesso.",
        });
      } else {
        throw new Error('Failed to save layout');
      }
    } catch (error) {
      console.error('Error saving dashboard layout:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o layout personalizado.",
        variant: "destructive",
      });
    }
    setIsSavingLayout(false);
  };

  const handleLayoutChange = useCallback((layout: LayoutItem[], allLayouts: { [key: string]: LayoutItem[] }) => {
    setLayouts(allLayouts);
  }, []);

  const handleWidgetToggle = useCallback((widget: WidgetConfig, enabled: boolean) => {
    if (enabled) {
      setActiveWidgets(prev => [...prev, widget]);
    } else {
      setActiveWidgets(prev => prev.filter(w => w.id !== widget.id));
    }
  }, []);

  // Data queries for widgets
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
  });

  const { data: recentCases } = useQuery({
    queryKey: ["/api/cases", { limit: 5 }],
    queryFn: async () => {
      const response = await fetch("/api/cases?limit=5", { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch cases');
      return response.json() as Promise<CaseWithRelations[]>;
    },
    refetchInterval: 120000, // 2 minutes
  });

  const { data: activityLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
    queryFn: async () => {
      const response = await fetch("/api/activity-logs", { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      return response.json() as Promise<ActivityLogWithUser[]>;
    },
    refetchInterval: 60000, // 1 minute
  });

  // Generate chart data from cases
  const chartData = recentCases ? [
    { name: 'Novo', value: recentCases.filter(c => c.status === 'novo').length },
    { name: 'Andamento', value: recentCases.filter(c => c.status === 'andamento').length },
    { name: 'Concluído', value: recentCases.filter(c => c.status === 'concluido').length },
    { name: 'Pendente', value: recentCases.filter(c => c.status === 'pendente').length },
  ].filter(item => item.value > 0) : undefined;

  const dashboardData = {
    stats,
    recentCases,
    chartData,
    activityLogs,
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <DashboardCustomizer
          availableWidgets={AVAILABLE_WIDGETS}
          activeWidgets={activeWidgets}
          layout={layouts.lg || []}
          onWidgetToggle={handleWidgetToggle}
          onSaveLayout={saveDashboardLayout}
        />
      </div>

      <DashboardGrid
        widgets={activeWidgets}
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        dashboardData={dashboardData}
        onNewCase={() => {
          // Navigate to cases page with new case modal
          window.location.href = '/cases?new=true';
        }}
        onSearchEmployees={() => {
          // Navigate to cases page with search focus
          window.location.href = '/cases?search=true';
        }}
      />

      {isSavingLayout && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Salvando layout...</span>
          </div>
        </div>
      )}
    </div>
  );
}