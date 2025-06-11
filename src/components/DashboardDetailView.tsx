
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { salesysApi, Dashboard, DashboardResult } from '@/SaleSys';
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

  useEffect(() => {
    loadDashboardResults();
  }, [dashboard.id]);

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

  const updateGroupBy = async (newGroupBy: GroupByOption) => {
    setUpdatingGroupBy(true);
    try {
      const response = await fetch(`https://salesys.se/api/tools/proxy.php?url=${encodeURIComponent(`https://app.salesys.se/api/users/dashboards-v1/${dashboard.id}`)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${salesysApi.getBearerToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupBy: newGroupBy })
      });

      if (!response.ok) {
        throw new Error(`Failed to update groupBy: ${response.status}`);
      }

      setGroupBy(newGroupBy);
      await loadDashboardResults();
      
      toast({
        title: "Uppdaterat",
        description: `Visning ändrad till ${getGroupByLabel(newGroupBy)}`,
      });
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

  const shouldShowAsCards = (): boolean => {
    return results.length > 0 && results[0].groupedId?.startsWith('50');
  };

  const formatValue = (value: number, unit?: string): string => {
    const formattedValue = Number(value.toFixed(2));
    if (unit === 'percent') {
      return `${(formattedValue * 100).toFixed(2)}%`;
    }
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

  const renderTable = () => (
    <Card className="bg-white border-0 shadow-sm rounded-2xl">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>Senaste värde</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Intervall</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => {
              const reader = dashboard.readers.find(r => r.id === result.readerId);
              const latestValue = getLatestValue(result);
              const trend = getTrend(result);

              return (
                <TableRow key={result.readerId}>
                  <TableCell className="font-medium">
                    {reader?.name || 'Unnamed Reader'}
                  </TableCell>
                  <TableCell className="text-blue-600 font-medium">
                    {formatValue(latestValue, reader?.unit)}
                  </TableCell>
                  <TableCell>
                    {getTrendIcon(trend)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {result.intervals.length} datapunkter
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

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
            <p className="text-sm text-gray-500 mt-1">
              {dashboard.readers.length} reader{dashboard.readers.length !== 1 ? 's' : ''} • ID: {dashboard.id}
            </p>
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
