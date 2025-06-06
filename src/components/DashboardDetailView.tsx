import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { salesysApi, Dashboard, DashboardResult } from '@/services/salesysApi';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardDetailViewProps {
  dashboard: Dashboard;
  onBack: () => void;
}

const DashboardDetailView: React.FC<DashboardDetailViewProps> = ({
  dashboard,
  onBack
}) => {
  const { toast } = useToast();
  const [results, setResults] = useState<DashboardResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const formatChartData = (result: DashboardResult) => {
    return result.intervals.map(interval => ({
      date: new Date(interval.intervalStart).toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' }),
      value: interval.value,
      fullDate: interval.intervalStart
    })).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  };

  const formatValue = (value: number, unit?: string) => {
    if (unit === 'percent') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toLocaleString('sv-SE');
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
            <h1 className="text-2xl font-light text-gray-800">{dashboard.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {dashboard.readers.length} reader{dashboard.readers.length !== 1 ? 's' : ''} • ID: {dashboard.id}
            </p>
          </div>
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
                      <div className="text-2xl font-light text-blue-600">
                        {formatValue(latestValue, reader?.unit)}
                      </div>
                      
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
        )}
      </div>
    </div>
  );
};

export default DashboardDetailView;
