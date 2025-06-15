import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Calendar, Filter, User } from 'lucide-react';
import { salesysApi } from '@/services/salesysApi';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface StatisticsViewProps {
  statType: 'avtal' | 'samtal' | 'ordrar';
  onBack: () => void;
  cachedStatisticsData?: Map<string, any>;
}

interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
}

interface UserStats {
  userId: string;
  fullName: string;
  totalCount: number;
}

interface Project {
  id: string;
  name: string;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ statType, onBack, cachedStatisticsData }) => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'last30days' | 'all'>('last30days');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Helper function to get date ranges
  const getDateRange = (range: string): { from: string; to: string } => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (range) {
      case 'today':
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const currentDay = now.getDay();
        from = new Date(now);
        from.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(from.getDate() + 6);
        to.setHours(23, 59, 59, 999);
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        from.setHours(0, 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last30days':
        from = new Date(now);
        from.setDate(now.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
        break;
      case 'all':
        from = new Date(now.getFullYear(), 0, 1);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
        break;
      default:
        from = new Date(now);
        from.setDate(now.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  };

  // Load projects on component mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsData = await salesysApi.getProjects();
        const formattedProjects = [
          { id: 'all', name: 'Alla projekt' },
          ...projectsData.map(project => ({ id: project.id, name: project.name }))
        ];
        setProjects(formattedProjects);
        setSelectedProjectId('all'); // Default to all projects
      } catch (error) {
        console.error('Error loading projects:', error);
        // Set default project even if API fails
        setProjects([{ id: 'all', name: 'Alla projekt' }]);
        setSelectedProjectId('all');
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [statType, timeRange, selectedProjectId, cachedStatisticsData]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { from, to } = getDateRange(timeRange);
      let chartData: ChartDataPoint[] = [];
      let total = 0;

      console.log(`Loading ${statType} statistics from ${from} to ${to}, project: ${selectedProjectId}`);

      // Check if we have cached data for this combination
      const cacheKey = `${statType}-${timeRange}`;
      if (cachedStatisticsData && cachedStatisticsData.has(cacheKey) && selectedProjectId === 'all') {
        console.log(`Using cached statistics for ${cacheKey}`);
        const cachedData = cachedStatisticsData.get(cacheKey);
        
        chartData = cachedData.map((item: any) => {
          const date = new Date(item.intervalStart);
          const label = date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
          
          return {
            date: item.intervalStart,
            value: item.count,
            label
          };
        });

        total = chartData.reduce((sum, item) => sum + item.value, 0);
        setData(chartData);
        setTotalCount(total);
        setLoading(false);
        
        // Still load user stats in background
        loadUserStats(from, to);
        return;
      }

      // Prepare project IDs for API call
      const projectIds = selectedProjectId === 'all' ? undefined : [selectedProjectId];

      if (statType === 'avtal') {
        // Use "day" interval for detailed statistics view
        const statsData = await salesysApi.getOfferStatistics({
          from,
          to,
          fixedIntervalType: 'day',
          projectIds
        });

        // Convert statistics data to chart format
        chartData = statsData.map(item => {
          const date = new Date(item.intervalStart);
          const label = date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
          
          return {
            date: item.intervalStart,
            value: item.count,
            label
          };
        });

        total = chartData.reduce((sum, item) => sum + item.value, 0);

      } else if (statType === 'samtal') {
        // Use "day" interval for detailed statistics view
        const statsData = await salesysApi.getCallStatisticsHourly({
          from,
          to,
          fixedIntervalType: 'day',
          projectIds
        });

        chartData = statsData.map(item => {
          const date = new Date(item.intervalStart);
          const label = date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
          
          return {
            date: item.intervalStart,
            value: item.count,
            label
          };
        });

        total = chartData.reduce((sum, item) => sum + item.value, 0);

      } else if (statType === 'ordrar') {
        // Use "day" interval for detailed statistics view
        const statsData = await salesysApi.getOrderStatisticsHourly({
          from,
          to,
          fixedIntervalType: 'day',
          projectIds
        });

        chartData = statsData.map(item => {
          const date = new Date(item.intervalStart);
          const label = date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
          
          return {
            date: item.intervalStart,
            value: item.count,
            label
          };
        });

        total = chartData.reduce((sum, item) => sum + item.value, 0);
      }

      setData(chartData);
      setTotalCount(total);
      console.log(`Loaded ${statType} statistics:`, { chartData, total });

      // Load user statistics
      await loadUserStats(from, to);
      
    } catch (error) {
      const errorMsg = `Kunde inte ladda ${statType}-statistik`;
      setError(errorMsg);
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (from: string, to: string) => {
    setLoadingUsers(true);
    try {
      // Get all users first
      const users = await salesysApi.getUsers();
      const userStatsPromises = users.map(async (user) => {
        let count = 0;
        try {
          if (statType === 'avtal') {
            const offers = await salesysApi.getOffers({
              statuses: ['signed'],
              from,
              to,
              count: 100
            });
            count = offers.data.length;
          } else if (statType === 'samtal') {
            const calls = await salesysApi.getCalls({
              after: from,
              before: to,
              count: 100
            });
            count = calls.data.filter(call => call.userId === user.id).length;
          } else if (statType === 'ordrar') {
            const orders = await salesysApi.getOrders({
              from,
              to,
              count: 100
            });
            count = orders.data.filter(order => order.userId === user.id).length;
          }
        } catch (error) {
          console.error(`Error loading stats for user ${user.fullName}:`, error);
        }

        return {
          userId: user.id,
          fullName: user.fullName,
          totalCount: count
        };
      });

      const stats = await Promise.all(userStatsPromises);
      const sortedStats = stats
        .filter(stat => stat.totalCount > 0)
        .sort((a, b) => b.totalCount - a.totalCount)
        .slice(0, 10);
      
      setUserStats(sortedStats);
    } catch (error) {
      console.error('Error loading user statistics:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const getTitle = () => {
    switch (statType) {
      case 'avtal': return 'Avtal signerade';
      case 'samtal': return 'Samtal genomförda';
      case 'ordrar': return 'Ordrar skapade';
      default: return 'Statistik';
    }
  };

  const getColor = () => {
    switch (statType) {
      case 'avtal': return '#16a34a';
      case 'samtal': return '#1665c0';
      case 'ordrar': return '#9333ea';
      default: return '#1665c0';
    }
  };

  const getRangeLabel = () => {
    switch (timeRange) {
      case 'today': return 'idag';
      case 'week': return 'denna vecka';
      case 'month': return 'denna månad';
      case 'last30days': return 'senaste 30 dagarna';
      case 'all': return 'totalt';
      default: return '';
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
          <div>
            <h1 className="text-2xl font-light text-gray-800">{getTitle()}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount.toLocaleString('sv-SE')} {getRangeLabel()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={timeRange} onValueChange={(value: 'today' | 'week' | 'month' | 'last30days' | 'all') => setTimeRange(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Idag</SelectItem>
              <SelectItem value="week">Denna vecka</SelectItem>
              <SelectItem value="month">Denna månad</SelectItem>
              <SelectItem value="last30days">Senaste 30 dagarna</SelectItem>
              <SelectItem value="all">Hela året</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Välj projekt" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="bg-gray-200 h-4 w-1/4 rounded" />
                <div className="bg-gray-200 h-80 w-full rounded" />
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-100 bg-red-50 rounded-2xl">
            <CardContent className="pt-6">
              <div className="text-sm text-red-600">{error}</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Chart Card */}
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">
                  {getTitle()} - {getRangeLabel()}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="flex items-center gap-6 px-4 sm:px-0">
                    <div>
                      <div className="text-3xl font-light" style={{ color: getColor() }}>
                        {totalCount.toLocaleString('sv-SE')}
                      </div>
                      <div className="text-sm text-gray-500">Totalt {getRangeLabel()}</div>
                    </div>
                    {data.length > 0 && (
                      <div>
                        <div className="text-lg font-light text-gray-600">
                          {Math.round(totalCount / data.length)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Snitt per {timeRange === 'today' ? 'timme' : 'dag'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chart */}
                  {data.length > 0 && (
                    <div className="h-80 -mx-4 sm:-mx-2 lg:mx-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 5, left: 5, bottom: timeRange === 'today' ? 60 : 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="label"
                            tick={{ fontSize: 12 }}
                            angle={timeRange === 'today' ? -45 : 0}
                            textAnchor={timeRange === 'today' ? 'end' : 'middle'}
                            height={timeRange === 'today' ? 60 : 30}
                            interval={0}
                          />
                          <YAxis tick={{ fontSize: 12 }} width={30} />
                          <Tooltip 
                            formatter={(value: any) => [value, getTitle()]}
                            labelFormatter={(label: string) => `${timeRange === 'today' ? 'Klockan' : 'Datum'}: ${label}`}
                          />
                          <Bar 
                            dataKey="value" 
                            fill={getColor()}
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {data.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                      Ingen data hittades för vald period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Statistics */}
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-light flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Topp användare - {getRangeLabel()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="bg-gray-200 h-4 w-32 rounded" />
                        <div className="bg-gray-200 h-4 w-12 rounded" />
                      </div>
                    ))}
                  </div>
                ) : userStats.length > 0 ? (
                  <div className="space-y-3">
                    {userStats.map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-gray-400 w-6">
                            #{index + 1}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.fullName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" style={{ backgroundColor: `${getColor()}20`, color: getColor() }}>
                            {user.totalCount.toLocaleString('sv-SE')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Ingen användardata hittades för vald period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsView;
