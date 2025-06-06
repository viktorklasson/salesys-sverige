
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, LogOut } from 'lucide-react';
import { salesysApi, DialGroup, DialGroupSummary } from '@/services/salesysApi';
import DashboardCard from './DashboardCard';
import DialGroupCard from './DialGroupCard';
import StatisticsView from './StatisticsView';
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
  
  // View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'statistics'>('dashboard');
  const [selectedStatType, setSelectedStatType] = useState<'avtal' | 'samtal' | 'ordrar'>('avtal');
  
  // Track if this is the initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Today's stats state
  const [avtalCount, setAvtalCount] = useState(0);
  const [avtalLoading, setAvtalLoading] = useState(false);
  const [avtalError, setAvtalError] = useState('');
  const [avtalChartData, setAvtalChartData] = useState<Array<{ date: string; value: number }>>([]);
  const [avtalWeeklyTotal, setAvtalWeeklyTotal] = useState<number>(0);
  const [avtalMonthlyTotal, setAvtalMonthlyTotal] = useState<number>(0);

  const [samtalCount, setSamtalCount] = useState(0);
  const [samtalLoading, setSamtalLoading] = useState(false);
  const [samtalError, setSamtalError] = useState('');
  const [samtalChartData, setSamtalChartData] = useState<Array<{ date: string; value: number }>>([]);
  const [samtalWeeklyTotal, setSamtalWeeklyTotal] = useState<number>(0);
  const [samtalMonthlyTotal, setSamtalMonthlyTotal] = useState<number>(0);

  const [ordrarCount, setOrdrarCount] = useState(0);
  const [ordrarLoading, setOrdrarLoading] = useState(false);
  const [ordrarError, setOrdrarError] = useState('');
  const [ordrarChartData, setOrdrarChartData] = useState<Array<{ date: string; value: number }>>([]);
  const [ordrarWeeklyTotal, setOrdrarWeeklyTotal] = useState<number>(0);
  const [ordrarMonthlyTotal, setOrdrarMonthlyTotal] = useState<number>(0);

  // Dial groups state
  const [dialGroups, setDialGroups] = useState<DialGroup[]>([]);
  const [dialGroupSummaries, setDialGroupSummaries] = useState<Map<string, DialGroupSummary>>(new Map());
  const [dialGroupsLoading, setDialGroupsLoading] = useState(false);
  const [dialGroupsError, setDialGroupsError] = useState('');

  // Helper function to get past 7 working days
  const getPast7WorkingDays = (): string[] => {
    const dates: string[] = [];
    const today = new Date();
    let currentDate = new Date(today);
    let workingDaysCount = 0;

    while (workingDaysCount < 7) {
      const dayOfWeek = currentDate.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.unshift(currentDate.toISOString().split('T')[0]);
        workingDaysCount++;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return dates;
  };

  // Helper function to get current week dates
  const getCurrentWeekDates = (): { start: Date; end: Date } => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  };

  // Helper function to get current month dates
  const getCurrentMonthDates = (): { start: Date; end: Date } => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  // Reset all state to initial values
  const resetAllState = () => {
    setCurrentView('dashboard');
    setSelectedStatType('avtal');
    
    setAvtalCount(0);
    setAvtalLoading(false);
    setAvtalError('');
    setAvtalChartData([]);
    setAvtalWeeklyTotal(0);
    setAvtalMonthlyTotal(0);
    
    setSamtalCount(0);
    setSamtalLoading(false);
    setSamtalError('');
    setSamtalChartData([]);
    setSamtalWeeklyTotal(0);
    setSamtalMonthlyTotal(0);
    
    setOrdrarCount(0);
    setOrdrarLoading(false);
    setOrdrarError('');
    setOrdrarChartData([]);
    setOrdrarWeeklyTotal(0);
    setOrdrarMonthlyTotal(0);
    
    setDialGroups([]);
    setDialGroupSummaries(new Map());
    setDialGroupsLoading(false);
    setDialGroupsError('');
  };

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

  // Load Avtal (signed contracts) with 7-day trend
  const loadAvtal = async () => {
    // Only show loading on initial load
    if (isInitialLoad) {
      setAvtalLoading(true);
    }
    setAvtalError('');
    
    try {
      // Get today's count
      const count = await salesysApi.getOffersCount({ 
        statuses: ['signed'] 
      });
      setAvtalCount(count);

      // Get 7-day trend data
      const workingDays = getPast7WorkingDays();
      const chartDataPromises = workingDays.map(async (date) => {
        const dayStart = new Date(date + 'T00:00:00.000+01:00');
        const dayEnd = new Date(date + 'T23:59:59.999+01:00');
        
        try {
          const dayCount = await salesysApi.getOffersCount({
            statuses: ['signed'],
            from: dayStart.toISOString(),
            to: dayEnd.toISOString()
          });
          return { date, value: dayCount };
        } catch (error) {
          return { date, value: 0 };
        }
      });

      const chartData = await Promise.all(chartDataPromises);
      setAvtalChartData(chartData);

      // Get weekly total
      const weekDates = getCurrentWeekDates();
      const weeklyCount = await salesysApi.getOffersCount({
        statuses: ['signed'],
        from: weekDates.start.toISOString(),
        to: weekDates.end.toISOString()
      });
      setAvtalWeeklyTotal(weeklyCount);

      // Get monthly total
      const monthDates = getCurrentMonthDates();
      const monthlyCount = await salesysApi.getOffersCount({
        statuses: ['signed'],
        from: monthDates.start.toISOString(),
        to: monthDates.end.toISOString()
      });
      setAvtalMonthlyTotal(monthlyCount);
      
      console.log('Loaded avtal count:', count);
    } catch (error) {
      const errorMsg = 'Kunde inte ladda avtalsdata';
      setAvtalError(errorMsg);
      console.error('Error loading avtal:', error);
    } finally {
      if (isInitialLoad) {
        setAvtalLoading(false);
      }
    }
  };

  // Load Samtal (calls) with 7-day trend
  const loadSamtal = async () => {
    // Only show loading on initial load
    if (isInitialLoad) {
      setSamtalLoading(true);
    }
    setSamtalError('');
    
    try {
      // Get today's count
      const response = await salesysApi.getCalls({
        count: 1 // We only need the count
      });
      setSamtalCount(response.total);

      // Get 7-day trend data
      const workingDays = getPast7WorkingDays();
      const chartDataPromises = workingDays.map(async (date) => {
        const dayStart = new Date(date + 'T00:00:00.000+01:00');
        const dayEnd = new Date(date + 'T23:59:59.999+01:00');
        
        try {
          const dayResponse = await salesysApi.getCalls({
            count: 1,
            after: dayStart.toISOString(),
            before: dayEnd.toISOString()
          });
          return { date, value: dayResponse.total };
        } catch (error) {
          return { date, value: 0 };
        }
      });

      const chartData = await Promise.all(chartDataPromises);
      setSamtalChartData(chartData);

      // Get weekly total
      const weekDates = getCurrentWeekDates();
      const weeklyResponse = await salesysApi.getCalls({
        count: 1,
        after: weekDates.start.toISOString(),
        before: weekDates.end.toISOString()
      });
      setSamtalWeeklyTotal(weeklyResponse.total);

      // Get monthly total
      const monthDates = getCurrentMonthDates();
      const monthlyResponse = await salesysApi.getCalls({
        count: 1,
        after: monthDates.start.toISOString(),
        before: monthDates.end.toISOString()
      });
      setSamtalMonthlyTotal(monthlyResponse.total);

      console.log('Loaded samtal count:', response.total);
    } catch (error) {
      const errorMsg = 'Kunde inte ladda samtalsdata';
      setSamtalError(errorMsg);
      console.error('Error loading samtal:', error);
    } finally {
      if (isInitialLoad) {
        setSamtalLoading(false);
      }
    }
  };

  // Load Ordrar (orders) with 7-day trend
  const loadOrdrar = async () => {
    // Only show loading on initial load
    if (isInitialLoad) {
      setOrdrarLoading(true);
    }
    setOrdrarError('');
    
    try {
      // Get today's count
      const response = await salesysApi.getOrders({
        count: 1 // We only need the count
      });
      setOrdrarCount(response.total);

      // Get 7-day trend data
      const workingDays = getPast7WorkingDays();
      const chartDataPromises = workingDays.map(async (date) => {
        const dayStart = new Date(date + 'T00:00:00.000+01:00');
        const dayEnd = new Date(date + 'T23:59:59.999+01:00');
        
        try {
          const dayResponse = await salesysApi.getOrders({
            count: 1,
            from: dayStart.toISOString(),
            to: dayEnd.toISOString()
          });
          return { date, value: dayResponse.total };
        } catch (error) {
          return { date, value: 0 };
        }
      });

      const chartData = await Promise.all(chartDataPromises);
      setOrdrarChartData(chartData);

      // Get weekly total
      const weekDates = getCurrentWeekDates();
      const weeklyResponse = await salesysApi.getOrders({
        count: 1,
        from: weekDates.start.toISOString(),
        to: weekDates.end.toISOString()
      });
      setOrdrarWeeklyTotal(weeklyResponse.total);

      // Get monthly total
      const monthDates = getCurrentMonthDates();
      const monthlyResponse = await salesysApi.getOrders({
        count: 1,
        from: monthDates.start.toISOString(),
        to: monthDates.end.toISOString()
      });
      setOrdrarMonthlyTotal(monthlyResponse.total);

      console.log('Loaded ordrar count:', response.total);
    } catch (error) {
      const errorMsg = 'Kunde inte ladda orderdata';
      setOrdrarError(errorMsg);
      console.error('Error loading ordrar:', error);
    } finally {
      if (isInitialLoad) {
        setOrdrarLoading(false);
      }
    }
  };

  // Load Dial Groups
  const loadDialGroups = async () => {
    // Only show loading on initial load
    if (isInitialLoad) {
      setDialGroupsLoading(true);
    }
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
      if (isInitialLoad) {
        setDialGroupsLoading(false);
      }
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
    
    // Mark initial load as complete
    setIsInitialLoad(false);
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
    salesysApi.setBearerToken(''); // Clear the cached token in the service
    resetAllState(); // Reset all component state
    onLogout();
  };

  const handleCardClick = (statType: 'avtal' | 'samtal' | 'ordrar') => {
    setSelectedStatType(statType);
    setCurrentView('statistics');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  if (currentView === 'statistics') {
    return (
      <StatisticsView 
        statType={selectedStatType} 
        onBack={handleBackToDashboard} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Section with Greeting and Settings */}
      <div className="relative">
        <div className="container mx-auto px-4 pt-12 pb-2">
          <div className="flex items-start justify-between">
            <h1 className="text-4xl font-nunito font-thin text-gray-800">
              Hej Viktor,
            </h1>
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
              className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleCardClick('avtal')}
              chartData={avtalChartData}
              weeklyTotal={avtalWeeklyTotal}
              monthlyTotal={avtalMonthlyTotal}
            />
            
            <DashboardCard
              title="Samtal genomförda"
              count={samtalCount}
              isLoading={samtalLoading}
              error={samtalError}
              color="blue"
              className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleCardClick('samtal')}
              chartData={samtalChartData}
              weeklyTotal={samtalWeeklyTotal}
              monthlyTotal={samtalMonthlyTotal}
            />
            
            <DashboardCard
              title="Ordrar skapade"
              count={ordrarCount}
              isLoading={ordrarLoading}
              error={ordrarError}
              color="purple"
              className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleCardClick('ordrar')}
              chartData={ordrarChartData}
              weeklyTotal={ordrarWeeklyTotal}
              monthlyTotal={ordrarMonthlyTotal}
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
