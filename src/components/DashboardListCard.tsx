
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
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
          <CardTitle className="text-sm font-medium text-gray-800">
            {dashboard.name}
          </CardTitle>
          <ChevronRight className="h-4 w-4 text-blue-600" />
        </div>
      </CardHeader>
    </Card>
  );
};

export default DashboardListCard;
