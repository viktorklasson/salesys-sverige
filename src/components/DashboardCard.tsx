
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import MiniChart from './MiniChart';

interface DashboardCardProps {
  title: string;
  count: number;
  isLoading: boolean;
  error?: string;
  color?: 'blue' | 'green' | 'purple';
  filterInfo?: string;
  className?: string;
  onClick?: () => void;
  chartData?: Array<{ date: string; value: number }>;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  count,
  isLoading,
  error,
  color = 'blue',
  filterInfo,
  className,
  onClick,
  chartData
}) => {
  const countColors = {
    blue: 'text-[#1665c0]',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  // Calculate average and trend
  const calculateAverage = () => {
    if (!chartData || chartData.length === 0) return null;
    
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const average = total / chartData.length;
    const todayValue = count;
    
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (todayValue > average) trend = 'up';
    else if (todayValue < average) trend = 'down';
    
    return {
      average: Math.round(average * 10) / 10, // Round to 1 decimal
      trend,
      difference: Math.abs(todayValue - average)
    };
  };

  const averageData = calculateAverage();

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md relative',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Background Average Badge */}
      {averageData && !isLoading && !error && (
        <div className="absolute top-3 right-3 z-0">
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs opacity-40 bg-gray-50 border-gray-200',
              getTrendColor(averageData.trend)
            )}
          >
            <span className="flex items-center gap-1">
              {getTrendIcon(averageData.trend)}
              Ø {averageData.average}/dag
            </span>
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-light text-gray-600">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-3">
          {error ? (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          ) : (
            <>
              <div className={cn('text-4xl font-thin', countColors[color])}>
                {isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-10 w-20 rounded" />
                ) : (
                  count.toLocaleString('sv-SE')
                )}
              </div>
              {isLoading && (
                <Progress value={undefined} className="h-1" />
              )}
              {chartData && chartData.length > 0 && !isLoading && !error && (
                <MiniChart data={chartData} color={color} />
              )}
              {filterInfo && (
                <div className="text-xs text-gray-400">
                  {filterInfo}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
