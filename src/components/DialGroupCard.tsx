import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DialGroup, DialGroupSummary } from '@/SaleSys';
import { Users, Phone, UserCheck, Clock } from 'lucide-react';

interface DialGroupCardProps {
  dialGroup: DialGroup;
  summary?: DialGroupSummary;
  isLoading?: boolean;
}

const DialGroupCard: React.FC<DialGroupCardProps> = ({
  dialGroup,
  summary,
  isLoading
}) => {
  const summaryData = summary?.summary || dialGroup.contactSummaryCache;
  const totalContacts = summaryData.contactCount;
  const bearbetadeContacts = summaryData.reservedContactCount;
  const invantarContacts = summaryData.quarantinedContactCount;
  
  const bearbetadePercentage = totalContacts > 0 ? (bearbetadeContacts / totalContacts) * 100 : 0;
  const invantarPercentage = totalContacts > 0 ? (invantarContacts / totalContacts) * 100 : 0;

  return (
    <Card className="bg-white border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-light text-gray-700 truncate">
            {dialGroup.name}
          </CardTitle>
          <Badge variant="outline" className="text-xs font-light">
            #{dialGroup.serialId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />
            <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded" />
            <div className="animate-pulse bg-gray-200 h-2 w-full rounded" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3 text-[#1665c0]" />
                <div>
                  <div className="font-light text-gray-600">Totalt</div>
                  <div className="text-gray-800 font-thin">{totalContacts.toLocaleString('sv-SE')}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <UserCheck className="h-3 w-3 text-green-500" />
                <div>
                  <div className="font-light text-gray-600">Bearbetade</div>
                  <div className="text-gray-800 font-thin">{bearbetadeContacts.toLocaleString('sv-SE')}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-orange-500" />
                <div>
                  <div className="font-light text-gray-600">Inväntar</div>
                  <div className="text-gray-800 font-thin">{invantarContacts.toLocaleString('sv-SE')}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Phone className="h-3 w-3 text-purple-500" />
                <div>
                  <div className="font-light text-gray-600">Kvar</div>
                  <div className="text-gray-800 font-thin">
                    {(totalContacts - bearbetadeContacts - invantarContacts).toLocaleString('sv-SE')}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-light">Bearbetade</span>
                <span className="text-gray-400 font-thin">{bearbetadePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={bearbetadePercentage} className="h-1" />
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-light">Inväntar återkoppling</span>
                <span className="text-gray-400 font-thin">{invantarPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={invantarPercentage} className="h-1 [&>div]:bg-orange-500" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DialGroupCard;
