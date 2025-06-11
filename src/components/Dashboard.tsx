import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Phone, Users, UserPlus, CheckCircle, XCircle, Settings } from 'lucide-react';
import { salesysApi } from '@/services/salesysApi';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from '@/lib/utils';
import { format } from "date-fns"
import { sv } from 'date-fns/locale';
import DashboardCard from './DashboardCard';
import DashboardListCard from './DashboardListCard';
import DashboardDetailView from './DashboardDetailView';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

interface DashboardProps {
  onStatisticsClick: (statType: 'avtal' | 'samtal' | 'ordrar') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStatisticsClick }) => {
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<'welcome' | 'section' | 'dashboard'>('welcome');
  const [activeSection, setActiveSection] = useState<'ringlistor' | 'anvandare' | 'team'>('ringlistor');
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [avtalsData, setAvtalsData] = useState<Array<{ date: string; value: number }>>([]);
  const [samtalData, setSamtalData] = useState<Array<{ date: string; value: number }>>([]);
  const [ordrarData, setOrdrarData] = useState<Array<{ date: string; value: number }>>([]);
  const [dialGroups, setDialGroups] = useState<any[]>([]);
  const [loadingDialGroups, setLoadingDialGroups] = useState(true);
  const [dialGroupsError, setDialGroupsError] = useState<string | null>(null);
  const [dialGroupSummaries, setDialGroupSummaries] = useState<any[]>([]);
  const [loadingDialGroupSummaries, setLoadingDialGroupSummaries] = useState(true);
  const [dialGroupSummariesError, setDialGroupSummariesError] = useState<string | null>(null);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [dashboardResults, setDashboardResults] = useState<any>(null);
  const [loadingDashboardResults, setLoadingDashboardResults] = useState(false);

  // Helper function to get date range for a specific date
  const getDateRange = (date: Date): { from: string; to: string } => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    return {
      from: targetDate.toISOString().split('T')[0],
      to: nextDay.toISOString().split('T')[0]
    };
  };

  // Helper function to aggregate hourly data and convert to Stockholm time
  const aggregateHourlyData = (data: any[]): Array<{ date: string; value: number }> => {
    const hourlyMap = new Map<string, number>();
    
    data.forEach(item => {
      const utcDate = new Date(item.intervalStart);
      const stockholmDate = new Date(utcDate.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
      const hour = stockholmDate.getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      
      const currentCount = hourlyMap.get(hourKey) || 0;
      hourlyMap.set(hourKey, currentCount + item.count);
    });

    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      result.push({
        date: hourKey,
        value: hourlyMap.get(hourKey) || 0
      });
    }
    
    return result;
  };

  // Helper function to check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    const targetDate = new Date(date);
    return targetDate.toDateString() === today.toDateString();
  };

  // Helper function to crop chart data to only show hours with data
  const cropChartData = (data: Array<{ date: string; value: number }>): Array<{ date: string; value: number }> => {
    // Find first and last hour with data
    let firstHourWithData = -1;
    let lastHourWithData = -1;

    for (let i = 0; i < data.length; i++) {
      if (data[i].value > 0) {
        if (firstHourWithData === -1) {
          firstHourWithData = i;
        }
        lastHourWithData = i;
      }
    }

    // If no data found, return empty array
    if (firstHourWithData === -1) {
      return [];
    }

    // Add some padding around the data (1 hour before first, 1 hour after last)
    const startIndex = Math.max(0, firstHourWithData - 1);
    const endIndex = Math.min(data.length - 1, lastHourWithData + 1);

    return data.slice(startIndex, endIndex + 1);
  };

  // Helper function to get relative date text
  const getRelativeDateText = (date: Date): string => {
    const today = new Date();
    const targetDate = new Date(date);
    
    // Check if it's today
    if (targetDate.toDateString() === today.toDateString()) {
      return "Idag";
    }
    
    // Check if it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (targetDate.toDateString() === yesterday.toDateString()) {
      return "Igår";
    }
    
    // Check if it's tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (targetDate.toDateString() === tomorrow.toDateString()) {
      return "Imorgon";
    }
    
    // Check if it's the same year
    if (targetDate.getFullYear() === today.getFullYear()) {
      return format(targetDate, "d MMMM", { locale: sv });
    }
    
    // Different year, include year
    return format(targetDate, "d MMMM yyyy", { locale: sv });
  };

  // Load statistics data based on selected date (only for welcome screen)
  useEffect(() => {
    if (currentView !== 'welcome') return;

    const loadStatistics = async () => {
      if (!salesysApi.getBearerToken()) return;

      console.log('Loading statistics data for date:', selectedDate);
      const { from, to } = getDateRange(selectedDate);

      try {
        const [offerStats, callStats, orderStats] = await Promise.all([
          salesysApi.getOfferStatistics({ from, to, fixedIntervalType: 'hour' }),
          salesysApi.getCallStatisticsHourly({ from, to, fixedIntervalType: 'hour' }),
          salesysApi.getOrderStatisticsHourly({ from, to, fixedIntervalType: 'hour' })
        ]);

        const avtalsData = aggregateHourlyData(offerStats);
        const samtalData = aggregateHourlyData(callStats);
        const ordrarData = aggregateHourlyData(orderStats);

        setAvtalsData(avtalsData);
        setSamtalData(samtalData);
        setOrdrarData(ordrarData);

        console.log('Loaded hourly statistics:', { 
          avtal: avtalsData, 
          samtal: samtalData, 
          ordrar: ordrarData 
        });

      } catch (error) {
        console.error('Error loading statistics:', error);
      }
    };

    loadStatistics();
  }, [selectedDate, currentView]);

  // Load dashboards when navigating to welcome
  useEffect(() => {
    if (currentView !== 'welcome') return;

    const loadDashboards = async () => {
      setLoadingDashboards(true);
      try {
        const response = await salesysApi.getDashboards();
        setDashboards(response);
        console.log('Loaded dashboards:', response);
      } catch (error) {
        console.error('Error loading dashboards:', error);
        toast({
          title: "Något gick fel.",
          description: "Kunde inte ladda statistikvyer.",
          variant: "destructive",
        });
      } finally {
        setLoadingDashboards(false);
      }
    };

    loadDashboards();
  }, [currentView]);

  // Load dial groups only when navigating to the ringlistor section
  useEffect(() => {
    if (currentView !== 'section' || activeSection !== 'ringlistor') return;

    const loadDialGroups = async () => {
      setLoadingDialGroups(true);
      setDialGroupsError(null);
      try {
        const response = await salesysApi.getDialGroups();
        setDialGroups(response.data);
      } catch (error) {
        console.error('Error loading dial groups:', error);
        setDialGroupsError('Kunde inte ladda ringlistor.');
        toast({
          title: "Något gick fel.",
          description: "Kunde inte ladda ringlistor.",
          variant: "destructive",
        })
      } finally {
        setLoadingDialGroups(false);
      }
    };

    loadDialGroups();
  }, [currentView, activeSection]);

  // Load dial group summaries only when dial groups are loaded and in ringlistor section
  useEffect(() => {
    if (dialGroups.length === 0 || currentView !== 'section' || activeSection !== 'ringlistor') return;

    const loadDialGroupSummaries = async () => {
      setLoadingDialGroupSummaries(true);
      setDialGroupSummariesError(null);

      try {
        const dialGroupIds = dialGroups.map(group => group.id);
        const summaries = await salesysApi.getDialGroupSummaries(dialGroupIds);
        setDialGroupSummaries(summaries);
      } catch (error) {
        console.error('Error loading dial group summaries:', error);
        setDialGroupSummariesError('Kunde inte ladda ringlistesammanfattningar.');
        toast({
          title: "Något gick fel.",
          description: "Kunde inte ladda ringlistesammanfattningar.",
          variant: "destructive",
        })
      } finally {
        setLoadingDialGroupSummaries(false);
      }
    };

    loadDialGroupSummaries();
  }, [dialGroups, currentView, activeSection]);

  // Load dashboard results when a dashboard is selected
  useEffect(() => {
    if (!selectedDashboard || currentView !== 'dashboard') return;

    const loadDashboardResults = async () => {
      setLoadingDashboardResults(true);
      try {
        const results = await salesysApi.getDashboardResults(selectedDashboard.id);
        setDashboardResults(results);
        console.log('Loaded dashboard results:', results);
      } catch (error) {
        console.error('Error loading dashboard results:', error);
        toast({
          title: "Något gick fel.",
          description: "Kunde inte ladda dashboard-resultat.",
          variant: "destructive",
        });
      } finally {
        setLoadingDashboardResults(false);
      }
    };

    loadDashboardResults();
  }, [selectedDashboard, currentView]);

  const getTotalFromHourlyData = (data: Array<{ date: string; value: number }>): number => {
    return data.reduce((sum, item) => sum + item.value, 0);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSectionNavigation = (section: 'ringlistor' | 'anvandare' | 'team') => {
    setActiveSection(section);
    setCurrentView('section');
  };

  const handleDashboardClick = (dashboard: any) => {
    setSelectedDashboard(dashboard);
    setCurrentView('dashboard');
  };

  const handleBackToWelcome = () => {
    setCurrentView('welcome');
    setSelectedDashboard(null);
    setDashboardResults(null);
  };

  const handleBackToSection = () => {
    setCurrentView('section');
    setSelectedDashboard(null);
    setDashboardResults(null);
  };

  if (currentView === 'welcome') {
    const isSelectedDateToday = isToday(selectedDate);
    const croppedAvtalsData = cropChartData(avtalsData);
    const croppedSamtalData = cropChartData(samtalData);
    const croppedOrdrarData = cropChartData(ordrarData);

    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-between items-start mb-6 mt-12">
            <div className="flex items-baseline gap-3">
              <h1 className="text-4xl font-light text-gray-800">Hej Viktor</h1>
              <p className="text-lg text-gray-600">
                {getRelativeDateText(selectedDate)}
              </p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="border-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DashboardCard
              title="Avtal signerade"
              count={getTotalFromHourlyData(avtalsData)}
              isLoading={!avtalsData.length}
              color="green"
              chartData={croppedAvtalsData}
              onClick={() => onStatisticsClick('avtal')}
              showLiveDot={isSelectedDateToday}
            />
            
            <DashboardCard
              title="Samtal genomförda"
              count={getTotalFromHourlyData(samtalData)}
              isLoading={!samtalData.length}
              color="blue"
              chartData={croppedSamtalData}
              onClick={() => onStatisticsClick('samtal')}
              showLiveDot={isSelectedDateToday}
            />
            
            <DashboardCard
              title="Ordrar skapade"
              count={getTotalFromHourlyData(ordrarData)}
              isLoading={!ordrarData.length}
              color="purple"
              chartData={croppedOrdrarData}
              onClick={() => onStatisticsClick('ordrar')}
              showLiveDot={isSelectedDateToday}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => handleSectionNavigation('anvandare')}
            >
              Användare
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSectionNavigation('ringlistor')}
            >
              Ringlistor
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSectionNavigation('team')}
            >
              Team
            </Button>
          </div>

          {/* Dashboards List */}
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-light">Statistikvyer</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDashboards ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-200 h-16 rounded-lg" />
                  ))}
                </div>
              ) : dashboards.length > 0 ? (
                <div className="space-y-3">
                  {dashboards.map((dashboard) => (
                    <DashboardListCard
                      key={dashboard.id}
                      dashboard={dashboard}
                      onClick={() => handleDashboardClick(dashboard)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Inga statistikvyer hittades.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'section') {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-light text-gray-800">
              {activeSection === 'ringlistor' ? 'Ringlistor' : 
               activeSection === 'anvandare' ? 'Användare' : 'Team'}
            </h1>
            <Button variant="outline" onClick={handleBackToWelcome}>
              Tillbaka till översikt
            </Button>
          </div>

          {activeSection === 'ringlistor' && (
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">Ringlistor</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDialGroups ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="bg-gray-200 h-4 w-32 rounded" />
                        <div className="bg-gray-200 h-4 w-12 rounded" />
                      </div>
                    ))}
                  </div>
                ) : dialGroupsError ? (
                  <div className="text-red-500">{dialGroupsError}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">ID</TableHead>
                          <TableHead>Namn</TableHead>
                          <TableHead>Kontakter</TableHead>
                          <TableHead>Reserverade</TableHead>
                          <TableHead>Skippade</TableHead>
                          <TableHead>Karantän</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dialGroups.map((group) => {
                          const summary = dialGroupSummaries.find(s => s.dialGroupId === group.id)?.summary;
                          return (
                            <TableRow key={group.id}>
                              <TableCell className="font-medium">{group.serialId}</TableCell>
                              <TableCell>{group.name}</TableCell>
                              <TableCell>{summary?.contactCount ?? 'N/A'}</TableCell>
                              <TableCell>{summary?.reservedContactCount ?? 'N/A'}</TableCell>
                              <TableCell>{summary?.skippedContactCount ?? 'N/A'}</TableCell>
                              <TableCell>{summary?.quarantinedContactCount ?? 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === 'anvandare' && (
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">Användare</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Här kommer en lista med användare.</p>
              </CardContent>
            </Card>
          )}

          {activeSection === 'team' && (
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Här kommer en lista med team.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Dashboard view - updated to use DashboardDetailView
  return (
    <DashboardDetailView
      dashboard={selectedDashboard}
      onBack={handleBackToWelcome}
    />
  );
};

export default Dashboard;
