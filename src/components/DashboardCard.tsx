
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-light text-gray-600">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
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
