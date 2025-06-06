
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Settings, RefreshCw, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  count: number;
  isLoading: boolean;
  error?: string;
  color?: 'blue' | 'green' | 'purple';
  onRefresh?: () => void;
  onSettings?: () => void;
  filterInfo?: string;
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  count,
  isLoading,
  error,
  color = 'blue',
  onRefresh,
  onSettings,
  filterInfo,
  className
}) => {
  const countColors = {
    blue: 'text-[#1665c0]',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-light text-gray-600">
            {title}
          </CardTitle>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn(
                'h-3 w-3',
                isLoading && 'animate-spin'
              )} />
            </Button>
          )}
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
