
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Settings } from 'lucide-react';
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
  weeklyTotal?: number;
  monthlyTotal?: number;
  showLiveDot?: boolean;
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
  chartData,
  weeklyTotal,
  monthlyTotal,
  showLiveDot = false
}) => {
  const countColors = {
    blue: 'text-[#1665c0]',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  const chartColors = {
    blue: '#1665c0', // Strong blue
    green: '#16a34a', // Strong green  
    purple: '#9333ea', // Strong purple
  };

  const dotColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
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
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-light text-gray-600">
              {title}
            </CardTitle>
            <Settings className="h-3 w-3 text-gray-400" />
          </div>
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
              <div className="flex items-center gap-2">
                <div className={cn('text-4xl font-thin', countColors[color])}>
                  {isLoading ? (
                    <div className="animate-pulse bg-gray-200 h-10 w-20 rounded" />
                  ) : (
                    count.toLocaleString('sv-SE')
                  )}
                </div>
                {showLiveDot && !isLoading && (
                  <div className={cn('w-2 h-2 rounded-full animate-pulse opacity-75', dotColors[color])} />
                )}
              </div>
              {isLoading && (
                <Progress value={undefined} className="h-1" />
              )}
              {chartData && chartData.length > 0 && !isLoading && !error && (
                <MiniChart data={chartData} color={color} />
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
