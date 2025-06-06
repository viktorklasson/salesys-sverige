
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Calendar, Filter } from 'lucide-react';
import { salesysApi } from '@/services/salesysApi';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface StatisticsViewProps {
  statType: 'avtal' | 'samtal' | 'ordrar';
  onBack: () => void;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ statType, onBack }) => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Helper functions for date calculations
  const getTodayRange = (): { from: string; to: string } => {
    const now = new Date();
    const today = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
    
    const from = new Date(today);
    from.setHours(0, 0, 0, 0);
    
    const to = new Date(today);
    to.setHours(23, 59, 59, 999);

    return {
      from: from.toISOString(),
      to: to.toISOString()
    };
  };

  const getWeekDates = (): { from: string; to: string } => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      from: monday.toISOString(),
      to: sunday.toISOString()
    };
  };

  const getMonthDates = (): { from: string; to: string } => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    
    return {
      from: start.toISOString(),
      to: end.toISOString()
    };
  };

  useEffect(() => {
    loadData();
  }, [statType, timeRange]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Simple data loading logic for now
      console.log(`Loading ${statType} data for ${timeRange}`);
      setData([]);
    } catch (error) {
      const errorMsg = `Kunde inte ladda ${statType}-statistik`;
      setError(errorMsg);
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (statType) {
      case 'avtal': return 'Avtal';
      case 'samtal': return 'Samtal';
      case 'ordrar': return 'Ordrar';
      default: return 'Statistik';
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
            <p className="text-sm text-gray-500 mt-1">Detaljerad statistik</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={timeRange} onValueChange={(value: 'today' | 'week' | 'month' | 'all') => setTimeRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Idag</SelectItem>
              <SelectItem value="week">Denna vecka</SelectItem>
              <SelectItem value="month">Denna månad</SelectItem>
              <SelectItem value="all">Alla</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="bg-gray-200 h-4 w-1/4 rounded" />
                <div className="bg-gray-200 h-32 w-full rounded" />
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
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                Statistikdata kommer att visas här
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StatisticsView;
