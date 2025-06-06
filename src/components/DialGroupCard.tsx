
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DialGroup, DialGroupSummary } from '@/services/salesysApi';
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
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700 truncate">
            {dialGroup.name}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            #{dialGroup.serialId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="animate-pulse bg-muted h-4 w-full rounded" />
            <div className="animate-pulse bg-muted h-4 w-3/4 rounded" />
            <div className="animate-pulse bg-muted h-2 w-full rounded" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3 text-blue-500" />
                <div>
                  <div className="font-medium text-slate-700">Totalt</div>
                  <div className="text-slate-500">{totalContacts.toLocaleString('sv-SE')}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <UserCheck className="h-3 w-3 text-green-500" />
                <div>
                  <div className="font-medium text-slate-700">Bearbetade</div>
                  <div className="text-slate-500">{bearbetadeContacts.toLocaleString('sv-SE')}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-orange-500" />
                <div>
                  <div className="font-medium text-slate-700">Inväntar</div>
                  <div className="text-slate-500">{invantarContacts.toLocaleString('sv-SE')}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Phone className="h-3 w-3 text-purple-500" />
                <div>
                  <div className="font-medium text-slate-700">Kvar</div>
                  <div className="text-slate-500">
                    {(totalContacts - bearbetadeContacts - invantarContacts).toLocaleString('sv-SE')}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Bearbetade</span>
                <span className="text-slate-500">{bearbetadePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={bearbetadePercentage} className="h-2" />
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Inväntar återkoppling</span>
                <span className="text-slate-500">{invantarPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={invantarPercentage} className="h-2 [&>div]:bg-orange-500" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DialGroupCard;
