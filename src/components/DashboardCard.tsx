
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
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-200',
    green: 'from-green-500/10 to-green-600/5 border-green-200',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-200',
  };

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  const countColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
  };

  return (
    <Card className={cn(
      'bg-gradient-to-br border-2 transition-all duration-200 hover:shadow-md',
      colorClasses[color],
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center space-x-1">
          {filterInfo && (
            <Badge variant="secondary" className="text-xs">
              <Filter className="h-3 w-3 mr-1" />
              {filterInfo}
            </Badge>
          )}
          {onSettings && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onSettings}
            >
              <Settings className={cn('h-4 w-4', iconColors[color])} />
            </Button>
          )}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn(
                'h-4 w-4',
                iconColors[color],
                isLoading && 'animate-spin'
              )} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          {error ? (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          ) : (
            <>
              <div className={cn('text-3xl font-bold', countColors[color])}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse bg-muted h-8 w-16 rounded" />
                  </div>
                ) : (
                  count.toLocaleString('sv-SE')
                )}
              </div>
              {isLoading && (
                <Progress value={undefined} className="h-1" />
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
