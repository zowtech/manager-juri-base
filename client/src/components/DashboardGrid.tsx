import { useState, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import StatsWidget from "./widgets/StatsWidget";
import RecentCasesWidget from "./widgets/RecentCasesWidget";
import ChartWidget from "./widgets/ChartWidget";
import QuickActionsWidget from "./widgets/QuickActionsWidget";
import ActivityFeedWidget from "./widgets/ActivityFeedWidget";
import PerformanceMetricsWidget from "./widgets/PerformanceMetricsWidget";
import DeadlineAlertsWidget from "./widgets/DeadlineAlertsWidget";
import type { WidgetConfig, LayoutItem } from "@shared/schema";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@/styles/dashboard-grid.css";
import "@/styles/responsive-dashboard.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  widgets: WidgetConfig[];
  layouts: { [key: string]: LayoutItem[] };
  onLayoutChange: (layout: LayoutItem[], layouts: { [key: string]: LayoutItem[] }) => void;
  dashboardData: {
    stats?: any;
    recentCases?: any[];
    chartData?: any[];
    activityLogs?: any[];
    performanceMetrics?: any;
    deadlineAlerts?: any[];
    chartProcessTypes?: any[];
    chartMonthly?: any[];
    chartStatus?: any[];
  };
  onNewCase?: () => void;
  onSearchEmployees?: () => void;
}

export default function DashboardGrid({ 
  widgets, 
  layouts, 
  onLayoutChange, 
  dashboardData,
  onNewCase,
  onSearchEmployees
}: DashboardGridProps) {
  const [isDragging, setIsDragging] = useState(false);

  const renderWidget = useCallback((widget: WidgetConfig) => {
    switch (widget.type) {
      case 'stats':
        return <StatsWidget config={widget} data={dashboardData.stats} />;
      case 'recent-cases':
        return <RecentCasesWidget config={widget} data={dashboardData.recentCases} />;
      case 'chart':
        // Determinar dados baseado no endpoint específico
        let chartData = dashboardData.chartData;
        if (widget.data?.endpoint === '/api/dashboard/chart-status') {
          chartData = dashboardData.chartStatus;
        } else if (widget.data?.endpoint === '/api/dashboard/chart-monthly') {
          chartData = dashboardData.chartMonthly;
        } else if (widget.data?.endpoint === '/api/dashboard/chart-process-types') {
          chartData = dashboardData.chartProcessTypes;
        }
        return <ChartWidget config={widget} data={chartData} />;
      case 'activity-feed':
        return <ActivityFeedWidget config={widget} data={dashboardData.activityLogs} />;
      case 'quick-actions':
        return (
          <QuickActionsWidget 
            config={widget} 
            onNewCase={onNewCase}
            onSearchEmployees={onSearchEmployees}
          />
        );
      case 'performance-metrics':
        return <PerformanceMetricsWidget config={widget} data={dashboardData.performanceMetrics} />;
      case 'deadline-alerts':
        return <DeadlineAlertsWidget config={widget} data={dashboardData.deadlineAlerts} />;
      default:
        return (
          <div className="h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Widget: {widget.type}</span>
          </div>
        );
    }
  }, [dashboardData, onNewCase, onSearchEmployees]);

  return (
    <div className={`transition-all duration-200 ${isDragging ? 'cursor-grabbing' : ''}`}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={onLayoutChange}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
        onResizeStart={() => setIsDragging(true)}
        onResizeStop={() => setIsDragging(false)}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={70}
        margin={[16, 16]}
        containerPadding={[20, 20]}
        isDraggable={true}
        isResizable={true}
        useCSSTransforms={true}
        preventCollision={false}
        compactType="vertical"
      >
        {widgets.map((widget) => (
          <div 
            key={widget.id} 
            className={`bg-white rounded-lg shadow-sm border transition-shadow duration-200 ${
              isDragging ? 'shadow-lg' : 'hover:shadow-md'
            }`}
          >
            {renderWidget(widget)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}