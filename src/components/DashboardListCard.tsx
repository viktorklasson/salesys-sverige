
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
        'transition-all duration-200 hover:shadow-lg cursor-pointer bg-white border-0 shadow-sm rounded-2xl hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-lg font-light text-gray-800 mb-1">
              {dashboard.name}
            </h3>
            <p className="text-sm text-gray-500">Klicka för att visa</p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-full">
            <ChevronRight className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardListCard;
