
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dashboard } from '@/services/salesysApi';

interface DashboardListCardProps {
  dashboard: Dashboard;
  onClick?: () => void;
  className?: string;
}

const DashboardListCard: React.FC<DashboardListCardProps> = ({
  dashboard,
  onClick,
  className
}) => {
  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md cursor-pointer bg-white border-0 shadow-sm rounded-2xl',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-gray-800">
                {dashboard.name}
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">
                {dashboard.readers.length} reader{dashboard.readers.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>
      </CardHeader>
      
      {dashboard.readers.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {dashboard.readers.slice(0, 3).map((reader) => (
              <Badge 
                key={reader.id} 
                variant="outline" 
                className="text-xs bg-gray-50 border-gray-200 text-gray-600"
              >
                {reader.name}
              </Badge>
            ))}
            {dashboard.readers.length > 3 && (
              <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                +{dashboard.readers.length - 3} mer
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default DashboardListCard;
