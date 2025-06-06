import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Filter, Calendar, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { salesysApi, Project } from '@/services/salesysApi';
import { useToast } from '@/hooks/use-toast';
import DashboardCard from './DashboardCard';

interface StatisticsViewProps {
  onBack: () => void;
}

interface StatisticsData {
  calls: number;
  connectedCalls: number;
  deals: number;
}

interface WeeklyStatistics {
  calls: number;
  connectedCalls: number;
  deals: number;
}

interface MonthlyStatistics {
  calls: number;
  connectedCalls: number;
  deals: number;
}

interface ChartDataPoint {
  date: string;
  value: number;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<StatisticsData>({ calls: 0, connectedCalls: 0, deals: 0 });
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStatistics>({ calls: 0, connectedCalls: 0, deals: 0 });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStatistics>({ calls: 0, connectedCalls: 0, deals: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    loadStatistics();
    loadProjects();
  }, [selectedPeriod, selectedProject]);

  const loadStatistics = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await salesysApi.getStatistics(selectedPeriod, selectedProject);
      setStatistics(data.total);
      setWeeklyStats(data.weekly);
      setMonthlyStats(data.monthly);
      setChartData(data.chartData);
    } catch (error) {
      setError('Kunde inte ladda statistik.');
      toast({
        title: "Fel",
        description: "Kunde inte ladda statistik.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const projectsData = await salesysApi.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda projekt.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {selectedPeriod === 'today' ? 'Idag' : 
                     selectedPeriod === 'week' ? 'Denna vecka' : 
                     selectedPeriod === 'month' ? 'Denna månad' : 'Alla'}
                  </Badge>
                  {selectedProject !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {projects.find(p => p.id === selectedProject)?.name || 'Projekt'}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Idag</SelectItem>
                    <SelectItem value="week">Denna vecka</SelectItem>
                    <SelectItem value="month">Denna månad</SelectItem>
                    <SelectItem value="all">Alla</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla projekt</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            title="Samtal"
            count={statistics.calls}
            isLoading={loading}
            error={error}
            color="blue"
            chartData={chartData}
            weeklyTotal={weeklyStats.calls}
            monthlyTotal={monthlyStats.calls}
          />
          <DashboardCard
            title="Anslutna samtal"
            count={statistics.connectedCalls}
            isLoading={loading}
            error={error}
            color="green"
            chartData={chartData}
            weeklyTotal={weeklyStats.connectedCalls}
            monthlyTotal={monthlyStats.connectedCalls}
          />
          <DashboardCard
            title="Avtal signerade"
            count={statistics.deals}
            isLoading={loading}
            error={error}
            color="purple"
            chartData={chartData}
            weeklyTotal={weeklyStats.deals}
            monthlyTotal={monthlyStats.deals}
          />
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
