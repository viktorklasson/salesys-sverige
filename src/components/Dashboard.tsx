import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, LogOut } from 'lucide-react';
import { salesysApi, DialGroup, DialGroupSummary } from '@/services/salesysApi';
import DashboardCard from './DashboardCard';
import DialGroupCard from './DialGroupCard';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { toast } = useToast();
  
  // Today's stats state
  const [avtalCount, setAvtalCount] = useState(0);
  const [avtalLoading, setAvtalLoading] = useState(false);
  const [avtalError, setAvtalError] = useState('');

  const [samtalCount, setSamtalCount] = useState(0);
  const [samtalLoading, setSamtalLoading] = useState(false);
  const [samtalError, setSamtalError] = useState('');

  const [ordrarCount, setOrdrarCount] = useState(0);
  const [ordrarLoading, setOrdrarLoading] = useState(false);
  const [ordrarError, setOrdrarError] = useState('');

  // Dial groups state
  const [dialGroups, setDialGroups] = useState<DialGroup[]>([]);
  const [dialGroupSummaries, setDialGroupSummaries] = useState<Map<string, DialGroupSummary>>(new Map());
  const [dialGroupsLoading, setDialGroupsLoading] = useState(false);
  const [dialGroupsError, setDialGroupsError] = useState('');

  // Get today's date in Swedish format
  const getTodayDateString = (): string => {
    const today = new Date();
    return today.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Europe/Stockholm'
    });
  };

  // Load Avtal (signed contracts)
  const loadAvtal = async () => {
    setAvtalLoading(true);
    setAvtalError('');
    
    try {
      const count = await salesysApi.getOffersCount({ 
        statuses: ['signed'] 
      });
      setAvtalCount(count);
      console.log('Loaded avtal count:', count);
    } catch (error) {
      const errorMsg = 'Kunde inte ladda avtalsdata';
      setAvtalError(errorMsg);
      console.error('Error loading avtal:', error);
    } finally {
      setAvtalLoading(false);
    }
  };

  // Load Samtal (calls)
  const loadSamtal = async () => {
    setSamtalLoading(true);
    setSamtalError('');
    
    try {
      const response = await salesysApi.getCalls({
        count: 1 // We only need the count
      });
      setSamtalCount(response.total);
      console.log('Loaded samtal count:', response.total);
    } catch (error) {
      const errorMsg = 'Kunde inte ladda samtalsdata';
      setSamtalError(errorMsg);
      console.error('Error loading samtal:', error);
    } finally {
      setSamtalLoading(false);
    }
  };

  // Load Ordrar (orders)
  const loadOrdrar = async () => {
    setOrdrarLoading(true);
    setOrdrarError('');
    
    try {
      const response = await salesysApi.getOrders({
        count: 1 // We only need the count
      });
      setOrdrarCount(response.total);
      console.log('Loaded ordrar count:', response.total);
    } catch (error) {
      const errorMsg = 'Kunde inte ladda orderdata';
      setOrdrarError(errorMsg);
      console.error('Error loading ordrar:', error);
    } finally {
      setOrdrarLoading(false);
    }
  };

  // Load Dial Groups
  const loadDialGroups = async () => {
    setDialGroupsLoading(true);
    setDialGroupsError('');
    
    try {
      const response = await salesysApi.getDialGroups({ count: 20 });
      setDialGroups(response.data);
      
      // Load summaries for each dial group
      if (response.data.length > 0) {
        const groupIds = response.data.map(group => group.id);
        const summaries = await salesysApi.getDialGroupSummaries(groupIds);
        
        const summaryMap = new Map<string, DialGroupSummary>();
        summaries.forEach(summary => {
          summaryMap.set(summary.dialGroupId, summary);
        });
        setDialGroupSummaries(summaryMap);
      }
      
      console.log('Loaded dial groups:', response.data.length);
    } catch (error) {
      const errorMsg = 'Kunde inte ladda ringgrupper';
      setDialGroupsError(errorMsg);
      console.error('Error loading dial groups:', error);
    } finally {
      setDialGroupsLoading(false);
    }
  };

  // Load all data
  const loadAllData = async () => {
    await Promise.all([
      loadAvtal(),
      loadSamtal(),
      loadOrdrar(),
      loadDialGroups()
    ]);
  };

  // Auto-refresh every minute
  useEffect(() => {
    loadAllData();
    
    const interval = setInterval(() => {
      loadAllData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('salesys_bearer_token');
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {getTodayDateString()}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logga ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Today's Dashboard Cards */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DashboardCard
              title="Avtal signerade"
              count={avtalCount}
              isLoading={avtalLoading}
              error={avtalError}
              color="green"
              onRefresh={loadAvtal}
              filterInfo="Status: Signerad"
              className="bg-white border-0 shadow-sm rounded-2xl"
            />
            
            <DashboardCard
              title="Samtal genomförda"
              count={samtalCount}
              isLoading={samtalLoading}
              error={samtalError}
              color="blue"
              onRefresh={loadSamtal}
              filterInfo="Alla samtal"
              className="bg-white border-0 shadow-sm rounded-2xl"
            />
            
            <DashboardCard
              title="Ordrar skapade"
              count={ordrarCount}
              isLoading={ordrarLoading}
              error={ordrarError}
              color="purple"
              onRefresh={loadOrdrar}
              filterInfo="Alla ordrar"
              className="bg-white border-0 shadow-sm rounded-2xl"
            />
          </div>
        </section>

        {/* Dial Groups Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-light text-gray-700">Ringgrupper</h2>
            <Badge variant="outline" className="text-xs">
              {dialGroups.length} grupper
            </Badge>
          </div>
          
          {dialGroupsError && (
            <Card className="border-red-100 bg-red-50 rounded-2xl">
              <CardContent className="pt-6">
                <div className="text-sm text-red-600">{dialGroupsError}</div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dialGroupsLoading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="bg-white border-0 shadow-sm rounded-2xl">
                  <CardContent className="pt-6 space-y-3">
                    <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded" />
                    <div className="animate-pulse bg-gray-200 h-4 w-1/2 rounded" />
                    <div className="animate-pulse bg-gray-200 h-2 w-full rounded" />
                    <div className="animate-pulse bg-gray-200 h-2 w-full rounded" />
                  </CardContent>
                </Card>
              ))
            ) : (
              dialGroups.map((group) => (
                <DialGroupCard
                  key={group.id}
                  dialGroup={group}
                  summary={dialGroupSummaries.get(group.id)}
                />
              ))
            )}
          </div>
          
          {!dialGroupsLoading && dialGroups.length === 0 && !dialGroupsError && (
            <Card className="bg-white rounded-2xl border-0 shadow-sm">
              <CardContent className="pt-6 text-center text-gray-500">
                Inga ringgrupper hittades
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
