
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { salesysApi, Dashboard, DashboardResult, User, Team, DialGroup } from '@/services/salesysApi';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardDetailViewProps {
  dashboard: Dashboard;
  onBack: () => void;
}

type GroupByOption = 'user' | 'team' | 'leadList' | null;

const DashboardDetailView: React.FC<DashboardDetailViewProps> = ({
  dashboard,
  onBack
}) => {
  const { toast } = useToast();
  const [results, setResults] = useState<DashboardResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>(null);
  const [updatingGroupBy, setUpdatingGroupBy] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dialGroups, setDialGroups] = useState<DialGroup[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  useEffect(() => {
    initializeDashboard();
  }, [dashboard.id]);

  useEffect(() => {
    if (groupBy) {
      loadEntityData();
    }
  }, [groupBy]);

  const initializeDashboard = async () => {
    // Check current groupBy setting from dashboard
    const currentGroupBy = dashboard.groupBy as GroupByOption;
    
    if (currentGroupBy && ['user', 'team', 'leadList'].includes(currentGroupBy)) {
      // Use existing groupBy setting
      setGroupBy(currentGroupBy);
    } else {
      // Default to 'user' if no valid groupBy is set
      setGroupBy('user');
      await updateGroupBy('user');
    }
    
    await loadDashboardResults();
  };

  const loadDashboardResults = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Loading dashboard results for ID:', dashboard.id);
      console.log('Dashboard object:', dashboard);
      
      const data = await salesysApi.getDashboardResults(dashboard.id);
      setResults(data);
      console.log('Loaded dashboard results:', data);
    } catch (error) {
      const errorMsg = `Kunde inte ladda dashboard-data för ${dashboard.name}`;
      setError(errorMsg);
      console.error('Error loading dashboard results:', error);
      console.error('Dashboard ID that failed:', dashboard.id);
      toast({
        title: "Fel",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEntityData = async () => {
    if (!groupBy) return;
    
    setEntitiesLoading(true);
    try {
      switch (groupBy) {
        case 'user':
          const userData = await salesysApi.getUsers();
          setUsers(userData);
          break;
        case 'team':
          const teamData = await salesysApi.getTeams();
          setTeams(teamData);
          break;
        case 'leadList':
          const dialGroupData = await salesysApi.getDialGroups();
          setDialGroups(dialGroupData.data);
          break;
      }
    } catch (error) {
      console.error('Error loading entity data:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda entitetsdata",
        variant: "destructive",
      });
    } finally {
      setEntitiesLoading(false);
    }
  };

  const updateGroupBy = async (newGroupBy: GroupByOption) => {
    setUpdatingGroupBy(true);
    try {
      await salesysApi.updateDashboardGroupBy(dashboard.id, newGroupBy);
      setGroupBy(newGroupBy);
      await loadDashboardResults();
    } catch (error) {
      console.error('Error updating groupBy:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera visning",
        variant: "destructive",
      });
    } finally {
      setUpdatingGroupBy(false);
    }
  };

  const getGroupByLabel = (option: GroupByOption): string => {
    switch (option) {
      case 'user': return 'Användare';
      case 'team': return 'Team';
      case 'leadList': return 'Ringlista';
      default: return 'Standard';
    }
  };

  const getEntityName = (groupedId: string): string => {
    if (!groupBy) return '';
    
    switch (groupBy) {
      case 'user':
        const user = users.find(u => u.id === groupedId);
        return user ? user.fullName : `Okänd användare (${groupedId})`;
      case 'team':
        const team = teams.find(t => t.id === groupedId);
        return team ? team.name : `Okänt team (${groupedId})`;
      case 'leadList':
        const dialGroup = dialGroups.find(d => d.id === groupedId);
        return dialGroup ? dialGroup.name : `Okänd ringlista (${groupedId})`;
      default:
        return '';
    }
  };

  const shouldShowAsCards = (): boolean => {
    return results.length > 0 && results[0].groupedId?.startsWith('50');
  };

  const formatValue = (value: number, unit?: string): string => {
    if (unit === 'milliseconds') {
      const totalSeconds = Math.floor(value / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    }
    
    if (unit === 'percent') {
      return `${(value * 100).toFixed(1)}%`;
    }
    
    // Default formatting for other units or no unit
    const formattedValue = Number(value.toFixed(2));
    return formattedValue.toLocaleString('sv-SE');
  };

  const formatChartData = (result: DashboardResult) => {
    return result.intervals.map(interval => ({
      date: new Date(interval.intervalStart).toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' }),
      value: interval.value,
      fullDate: interval.intervalStart
    })).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  };

  const getLatestValue = (result: DashboardResult) => {
    if (result.intervals.length === 0) return 0;
    return result.intervals.reduce((latest, current) => 
      new Date(current.intervalStart) > new Date(latest.intervalStart) ? current : latest
    ).value;
  };

  const getTrend = (result: DashboardResult) => {
    if (result.intervals.length < 2) return 'neutral';
    
    const sortedIntervals = result.intervals.sort((a, b) => 
      new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime()
    );
    
    const latest = sortedIntervals[sortedIntervals.length - 1].value;
    const previous = sortedIntervals[sortedIntervals.length - 2].value;
    
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'neutral';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderCards = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {results.map((result) => {
        const reader = dashboard.readers.find(r => r.id === result.readerId);
        const chartData = formatChartData(result);
        const latestValue = getLatestValue(result);
        const trend = getTrend(result);

        return (
          <Card key={result.readerId} className="bg-white border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {reader?.name || 'Unnamed Reader'}
                </CardTitle>
                {getTrendIcon(trend)}
              </div>
              {groupBy && (
                <div className="text-xs text-gray-500 mt-1">
                  {entitiesLoading ? 'Laddar...' : getEntityName(result.groupedId)}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-light text-blue-600">
                  {formatValue(latestValue, reader?.unit)}
                </div>
                
                {result.intervals.length > 1 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-2">Tidigare värden:</div>
                    <div className="flex flex-wrap gap-2">
                      {result.intervals
                        .sort((a, b) => new Date(b.intervalStart).getTime() - new Date(a.intervalStart).getTime())
                        .slice(1, 6)
                        .map((interval, index) => (
                          <div 
                            key={index}
                            className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded"
                          >
                            {formatValue(interval.value, reader?.unit)}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {chartData.length > 0 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#666' }}
                        />
                        <YAxis hide />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-2 border border-gray-200 rounded shadow text-xs">
                                  <p className="text-gray-600">{payload[0].payload.date}</p>
                                  <p className="text-blue-600 font-medium">
                                    {formatValue(payload[0].value as number, reader?.unit)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#1665c0"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3, fill: '#1665c0' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderTable = () => {
    // Group results by groupedId to create rows
    const groupedResults = results.reduce((acc, result) => {
      const key = result.groupedId || 'default';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {} as Record<string, DashboardResult[]>);

    return (
      <Card className="bg-white border-0 shadow-sm rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entitet</TableHead>
                {dashboard.readers.map((reader) => (
                  <TableHead key={reader.id}>{reader.name}</TableHead>
                ))}
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedResults).map(([groupedId, groupResults]) => {
                const entityName = groupBy ? getEntityName(groupedId) : 'Alla';
                
                return (
                  <TableRow key={groupedId}>
                    <TableCell className="font-medium">
                      {entitiesLoading ? 'Laddar...' : entityName}
                    </TableCell>
                    {dashboard.readers.map((reader) => {
                      const result = groupResults.find(r => r.readerId === reader.id);
                      const latestValue = result ? getLatestValue(result) : 0;
                      return (
                        <TableCell key={reader.id} className="text-blue-600 font-medium">
                          {formatValue(latestValue, reader.unit)}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      {/* Show trend for the first reader as an example */}
                      {groupResults.length > 0 && getTrendIcon(getTrend(groupResults[0]))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
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
            <h1 className="text-2xl font-light text-gray-800">{dashboard.name}</h1>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={groupBy === null ? "default" : "outline"}
            size="sm"
            onClick={() => updateGroupBy(null)}
            disabled={updatingGroupBy}
          >
            Standard
          </Button>
          <Button
            variant={groupBy === 'user' ? "default" : "outline"}
            size="sm"
            onClick={() => updateGroupBy('user')}
            disabled={updatingGroupBy}
          >
            Användare
          </Button>
          <Button
            variant={groupBy === 'team' ? "default" : "outline"}
            size="sm"
            onClick={() => updateGroupBy('team')}
            disabled={updatingGroupBy}
          >
            Team
          </Button>
          <Button
            variant={groupBy === 'leadList' ? "default" : "outline"}
            size="sm"
            onClick={() => updateGroupBy('leadList')}
            disabled={updatingGroupBy}
          >
            Ringlista
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="bg-white border-0 shadow-sm rounded-2xl">
                <CardContent className="pt-6 space-y-4">
                  <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded" />
                  <div className="animate-pulse bg-gray-200 h-8 w-1/2 rounded" />
                  <div className="animate-pulse bg-gray-200 h-32 w-full rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-red-100 bg-red-50 rounded-2xl">
            <CardContent className="pt-6">
              <div className="text-sm text-red-600 space-y-2">
                <p>{error}</p>
                <p className="text-xs text-gray-500">Dashboard ID: {dashboard.id}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadDashboardResults}
                  className="mt-2"
                >
                  Försök igen
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          shouldShowAsCards() ? renderCards() : renderTable()
        )}
      </div>
    </div>
  );
};

export default DashboardDetailView;
